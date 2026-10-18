import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../db.js';
import { signToken, asyncHandler, authRequired } from '../utils.js';

const router = Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** POST /api/auth/register — create a client account. */
router.post(
  '/register',
  asyncHandler(async (req, res) => {
    const { name, email, password, phone } = req.body || {};

    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ error: 'name, email and password are required' });
    }
    if (!EMAIL_RE.test(email)) {
      return res.status(400).json({ error: 'Please enter a valid email address' });
    }
    if (String(password).length < 6) {
      return res
        .status(400)
        .json({ error: 'Password must be at least 6 characters' });
    }

    const normalized = email.toLowerCase().trim();
    const existing = await query('SELECT id FROM users WHERE email = $1', [
      normalized,
    ]);
    if (existing.rowCount) {
      return res
        .status(409)
        .json({ error: 'An account with this email already exists' });
    }

    const passwordHash = await bcrypt.hash(String(password), 10);
    const { rows } = await query(
      `INSERT INTO users (name, email, phone, password_hash)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, phone, role, created_at`,
      [name.trim(), normalized, phone ? String(phone).trim() : null, passwordHash]
    );

    const user = rows[0];
    return res.status(201).json({ token: signToken(user), user });
  })
);

/** POST /api/auth/login */
router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }

    const { rows } = await query(
      `SELECT id, name, email, phone, role, password_hash, created_at
       FROM users WHERE email = $1`,
      [email.toLowerCase().trim()]
    );
    const user = rows[0];
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const ok = await bcrypt.compare(String(password), user.password_hash);
    if (!ok) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    delete user.password_hash;
    return res.json({ token: signToken(user), user });
  })
);

/** GET /api/auth/me — current user. */
router.get(
  '/me',
  authRequired,
  asyncHandler(async (req, res) => {
    const { rows } = await query(
      'SELECT id, name, email, phone, role, created_at FROM users WHERE id = $1',
      [req.user.id]
    );
    if (!rows[0]) {
      return res.status(404).json({ error: 'User not found' });
    }
    return res.json({ user: rows[0] });
  })
);

export default router;
