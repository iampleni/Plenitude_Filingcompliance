import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import authRoutes from './routes/auth.js';
import productRoutes from './routes/products.js';
import cartRoutes from './routes/cart.js';
import orderRoutes from './routes/orders.js';
import paymentRoutes from './routes/payments.js';
import dashboardRoutes from './routes/dashboard.js';
import serviceRequestRoutes from './routes/serviceRequests.js';
import adminRoutes from './routes/admin.js';
import profileRoutes from './routes/profile.js';

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN
      ? process.env.CLIENT_ORIGIN.split(',')
      : true,
    credentials: true,
  })
);
app.use(express.json());

// Health check. Also reports whether DATABASE_URL reached the process (and its
// host only — never credentials), which makes deployment problems obvious.
app.get('/api/health', (req, res) => {
  const url = process.env.DATABASE_URL || '';
  const host = (url.match(/@([^/:?#]+)/) || [])[1] || null;
  res.json({
    ok: true,
    service: 'taxdesk',
    db_configured: Boolean(url),
    db_host: host,
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/service-requests', serviceRequestRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/admin', adminRoutes);

// 404
app.use((req, res) => {
  res.status(404).json({ error: `No route for ${req.method} ${req.path}` });
});

// error handler
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  // PostgreSQL connection failures arrive as an AggregateError with an empty
  // .message, so fall back to the error code to keep the response useful.
  const message = err.message || err.code || 'Server error';
  res.status(err.status || 500).json({ error: message, code: err.code || undefined });
});

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`TaxDesk API listening on http://localhost:${port}`);
});
