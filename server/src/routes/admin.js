import { Router } from 'express';
import fs from 'node:fs';
import { query } from '../db.js';
import { asyncHandler, adminRequired, money } from '../utils.js';
import { sendMail, statusChangeEmail } from '../mailer.js';
import { documentPath } from '../middleware/upload.js';

const router = Router();

// Every route below requires an authenticated admin. Clients get 403.
router.use(adminRequired);

const ORDER_STATUSES = ['pending', 'paid', 'processing', 'cancelled', 'refunded'];
const REQUEST_STATUSES = [
  'awaiting_payment',
  'submitted',
  'in_progress',
  'completed',
  'rejected',
];

/** GET /api/admin/stats — headline numbers for the admin dashboard. */
router.get(
  '/stats',
  asyncHandler(async (req, res) => {
    const revenue = await query(
      `SELECT COALESCE(SUM(total),0) AS revenue,
              COUNT(*)::int AS paid_orders
       FROM orders WHERE status = 'paid'`
    );
    const clients = await query(
      `SELECT COUNT(*)::int AS total FROM users WHERE role = 'client'`
    );
    const orders = await query(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE status = 'pending')::int AS pending
       FROM orders`
    );
    const filings = await query(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE status IN ('submitted','in_progress'))::int AS open,
         COUNT(*) FILTER (WHERE status = 'completed')::int AS completed
       FROM service_requests`
    );

    return res.json({
      stats: {
        revenue: money(revenue.rows[0].revenue),
        paid_orders: revenue.rows[0].paid_orders,
        clients: clients.rows[0].total,
        orders_total: orders.rows[0].total,
        orders_pending: orders.rows[0].pending,
        filings_total: filings.rows[0].total,
        filings_open: filings.rows[0].open,
        filings_completed: filings.rows[0].completed,
      },
    });
  })
);

/** GET /api/admin/users — all client accounts. */
router.get(
  '/users',
  asyncHandler(async (req, res) => {
    const { rows } = await query(
      `SELECT u.id, u.name, u.email, u.phone, u.role, u.created_at,
              COUNT(DISTINCT o.id)::int AS order_count,
              COALESCE(SUM(o.total) FILTER (WHERE o.status = 'paid'), 0) AS total_spend
       FROM users u
       LEFT JOIN orders o ON o.user_id = u.id
       WHERE u.role = 'client'
       GROUP BY u.id
       ORDER BY u.created_at DESC`
    );
    return res.json({ users: rows });
  })
);

/** GET /api/admin/orders — every order across all clients. */
router.get(
  '/orders',
  asyncHandler(async (req, res) => {
    const { status } = req.query;
    const params = [];
    let clause = '';
    if (status) {
      params.push(status);
      clause = `WHERE o.status = $1`;
    }
    const { rows } = await query(
      `SELECT o.*, u.name AS client_name, u.email AS client_email,
              COUNT(oi.id)::int AS item_count
       FROM orders o
       JOIN users u ON u.id = o.user_id
       LEFT JOIN order_items oi ON oi.order_id = o.id
       ${clause}
       GROUP BY o.id, u.name, u.email
       ORDER BY o.created_at DESC`,
      params
    );
    return res.json({ orders: rows });
  })
);

