// backend/middleware/cookies.js - Secure httpOnly Cookie Authentication
// More secure than localStorage - prevents XSS token theft

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
const COOKIE_NAME = 'pro_irp_session';
const TOKEN_TTL_SEC = 60 * 60 * 2; // 2 hours (HIPAA compliant)

/**
 * Cookie configuration for security
 */
function getCookieOptions(req) {
  const isProduction = process.env.NODE_ENV === 'production';

  return {
    httpOnly: true,          // Not accessible via JavaScript (XSS protection)
    secure: isProduction,    // HTTPS only in production
    sameSite: 'strict',      // CSRF protection
    maxAge: TOKEN_TTL_SEC * 1000, // Convert to milliseconds
    path: '/',
    domain: isProduction ? process.env.COOKIE_DOMAIN : undefined
  };
}

/**
 * Set authentication cookie after login
 */
function setAuthCookie(res, user, req) {
  const payload = {
    id: user.id,
    email: user.email,
    name: user.name || null,
    role: user.role || 'agent'
  };

  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_TTL_SEC });

  res.cookie(COOKIE_NAME, token, getCookieOptions(req));

  return token;
}

/**
 * Clear authentication cookie on logout
 */
function clearAuthCookie(res, req) {
  res.clearCookie(COOKIE_NAME, {
    ...getCookieOptions(req),
    maxAge: 0
  });
}

/**
 * Middleware to extract user from cookie OR Authorization header
 * Supports both methods for backward compatibility
 */
function cookieAuthMiddleware(req, res, next) {
  try {
    let token = null;

    // First try cookie
    if (req.cookies && req.cookies[COOKIE_NAME]) {
      token = req.cookies[COOKIE_NAME];
    }

    // Fall back to Authorization header (for API clients, mobile apps)
    if (!token) {
      const auth = req.headers.authorization || '';
      const [, headerToken] = auth.split(' ');
      token = headerToken;
    }

    if (token) {
      const payload = jwt.verify(token, JWT_SECRET);
      req.user = {
        id: payload.id || payload.sub || payload.userId || null,
        email: payload.email || null,
        name: payload.name || null,
        role: payload.role || 'agent',
      };
    }
  } catch {
    req.user = null;
  }

  next();
}

/**
 * Refresh cookie if it's getting close to expiration
 * Call this on authenticated requests to extend session
 */
function refreshCookieIfNeeded(req, res, next) {
  if (!req.user || !req.cookies || !req.cookies[COOKIE_NAME]) {
    return next();
  }

  try {
    const token = req.cookies[COOKIE_NAME];
    const decoded = jwt.decode(token);

    if (decoded && decoded.exp) {
      const expiresIn = decoded.exp * 1000 - Date.now();
      const halfLife = (TOKEN_TTL_SEC * 1000) / 2;

      // If less than half the TTL remaining, issue new cookie
      if (expiresIn < halfLife) {
        setAuthCookie(res, req.user, req);
      }
    }
  } catch {
    // Ignore errors, don't refresh
  }

  next();
}

module.exports = {
  COOKIE_NAME,
  getCookieOptions,
  setAuthCookie,
  clearAuthCookie,
  cookieAuthMiddleware,
  refreshCookieIfNeeded
};
