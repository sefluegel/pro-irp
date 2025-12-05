// backend/routes/auth.js (PostgreSQL version - ready for scale!)
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../db");

// Cookie and session management
const { setAuthCookie, clearAuthCookie } = require("../middleware/cookies");
const { createSession, revokeSession, revokeAllUserSessions, getUserSessions } = require("../middleware/session-limits");

const router = express.Router();

// Require JWT_SECRET in environment - no fallback for security
if (!process.env.JWT_SECRET) {
  throw new Error("CRITICAL: JWT_SECRET environment variable must be set!");
}
const JWT_SECRET = process.env.JWT_SECRET;
const TOKEN_TTL_SEC = 60 * 60 * 2; // 2 hours (HIPAA compliant session timeout)

// Password requirements
const MIN_PASSWORD_LENGTH = 8;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

// Email validation (simple but effective)
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Password validation
function validatePassword(password) {
  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
  }
  return null; // null means valid
}

// Issue JWT token
function issueToken(user) {
  const payload = {
    id: user.id,
    email: user.email,
    name: user.name || null,
    role: user.role || 'agent'
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_TTL_SEC });
}

// ============================================================================
// SIGNUP - Create new account (Agency or Agent via invitation)
// ============================================================================
router.post("/signup", async (req, res) => {
  try {
    const { email, password, name, role, agencyName, agentCount, promoCode, invitationToken } = req.body || {};

    // Basic validation
    if (!email || !password) {
      return res.status(400).json({ ok: false, error: "Email and password required" });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ ok: false, error: "Invalid email format" });
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      return res.status(400).json({ ok: false, error: passwordError });
    }

    // Check if email already exists
    const existing = await db.query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase().trim()]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({ ok: false, error: "Email already registered" });
    }

    // Route to appropriate signup handler based on role
    if (role === 'agency') {
      return await signupAgency(req, res, { email, password, name, agencyName, agentCount, promoCode });
    } else if (role === 'agent') {
      return await signupAgent(req, res, { email, password, name, invitationToken });
    } else if (role === 'fmo') {
      return res.status(400).json({
        ok: false,
        error: "FMO accounts require approval. Please contact support@proirp.com"
      });
    } else if (role === 'admin') {
      return res.status(400).json({
        ok: false,
        error: "Admin accounts cannot be created via signup"
      });
    } else {
      return res.status(400).json({ ok: false, error: "Invalid role. Choose 'agency' or 'agent'" });
    }

  } catch (error) {
    console.error('Signup error:', error);
    return res.status(500).json({ ok: false, error: "Internal server error" });
  }
});

