import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

/** Wrap an async route handler so thrown errors reach the error middleware. */
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

/** Sign a 7-day JWT for a user record. */
export function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role || 'client' },
    SECRET,
    { expiresIn: '7d' }
  );
}

/** Express middleware that requires a valid bearer token. */
export function authRequired(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  try {
    req.user = jwt.verify(token, SECRET);
    return next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/** Express middleware that requires an authenticated admin user. */
export function adminRequired(req, res, next) {
  authRequired(req, res, () => {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Administrator access required' });
    }
    return next();
  });
}

/** Generate a human-friendly order number, e.g. TD-20261004-7F3A9C. */
export function orderNumber() {
  const d = new Date();
  const stamp =
    d.getFullYear().toString() +
    String(d.getMonth() + 1).padStart(2, '0') +
    String(d.getDate()).padStart(2, '0');
  const rand = Math.random().toString(16).slice(2, 8).toUpperCase();
  return `TD-${stamp}-${rand}`;
}

/** Round a number to 2 decimal places (currency-safe). */
export const money = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
