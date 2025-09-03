const express = require("express");
const cors = require("cors");
const Sentry = require("@sentry/node");
const { nodeProfilingIntegration } = require("@sentry/profiling-node");
const pkg = require("./package.json");

const app = express();

// Sentry (safe if DSN missing)
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    integrations: [nodeProfilingIntegration()],
    tracesSampleRate: 1.0,
    environment: "production",
  });
  app.use(Sentry.Handlers.requestHandler());
  app.use(Sentry.Handlers.tracingHandler());
}

// CORS: allow all for Day 3
app.use(cors({ origin: true, credentials: true }));

app.get("/health", (_req, res) => res.status(200).json({ ok: true }));

app.get("/version", (_req, res) => {
  const sha = process.env.GIT_SHA || "dev";
  const time = process.env.BUILD_TIME || new Date().toISOString();
  res.json({ name: pkg.name || "pro-irp-api", version: pkg.version || "1.0.0", sha, time });
});

// Test event
app.get("/sentry-test", (_req, res) => {
  if (process.env.SENTRY_DSN) Sentry.captureMessage("Day3 API test event");
  res.json({ sent: true });
});

if (process.env.SENTRY_DSN) app.use(Sentry.Handlers.errorHandler());

const port = process.env.PORT || 8080;
app.listen(port, () => console.log(`API listening on :${port}`));
