// backend/index.js
const express = require('express');
const cors = require('cors');
const Sentry = require('@sentry/node');
const { nodeProfilingIntegration } = require('@sentry/profiling-node');
const pkg = require('./package.json');

const app = express();

/** ---------------- SENTRY (optional, safe if DSN missing) ---------------- */
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    integrations: [nodeProfilingIntegration()],
    tracesSampleRate: 1.0,
    profilesSampleRate: 1.0,
    environment: 'production',
  });
  app.use(Sentry.Handlers.requestHandler());
  app.use(Sentry.Handlers.tracingHandler());
}

/** ---------------- CORS ---------------- */
const allowed = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, cb) {
    // allow same-origin / curl / server-side (no origin) OR exact matches in allowlist
    if (!origin || allowed.includes(origin)) return cb(null, true);
    return cb(new Error(`CORS blocked: ${origin}`));
  },
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
  credentials: true,
}));

// clean OPTIONS handling
app.options('*', cors());

/** ---------------- BASIC ENDPOINTS ---------------- */
app.get('/health', (_req, res) => {
  res.status(200).json({ ok: true });
});

app.get('/version', (_req, res) => {
  const sha = process.env.GIT_SHA || 'dev';
  const time = process.env.BUILD_TIME || new Date().toISOString();
  res.json({
    name: pkg.name || 'pro-irp-api',
    version: pkg.version || '0.0.0',
    sha,
    time,
  });
});

// manual Sentry test endpoint (safe if DSN missing)
app.get('/sentry-test', (_req, res) => {
  if (process.env.SENTRY_DSN) {
    Sentry.captureMessage('Day3 API test event');
  }
  res.json({ sent: true });
});

/** ---------------- ERROR HANDLER (Sentry last) ---------------- */
if (process.env.SENTRY_DSN) {
  app.use(Sentry.Handlers.errorHandler());
}

/** ---------------- START SERVER ---------------- */
const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`API listening on :${port}`);
});
