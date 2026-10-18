# TaxDesk — Statutory Compliance Portal

A full-stack web application for filing tax returns, registrations, and other
statutory compliances. Clients create an account, browse a catalogue of
compliance services, add them to a cart, pay, and track their filings from a
dashboard.

- **Backend:** Node.js + Express + PostgreSQL (`pg`)
- **Frontend:** React (Vite) + React Router
- **Auth:** Email + password (bcrypt hashed), JWT bearer tokens
- **Payments:** Razorpay (with a built-in mock mode for local development)

---

## Features

1. **Client accounts** — sign up with name, email, phone and password; secure login; JWT sessions.
2. **Client dashboard** — spend, open filings, completed filings, and recent activity.
3. **Product catalogue** — compliance services grouped by category, with prices, GST, and turnaround time.
4. **Cart & checkout** — add/update/remove items, live totals with tax, and place an order.
5. **Payments** — Razorpay order creation + signature verification (mock provider when keys are absent).
6. **Service requests** — every purchased service becomes a trackable filing with a status.
7. **Admin console** — a role-gated dashboard that clients can never see (see below).
8. **Client profiles** — statutory details (entity type, PAN, GSTIN, address, DOB) stored per client and pre-filled for filings.
9. **Document uploads** — attach PDFs/images/office files to any filing; unlocked once that service's order is paid.
10. **Email notifications** — the client is emailed automatically when a filing's status changes, and on payment confirmation.

---

## Admin console

The admin area lives at `/admin` and is protected in two independent layers:

- **Backend:** every `/api/admin/*` route passes through `adminRequired`, which
  returns **403** for any authenticated user whose `role` is not `admin`. The role
  is baked into the JWT at login and can only be set by the admin-creation script —
  clients can never promote themselves.
- **Frontend:** `/admin` is wrapped in `<ProtectedRoute adminOnly>`, and the
  "Admin console" nav link renders only when `user.role === 'admin'`. A client who
  guesses the URL is redirected to the catalogue.

The console includes:

| Section | What it does |
| --- | --- |
| Overview | Revenue, client count, orders, and filing pipeline stats |
| Clients | Every registered client with their order count and lifetime spend |
| Orders | All orders, filter by status, and change an order's status inline |
| Filings | All service requests; update filing status and add internal notes |
| Catalogue | Add services, edit prices inline, activate/retire offerings |

**Create the first admin:**

```bash
cd server
ADMIN_EMAIL=you@firm.com ADMIN_PASSWORD=strongpassword npm run create-admin
```

Defaults to `admin@taxdesk.local` / `admin12345` if the env vars are omitted —
change the password before any real use. Admins log in through the same login
page and are routed straight to `/admin`.

---

## Project layout

```
tax-compliance-app/
├── docker-compose.yml        # Postgres (and optional API) for local dev
├── server/                   # Express + PostgreSQL API
│   ├── src/
│   │   ├── index.js          # app entry
│   │   ├── db.js             # pg pool
│   │   ├── utils.js          # jwt + async helpers
│   │   ├── schema.sql        # database schema
│   │   ├── migrate.js        # apply schema
│   │   ├── seed.js           # seed catalogue
│   │   └── routes/           # auth, products, cart, orders, payments, dashboard, serviceRequests
│   └── .env.example
└── client/                   # React (Vite) frontend
    ├── index.html
    └── src/
        ├── main.jsx, App.jsx, api.js, styles.css
        ├── context/          # AuthContext, CartContext
        ├── components/       # Navbar, ProductCard, ProtectedRoute, ...
        └── pages/            # Home, ProductDetail, Login, Register, Dashboard, Cart, Checkout, Orders, ...
```

---

## Quick start

### 1. Start PostgreSQL

Use the bundled Docker service, or any Postgres you have:

```bash
docker compose up -d db
```

This exposes Postgres on `localhost:5432` with database `taxdesk`,
user `taxdesk`, password `taxdesk`.

### 2. Backend

```bash
cd server
cp .env.example .env          # then edit if needed
npm install
npm run migrate               # create tables
npm run seed                  # load the service catalogue
npm run dev                   # API on http://localhost:4000
```

### 3. Frontend

```bash
cd client
npm install
npm run dev                   # app on http://localhost:5173
```

Vite proxies `/api` to the backend, so just open http://localhost:5173.

---

## Environment variables (`server/.env`)

| Variable | Description | Default |
| --- | --- | --- |
| `PORT` | API port | `4000` |
| `DATABASE_URL` | Postgres connection string | `postgres://taxdesk:taxdesk@localhost:5432/taxdesk` |
| `JWT_SECRET` | Secret for signing tokens — **change in production** | `dev-secret-change-me` |
| `CLIENT_ORIGIN` | Allowed CORS origin | `http://localhost:5173` |
| `RAZORPAY_KEY_ID` | Razorpay key id (optional) | — |
| `RAZORPAY_KEY_SECRET` | Razorpay key secret (optional) | — |
| `SMTP_HOST` | SMTP server for notifications (optional) | — |
| `SMTP_PORT` | SMTP port | `587` |
| `SMTP_SECURE` | Use TLS (`true`/`false`) | `false` |
| `SMTP_USER` / `SMTP_PASS` | SMTP credentials (optional) | — |
| `SMTP_FROM` | From address for notifications | `TaxDesk <no-reply@taxdesk.local>` |
| `UPLOAD_DIR` | Directory where uploaded documents are stored | `uploads` |
| `MAX_UPLOAD_MB` | Max size per uploaded document | `10` |