// ============================================================================
// SIGNUP AGENCY - Create agency account with optional promo code
// ============================================================================
async function signupAgency(req, res, { email, password, name, agencyName, agentCount, promoCode }) {
  try {
    // Validate agency-specific fields
    if (!agencyName) {
      return res.status(400).json({ ok: false, error: "Agency name required" });
    }

    if (!agentCount || agentCount < 1) {
      return res.status(400).json({ ok: false, error: "Agent count must be at least 1" });
    }

    // Validate promo code if provided
    let validPromo = null;
    if (promoCode) {
      const promoResult = await db.query(
        `SELECT id, code, discount_type, discount_value, max_uses, used_count, valid_until, is_active
         FROM promo_codes
         WHERE code = $1 AND is_active = true`,
        [promoCode.toUpperCase().trim()]
      );

      if (promoResult.rows.length === 0) {
        return res.status(400).json({ ok: false, error: "Invalid promo code" });
      }

      validPromo = promoResult.rows[0];

      // Check if promo code is still valid
      if (validPromo.valid_until && new Date() > new Date(validPromo.valid_until)) {
        return res.status(400).json({ ok: false, error: "Promo code has expired" });
      }

      // Check if max uses reached
      if (validPromo.max_uses && validPromo.used_count >= validPromo.max_uses) {
        return res.status(400).json({ ok: false, error: "Promo code has reached maximum uses" });
      }
    }

    // For pilot: require promo code (remove this check later when payment is integrated)
    if (!validPromo || validPromo.discount_type !== 'free_trial') {
      return res.status(400).json({
        ok: false,
        error: "Agency signup requires a valid promo code during pilot phase. Contact support@proirp.com"
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create organization for the agency
    const orgResult = await db.query(
      `INSERT INTO organizations (name, type, agent_limit)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [agencyName, 'agency', agentCount]
    );

    const organizationId = orgResult.rows[0].id;

    // Create subscription (trial status for pilot)
    const subResult = await db.query(
      `INSERT INTO subscriptions (organization_id, status, agent_count, promo_code_id, trial_ends_at)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [
        organizationId,
        'trial',
        agentCount,
        validPromo?.id || null,
        validPromo?.valid_until || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 90 days trial
      ]
    );

    const subscriptionId = subResult.rows[0].id;

    // Update organization with subscription
    await db.query(
      'UPDATE organizations SET subscription_id = $1 WHERE id = $2',
      [subscriptionId, organizationId]
    );

    // Create agency admin user
    const userResult = await db.query(
      `INSERT INTO users (email, password_hash, name, role, organization_id, promo_code_used, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, email, name, role, created_at`,
      [
        email.toLowerCase().trim(),
        passwordHash,
        name || '',
        'agency',
        organizationId,
        promoCode?.toUpperCase().trim() || null,
        true
      ]
    );

    const user = userResult.rows[0];

    // Increment promo code usage
    if (validPromo) {
      await db.query(
        'UPDATE promo_codes SET used_count = used_count + 1 WHERE id = $1',
        [validPromo.id]
      );
    }

    // Issue token
    const token = issueToken(user);

    // Set httpOnly cookie
    setAuthCookie(res, user, req);

    // Track session
    await createSession(user.id, token, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      deviceInfo: { type: 'web' }
    });

    return res.json({
      ok: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      },
      organization: {
        id: organizationId,
        name: agencyName,
        agentLimit: agentCount
      }
    });

  } catch (error) {
    console.error('Agency signup error:', error);
    return res.status(500).json({ ok: false, error: "Internal server error" });
  }
}

// ============================================================================
// SIGNUP AGENT - Accept invitation and create agent account
// ============================================================================
async function signupAgent(req, res, { email, password, name, invitationToken }) {
  try {
    // Validate invitation token
    if (!invitationToken) {
      return res.status(400).json({
        ok: false,
        error: "Agent accounts require an invitation. Contact your agency administrator."
      });
    }

    // Find valid invitation
    const invResult = await db.query(
      `SELECT id, organization_id, email, invited_by, expires_at, status
       FROM agent_invitations
       WHERE token = $1`,
      [invitationToken]
    );

    if (invResult.rows.length === 0) {
      return res.status(400).json({ ok: false, error: "Invalid invitation token" });
    }

    const invitation = invResult.rows[0];

    // Check if invitation already used
    if (invitation.status !== 'pending') {
      return res.status(400).json({ ok: false, error: "Invitation has already been used" });
    }

    // Check if invitation expired
    if (new Date() > new Date(invitation.expires_at)) {
      await db.query(
        'UPDATE agent_invitations SET status = $1 WHERE id = $2',
        ['expired', invitation.id]
      );
      return res.status(400).json({ ok: false, error: "Invitation has expired" });
    }

    // Email must match invitation email
    if (email.toLowerCase().trim() !== invitation.email.toLowerCase().trim()) {
      return res.status(400).json({
        ok: false,
        error: "Email does not match the invitation. Use the email address that received the invitation."
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create agent user
    const userResult = await db.query(
      `INSERT INTO users (email, password_hash, name, role, organization_id, invitation_token, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, email, name, role, created_at`,
      [
        email.toLowerCase().trim(),
        passwordHash,
        name || '',
        'agent',
        invitation.organization_id,
        invitationToken,
        true
      ]
    );

    const user = userResult.rows[0];

    // Mark invitation as accepted
    await db.query(
      'UPDATE agent_invitations SET status = $1, accepted_at = CURRENT_TIMESTAMP WHERE id = $2',
      ['accepted', invitation.id]
    );

    // Issue token
    const token = issueToken(user);

    // Set httpOnly cookie
    setAuthCookie(res, user, req);

    // Track session
    await createSession(user.id, token, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      deviceInfo: { type: 'web' }
    });

    return res.json({
      ok: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Agent signup error:', error);
    return res.status(500).json({ ok: false, error: "Internal server error" });
  }
}

// ============================================================================
// LOGIN - Authenticate user
// ============================================================================
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ ok: false, error: "Email and password required" });
    }

    // Find user by email
    const result = await db.query(
      `SELECT id, email, password_hash, name, role, is_active
       FROM users
       WHERE email = $1`,
      [email.toLowerCase().trim()]
    );

    const user = result.rows[0];

    // User doesn't exist - return generic error (don't reveal which)
    if (!user) {
      return res.status(401).json({ ok: false, error: "Invalid credentials" });
    }

    // Check if account is active
    if (!user.is_active) {
      return res.status(403).json({ ok: false, error: "Account is deactivated" });
    }

    // Check password
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ ok: false, error: "Invalid credentials" });
    }

    // Update last login time
    await db.query(
      'UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    );

    // Issue token
    const token = issueToken(user);

    // Set httpOnly cookie (more secure than localStorage - prevents XSS theft)
    setAuthCookie(res, user, req);

    // Track session (enforces 1-session-per-user limit)
    await createSession(user.id, token, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      deviceInfo: { type: 'web' }
    });

    return res.json({
      ok: true,
      token, // Still return token for API clients/mobile apps
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ ok: false, error: "Internal server error" });
  }
});

