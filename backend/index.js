const express = require("express");
const cors = require("cors");
const Sentry = require("@sentry/node");
const pkg = require("./package.json");

const app = express();

/** ---- SENTRY (safe) ---- */
let sentryReady = false;
const dsn = (process.env.SENTRY_DSN || "").trim();
try {
  if (dsn) { Sentry.init({ dsn, environment: "production" }); sentryReady = true; }
} catch (e) { console.error("Sentry init failed:", e?.message || e); }

/** ---- CORS (allowlist via env) ----
 * Set CORS_ORIGINS in Railway like:
 * https://proirp.com,https://www.proirp.com,https://proirp.netlify.app,http://localhost:3000
 */
const allowlist = (process.env.CORS_ORIGINS || "")
  .split(",").map(s => s.trim()).filter(Boolean);

const corsOptions = {
  origin(origin, cb) {
    if (!origin) return cb(null, true);            // allow curl/postman/direct hits
    const ok = allowlist.includes(origin);
    cb(ok ? null : new Error("Not allowed by CORS"), ok);
  },
  credentials: true,
};
app.use(cors(corsOptions));

/** ---- Endpoints ---- */
app.get("/health", (_req, res) => res.status(200).json({ ok: true }));
app.get("/version", (_req, res) => {
  const sha = process.env.GIT_SHA || "dev";
  const time = process.env.BUILD_TIME || new Date().toISOString();
  res.json({ name: pkg.name || "pro-irp-api", version: pkg.version || "1.0.0", sha, time });
});
app.get("/sentry-test", (_req, res) => {
  if (sentryReady) { Sentry.captureMessage("Day3 API test event"); return res.json({ sent: true }); }
  return res.json({ sent: false, reason: "sentry-not-initialized" });
});
app.get("/debug/sentry", (_req, res) => res.json({ hasEnv: Boolean(dsn), ready: sentryReady }));

const port = process.env.PORT || 8080;
app.listen(port, () => console.log(`API listening on :${port}`));
