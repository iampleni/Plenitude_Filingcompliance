import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import ProductCard from '../components/ProductCard.jsx';
import { useAuth } from '../context/AuthContext';

export default function Home() {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Category list (once).
  useEffect(() => {
    api('/products/categories', { auth: false })
      .then((d) => setCategories(d.categories))
      .catch(() => {});
  }, []);

  // Product list (re-runs on filter change).
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    const params = new URLSearchParams();
    if (category) params.set('category', category);
    if (search) params.set('search', search);
    api(`/products?${params.toString()}`, { auth: false })
      .then((d) => active && setProducts(d.products))
      .catch((e) => active && setError(e.message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [category, search]);

  return (
    <div>
      <header className="hero">
        <div className="container">
          <h1>File your tax returns, registrations and compliances — all in one place.</h1>
          <p>
            Choose the service you need, pay securely, and track every filing from
            your dashboard. Built for individuals, freelancers and growing businesses.
          </p>
          {!user && (
            <Link to="/register" className="btn">
              Create your account
            </Link>
          )}
          {user && (
            <Link to="/dashboard" className="btn">
              Go to dashboard
            </Link>
          )}
        </div>
      </header>

      <div className="container page">
        <div className="page-head row-between">
          <div>
            <h2>Service catalogue</h2>
            <p>Transparent pricing, GST-inclusive totals at checkout.</p>
          </div>
        </div>

        <div className="row mb-2" style={{ flexWrap: 'wrap' }}>
          <input
            placeholder="Search services…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ maxWidth: 280 }}
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            style={{ maxWidth: 220 }}
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.category} value={c.category}>
                {c.category} ({c.count})
              </option>
            ))}
          </select>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        {loading ? (
          <p className="muted">Loading services…</p>
        ) : products.length === 0 ? (
          <div className="empty">No services match your search.</div>
        ) : (
          <div className="grid grid-3">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
