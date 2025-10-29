const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret';
function requireAuth(req, res, next) {
  const hdr = req.headers.authorization || '';
  const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'missing token' });
  try { const payload = jwt.verify(token, JWT_SECRET); req.user = { id: payload.sub, email: payload.email }; return next(); }
  catch (e) { return res.status(401).json({ error: 'invalid token' }); }
}
module.exports = { requireAuth };
