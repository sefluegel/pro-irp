// backend/middleware/session-limits.js - Session Limit Enforcement
// Limits concurrent sessions per user (HIPAA security best practice)

const crypto = require('crypto');
const db = require('../db');

// Configuration
const MAX_SESSIONS_PER_USER = parseInt(process.env.MAX_SESSIONS_PER_USER || '1');
const SESSION_LIMIT_ENABLED = process.env.ENABLE_SESSION_LIMITS !== 'false';

/**
 * Create a new session and revoke oldest sessions if over limit
 * Call this when a user logs in
 */
async function createSession(userId, token, metadata = {}) {
  if (!SESSION_LIMIT_ENABLED) {
    return { ok: true, message: 'Session limits disabled' };
  }

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours

  try {
    // Start transaction
    await db.query('BEGIN');

    // Count active sessions for this user
    const countResult = await db.query(
      `SELECT COUNT(*) as count FROM sessions
       WHERE user_id = $1 AND revoked = false AND expires_at > NOW()`,
      [userId]
    );

    const activeCount = parseInt(countResult.rows[0].count);

    // If at or over limit, revoke oldest sessions
    if (activeCount >= MAX_SESSIONS_PER_USER) {
      const sessionsToRevoke = activeCount - MAX_SESSIONS_PER_USER + 1;

      await db.query(
        `UPDATE sessions
         SET revoked = true, revoked_at = CURRENT_TIMESTAMP, revoke_reason = 'new_session_limit'
         WHERE id IN (
           SELECT id FROM sessions
           WHERE user_id = $1 AND revoked = false
           ORDER BY created_at ASC
           LIMIT $2
         )`,
        [userId, sessionsToRevoke]
      );
    }

    // Create new session
    await db.query(
      `INSERT INTO sessions (user_id, token_hash, expires_at, ip_address, user_agent, device_info)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        userId,
        tokenHash,
        expiresAt,
        metadata.ip || null,
        metadata.userAgent || null,
        metadata.deviceInfo ? JSON.stringify(metadata.deviceInfo) : null
      ]
    );

    await db.query('COMMIT');

    return {
      ok: true,
      sessionsRevoked: activeCount >= MAX_SESSIONS_PER_USER ? activeCount - MAX_SESSIONS_PER_USER + 1 : 0
    };

  } catch (error) {
    await db.query('ROLLBACK');
    console.error('Create session error:', error);
    // Don't fail login if session tracking fails
    return { ok: true, error: error.message };
  }
}

/**
 * Revoke a specific session (logout)
 */
async function revokeSession(token) {
  if (!SESSION_LIMIT_ENABLED) {
    return { ok: true };
  }

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  try {
    await db.query(
      `UPDATE sessions
       SET revoked = true, revoked_at = CURRENT_TIMESTAMP, revoke_reason = 'user_logout'
       WHERE token_hash = $1`,
      [tokenHash]
    );
    return { ok: true };
  } catch (error) {
    console.error('Revoke session error:', error);
    return { ok: false, error: error.message };
  }
}

/**
 * Revoke all sessions for a user (force logout everywhere)
 */
async function revokeAllUserSessions(userId, reason = 'admin_revoke') {
  if (!SESSION_LIMIT_ENABLED) {
    return { ok: true };
  }

  try {
    const result = await db.query(
      `UPDATE sessions
       SET revoked = true, revoked_at = CURRENT_TIMESTAMP, revoke_reason = $2
       WHERE user_id = $1 AND revoked = false
       RETURNING id`,
      [userId, reason]
    );
    return { ok: true, revokedCount: result.rowCount };
  } catch (error) {
    console.error('Revoke all sessions error:', error);
    return { ok: false, error: error.message };
  }
}

/**
 * Get active sessions for a user (for settings page)
 */
async function getUserSessions(userId) {
  if (!SESSION_LIMIT_ENABLED) {
    return { ok: true, sessions: [] };
  }

  try {
    const result = await db.query(
      `SELECT id, ip_address, user_agent, device_info, created_at, last_activity_at
       FROM sessions
       WHERE user_id = $1 AND revoked = false AND expires_at > NOW()
       ORDER BY last_activity_at DESC`,
      [userId]
    );

    return {
      ok: true,
      sessions: result.rows.map(row => ({
        id: row.id,
        ip: row.ip_address,
        userAgent: row.user_agent,
        device: row.device_info ? JSON.parse(row.device_info) : null,
        createdAt: row.created_at,
        lastActivity: row.last_activity_at
      }))
    };
  } catch (error) {
    console.error('Get user sessions error:', error);
    return { ok: false, error: error.message, sessions: [] };
  }
}

/**
 * Middleware to check if current session is still valid
 */
async function validateSessionMiddleware(req, res, next) {
  if (!SESSION_LIMIT_ENABLED || !req.user) {
    return next();
  }

  const auth = req.headers.authorization || '';
  const [, token] = auth.split(' ');

  if (!token) {
    return next();
  }

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  try {
    const result = await db.query(
      `SELECT id, revoked, expires_at FROM sessions WHERE token_hash = $1`,
      [tokenHash]
    );

    if (result.rows.length > 0) {
      const session = result.rows[0];

      if (session.revoked) {
        return res.status(401).json({
          ok: false,
          error: 'Session has been revoked. You may have logged in from another device.',
          code: 'SESSION_REVOKED'
        });
      }

      if (new Date(session.expires_at) < new Date()) {
        return res.status(401).json({
          ok: false,
          error: 'Session expired. Please login again.',
          code: 'SESSION_EXPIRED'
        });
      }

      // Update last activity
      await db.query(
        'UPDATE sessions SET last_activity_at = CURRENT_TIMESTAMP WHERE id = $1',
        [session.id]
      );
    }

    next();
  } catch (error) {
    console.error('Session validation error:', error);
    // Don't block request if validation fails
    next();
  }
}

module.exports = {
  MAX_SESSIONS_PER_USER,
  SESSION_LIMIT_ENABLED,
  createSession,
  revokeSession,
  revokeAllUserSessions,
  getUserSessions,
  validateSessionMiddleware
};
