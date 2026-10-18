import { Router } from 'express';
import { query } from '../db.js';
import { asyncHandler, authRequired, money } from '../utils.js';

const router = Router();

router.use(authRequired);

/** Return the user's active cart, creating it if needed. */
async function getOrCreateCart(userId) {
  const existing = await query(
    `SELECT id FROM carts WHERE user_id = $1 AND status = 'active'
     ORDER BY id DESC LIMIT 1`,
    [userId]
  );
  if (existing.rows[0]) return existing.rows[0].id;

  const created = await query(
    `INSERT INTO carts (user_id) VALUES ($1) RETURNING id`,
    [userId]
  );
  return created.rows[0].id;
}

/** Build a cart payload with items and totals. */
async function loadCart(cartId) {
  const { rows: items } = await query(
    `SELECT ci.id, ci.product_id, ci.quantity,
            p.name, p.category, p.price, p.tax_rate, p.turnaround_days
     FROM cart_items ci
     JOIN products p ON p.id = ci.product_id
     WHERE ci.cart_id = $1
     ORDER BY ci.id`,
    [cartId]
  );

  let subtotal = 0;
  let taxTotal = 0;
  const mapped = items.map((it) => {
    const lineSubtotal = money(Number(it.price) * it.quantity);
    const lineTax = money((lineSubtotal * Number(it.tax_rate)) / 100);
    subtotal += lineSubtotal;
    taxTotal += lineTax;
    return {
      ...it,
      price: Number(it.price),
      tax_rate: Number(it.tax_rate),
      line_subtotal: lineSubtotal,
      line_tax: lineTax,
      line_total: money(lineSubtotal + lineTax),
    };
  });

  subtotal = money(subtotal);
  taxTotal = money(taxTotal);
  return {
    cart_id: cartId,
    items: mapped,
    subtotal,
    tax_total: taxTotal,
    total: money(subtotal + taxTotal),
    currency: 'INR',
    item_count: mapped.reduce((n, it) => n + it.quantity, 0),
  };
}

/** GET /api/cart */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const cartId = await getOrCreateCart(req.user.id);
    return res.json(await loadCart(cartId));
  })
);

/** POST /api/cart/items  { product_id, quantity } */
router.post(
  '/items',
  asyncHandler(async (req, res) => {
    const { product_id, quantity = 1 } = req.body || {};
    const qty = Math.max(1, parseInt(quantity, 10) || 1);

    if (!product_id) {
      return res.status(400).json({ error: 'product_id is required' });
    }

    const product = await query(
      'SELECT id FROM products WHERE id = $1 AND active = true',
      [product_id]
    );
    if (!product.rows[0]) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const cartId = await getOrCreateCart(req.user.id);
    await query(
      `INSERT INTO cart_items (cart_id, product_id, quantity)
       VALUES ($1, $2, $3)
       ON CONFLICT (cart_id, product_id)
       DO UPDATE SET quantity = cart_items.quantity + EXCLUDED.quantity`,
      [cartId, product_id, qty]
    );

    return res.status(201).json(await loadCart(cartId));
  })
);

/** PATCH /api/cart/items/:id  { quantity } */
router.patch(
  '/items/:id',
  asyncHandler(async (req, res) => {
    const qty = parseInt(req.body?.quantity, 10);
    if (!Number.isFinite(qty) || qty < 1) {
      return res.status(400).json({ error: 'quantity must be a positive integer' });
    }

    const cartId = await getOrCreateCart(req.user.id);
    const updated = await query(
      `UPDATE cart_items SET quantity = $1
       WHERE id = $2 AND cart_id = $3
       RETURNING id`,
      [qty, req.params.id, cartId]
    );
    if (!updated.rows[0]) {
      return res.status(404).json({ error: 'Cart item not found' });
    }

    return res.json(await loadCart(cartId));
  })
);

/** DELETE /api/cart/items/:id */
router.delete(
  '/items/:id',
  asyncHandler(async (req, res) => {
    const cartId = await getOrCreateCart(req.user.id);
    const deleted = await query(
      'DELETE FROM cart_items WHERE id = $1 AND cart_id = $2 RETURNING id',
      [req.params.id, cartId]
    );
    if (!deleted.rows[0]) {
      return res.status(404).json({ error: 'Cart item not found' });
    }
    return res.json(await loadCart(cartId));
  })
);

/** DELETE /api/cart — clear the cart. */
router.delete(
  '/',
  asyncHandler(async (req, res) => {
    const cartId = await getOrCreateCart(req.user.id);
    await query('DELETE FROM cart_items WHERE cart_id = $1', [cartId]);
    return res.json(await loadCart(cartId));
  })
);

export default router;
