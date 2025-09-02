const express = require("express");
const cors = require("cors");
const Sentry = require("@sentry/node");
const pkg = require("./package.json");

const app = express();

/** ---- SENTRY ---- */
let sentryReady = false;
const dsn = (process.env.SENTRY_DSN || "").trim();
try {
  if (dsn) { Sentry.init({ dsn, environment: "production" }); sentryReady = true; }
} catch (e) { console.error("Sentry init failed:", e?.message || e); }

/** ---- CORS (allowlist from env) ----
 * CORS_ORIGINS example:
 * https://proirp.com,https://www.proirp.com,https://proirp.netlify.app,http://localhost:3000
 */
const allowlist = (process.env.CORS_ORIGINS || "")
  .split(",").map(s => s.trim()).filter(Boolean);

const corsOptions = {
  origin(origin, cb) {
    if (!origin) return cb(null, true); // allow curl/postman
    const ok = allowlist.includes(origin);
    cb(ok ? null : new Error("Not allowed by CORS"), ok);
  },
  credentials: true,
};
app.use(cors(corsOptions));

/** ---- SIMULATOR ----
 * Toggle API health behavior globally via:
 *   GET /__simulate?state=up|degraded|down&key=YOUR_KEY
 * Set SIM_KEY in Railway (use any string). If missing, defaults to "dev".
 */
const SIM_KEY = (process.env.SIM_KEY || "dev").trim();
let STATE = "up"; // up | degraded | down

app.get("/__simulate", (req, res) => {
  const { state = "", key = "" } = req.query;
  if (key !== SIM_KEY) return res.status(401).json({ ok: false, error: "unauthorized" });
  if (!["up", "degraded", "down"].includes(state)) return res.status(400).json({ ok: false, error: "bad-state" });
  STATE = state;
  return res.json({ ok: true, state: STATE });
});

/** ---- ENDPOINTS ---- */
app.get("/health", (_req, res) => {
  if (STATE === "down") return res.status(503).json({ ok: false });
  if (STATE === "degraded") return setTimeout(() => res.status(200).json({ ok: true, degraded: true }), 2000);
  return res.status(200).json({ ok: true });
});

app.get("/version", (_req, res) => {
  const sha  = process.env.GIT_SHA || "dev";
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
