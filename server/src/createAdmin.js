import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { pool } from './db.js';

/**
 * Create (or update) an administrator account.
 *
 * Usage:
 *   ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=secret123 npm run create-admin
 *
 * Defaults to admin@taxdesk.local / admin12345 when env vars are absent.
 * Change the password immediately in any real deployment.
 */
async function createAdmin() {
  const email = (process.env.ADMIN_EMAIL || 'admin@taxdesk.local')
    .toLowerCase()
    .trim();
  const password = process.env.ADMIN_PASSWORD || 'admin12345';
  const name = process.env.ADMIN_NAME || 'Administrator';

  if (password.length < 6) {
    console.error('✗ ADMIN_PASSWORD must be at least 6 characters.');
    process.exitCode = 1;
    await pool.end();
    return;
  }

  const hash = await bcrypt.hash(password, 10);
  try {
    const { rows } = await pool.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, 'admin')
       ON CONFLICT (email)
       DO UPDATE SET password_hash = EXCLUDED.password_hash, role = 'admin'
       RETURNING id, email, role`,
      [name, email, hash]
    );
    console.log(`✓ Admin ready: ${rows[0].email} (id ${rows[0].id}, role ${rows[0].role})`);
    console.log('  Log in at the normal login page — the admin dashboard appears automatically.');
  } catch (err) {
    console.error('✗ Failed to create admin:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

createAdmin();
