// backend/index.js - HIPAA-compliant backend with security middleware
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");

// Security middleware
const {
  enforceHttps,
  apiLimiter,
  authLimiter,
  resetLimiter,
  helmetConfig,
  auditLogger,
  validateSession,
  checkInactivityTimeout
} = require("./middleware/security");

// CSRF Protection
const { csrfProtection, getCsrfTokenEndpoint } = require("./middleware/csrf");

// Cookie-based Authentication (more secure than localStorage)
const { cookieAuthMiddleware, refreshCookieIfNeeded } = require("./middleware/cookies");

// Session Limits (1 session per user - HIPAA best practice)
const { validateSessionMiddleware } = require("./middleware/session-limits");

// Feature Usage Tracking (for founder pilot metrics)
const { featureTrackingMiddleware } = require("./middleware/feature-tracking");

// ---- App init --------------------------------------------------------------
const app = express();
const PORT = process.env.PORT || 8080;

// Security: JWT_SECRET must be set in environment - no fallback allowed
if (!process.env.JWT_SECRET) {
  console.error("CRITICAL: JWT_SECRET environment variable is not set!");
  console.error("Please set JWT_SECRET in your .env file before starting the server.");
  process.exit(1);
}
const JWT_SECRET = process.env.JWT_SECRET;

// ---- HTTPS Enforcement (Production Only) -----------------------------------
app.use(enforceHttps);

// ---- HIPAA Security Headers (Helmet) ---------------------------------------
app.use(helmetConfig);

// ---- CORS Configuration ----------------------------------------------------
const corsOptions = {
  origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true, // Required for cookies to work cross-origin
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
  exposedHeaders: ['RateLimit-Limit', 'RateLimit-Remaining', 'RateLimit-Reset', 'X-CSRF-Token']
};
app.use(cors(corsOptions));

// ---- Body Parsers ----------------------------------------------------------
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));

// ---- Cookie Parser (for httpOnly cookie auth) ------------------------------
app.use(cookieParser());

// ---- Global Rate Limiting (HIPAA Security) ---------------------------------
app.use(apiLimiter);

// ---- Cookie-based Authentication (supports both cookie and Bearer token) ---
// This replaces the old Bearer-only auth shim
// Cookie auth is more secure (XSS-proof) while still supporting API clients
app.use(cookieAuthMiddleware);

// ---- Refresh Cookie if Near Expiration -------------------------------------
// Extends session if user is actively using the app
app.use(refreshCookieIfNeeded);

// ---- HIPAA Session Validation & Inactivity Timeout ------------------------
app.use(validateSession);
app.use(checkInactivityTimeout);

// ---- Session Limit Validation (1 session per user) ------------------------
// Checks if current session has been revoked (e.g., by login from another device)
app.use(validateSessionMiddleware);

// ---- CSRF Protection -------------------------------------------------------
// Validates CSRF tokens on state-changing requests (POST, PUT, DELETE, PATCH)
// Note: Skipped for Bearer token requests (API clients handle their own security)
app.use(csrfProtection);

// ---- HIPAA Audit Logging ---------------------------------------------------
app.use(auditLogger);

// ---- Feature Usage Tracking ------------------------------------------------
// Tracks module usage for founder pilot metrics
app.use(featureTrackingMiddleware);

// ---- Health/version --------------------------------------------------------
app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "pro-irp-backend", status: "UP", time: new Date().toISOString() });
});

app.get("/version", (_req, res) => {
  res.json({
    ok: true,
    name: "pro-irp-backend",
    version: process.env.APP_VERSION || "0.0.0",
    commit: process.env.COMMIT_SHA || null,
    buildTime: process.env.BUILD_TIME || null,
  });
});

// ---- CSRF Token Endpoint ---------------------------------------------------
// Frontend can call this to get a fresh CSRF token
app.get("/csrf-token", getCsrfTokenEndpoint);

// ---- Safe router loader using require.resolve ------------------------------
function mountIfExists(mountPath, relFile) {
  try {
    const resolved = require.resolve(path.join(__dirname, relFile));
    const router = require(resolved);
    app.use(mountPath, router);
    console.log(`[router] mounted ${mountPath} -> ${relFile}`);
    return true;
  } catch (e) {
    const reason = e && e.code === "MODULE_NOT_FOUND" ? "missing file" : `load error: ${e.message}`;
    console.warn(`[router] skipped ${mountPath} (${reason}): ${relFile}`);
    return false;
  }
}

// ---- Mount routers with appropriate rate limiting --------------------------
// Auth routes get stricter rate limiting to prevent brute force
if (mountIfExists("/auth", "./routes/auth")) {
  app.use("/auth/login", authLimiter);
  app.use("/auth/signup", authLimiter);
  app.use("/auth/request-reset", resetLimiter);
  app.use("/auth/reset", resetLimiter);
}

// Other routes use standard rate limiting (already applied globally)
mountIfExists("/clients", "./routes/clients");
mountIfExists("/comms", "./routes/comms");
mountIfExists("/uploads", "./routes/uploads");
mountIfExists("/tasks", "./routes/tasks");
mountIfExists("/metrics", "./routes/metrics");
mountIfExists("/calendar", "./routes/calendar");
mountIfExists("/calls", "./routes/calls");
mountIfExists("/bluebutton", "./routes/bluebutton");
mountIfExists("/churn", "./routes/churn");
mountIfExists("/risk", "./routes/risk");
mountIfExists("/enrollments", "./routes/enrollments");

// Churn Prediction Model routes
mountIfExists("/churn-prediction", "./routes/churn-prediction");
mountIfExists("/founder-analytics", "./routes/founder-analytics");

// Pilot Metrics routes (comprehensive founder dashboard)
mountIfExists("/pilot-metrics", "./routes/pilot-metrics");

// AEP Wizard routes
mountIfExists("/aep", "./routes/aep");

// OEP Retention Hub routes
mountIfExists("/oep", "./routes/oep");

// CRM Integration routes (Go High Level, Salesforce)
mountIfExists("/crm", "./routes/crm");

// ---- Static (optional) -----------------------------------------------------
app.use("/public", express.static(path.join(__dirname, "public"), { maxAge: "1h", fallthrough: true }));

// ---- 404 & error handlers --------------------------------------------------
app.use((req, res) => res.status(404).json({ ok: false, error: "Not Found", path: req.path }));
app.use((err, _req, res, _next) => {
  console.error("[server-error]", err);
  res.status(500).json({ ok: false, error: "Internal Server Error" });
});

// ---- Start server ----------------------------------------------------------
app.listen(PORT, () => {
  console.log(`PRO IRP backend running on http://localhost:${PORT}`);
});
