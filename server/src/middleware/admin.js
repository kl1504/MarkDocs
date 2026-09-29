import crypto from 'crypto';

// Optional single-password protection for the editing API.
// If ADMIN_PASSWORD is not set, the API stays open (handy for local development).
export function requireAdmin(req, res, next) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return next();
  const given = (req.headers.authorization || '').replace(/^Bearer /, '');
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  if (a.length === b.length && crypto.timingSafeEqual(a, b)) return next();
  res.status(401).json({ error: 'Admin password required.' });
}
