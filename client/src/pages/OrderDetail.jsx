import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api, inr, formatDateTime, statusMeta } from '../api';

export default function OrderDetail() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api(`/orders/${id}`)
      .then((d) => setOrder(d.order))
      .catch((e) => setError(e.message));
  }, [id]);

  if (error) return <div className="container page"><div className="alert alert-error">{error}</div></div>;
  if (!order) return <div className="container page"><p className="muted">Loading…</p></div>;

  const s = statusMeta(order.status);

  return (
    <div className="container page">
      <Link to="/orders" className="small">← Back to orders</Link>
      <div className="page-head row-between mt-1">
        <div>
          <h1>{order.order_number}</h1>
          <p className="muted">Placed {formatDateTime(order.created_at)}</p>
        </div>
        <span className={`badge ${s.cls}`}>{s.label}</span>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '2fr 1fr' }}>
        <div className="card">
          <h3>Items</h3>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Service</th><th>Unit price</th><th>Qty</th><th>GST</th></tr></thead>
              <tbody>
                {order.items.map((it) => (
                  <tr key={it.id}>
                    <td>{it.product_name}</td>
                    <td>{inr(it.unit_price)}</td>
                    <td>{it.quantity}</td>
                    <td>{Number(it.tax_rate)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {order.filings?.length > 0 && (
            <>
              <h3 className="mt-3">Linked filings</h3>
              <table className="table">
                <thead><tr><th>Service</th><th>Status</th></tr></thead>
                <tbody>
                  {order.filings.map((f) => {
                    const fs = statusMeta(f.status);
                    return (
                      <tr key={f.id}>
                        <td>{f.title}</td>
                        <td><span className={`badge ${fs.cls}`}>{fs.label}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </>
          )}
        </div>

        <div className="card" style={{ alignSelf: 'start' }}>
          <h3>Summary</h3>
          <div className="summary-row"><span>Subtotal</span><span>{inr(order.subtotal)}</span></div>
          <div className="summary-row"><span>GST</span><span>{inr(order.tax_total)}</span></div>
          <div className="summary-row total"><span>Total</span><span>{inr(order.total)}</span></div>

          {order.payments?.length > 0 && (
            <p className="muted small mt-2">
              Payment: {order.payments[0].status} ({order.payments[0].provider})
            </p>
          )}

          {order.status === 'pending' && (
            <Link to={`/order-success/${order.id}`} className="btn btn-block mt-2">Pay now</Link>
          )}
        </div>
      </div>
    </div>
  );
}