/** PATCH /api/admin/orders/:id — update an order status. */
router.patch(
  '/orders/:id',
  asyncHandler(async (req, res) => {
    const { status } = req.body || {};
    if (!ORDER_STATUSES.includes(status)) {
      return res
        .status(400)
        .json({ error: `status must be one of: ${ORDER_STATUSES.join(', ')}` });
    }
    const { rows } = await query(
      `UPDATE orders SET status = $1 WHERE id = $2 RETURNING *`,
      [status, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Order not found' });
    return res.json({ order: rows[0] });
  })
);

/** GET /api/admin/service-requests — all filings, filterable by status. */
router.get(
  '/service-requests',
  asyncHandler(async (req, res) => {
    const { status } = req.query;
    const params = [];
    let clause = '';
    if (status) {
      params.push(status);
      clause = `WHERE sr.status = $1`;
    }
    const { rows } = await query(
      `SELECT sr.*, u.name AS client_name, u.email AS client_email,
              p.category, o.order_number
       FROM service_requests sr
       JOIN users u ON u.id = sr.user_id
       LEFT JOIN products p ON p.id = sr.product_id
       LEFT JOIN orders o ON o.id = sr.order_id
       ${clause}
       ORDER BY sr.created_at DESC`,
      params
    );
    return res.json({ service_requests: rows });
  })
);

/** PATCH /api/admin/service-requests/:id — update filing status / notes.
 *  When the status actually changes, the client is emailed automatically. */
router.patch(
  '/service-requests/:id',
  asyncHandler(async (req, res) => {
    const { status, notes } = req.body || {};
    if (status && !REQUEST_STATUSES.includes(status)) {
      return res
        .status(400)
        .json({ error: `status must be one of: ${REQUEST_STATUSES.join(', ')}` });
    }

    // Fetch current state + client details before mutating.
    const current = await query(
      `SELECT sr.id, sr.title, sr.status AS old_status,
              u.id AS user_id, u.name AS user_name, u.email AS user_email
       FROM service_requests sr JOIN users u ON u.id = sr.user_id
       WHERE sr.id = $1`,
      [req.params.id]
    );
    if (!current.rows[0]) {
      return res.status(404).json({ error: 'Request not found' });
    }
    const before = current.rows[0];

    const { rows } = await query(
      `UPDATE service_requests
       SET status = COALESCE($1, status), notes = COALESCE($2, notes)
       WHERE id = $3 RETURNING *`,
      [status || null, notes ?? null, req.params.id]
    );
    const filing = rows[0];

    // Notify the client only when the status genuinely changed.
    let email = null;
    if (status && status !== before.old_status) {
      email = await sendMail(
        statusChangeEmail({
          user: { id: before.user_id, name: before.user_name, email: before.user_email },
          filing: { title: filing.title },
          fromStatus: before.old_status,
          toStatus: filing.status,
        })
      );
    }

    return res.json({ service_request: filing, email });
  })
);

/** GET /api/admin/service-requests/:id/documents — list a filing's documents. */
router.get(
  '/service-requests/:id/documents',
  asyncHandler(async (req, res) => {
    const { rows } = await query(
      `SELECT id, original_name, mime_type, size_bytes, uploaded_at
       FROM filing_documents WHERE service_request_id = $1
       ORDER BY uploaded_at DESC`,
      [req.params.id]
    );
    return res.json({ documents: rows });
  })
);

/** GET /api/admin/documents/:docId/download — download any client document. */
router.get(
  '/documents/:docId/download',
  asyncHandler(async (req, res) => {
    const { rows } = await query(
      'SELECT * FROM filing_documents WHERE id = $1',
      [req.params.docId]
    );
    const doc = rows[0];
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    const abs = documentPath(doc.user_id, doc.service_request_id, doc.stored_name);
    if (!fs.existsSync(abs)) {
      return res.status(410).json({ error: 'File is no longer available on the server' });
    }
    res.setHeader('Content-Type', doc.mime_type || 'application/octet-stream');
    return res.download(abs, doc.original_name);
  })
);

// ---------- Product (catalogue) management ----------

/** POST /api/admin/products — add a service to the catalogue. */
router.post(
  '/products',
  asyncHandler(async (req, res) => {
    const { sku, name, category, description, price, tax_rate, turnaround_days } =
      req.body || {};
    if (!sku || !name || !category || price == null) {
      return res
        .status(400)
        .json({ error: 'sku, name, category and price are required' });
    }
    const { rows } = await query(
      `INSERT INTO products (sku, name, category, description, price, tax_rate, turnaround_days)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [
        sku,
        name,
        category,
        description || null,
        price,
        tax_rate ?? 18,
        turnaround_days ?? 7,
      ]
    );
    return res.status(201).json({ product: rows[0] });
  })
);

/** PATCH /api/admin/products/:id — edit a service (incl. active toggle). */
router.patch(
  '/products/:id',
  asyncHandler(async (req, res) => {
    const { name, category, description, price, tax_rate, turnaround_days, active } =
      req.body || {};
    const { rows } = await query(
      `UPDATE products SET
         name = COALESCE($1, name),
         category = COALESCE($2, category),
         description = COALESCE($3, description),
         price = COALESCE($4, price),
         tax_rate = COALESCE($5, tax_rate),
         turnaround_days = COALESCE($6, turnaround_days),
         active = COALESCE($7, active)
       WHERE id = $8 RETURNING *`,
      [
        name ?? null,
        category ?? null,
        description ?? null,
        price ?? null,
        tax_rate ?? null,
        turnaround_days ?? null,
        typeof active === 'boolean' ? active : null,
        req.params.id,
      ]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Product not found' });
    return res.json({ product: rows[0] });
  })
);

/** DELETE /api/admin/products/:id — soft-delete (deactivate) a service. */
router.delete(
  '/products/:id',
  asyncHandler(async (req, res) => {
    const { rows } = await query(
      `UPDATE products SET active = false WHERE id = $1 RETURNING id`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Product not found' });
    return res.json({ success: true });
  })
);

export default router;
