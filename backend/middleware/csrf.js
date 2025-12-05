// backend/middleware/csrf.js - CSRF Protection Middleware
// Generates and validates CSRF tokens to prevent cross-site request forgery

const crypto = require('crypto');

// In-memory store for CSRF tokens (use Redis in production for multi-instance)
const csrfTokens = new Map();

// Token expiration time (1 hour)
const TOKEN_EXPIRY_MS = 60 * 60 * 1000;

/**
 * Generate a new CSRF token for a session
 */
function generateCsrfToken(sessionId) {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = Date.now() + TOKEN_EXPIRY_MS;

  csrfTokens.set(token, {
    sessionId,
    expiresAt
  });

  // Clean up expired tokens periodically
  cleanupExpiredTokens();

  return token;
}

/**
 * Validate a CSRF token
 */
function validateCsrfToken(token, sessionId) {
  if (!token) return false;

  const tokenData = csrfTokens.get(token);
  if (!tokenData) return false;

  // Check if expired
  if (Date.now() > tokenData.expiresAt) {
    csrfTokens.delete(token);
    return false;
  }

  // Check if session matches
  if (tokenData.sessionId !== sessionId) return false;

  return true;
}

/**
 * Clean up expired tokens
 */
function cleanupExpiredTokens() {
  const now = Date.now();
  for (const [token, data] of csrfTokens.entries()) {
    if (now > data.expiresAt) {
      csrfTokens.delete(token);
    }
  }
}

/**
 * Middleware to generate CSRF token
 * Adds token to response header and makes it available via endpoint
 */
function csrfTokenGenerator(req, res, next) {
  // Generate session ID from user ID or create anonymous session
  const sessionId = req.user?.id || req.ip || 'anonymous';

  // Generate token
  const token = generateCsrfToken(sessionId);

  // Set token in response header
  res.setHeader('X-CSRF-Token', token);

  // Attach to request for use in response
  req.csrfToken = token;

  next();
}

/**
 * Middleware to validate CSRF token on state-changing requests
 */
function csrfProtection(req, res, next) {
  // Skip for safe methods (GET, HEAD, OPTIONS)
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(req.method)) {
    return next();
  }

  // Skip for API endpoints that use Bearer token auth (already protected)
  // These are protected by the auth token itself
  if (req.headers.authorization?.startsWith('Bearer ')) {
    return next();
  }

  // Skip for auth routes (login, signup, password reset) - they don't have tokens yet
  const authRoutes = ['/auth/login', '/auth/signup', '/auth/forgot-password', '/auth/reset-password'];
  if (authRoutes.some(route => req.path.startsWith(route))) {
    return next();
  }

  // Get token from header or body
  const token = req.headers['x-csrf-token'] || req.body?._csrf;
  const sessionId = req.user?.id || req.ip || 'anonymous';

  if (!validateCsrfToken(token, sessionId)) {
    return res.status(403).json({
      ok: false,
      error: 'Invalid or missing CSRF token'
    });
  }

  next();
}

/**
 * Endpoint to get a fresh CSRF token
 */
function getCsrfTokenEndpoint(req, res) {
  const sessionId = req.user?.id || req.ip || 'anonymous';
  const token = generateCsrfToken(sessionId);

  res.json({
    ok: true,
    csrfToken: token
  });
}

module.exports = {
  generateCsrfToken,
  validateCsrfToken,
  csrfTokenGenerator,
  csrfProtection,
  getCsrfTokenEndpoint
};
