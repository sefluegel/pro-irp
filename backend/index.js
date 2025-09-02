const express = require("express");
const cors = require("cors");
const Sentry = require("@sentry/node");
const pkg = require("./package.json");

const app = express();

// ----- SENTRY (safe init) -----
let sentryReady = false;
const dsn = (process.env.SENTRY_DSN || "").trim();
try {
  if (dsn) {
    Sentry.init({ dsn, environment: "production" });
    sentryReady = true;
    console.log("Sentry initialized ");
  } else {
    console.log("Sentry DSN not set; skipping.");
  }
} catch (e) {
  console.error("Sentry init failed :", e?.message || e);
}

// ----- CORS (open for Day 3) -----
app.use(cors({ origin: true, credentials: true }));

// ----- ENDPOINTS -----
app.get("/health", (_req, res) => res.status(200).json({ ok: true }));

app.get("/version", (_req, res) => {
  const sha = process.env.GIT_SHA || "dev";
  const time = process.env.BUILD_TIME || new Date().toISOString();
  res.json({ name: pkg.name || "pro-irp-api", version: pkg.version || "1.0.0", sha, time });
});

// Test message: /sentry-test?level=error|warning|info  (default: info)
app.get("/sentry-test", (req, res) => {
  const level = (req.query.level || "info").toString();
  if (sentryReady) {
    // capture message with the chosen level
    Sentry.captureMessage("Day3 API test event", level);
    return res.json({ sent: true, level });
  }
  return res.json({ sent: false, reason: "sentry-not-initialized" });
});

// Test exception: always captures an error-level exception
app.get("/sentry-error", (_req, res) => {
  if (sentryReady) {
    try { throw new Error("Day3 API thrown error"); }
    catch (e) { Sentry.captureException(e); }
    return res.status(500).json({ ok: false, sent: true });
  }
  return res.status(500).json({ ok: false, sent: false });
});

// Debug helper (temporary)
app.get("/debug/sentry", (_req, res) => {
  res.json({ hasEnv: Boolean(dsn), len: dsn.length, ready: sentryReady });
});

// ----- START -----
const port = process.env.PORT || 8080;
app.listen(port, () => console.log(`API listening on :${port}`));
