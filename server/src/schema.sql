-- TaxDesk database schema
-- Safe to run repeatedly.

CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT UNIQUE NOT NULL,
  phone         TEXT,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'client',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS products (
  id              SERIAL PRIMARY KEY,
  sku             TEXT UNIQUE NOT NULL,
  name            TEXT NOT NULL,
  category        TEXT NOT NULL,
  description     TEXT,
  price           NUMERIC(12,2) NOT NULL,
  tax_rate        NUMERIC(5,2) NOT NULL DEFAULT 18,
  turnaround_days INTEGER NOT NULL DEFAULT 7,
  active          BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS carts (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status     TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cart_items (
  id         SERIAL PRIMARY KEY,
  cart_id    INTEGER NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id),
  quantity   INTEGER NOT NULL DEFAULT 1,
  UNIQUE (cart_id, product_id)
);

CREATE TABLE IF NOT EXISTS orders (
  id           SERIAL PRIMARY KEY,
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  order_number TEXT UNIQUE NOT NULL,
  status       TEXT NOT NULL DEFAULT 'pending',
  subtotal     NUMERIC(12,2) NOT NULL,
  tax_total    NUMERIC(12,2) NOT NULL,
  total        NUMERIC(12,2) NOT NULL,
  currency     TEXT NOT NULL DEFAULT 'INR',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS order_items (
  id           SERIAL PRIMARY KEY,
  order_id     INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id   INTEGER NOT NULL REFERENCES products(id),
  product_name TEXT NOT NULL,
  unit_price   NUMERIC(12,2) NOT NULL,
  quantity     INTEGER NOT NULL,
  tax_rate     NUMERIC(5,2) NOT NULL DEFAULT 18
);

CREATE TABLE IF NOT EXISTS payments (
  id                  SERIAL PRIMARY KEY,
  order_id            INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  provider            TEXT NOT NULL DEFAULT 'razorpay',
  provider_order_id   TEXT,
  provider_payment_id TEXT,
  amount              NUMERIC(12,2) NOT NULL,
  status              TEXT NOT NULL DEFAULT 'created',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS service_requests (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  order_id   INTEGER REFERENCES orders(id) ON DELETE SET NULL,
  product_id INTEGER REFERENCES products(id),
  title      TEXT NOT NULL,
  status     TEXT NOT NULL DEFAULT 'submitted',
  notes      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cart_items_cart ON cart_items(cart_id);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_user ON service_requests(user_id);

-- Extended client profile (one row per user). Used to pre-fill statutory details
-- that filings and registrations need.
CREATE TABLE IF NOT EXISTS client_profiles (
  user_id       INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  entity_type   TEXT NOT NULL DEFAULT 'individual',
  legal_name    TEXT,
  pan           TEXT,
  gstin         TEXT,
  aadhaar_last4 TEXT,
  date_of_birth DATE,
  address_line1 TEXT,
  address_line2 TEXT,
  city          TEXT,
  state         TEXT,
  pincode       TEXT,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Documents uploaded against a filing (allowed only once its order is paid).
CREATE TABLE IF NOT EXISTS filing_documents (
  id                 SERIAL PRIMARY KEY,
  service_request_id INTEGER NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
  user_id            INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  original_name      TEXT NOT NULL,
  stored_name        TEXT NOT NULL,
  mime_type          TEXT,
  size_bytes         INTEGER NOT NULL,
  uploaded_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Audit log of every notification the system attempted to send.
CREATE TABLE IF NOT EXISTS email_log (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  to_email   TEXT NOT NULL,
  subject    TEXT NOT NULL,
  body       TEXT,
  status     TEXT NOT NULL DEFAULT 'logged',
  error      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_filing_documents_request ON filing_documents(service_request_id);
CREATE INDEX IF NOT EXISTS idx_email_log_user ON email_log(user_id);
