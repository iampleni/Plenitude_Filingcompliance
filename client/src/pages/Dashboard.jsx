import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, inr, formatDate, statusMeta } from '../api';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/dashboard')
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <div className="container page"><div className="alert alert-error">{error}</div></div>;
  if (!data) return <div className="container page"><p className="muted">Loading…</p></div>;

  const { stats, recent_orders, recent_filings } = data;

  return (
    <div className="container page">
      <div className="page-head">
        <h1>Welcome, {user.name.split(' ')[0]}</h1>
        <p>Your compliance overview at a glance.</p>
      </div>

      <div className="grid grid-4">
        <div className="stat"><div className="label">Total spend</div><div className="value">{inr(stats.total_spend)}</div></div>
        <div className="stat"><div className="label">Paid orders</div><div className="value">{stats.order_count}</div></div>
        <div className="stat"><div className="label">Open filings</div><div className="value">{stats.filings_open}</div></div>
        <div className="stat"><div className="label">Completed</div><div className="value">{stats.filings_completed}</div></div>
      </div>

      <div className="grid mt-3" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <div className="card">
          <div className="row-between mb-2">
            <h3>Recent orders</h3>
            <Link to="/orders" className="small">View all</Link>
          </div>
          {recent_orders.length === 0 ? (
            <p className="muted small">No orders yet. <Link to="/">Browse the catalogue</Link>.</p>
          ) : (
            <table className="table">
              <thead><tr><th>Order</th><th>Status</th><th>Total</th></tr></thead>
              <tbody>
                {recent_orders.map((o) => {
                  const s = statusMeta(o.status);
                  return (
                    <tr key={o.id}>
                      <td><Link to={`/orders/${o.id}`}>{o.order_number}</Link><br /><span className="muted small">{formatDate(o.created_at)}</span></td>
                      <td><span className={`badge ${s.cls}`}>{s.label}</span></td>
                      <td>{inr(o.total)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="card">
          <div className="row-between mb-2">
            <h3>Recent filings</h3>
            <Link to="/filings" className="small">View all</Link>
          </div>
          {recent_filings.length === 0 ? (
            <p className="muted small">No filings yet.</p>
          ) : (
            <table className="table">
              <thead><tr><th>Service</th><th>Status</th></tr></thead>
              <tbody>
                {recent_filings.map((f) => {
                  const s = statusMeta(f.status);
                  return (
                    <tr key={f.id}>
                      <td>{f.title}<br /><span className="muted small">{formatDate(f.created_at)}</span></td>
                      <td><span className={`badge ${s.cls}`}>{s.label}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
