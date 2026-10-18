import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, inr, formatDate, statusMeta } from '../api';

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api('/orders')
      .then((d) => setOrders(d.orders))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="container page">
      <div className="page-head"><h1>My orders</h1></div>
      {error && <div className="alert alert-error">{error}</div>}
      {loading ? (
        <p className="muted">Loading…</p>
      ) : orders.length === 0 ? (
        <div className="card empty">
          <p>You haven't placed any orders yet.</p>
          <Link to="/" className="btn">Browse services</Link>
        </div>
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>Order #</th><th>Date</th><th>Items</th><th>Status</th><th>Total</th><th></th></tr>
              </thead>
              <tbody>
                {orders.map((o) => {
                  const s = statusMeta(o.status);
                  return (
                    <tr key={o.id}>
                      <td><strong>{o.order_number}</strong></td>
                      <td>{formatDate(o.created_at)}</td>
                      <td>{o.item_count}</td>
                      <td><span className={`badge ${s.cls}`}>{s.label}</span></td>
                      <td>{inr(o.total)}</td>
                      <td>
                        {o.status === 'pending' ? (
                          <Link to={`/order-success/${o.id}`} className="btn btn-sm">Pay now</Link>
                        ) : (
                          <Link to={`/orders/${o.id}`} className="btn-ghost">View</Link>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
