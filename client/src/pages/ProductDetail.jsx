import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api, inr } from '../api';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addItem } = useCart();

  const [product, setProduct] = useState(null);
  const [qty, setQty] = useState(1);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    let active = true;
    api(`/products/${id}`, { auth: false })
      .then((d) => active && setProduct(d.product))
      .catch((e) => active && setError(e.message));
    return () => {
      active = false;
    };
  }, [id]);

  const handleAdd = async () => {
    if (!user) {
      navigate('/login', { state: { from: `/product/${id}` } });
      return;
    }
    if (user.role === 'admin') return;
    setBusy(true);
    setError('');
    try {
      await addItem(product.id, qty);
      setAdded(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (error && !product) return <div className="container page"><div className="alert alert-error">{error}</div></div>;
  if (!product) return <div className="container page"><p className="muted">Loading…</p></div>;

  const tax = (Number(product.price) * Number(product.tax_rate)) / 100;
  const total = Number(product.price) + tax;

  return (
    <div className="container page">
      <Link to="/" className="small">← Back to catalogue</Link>
      <div className="grid mt-2" style={{ gridTemplateColumns: '2fr 1fr' }}>
        <div className="card">
          <span className="cat" style={{ color: 'var(--teal-dark)', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' }}>
            {product.category}
          </span>
          <h1>{product.name}</h1>
          <p className="muted">{product.description}</p>
          <table className="table mt-2">
            <tbody>
              <tr><td>Service fee</td><td>{inr(product.price)}</td></tr>
              <tr><td>GST ({Number(product.tax_rate)}%)</td><td>{inr(tax)}</td></tr>
              <tr><td><strong>Total</strong></td><td><strong>{inr(total)}</strong></td></tr>
              <tr><td>Estimated turnaround</td><td>{product.turnaround_days} working days</td></tr>
            </tbody>
          </table>
        </div>

        <div className="card">
          <h3>Add to cart</h3>
          {error && <div className="alert alert-error">{error}</div>}
          <div className="field">
            <label>Quantity</label>
            <input
              type="number"
              min="1"
              value={qty}
              onChange={(e) => setQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
            />
          </div>
          <div className="price mb-2">{inr(total * qty)}</div>
          <button className="btn btn-block" onClick={handleAdd} disabled={busy}>
            {busy ? 'Adding…' : 'Add to cart'}
          </button>
          {added && (
            <div className="mt-2">
              <div className="alert alert-ok">Added to your cart.</div>
              <Link to="/cart" className="btn btn-outline btn-block">Go to cart</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
