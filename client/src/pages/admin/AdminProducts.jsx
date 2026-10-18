import { useEffect, useState } from 'react';
import { api, inr } from '../../api';

const EMPTY = {
  sku: '', name: '', category: '', description: '',
  price: '', tax_rate: 18, turnaround_days: 7,
};

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = () => {
    setLoading(true);
    api('/products?', { auth: false })
      .then((d) => setProducts(d.products))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api('/admin/products', {
        method: 'POST',
        body: {
          ...form,
          price: Number(form.price),
          tax_rate: Number(form.tax_rate),
          turnaround_days: Number(form.turnaround_days),
        },
      });
      setForm(EMPTY);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async (p) => {
    setError('');
    try {
      const { product } = await api(`/admin/products/${p.id}`, {
        method: 'PATCH',
        body: { active: !p.active },
      });
      setProducts((prev) => prev.map((x) => (x.id === p.id ? product : x)));
    } catch (err) {
      setError(err.message);
    }
  };

  const updatePrice = async (p, value) => {
    const price = Number(value);
    if (!Number.isFinite(price) || price <= 0) return;
    try {
      const { product } = await api(`/admin/products/${p.id}`, {
        method: 'PATCH',
        body: { price },
      });
      setProducts((prev) => prev.map((x) => (x.id === p.id ? product : x)));
      setEditing(null);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      <div className="page-head">
        <h1>Catalogue</h1>
        <p className="muted">Add services, edit prices, and activate or retire offerings.</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="card mb-2">
        <h3>Add a new service</h3>
        <form onSubmit={submit} className="grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <div className="field"><label>SKU</label><input value={form.sku} onChange={set('sku')} required /></div>
          <div className="field"><label>Name</label><input value={form.name} onChange={set('name')} required /></div>
          <div className="field"><label>Category</label><input value={form.category} onChange={set('category')} required /></div>
          <div className="field"><label>Price (₹)</label><input type="number" min="0" value={form.price} onChange={set('price')} required /></div>
          <div className="field"><label>GST %</label><input type="number" min="0" value={form.tax_rate} onChange={set('tax_rate')} /></div>
          <div className="field"><label>Turnaround (days)</label><input type="number" min="1" value={form.turnaround_days} onChange={set('turnaround_days')} /></div>
          <div className="field" style={{ gridColumn: '1 / -1' }}>
            <label>Description</label>
            <textarea rows="2" value={form.description} onChange={set('description')} />
          </div>
          <div><button className="btn" disabled={busy}>{busy ? 'Saving…' : 'Add service'}</button></div>
        </form>
      </div>

      {loading ? (
        <p className="muted">Loading…</p>
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>SKU</th><th>Service</th><th>Category</th><th>Price</th><th>GST</th><th>Status</th><th></th></tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id}>
                    <td>{p.sku}</td>
                    <td>{p.name}</td>
                    <td>{p.category}</td>
                    <td>
                      {editing === p.id ? (
                        <input
                          type="number"
                          defaultValue={p.price}
                          autoFocus
                          onBlur={(e) => updatePrice(p, e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && updatePrice(p, e.target.value)}
                          style={{ width: 110 }}
                        />
                      ) : (
                        <span onClick={() => setEditing(p.id)} style={{ cursor: 'pointer' }} title="Click to edit">
                          {inr(p.price)}
                        </span>
                      )}
                    </td>
                    <td>{Number(p.tax_rate)}%</td>
                    <td>
                      <span className={`badge ${p.active ? 'badge-ok' : 'badge-muted'}`}>
                        {p.active ? 'Active' : 'Retired'}
                      </span>
                    </td>
                    <td>
                      <button className="btn-outline btn btn-sm" onClick={() => toggleActive(p)}>
                        {p.active ? 'Retire' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
