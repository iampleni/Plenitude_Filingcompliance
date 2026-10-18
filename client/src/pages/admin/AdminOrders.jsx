import { useEffect, useState } from 'react';
import { api, inr, formatDate, statusMeta } from '../../api';

const STATUSES = ['pending', 'paid', 'processing', 'cancelled', 'refunded'];

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  const load = () => {
    setLoading(true);
    const qs = filter ? `?status=${filter}` : '';
    api(`/admin/orders${qs}`)
      .then((d) => setOrders(d.orders))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const changeStatus = async (order, status) => {
    setBusyId(order.id);
    setError('');
    try {
      await api(`/admin/orders/${order.id}`, { method: 'PATCH', body: { status } });
      setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, status } : o)));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <div className="page-head row-between">
        <div><h1>Orders</h1><p className="muted">All orders across clients.</p></div>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} style={{ maxWidth: 200 }}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{statusMeta(s).label}</option>)}
        </select>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {loading ? (
        <p className="muted">Loading…</p>
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>Order #</th><th>Client</th><th>Date</th><th>Items</th><th>Total</th><th>Status</th><th>Update</th></tr>
              </thead>
              <tbody>
                {orders.map((o) => {
                  const s = statusMeta(o.status);
                  return (
                    <tr key={o.id}>
                      <td><strong>{o.order_number}</strong></td>
                      <td>{o.client_name}<br /><span className="muted small">{o.client_email}</span></td>
                      <td>{formatDate(o.created_at)}</td>
                      <td>{o.item_count}</td>
                      <td>{inr(o.total)}</td>
                      <td><span className={`badge ${s.cls}`}>{s.label}</span></td>
                      <td>
                        <select
                          value={o.status}
                          onChange={(e) => changeStatus(o, e.target.value)}
                          disabled={busyId === o.id}
                          style={{ minWidth: 130 }}
                        >
                          {STATUSES.map((st) => <option key={st} value={st}>{statusMeta(st).label}</option>)}
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {orders.length === 0 && <p className="empty">No orders found.</p>}
        </div>
      )}
    </div>
  );
}
