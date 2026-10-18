import { Router } from 'express';
import { query } from '../db.js';
import { asyncHandler, authRequired, money } from '../utils.js';

const router = Router();

router.use(authRequired);

/** GET /api/dashboard — summary for the logged-in client. */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const userId = req.user.id;

    const spendRes = await query(
      `SELECT COALESCE(SUM(total), 0) AS total_spend,
              COUNT(*)::int AS order_count
       FROM orders WHERE user_id = $1 AND status = 'paid'`,
      [userId]
    );

    const filingRes = await query(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE status IN ('submitted','in_progress'))::int AS open,
         COUNT(*) FILTER (WHERE status = 'completed')::int AS completed
       FROM service_requests WHERE user_id = $1`,
      [userId]
    );

    const recentOrders = await query(
      `SELECT o.id, o.order_number, o.status, o.total, o.created_at,
              COUNT(oi.id)::int AS item_count
       FROM orders o LEFT JOIN order_items oi ON oi.order_id = o.id
       WHERE o.user_id = $1
       GROUP BY o.id ORDER BY o.created_at DESC LIMIT 5`,
      [userId]
    );

    const recentFilings = await query(
      `SELECT id, title, status, created_at
       FROM service_requests WHERE user_id = $1
       ORDER BY created_at DESC LIMIT 5`,
      [userId]
    );

    return res.json({
      stats: {
        total_spend: money(spendRes.rows[0].total_spend),
        order_count: spendRes.rows[0].order_count,
        filings_total: filingRes.rows[0].total,
        filings_open: filingRes.rows[0].open,
        filings_completed: filingRes.rows[0].completed,
      },
      recent_orders: recentOrders.rows,
      recent_filings: recentFilings.rows,
    });
  })
);

export default router;
