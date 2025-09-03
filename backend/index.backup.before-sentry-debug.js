const express = require("express");
const cors = require("cors");
const Sentry = require("@sentry/node");
const pkg = require("./package.json");

const app = express();

// ---- SENTRY (safe, cannot crash app) ----
let sentryReady = false;
try {
  if (process.env.SENTRY_DSN) {
    Sentry.init({ dsn: process.env.SENTRY_DSN, environment: "production" });
    sentryReady = true;
    console.log("Sentry initialized.");
  } else {
    console.log("Sentry DSN not set; skipping.");
  }
} catch (e) {
  console.error("Sentry init failed:", e?.message || e);
}

// ---- CORS (open for Day 3) ----
app.use(cors({ origin: true, credentials: true }));

// ---- ENDPOINTS ----
app.get("/health", (_req, res) => res.status(200).json({ ok: true }));

app.get("/version", (_req, res) => {
  const sha = process.env.GIT_SHA || "dev";
  const time = process.env.BUILD_TIME || new Date().toISOString();
  res.json({ name: pkg.name || "pro-irp-api", version: pkg.version || "1.0.0", sha, time });
});

// send ONE test event without touching middleware
app.get("/sentry-test", (_req, res) => {
  if (sentryReady) {
    Sentry.captureMessage("Day3 API test event");
    return res.json({ sent: true });
  }
  return res.json({ sent: false, reason: "sentry-not-initialized" });
});

// ---- START ----
const port = process.env.PORT || 8080;
app.listen(port, () => console.log(`API listening on :${port}`));