// ============================================================================
// REQUEST PASSWORD RESET - Generate reset code
// ============================================================================
router.post("/request-reset", async (req, res) => {
  try {
    const { email } = req.body || {};

    if (!email) {
      return res.status(400).json({ ok: false, error: "Email required" });
    }

    // Check if user exists
    const userResult = await db.query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase().trim()]
    );

    // Always return success (don't reveal if email exists)
    if (userResult.rows.length === 0) {
      return res.json({ ok: true, message: "If that email exists, a reset code has been sent" });
    }

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Save reset code to database
    await db.query(
      `INSERT INTO password_resets (email, code, expires_at, used)
       VALUES ($1, $2, $3, $4)`,
      [email.toLowerCase().trim(), code, expiresAt, false]
    );

    // TODO: In production, send this code via email using SendGrid/AWS SES
    // HIPAA: Never log email or reset codes, even in development

    return res.json({ ok: true, message: "Reset code sent to your email" });

  } catch (error) {
    console.error('Request reset error:', error);
    return res.status(500).json({ ok: false, error: "Internal server error" });
  }
});

// ============================================================================
// RESET PASSWORD - Verify code and update password
// ============================================================================
router.post("/reset", async (req, res) => {
  try {
    const { email, code, newPassword } = req.body || {};

    if (!email || !code || !newPassword) {
      return res.status(400).json({ ok: false, error: "Email, code, and newPassword required" });
    }

    // Validate new password
    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      return res.status(400).json({ ok: false, error: passwordError });
    }

    // Find valid reset code
    const resetResult = await db.query(
      `SELECT id, expires_at, used
       FROM password_resets
       WHERE email = $1 AND code = $2
       ORDER BY created_at DESC
       LIMIT 1`,
      [email.toLowerCase().trim(), code]
    );

    if (resetResult.rows.length === 0) {
      return res.status(400).json({ ok: false, error: "Invalid reset code" });
    }

    const reset = resetResult.rows[0];

    // Check if already used
    if (reset.used) {
      return res.status(400).json({ ok: false, error: "Reset code already used" });
    }

    // Check if expired
    if (new Date() > new Date(reset.expires_at)) {
      return res.status(400).json({ ok: false, error: "Reset code expired" });
    }

    // Find user
    const userResult = await db.query(
      'SELECT id, email, name, role FROM users WHERE email = $1',
      [email.toLowerCase().trim()]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ ok: false, error: "User not found" });
    }

    const user = userResult.rows[0];

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Update password and mark reset as used (in a transaction for safety)
    await db.transaction(async (client) => {
      await client.query(
        'UPDATE users SET password_hash = $1 WHERE id = $2',
        [passwordHash, user.id]
      );

      await client.query(
        'UPDATE password_resets SET used = true WHERE id = $1',
        [reset.id]
      );
    });

    // Revoke all existing sessions (password reset = force logout everywhere)
    await revokeAllUserSessions(user.id, 'password_reset');

    // Issue new token
    const token = issueToken(user);

    // Set httpOnly cookie
    setAuthCookie(res, user, req);

    // Track new session
    await createSession(user.id, token, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      deviceInfo: { type: 'web' }
    });

    return res.json({
      ok: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Reset password error:', error);
    return res.status(500).json({ ok: false, error: "Internal server error" });
  }
});

