import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api, inr } from '../api';
import { useCart } from '../context/CartContext';

export default function Checkout() {
  const { cart, refresh } = useCart();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (!cart) return <div className="container page"><p className="muted">Loading…</p></div>;

  if (cart.items.length === 0) {
    return (
      <div className="container page">
        <div className="card empty">
          <p>Your cart is empty.</p>
          <Link to="/" className="btn">Browse services</Link>
        </div>
      </div>
    );
  }

  const placeOrder = async () => {
    setBusy(true);
    setError('');
    try {
      const { order } = await api('/orders', { method: 'POST' });
      await refresh();
      navigate(`/order-success/${order.id}`);
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  };

  return (
    <div className="container page">
      <div className="page-head"><h1>Checkout</h1><p>Review your order and confirm.</p></div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="grid" style={{ gridTemplateColumns: '2fr 1fr' }}>
        <div className="card">
          <h3>Items</h3>
          <table className="table">
            <thead><tr><th>Service</th><th>Qty</th><th>Line total</th></tr></thead>
            <tbody>
              {cart.items.map((it) => (
                <tr key={it.id}>
                  <td>{it.name}</td>
                  <td>{it.quantity}</td>
                  <td>{inr(it.line_total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card" style={{ alignSelf: 'start' }}>
          <h3>Payment summary</h3>
          <div className="summary-row"><span>Subtotal</span><span>{inr(cart.subtotal)}</span></div>
          <div className="summary-row"><span>GST</span><span>{inr(cart.tax_total)}</span></div>
          <div className="summary-row total"><span>Amount payable</span><span>{inr(cart.total)}</span></div>
          <button className="btn btn-block mt-2" onClick={placeOrder} disabled={busy}>
            {busy ? 'Placing order…' : 'Place order & pay'}
          </button>
          <p className="muted small mt-1">You'll confirm payment on the next step.</p>
        </div>
      </div>
    </div>
  );
}
