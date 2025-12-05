// backend/middleware/security.js - HIPAA-compliant security middleware

const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const db = require('../db');

// ============================================================================
// HTTPS ENFORCEMENT (HIPAA requires encryption in transit)
// ============================================================================

function enforceHttps(req, res, next) {
  // Skip in development
  if (process.env.NODE_ENV !== 'production') {
    return next();
  }

  // Skip HTTPS enforcement on Elastic Beanstalk until SSL is configured
  // ELB health checks and direct instance access won't have x-forwarded-proto
  if (process.env.SKIP_HTTPS_REDIRECT === 'true') {
    return next();
  }

  // Check if request is HTTPS (also check x-forwarded-proto for proxies/load balancers)
  const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https';

  if (!isSecure) {
    // Redirect to HTTPS
    return res.redirect(301, `https://${req.headers.host}${req.url}`);
  }

  next();
}

// ============================================================================
// RATE LIMITING (Prevent brute force attacks)
// ============================================================================

// General API rate limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    ok: false,
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/health' || req.path === '/version';
  }
});

// Strict rate limiter for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: {
    ok: false,
    error: 'Too many login attempts from this IP, please try again after 15 minutes.'
  },
  skipSuccessfulRequests: true // Don't count successful requests
});

// Moderate rate limiter for password reset
const resetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit each IP to 3 password reset requests per hour
  message: {
    ok: false,
    error: 'Too many password reset attempts, please try again later.'
  }
});

// ============================================================================
// HELMET - Security headers (HIPAA requires secure transmission)
// ============================================================================

const helmetConfig = helmet({
  // Content Security Policy
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },

  // HTTP Strict Transport Security (Force HTTPS)
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },

  // Prevent clickjacking
  frameguard: {
    action: 'deny'
  },

  // Disable X-Powered-By header
  hidePoweredBy: true,

  // Prevent MIME type sniffing
  noSniff: true,

  // XSS Protection
  xssFilter: true,

  // Referrer Policy
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin'
  }
});

// ============================================================================
// AUDIT LOGGING (HIPAA Requirement)
// ============================================================================

async function auditLogger(req, res, next) {
  // Capture original send
  const originalSend = res.send;

  // Override send to capture response
  res.send = function(data) {
    res.send = originalSend; // Restore original

    // Log the request after response is sent
    setImmediate(async () => {
      try {
        // Only log authenticated requests to sensitive endpoints
        if (req.user && shouldAuditLog(req)) {
          await db.query(
            `INSERT INTO audit_logs (
              user_id, action, resource_type, details, ip_address, user_agent
            ) VALUES ($1, $2, $3, $4, $5, $6)`,
            [
              req.user.id,
              `${req.method} ${req.path}`,
              getResourceType(req.path),
              JSON.stringify({
                method: req.method,
                path: req.path,
                query: req.query,
                statusCode: res.statusCode
              }),
              req.ip,
              req.get('user-agent')
            ]
          );
        }
      } catch (error) {
        console.error('Audit logging error:', error);
      }
    });

    return res.send(data);
  };

  next();
}

// Determine if request should be audit logged
function shouldAuditLog(req) {
  const sensitiveEndpoints = [
    '/clients',
    '/comms',
    '/uploads',
    '/tasks',
    '/metrics',
    '/auth/me'
  ];

  return sensitiveEndpoints.some(endpoint => req.path.startsWith(endpoint));
}

// Extract resource type from path
function getResourceType(path) {
  if (path.startsWith('/clients')) return 'client';
  if (path.startsWith('/comms')) return 'communication';
  if (path.startsWith('/uploads')) return 'file_upload';
  if (path.startsWith('/tasks')) return 'task';
  if (path.startsWith('/auth')) return 'auth';
  return 'unknown';
}

// ============================================================================
// SESSION VALIDATION (HIPAA requires session management)
// ============================================================================

async function validateSession(req, res, next) {
  // Only validate for authenticated requests
  if (!req.user || !req.user.id) {
    return next();
  }

  try {
    // Get JWT token from header
    const authHeader = req.headers.authorization || '';
    const token = authHeader.split(' ')[1];

    if (!token) {
      return next();
    }

    // Check if session exists and is valid
    const crypto = require('crypto');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const result = await db.query(
      `SELECT id, expires_at, revoked FROM sessions
       WHERE token_hash = $1`,
      [tokenHash]
    );

    if (result.rows.length > 0) {
      const session = result.rows[0];

      // Check if session is revoked
      if (session.revoked) {
        return res.status(401).json({
          ok: false,
          error: 'Session has been revoked. Please login again.'
        });
      }

      // Check if session is expired
      if (new Date(session.expires_at) < new Date()) {
        // Mark as revoked
        await db.query(
          'UPDATE sessions SET revoked = true, revoked_at = CURRENT_TIMESTAMP WHERE id = $1',
          [session.id]
        );

        return res.status(401).json({
          ok: false,
          error: 'Session expired. Please login again.'
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
    next(); // Continue even if validation fails (graceful degradation)
  }
}

// ============================================================================
// INACTIVITY TIMEOUT (HIPAA Best Practice)
// ============================================================================

async function checkInactivityTimeout(req, res, next) {
  if (!req.user || !req.user.id) {
    return next();
  }

  try {
    // Get inactivity timeout setting (default 30 minutes)
    const settingsResult = await db.query(
      `SELECT setting_value FROM compliance_settings
       WHERE setting_key = 'session_timeout_minutes'`
    );

    const timeoutMinutes = parseInt(settingsResult.rows[0]?.setting_value || '30');
    const timeoutMs = timeoutMinutes * 60 * 1000;

    // Check last activity
    const authHeader = req.headers.authorization || '';
    const token = authHeader.split(' ')[1];

    if (token) {
      const crypto = require('crypto');
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

      const result = await db.query(
        'SELECT last_activity_at FROM sessions WHERE token_hash = $1 AND revoked = false',
        [tokenHash]
      );

      if (result.rows.length > 0) {
        const lastActivity = new Date(result.rows[0].last_activity_at);
        const now = new Date();
        const inactiveTime = now - lastActivity;

        if (inactiveTime > timeoutMs) {
          // Session timed out due to inactivity
          await db.query(
            'UPDATE sessions SET revoked = true, revoked_at = CURRENT_TIMESTAMP WHERE token_hash = $1',
            [tokenHash]
          );

          return res.status(401).json({
            ok: false,
            error: `Session timed out due to ${timeoutMinutes} minutes of inactivity. Please login again.`
          });
        }
      }
    }

    next();

  } catch (error) {
    console.error('Inactivity check error:', error);
    next();
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  enforceHttps,
  apiLimiter,
  authLimiter,
  resetLimiter,
  helmetConfig,
  auditLogger,
  validateSession,
  checkInactivityTimeout
};
