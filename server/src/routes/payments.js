import { Router } from 'express';
import crypto from 'node:crypto';
import { query } from '../db.js';
import { asyncHandler, authRequired, money } from '../utils.js';
import { sendMail, orderPaidEmail } from '../mailer.js';

const router = Router();

router.use(authRequired);

const KEY_ID = process.env.RAZORPAY_KEY_ID;
const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;
const MOCK_MODE = !KEY_ID || !KEY_SECRET;

let razorpay = null;
if (!MOCK_MODE) {
  const { default: Razorpay } = await import('razorpay');
  razorpay = new Razorpay({ key_id: KEY_ID, key_secret: KEY_SECRET });
}

async function getOrderForUser(orderId, userId) {
  const { rows } = await query(
    'SELECT * FROM orders WHERE id = $1 AND user_id = $2',
    [orderId, userId]
  );
  return rows[0];
}

/** POST /api/payments/create  { order_id } — start a payment. */
router.post(
  '/create',
  asyncHandler(async (req, res) => {
    const { order_id } = req.body || {};
    const order = await getOrderForUser(order_id, req.user.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.status === 'paid') {
      return res.status(400).json({ error: 'Order is already paid' });
    }

    const amountPaise = Math.round(Number(order.total) * 100);

    if (MOCK_MODE) {
      const providerOrderId = `mock_order_${Date.now()}`;
      await query(
        `INSERT INTO payments (order_id, provider, provider_order_id, amount, status)
         VALUES ($1, 'mock', $2, $3, 'created')`,
        [order.id, providerOrderId, order.total]
      );
      return res.json({
        mock: true,
        key_id: null,
        provider_order_id: providerOrderId,
        amount: amountPaise,
        currency: order.currency,
        message:
          'Razorpay keys not configured — running in mock mode. Post signature "mock" to /verify.',
      });
    }

    const rzpOrder = await razorpay.orders.create({
      amount: amountPaise,
      currency: order.currency,
      receipt: order.order_number,
      notes: { order_id: String(order.id), user_id: String(req.user.id) },
    });

    await query(
      `INSERT INTO payments (order_id, provider, provider_order_id, amount, status)
       VALUES ($1, 'razorpay', $2, $3, 'created')`,
      [order.id, rzpOrder.id, order.total]
    );

    return res.json({
      mock: false,
      key_id: KEY_ID,
      provider_order_id: rzpOrder.id,
      amount: amountPaise,
      currency: order.currency,
      order_number: order.order_number,
    });
  })
);

/** POST /api/payments/verify — confirm a payment and mark the order paid. */
router.post(
  '/verify',
  asyncHandler(async (req, res) => {
    const {
      order_id,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body || {};

    const order = await getOrderForUser(order_id, req.user.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    const paymentRes = await query(
      `SELECT * FROM payments WHERE order_id = $1
       ORDER BY id DESC LIMIT 1`,
      [order.id]
    );
    const payment = paymentRes.rows[0];
    if (!payment) return res.status(400).json({ error: 'No payment initiated' });

    let valid = false;
    if (MOCK_MODE) {
      valid = razorpay_signature === 'mock';
    } else {
      const expected = crypto
        .createHmac('sha256', KEY_SECRET)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');
      valid =
        expected === razorpay_signature &&
        razorpay_order_id === payment.provider_order_id;
    }

    if (!valid) {
      await query(`UPDATE payments SET status = 'failed' WHERE id = $1`, [
        payment.id,
      ]);
      return res.status(400).json({ error: 'Payment verification failed' });
    }

    await query(
      `UPDATE payments SET status = 'captured', provider_payment_id = $1
       WHERE id = $2`,
      [razorpay_payment_id || `mock_pay_${Date.now()}`, payment.id]
    );
    await query(`UPDATE orders SET status = 'paid' WHERE id = $1`, [order.id]);
    await query(
      `UPDATE service_requests SET status = 'submitted'
       WHERE order_id = $1 AND status = 'awaiting_payment'`,
      [order.id]
    );

    // Confirmation email listing the services now in progress.
    try {
      const userRes = await query('SELECT id, name, email FROM users WHERE id = $1', [
        req.user.id,
      ]);
      const filingRes = await query(
        'SELECT title FROM service_requests WHERE order_id = $1 ORDER BY id',
        [order.id]
      );
      const user = userRes.rows[0];
      if (user?.email) {
        await sendMail(orderPaidEmail({ user, order, filings: filingRes.rows }));
      }
    } catch (e) {
      console.error('Order-paid email failed:', e.message);
    }

    return res.json({ success: true, order_id: order.id, status: 'paid' });
  })
);

export default router;
