import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api, inr, statusMeta } from '../api';

export default function OrderSuccess() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [paid, setPaid] = useState(false);

  const load = () =>
    api(`/orders/${id}`)
      .then((d) => {
        setOrder(d.order);
        if (d.order.status === 'paid') setPaid(true);
      })
      .catch((e) => setError(e.message));

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const pay = async () => {
    setBusy(true);
    setError('');
    try {
      const created = await api('/payments/create', {
        method: 'POST',
        body: { order_id: order.id },
      });

      // In mock mode there is no real checkout UI — confirm immediately.
      if (created.mock) {
        await api('/payments/verify', {
          method: 'POST',
          body: {
            order_id: order.id,
            razorpay_order_id: created.provider_order_id,
            razorpay_payment_id: `mock_pay_${Date.now()}`,
            razorpay_signature: 'mock',
          },
        });
        await load();
        setPaid(true);
        return;
      }

      // Real Razorpay checkout. Requires the Razorpay script on the page.
      if (!window.Razorpay) {
        throw new Error('Razorpay checkout script not loaded. Add it to index.html to enable live payments.');
      }
      const rzp = new window.Razorpay({
        key: created.key_id,
        amount: created.amount,
        currency: created.currency,
        name: 'TaxDesk',
        description: `Order ${order.order_number}`,
        order_id: created.provider_order_id,
        handler: async (resp) => {
          await api('/payments/verify', {
            method: 'POST',
            body: {
              order_id: order.id,
              razorpay_order_id: resp.razorpay_order_id,
              razorpay_payment_id: resp.razorpay_payment_id,
              razorpay_signature: resp.razorpay_signature,
            },
          });
          await load();
          setPaid(true);
        },
        theme: { color: '#0f9d8f' },
      });
      rzp.open();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (error && !order) return <div className="container page"><div className="alert alert-error">{error}</div></div>;
  if (!order) return <div className="container page"><p className="muted">Loading order…</p></div>;

  const s = statusMeta(order.status);

  return (
    <div className="container page">
      <div className="auth-wrap" style={{ maxWidth: 640 }}>
        <div className="card">
          {paid ? (
            <>
              <div className="alert alert-ok">Payment successful — your order is confirmed.</div>
              <h2>Thank you!</h2>
              <p className="muted">
                Order <strong>{order.order_number}</strong> has been paid. Your filings are now
                queued and visible on your dashboard.
              </p>
              <div className="row mt-2">
                <Link to="/filings" className="btn">View my filings</Link>
                <Link to="/dashboard" className="btn btn-outline">Go to dashboard</Link>
              </div>
            </>
          ) : (
            <>
              <h2>Order placed</h2>
              <p className="muted">
                Order <strong>{order.order_number}</strong> is awaiting payment.
              </p>
              {error && <div className="alert alert-error">{error}</div>}
              <div className="summary-row"><span>Status</span><span><span className={`badge ${s.cls}`}>{s.label}</span></span></div>
              <div className="summary-row total"><span>Amount payable</span><span>{inr(order.total)}</span></div>
              <button className="btn btn-block mt-2" onClick={pay} disabled={busy}>
                {busy ? 'Processing…' : `Pay ${inr(order.total)}`}
              </button>
              <button className="btn-ghost btn-block mt-1" onClick={() => navigate('/orders')}>
                Pay later
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
