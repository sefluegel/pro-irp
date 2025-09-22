// backend/index.js (complete, clean, and ready)
const express = require("express");
const cors = require("cors");
const Sentry = require("@sentry/node");
const crypto = require("crypto");
const pkg = require("./package.json");

const app = express();

/** ── SENTRY ─────────────────────────────────────────────────────────── */
let sentryReady = false;
const dsn = (process.env.SENTRY_DSN || "").trim();
try {
  if (dsn) {
    Sentry.init({ dsn, environment: process.env.NODE_ENV || "development" });
    sentryReady = true;
  }
} catch (e) {
  console.error("Sentry init failed:", e?.message || e);
}

/** ── CORS (allowlist via env) ─────────────────────────────────────────
 * CORS_ORIGINS example:
 * https://proirp.com,https://www.proirp.com,https://proirp.netlify.app,http://localhost:3000
 */
const allowlist = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);

const corsOptions = {
  origin(origin, cb) {
    // allow tools like curl/postman (no origin)
    if (!origin) return cb(null, true);
    const ok = allowlist.includes(origin);
    cb(ok ? null : new Error("Not allowed by CORS"), ok);
  },
  credentials: true,
};
app.use(cors({ origin: true, credentials: true }));

/** ── BODY PARSING (VERY IMPORTANT) ──────────────────────────────────── */
app.use(express.json()); // lets us read JSON bodies: req.body

/** ── OUTAGE SIMULATOR (dev / demo) ────────────────────────────────────
 * Toggle API health via:
 *   GET /__simulate?state=up|degraded|down&key=YOUR_KEY
 * Set SIM_KEY env var (defaults to "dev").
 */
const SIM_KEY = (process.env.SIM_KEY || "dev").trim();
let STATE = "up"; // "up" | "degraded" | "down"

app.get("/__simulate", (req, res) => {
  const { state = "", key = "" } = req.query;
  if (key !== SIM_KEY) return res.status(401).json({ ok: false, error: "unauthorized" });
  if (!["up", "degraded", "down"].includes(state))
    return res.status(400).json({ ok: false, error: "bad-state" });
  STATE = state;
  return res.json({ ok: true, state: STATE });
});

/** ── DEMO CLIENT STORE (in-memory; replace with DB later) ───────────── */
const clients = [
  { id: "1", firstName: "Jane", lastName: "Doe",   phone: "555-111-2222", email: "jane@example.com", notes: "Demo client", createdAt: "2025-09-01T12:00:00Z" },
  { id: "2", firstName: "John", lastName: "Smith", phone: "555-222-3333", email: "john@example.com", notes: "Demo client", createdAt: "2025-09-01T12:05:00Z" },
  { id: "3", firstName: "Ava",  lastName: "Brown", phone: "555-333-4444", email: "ava@example.com",  notes: "Demo client", createdAt: "2025-09-01T12:10:00Z" },
  { id: "4", firstName: "Liam", lastName: "Lee",   phone: "555-444-5555", email: "liam@example.com", notes: "Demo client", createdAt: "2025-09-01T12:15:00Z" },
];

/** ── ENDPOINTS ──────────────────────────────────────────────────────── */

// Health
app.get("/health", (_req, res) => {
  if (STATE === "down")    return res.status(503).json({ ok: false });
  if (STATE === "degraded") return setTimeout(() => res.status(200).json({ ok: true, degraded: true }), 2000);
  return res.status(200).json({ ok: true });
});

// Version/build info
app.get("/version", (_req, res) => {
  const sha  = process.env.GIT_SHA || "dev";
  const time = process.env.BUILD_TIME || new Date().toISOString();
  res.json({ name: pkg.name || "pro-irp-api", version: pkg.version || "1.0.0", sha, time });
});

// Sentry test + debug
app.get("/sentry-test", (_req, res) => {
  if (sentryReady) { Sentry.captureMessage("API test event"); return res.json({ sent: true }); }
  return res.json({ sent: false, reason: "sentry-not-initialized" });
});
app.get("/debug/sentry", (_req, res) => res.json({ hasEnv: Boolean(dsn), ready: sentryReady }));

// ---- Clients: list
app.get("/clients", (_req, res) => {
  res.json({ data: clients });
});

// ---- Clients: create
app.post("/clients", (req, res) => {
  const { firstName, lastName, email, phone, notes } = req.body || {};

  if (!firstName || !lastName) {
    return res.status(400).json({ error: "firstName and lastName are required." });
  }

  const id = crypto.randomUUID ? crypto.randomUUID() : String(Date.now());
  const createdAt = new Date().toISOString();

  const client = {
    id,
    firstName: String(firstName).trim(),
    lastName:  String(lastName).trim(),
    email:     email ? String(email).trim() : "",
    phone:     phone ? String(phone).trim() : "",
    notes:     notes ? String(notes).trim() : "",
    createdAt,
  };

  clients.push(client);
  console.log("Added client:", client);
  return res.status(201).json({ data: client });
});

/** ── START SERVER ───────────────────────────────────────────────────── */
const port = process.env.PORT || 8080; // you were already using 8080
app.listen(port, () => console.log(`API listening on :${port}`));
