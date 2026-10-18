import { Router } from 'express';
import { query, withTransaction } from '../db.js';
import { asyncHandler, authRequired, orderNumber, money } from '../utils.js';

const router = Router();

router.use(authRequired);

/** Fetch one order (with items + payment) scoped to a user. */
async function loadOrder(orderId, userId, { isAdmin = false } = {}) {
  const orderRes = await query(
    `SELECT o.*, u.name AS client_name, u.email AS client_email
     FROM orders o JOIN users u ON u.id = o.user_id
     WHERE o.id = $1 ${isAdmin ? '' : 'AND o.user_id = $2'}`,
    isAdmin ? [orderId] : [orderId, userId]
  );
  const order = orderRes.rows[0];
  if (!order) return null;

  const items = await query(
    'SELECT * FROM order_items WHERE order_id = $1 ORDER BY id',
    [orderId]
  );
  const payments = await query(
    'SELECT * FROM payments WHERE order_id = $1 ORDER BY id DESC',
    [orderId]
  );
  const filings = await query(
    'SELECT * FROM service_requests WHERE order_id = $1 ORDER BY id',
    [orderId]
  );

  return { ...order, items: items.rows, payments: payments.rows, filings: filings.rows };
}

/** POST /api/orders — check out the active cart into an order. */
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const result = await withTransaction(async (client) => {
      const cartRes = await client.query(
        `SELECT id FROM carts WHERE user_id = $1 AND status = 'active'
         ORDER BY id DESC LIMIT 1`,
        [req.user.id]
      );
      const cart = cartRes.rows[0];
      if (!cart) {
        const err = new Error('Your cart is empty');
        err.status = 400;
        throw err;
      }

      const itemsRes = await client.query(
        `SELECT ci.product_id, ci.quantity, p.name, p.price, p.tax_rate
         FROM cart_items ci JOIN products p ON p.id = ci.product_id
         WHERE ci.cart_id = $1`,
        [cart.id]
      );
      const items = itemsRes.rows;
      if (!items.length) {
        const err = new Error('Your cart is empty');
        err.status = 400;
        throw err;
      }

      let subtotal = 0;
      let taxTotal = 0;
      for (const it of items) {
        const line = money(Number(it.price) * it.quantity);
        subtotal += line;
        taxTotal += money((line * Number(it.tax_rate)) / 100);
      }
      subtotal = money(subtotal);
      taxTotal = money(taxTotal);
      const total = money(subtotal + taxTotal);

      const orderRes = await client.query(
        `INSERT INTO orders (user_id, order_number, status, subtotal, tax_total, total)
         VALUES ($1, $2, 'pending', $3, $4, $5)
         RETURNING *`,
        [req.user.id, orderNumber(), subtotal, taxTotal, total]
      );
      const order = orderRes.rows[0];

      for (const it of items) {
        await client.query(
          `INSERT INTO order_items (order_id, product_id, product_name, unit_price, quantity, tax_rate)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [order.id, it.product_id, it.name, it.price, it.quantity, it.tax_rate]
        );
        await client.query(
          `INSERT INTO service_requests (user_id, order_id, product_id, title, status)
           VALUES ($1, $2, $3, $4, 'awaiting_payment')`,
          [req.user.id, order.id, it.product_id, it.name]
        );
      }

      await client.query('DELETE FROM cart_items WHERE cart_id = $1', [cart.id]);
      await client.query(`UPDATE carts SET status = 'converted' WHERE id = $1`, [
        cart.id,
      ]);

      return order;
    });

    return res.status(201).json({ order: await loadOrder(result.id, req.user.id) });
  })
);

/** GET /api/orders — list my orders. */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { rows } = await query(
      `SELECT o.*, COUNT(oi.id)::int AS item_count
       FROM orders o LEFT JOIN order_items oi ON oi.order_id = o.id
       WHERE o.user_id = $1
       GROUP BY o.id ORDER BY o.created_at DESC`,
      [req.user.id]
    );
    return res.json({ orders: rows });
  })
);

/** GET /api/orders/:id */
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const order = await loadOrder(req.params.id, req.user.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    return res.json({ order });
  })
);

export { loadOrder };
export default router;