If Razorpay keys are **not** set, the payment endpoint runs in **mock mode**:
it returns a fake order and the verify endpoint accepts a `mock` signature so
you can exercise the full checkout flow locally.

If `SMTP_HOST` is **not** set, notifications run in **console mode**: each email
is printed to the server terminal and recorded in the `email_log` table with
status `logged`, so the whole notification flow works without a mail provider.
Point it at a real SMTP server (or a service like SendGrid/Mailgun/Amazon SES
SMTP) to send actual email.

---

## API reference

All authenticated routes expect `Authorization: Bearer <token>`.

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/api/auth/register` | Create an account |
| `POST` | `/api/auth/login` | Log in, returns JWT |
| `GET` | `/api/auth/me` | Current user |
| `GET` | `/api/products` | List services (`?category=&search=`) |
| `GET` | `/api/products/:id` | Service detail |
| `GET` | `/api/cart` | Current cart with totals |
| `POST` | `/api/cart/items` | Add item `{ product_id, quantity }` |
| `PATCH` | `/api/cart/items/:id` | Update quantity |
| `DELETE` | `/api/cart/items/:id` | Remove item |
| `POST` | `/api/orders` | Checkout the cart into an order |
| `GET` | `/api/orders` | List my orders |
| `GET` | `/api/orders/:id` | Order detail |
| `POST` | `/api/payments/create` | Create a payment for an order |
| `POST` | `/api/payments/verify` | Verify payment signature |
| `GET` | `/api/dashboard` | Dashboard summary |
| `GET` | `/api/service-requests` | My filings |
| `PATCH` | `/api/service-requests/:id` | Add notes to a filing |
| `GET` | `/api/profile` | Get my statutory profile |
| `PUT` | `/api/profile` | Create/update my profile |
| `GET` | `/api/service-requests/:id/documents` | List a filing's documents |
| `POST` | `/api/service-requests/:id/documents` | Upload a document (paid filings only) |
| `GET` | `/api/service-requests/:id/documents/:docId/download` | Download a document |
| `DELETE` | `/api/service-requests/:id/documents/:docId` | Delete a document |
| `GET` | `/api/admin/stats` | Admin: headline stats |
| `GET` | `/api/admin/users` | Admin: all clients |
| `GET` | `/api/admin/orders` | Admin: all orders (`?status=`) |
| `PATCH` | `/api/admin/orders/:id` | Admin: set order status |
| `GET` | `/api/admin/service-requests` | Admin: all filings (`?status=`) |
| `PATCH` | `/api/admin/service-requests/:id` | Admin: set filing status / notes (emails the client) |
| `GET` | `/api/admin/service-requests/:id/documents` | Admin: a filing's documents |
| `GET` | `/api/admin/documents/:docId/download` | Admin: download any client document |
| `POST` | `/api/admin/products` | Admin: add a service |
| `PATCH` | `/api/admin/products/:id` | Admin: edit a service |
| `DELETE` | `/api/admin/products/:id` | Admin: retire a service |

---

## Deploying (Render)

This monorepo runs as **two Render services** plus the Postgres database.

**Web Service — the API**
- Root Directory: `server`
- Build Command: `npm install`
- Start Command: `npm start`
- Environment: `DATABASE_URL` (use the **internal** connection string from your
  Render Postgres), `JWT_SECRET`, `CLIENT_ORIGIN` = your static site URL,
  and any Razorpay / SMTP keys.

**Static Site — the client**
- Root Directory: `client`
- Build Command: `npm install && npm run build`
- Publish Directory: `dist`
- Environment: `VITE_API_URL` = your API service URL (e.g.
  `https://your-api.onrender.com`). Without this the browser calls `/api` on the
  static-site origin, which has no API, and every request 404s.
- **Rewrites:** add a rule **Source** `/*` → **Destination** `/index.html`
  (Action: *Rewrite*). This is required for a single-page app: without it, opening
  a deep link such as `/dashboard` or `/admin` returns Render's `NOT_FOUND` page,
  because there is no file at that path.

After the API is live, run the migrations against the hosted database once from
`server/` with `DATABASE_URL` set to the Render connection string:
`npm run migrate`, then `npm run seed` and `npm run create-admin`.

### Client on Vercel

If the client is hosted on Vercel instead of a Render static site, the bundled
`client/vercel.json` handles both things that would otherwise break:

- `/api/:path*` → your Render API URL — proxies API calls through Vercel, so
  **no CORS setup is needed** (the browser only ever talks to Vercel).
- `/(.*)` → `/index.html` — the SPA fallback, so deep links like `/dashboard`
  or `/admin` load the app instead of returning a 404.

Open `client/vercel.json` and set the `destination` of the first rule to your
own API URL. Because the proxy is used, you do **not** need `VITE_API_URL` for
this setup.

One caveat: Vercel caps proxied request bodies (about 4.5 MB). If you upload
large documents, skip the proxy — set `VITE_API_URL` on the client to call the
API directly and set `CLIENT_ORIGIN` on the API for CORS.

---

## Security notes

- Passwords are hashed with bcrypt (cost 10) and never returned by the API.
- Tokens are signed with `JWT_SECRET`; always set a strong secret in production.
- Set `CLIENT_ORIGIN` to your real frontend origin so CORS is not wide open.
- This is a starter/reference implementation — add rate limiting, HTTPS,
  input validation hardening, and audit logging before going live.
