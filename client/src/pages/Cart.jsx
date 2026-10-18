import { Link } from 'react-router-dom';
import { inr } from '../api';
import { useCart } from '../context/CartContext';
import { useState } from 'react';

export default function Cart() {
  const { cart, updateItem, removeItem, clear } = useCart();
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);

  const run = async (id, fn) => {
    setBusyId(id);
    setError('');
    try {
      await fn();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyId(null);
    }
  };

  if (!cart) return <div className="container page"><p className="muted">Loading cart…</p></div>;

  if (cart.items.length === 0) {
    return (
      <div className="container page">
        <div className="page-head"><h1>Your cart</h1></div>
        <div className="card empty">
          <p>Your cart is empty.</p>
          <Link to="/" className="btn">Browse services</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container page">
      <div className="page-head row-between">
        <h1>Your cart</h1>
        <button className="btn-ghost" onClick={() => run('clear', clear)} disabled={busyId === 'clear'}>
          Clear cart
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="grid" style={{ gridTemplateColumns: '2fr 1fr' }}>
        <div className="card">
          {cart.items.map((it) => (
            <div className="cart-line" key={it.id}>
              <div className="info">
                <strong>{it.name}</strong>
                <div className="muted small">{it.category} · {inr(it.price)} + {it.tax_rate}% GST</div>
              </div>
              <div className="qty">
                <button
                  className="btn btn-outline btn-sm"
                  onClick={() => run(it.id, () => updateItem(it.id, it.quantity - 1))}
                  disabled={it.quantity <= 1 || busyId === it.id}
                >
                  −
                </button>
                <input
                  type="number"
                  min="1"
                  value={it.quantity}
                  onChange={(e) => {
                    const v = Math.max(1, parseInt(e.target.value, 10) || 1);
                    if (v !== it.quantity) run(it.id, () => updateItem(it.id, v));
                  }}
                />
                <button
                  className="btn btn-outline btn-sm"
                  onClick={() => run(it.id, () => updateItem(it.id, it.quantity + 1))}
                  disabled={busyId === it.id}
                >
                  +
                </button>
              </div>
              <div style={{ minWidth: 90, textAlign: 'right' }}>{inr(it.line_total)}</div>
              <button
                className="btn-ghost"
                onClick={() => run(it.id, () => removeItem(it.id))}
                disabled={busyId === it.id}
                title="Remove"
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        <div className="card" style={{ alignSelf: 'start' }}>
          <h3>Order summary</h3>
          <div className="summary-row"><span>Subtotal</span><span>{inr(cart.subtotal)}</span></div>
          <div className="summary-row"><span>GST</span><span>{inr(cart.tax_total)}</span></div>
          <div className="summary-row total"><span>Total</span><span>{inr(cart.total)}</span></div>
          <Link to="/checkout" className="btn btn-block mt-2">Proceed to checkout</Link>
        </div>
      </div>
    </div>
  );
}
