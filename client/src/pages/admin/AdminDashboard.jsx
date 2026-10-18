import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, inr, formatDate, statusMeta } from '../../api';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api('/admin/stats'), api('/admin/orders')])
      .then(([s, o]) => {
        setStats(s.stats);
        setOrders(o.orders.slice(0, 6));
      })
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <div className="alert alert-error">{error}</div>;
  if (!stats) return <p className="muted">Loading…</p>;

  return (
    <div>
      <div className="page-head">
        <h1>Overview</h1>
        <p className="muted">Business health across all clients.</p>
      </div>

      <div className="grid grid-4">
        <div className="stat"><div className="label">Revenue (paid)</div><div className="value">{inr(stats.revenue)}</div></div>
        <div className="stat"><div className="label">Clients</div><div className="value">{stats.clients}</div></div>
        <div className="stat"><div className="label">Orders</div><div className="value">{stats.orders_total}</div></div>
        <div className="stat"><div className="label">Pending orders</div><div className="value">{stats.orders_pending}</div></div>
      </div>

      <div className="grid grid-4 mt-2">
        <div className="stat"><div className="label">Paid orders</div><div className="value">{stats.paid_orders}</div></div>
        <div className="stat"><div className="label">Filings total</div><div className="value">{stats.filings_total}</div></div>
        <div className="stat"><div className="label">Filings open</div><div className="value">{stats.filings_open}</div></div>
        <div className="stat"><div className="label">Filings completed</div><div className="value">{stats.filings_completed}</div></div>
      </div>

      <div className="card mt-3">
        <div className="row-between mb-2">
          <h3>Recent orders</h3>
          <Link to="/admin/orders" className="small">Manage all</Link>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Order #</th><th>Client</th><th>Date</th><th>Status</th><th>Total</th></tr></thead>
            <tbody>
              {orders.map((o) => {
                const s = statusMeta(o.status);
                return (
                  <tr key={o.id}>
                    <td>{o.order_number}</td>
                    <td>{o.client_name}<br /><span className="muted small">{o.client_email}</span></td>
                    <td>{formatDate(o.created_at)}</td>
                    <td><span className={`badge ${s.cls}`}>{s.label}</span></td>
                    <td>{inr(o.total)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