// ============================================================================
// GET ME - Get current user info (for checking if token is valid)
// ============================================================================
router.get("/me", async (req, res) => {
  try {
    // req.user is set by the auth middleware in index.js
    if (!req.user || !req.user.id) {
      return res.status(401).json({ ok: false, error: "Not authenticated" });
    }

    // Get fresh user data from database
    const result = await db.query(
      `SELECT id, email, name, role, phone, organization_id, is_active, created_at, last_login_at, assistant_name
       FROM users
       WHERE id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ ok: false, error: "User not found" });
    }

    const user = result.rows[0];

    if (!user.is_active) {
      return res.status(403).json({ ok: false, error: "Account is deactivated" });
    }

    return res.json({
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        phone: user.phone,
        organizationId: user.organization_id,
        createdAt: user.created_at,
        lastLoginAt: user.last_login_at,
        assistantName: user.assistant_name || 'Alex'
      }
    });

  } catch (error) {
    console.error('Get me error:', error);
    return res.status(500).json({ ok: false, error: "Internal server error" });
  }
});

// ============================================================================
// UPDATE ASSISTANT NAME - Update user's AI assistant name
// ============================================================================
router.patch("/update-assistant-name", async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ ok: false, error: "Not authenticated" });
    }

    const { assistantName } = req.body;

    if (!assistantName || assistantName.trim().length === 0) {
      return res.status(400).json({ ok: false, error: "Assistant name is required" });
    }

    if (assistantName.trim().length > 50) {
      return res.status(400).json({ ok: false, error: "Assistant name must be 50 characters or less" });
    }

    // Update user's assistant name
    const result = await db.query(
      `UPDATE users
       SET assistant_name = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING id, assistant_name`,
      [assistantName.trim(), req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ ok: false, error: "User not found" });
    }

    return res.json({
      ok: true,
      message: "Assistant name updated successfully",
      assistantName: result.rows[0].assistant_name
    });

  } catch (error) {
    console.error('Update assistant name error:', error);
    return res.status(500).json({ ok: false, error: "Internal server error" });
  }
});

// ============================================================================
// UPDATE PHONE - Update user's phone number for click-to-call
// ============================================================================
router.patch("/update-phone", async (req, res) => {
  try {
    // req.user is set by the auth middleware in index.js
    if (!req.user || !req.user.id) {
      return res.status(401).json({ ok: false, error: "Not authenticated" });
    }

    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({ ok: false, error: "Phone number is required" });
    }

    // Basic phone validation (allow various formats)
    const phoneClean = phone.trim();
    if (phoneClean.length < 10) {
      return res.status(400).json({ ok: false, error: "Phone number must be at least 10 digits" });
    }

    // Update user's phone number
    const result = await db.query(
      `UPDATE users
       SET phone = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING id, phone`,
      [phoneClean, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ ok: false, error: "User not found" });
    }

    // HIPAA audit log
    try {
      await db.query(
        `INSERT INTO audit_logs (user_id, action, resource_type, details)
         VALUES ($1, $2, $3, $4)`,
        [
          req.user.id,
          'PHONE_UPDATED',
          'user',
          JSON.stringify({ phone: phoneClean })
        ]
      );
    } catch (auditError) {
      console.warn('⚠️  Audit log skipped:', auditError.message);
    }

    return res.json({
      ok: true,
      message: "Phone number updated successfully",
      phone: result.rows[0].phone
    });

  } catch (error) {
    console.error('Update phone error:', error);
    return res.status(500).json({ ok: false, error: "Internal server error" });
  }
});

// ============================================================================
// LOGOUT - Revoke session and clear cookie
// ============================================================================
router.post("/logout", async (req, res) => {
  try {
    // Get token from cookie or header
    const token = req.cookies?.pro_irp_session ||
      (req.headers.authorization?.split(' ')[1]);

    if (token) {
      // Revoke session in database
      await revokeSession(token);
    }

    // Clear the httpOnly cookie
    clearAuthCookie(res, req);

    return res.json({ ok: true, message: "Logged out successfully" });

  } catch (error) {
    console.error('Logout error:', error);
    // Still clear cookie even if session revocation fails
    clearAuthCookie(res, req);
    return res.json({ ok: true, message: "Logged out" });
  }
});

// ============================================================================
// GET SESSIONS - Get all active sessions for current user
// ============================================================================
router.get("/sessions", async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ ok: false, error: "Not authenticated" });
    }

    const result = await getUserSessions(req.user.id);

    return res.json({
      ok: true,
      sessions: result.sessions
    });

  } catch (error) {
    console.error('Get sessions error:', error);
    return res.status(500).json({ ok: false, error: "Internal server error" });
  }
});

// ============================================================================
// REVOKE ALL SESSIONS - Force logout from all devices
// ============================================================================
router.post("/revoke-all-sessions", async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ ok: false, error: "Not authenticated" });
    }

    const result = await revokeAllUserSessions(req.user.id, 'user_request');

    // Clear current session cookie too
    clearAuthCookie(res, req);

    return res.json({
      ok: true,
      message: `Revoked ${result.revokedCount || 0} sessions. Please log in again.`,
      revokedCount: result.revokedCount || 0
    });

  } catch (error) {
    console.error('Revoke all sessions error:', error);
    return res.status(500).json({ ok: false, error: "Internal server error" });
  }
});

module.exports = router;
