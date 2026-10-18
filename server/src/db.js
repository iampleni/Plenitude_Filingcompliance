import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;

const connectionString =
  process.env.DATABASE_URL ||
  'postgres://taxdesk:taxdesk@localhost:5432/taxdesk';

// Decide whether to use SSL for this connection:
//   - local databases (localhost / 127.0.0.1 / ::1) never use SSL;
//   - managed providers on a public hostname (Render external, Heroku, Neon,
//     Supabase, RDS, ...) require SSL;
//   - Render's *internal* hostname (e.g. dpg-abc123-a, no dots) does not;
//   - an explicit ?sslmode=require in the URL always wins.
// Override with PGSSL=true|false if a provider ever needs otherwise.
const host = (connectionString.match(/@([^/:?#]+)/) || [])[1] || '';
const isIpAddress = /^(\d{1,3}\.){3}\d{1,3}$/.test(host) || host.includes(':');
const isLocalHost = /^(localhost|127\.0\.0\.1|::1)$/i.test(host);
const sslInUrl = /sslmode=(require|prefer|verify-ca|verify-full)/i.test(connectionString);
const isPublicHost = host.includes('.') && !isIpAddress;

const useSSL =
  process.env.PGSSL === 'true' ||
  (process.env.PGSSL !== 'false' && !isLocalHost && (sslInUrl || isPublicHost));

export const pool = new Pool({
  connectionString,
  // rejectUnauthorized:false keeps the connection encrypted but skips CA
  // verification, which is what these providers' proxies need.
  ssl: useSSL ? { rejectUnauthorized: false } : undefined,
});

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL error', err);
});

export const query = (text, params) => pool.query(text, params);

export async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
