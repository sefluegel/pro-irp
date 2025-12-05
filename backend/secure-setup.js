require('dotenv').config();
const cors = require('cors');
const helmet = require('helmet');

function parseOrigins(s) {
  return (s || '')
    .split(',')
    .map(x => x.trim())
    .filter(Boolean);
}

module.exports = function secureSetup(app) {
  const allowlist = parseOrigins(process.env.CORS_ORIGINS);
  const isProd = process.env.NODE_ENV === 'production' && allowlist.length > 0;

  // Security headers
  app.use(helmet());

  // CORS: open in dev, allowlist in production
  if (isProd) {
    const corsOptions = {
      origin(origin, cb) {
        if (!origin) return cb(null, true);
        const ok = allowlist.includes(origin);
        cb(ok ? null : new Error('Not allowed by CORS'), ok);
      },
      credentials: true,
    };
    app.use(cors(corsOptions));
  } else {
    app.use(cors({ origin: true, credentials: true }));
  }

  // Health endpoint (always available)
  app.get('/health', (_req, res) => res.json({ ok: true }));
};
