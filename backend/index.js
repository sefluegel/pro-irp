const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const Sentry = require("@sentry/node");
require("dotenv").config();
const pkg = require("./package.json");

const app = express();
app.use(helmet());
app.use(express.json());

/** ---- SENTRY ---- */
let sentryReady = false;
const dsn = (process.env.SENTRY_DSN || "").trim();
try {
  if (dsn) { Sentry.init({ dsn, environment: process.env.NODE_ENV || "development" }); sentryReady = true; }
} catch (e) { console.error("Sentry init failed:", e?.message || e); }

/** ---- CORS ---- */
const allow = (process.env.CORS_ORIGINS || "*").split(",").map(s=>s.trim()).filter(Boolean);
app.use(cors({ origin: (origin, cb)=>{
  if (!origin || allow.includes("*") || allow.includes(origin)) return cb(null, true);
  cb(new Error("Not allowed by CORS"));
}}));

// === Routes ===
app.use('/auth', require('./routes/auth'));
app.use('/clients', require('./routes/clients'));
app.use('/comms', require('./routes/comms'));
app.use('/tasks', require('./routes/tasks'));
app.use('/risk', require('./routes/risk'));
app.use('/files', require('./routes/files'));

// === Ops
app.get("/health", (_req,res)=> res.json({ ok: true }));
app.get("/version", (_req,res)=>{
  const sha  = process.env.GIT_SHA || "dev";
  const time = process.env.BUILD_TIME || new Date().toISOString();
  res.json({ name: pkg.name || "pro-irp-api", version: pkg.version || "1.0.0", sha, time });
});
app.get("/sentry-test", (_req, res) => res.json({ sent: !!sentryReady }));
app.get("/debug/sentry", (_req, res) => res.json({ hasEnv: Boolean(dsn), ready: sentryReady }));

const port = process.env.PORT || 8080;
app.listen(port, () => console.log(`API listening on :${port}`));
