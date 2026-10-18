import { Router } from 'express';
import { query } from '../db.js';
import { asyncHandler } from '../utils.js';

const router = Router();

/** GET /api/products?category=&search= — list active services. */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { category, search } = req.query;
    const clauses = ['active = true'];
    const params = [];

    if (category) {
      params.push(category);
      clauses.push(`category = $${params.length}`);
    }
    if (search) {
      params.push(`%${search}%`);
      clauses.push(
        `(name ILIKE $${params.length} OR description ILIKE $${params.length})`
      );
    }

    const { rows } = await query(
      `SELECT * FROM products WHERE ${clauses.join(' AND ')}
       ORDER BY category, price`,
      params
    );

    const categories = [...new Set(rows.map((r) => r.category))];
    return res.json({ products: rows, categories });
  })
);

/** GET /api/products/categories — distinct active categories. */
router.get(
  '/categories',
  asyncHandler(async (req, res) => {
    const { rows } = await query(
      `SELECT category, COUNT(*)::int AS count
       FROM products WHERE active = true
       GROUP BY category ORDER BY category`
    );
    return res.json({ categories: rows });
  })
);

/** GET /api/products/:id — service detail. */
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const { rows } = await query(
      'SELECT * FROM products WHERE id = $1 AND active = true',
      [req.params.id]
    );
    if (!rows[0]) {
      return res.status(404).json({ error: 'Product not found' });
    }
    return res.json({ product: rows[0] });
  })
);

export default router;
