import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) {
      setError('Passwords do not match');
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setBusy(true);
    try {
      await register({
        name: form.name,
        email: form.email,
        phone: form.phone,
        password: form.password,
      });
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container page">
      <div className="auth-wrap">
        <div className="card">
          <h2>Create your account</h2>
          <p className="muted small mb-2">Start filing in minutes.</p>
          {error && <div className="alert alert-error">{error}</div>}
          <form onSubmit={submit}>
            <div className="field">
              <label>Full name</label>
              <input value={form.name} onChange={set('name')} required />
            </div>
            <div className="field">
              <label>Email</label>
              <input type="email" value={form.email} onChange={set('email')} required />
            </div>
            <div className="field">
              <label>Phone (optional)</label>
              <input value={form.phone} onChange={set('phone')} />
            </div>
            <div className="field">
              <label>Password</label>
              <input type="password" value={form.password} onChange={set('password')} required />
            </div>
            <div className="field">
              <label>Confirm password</label>
              <input type="password" value={form.confirm} onChange={set('confirm')} required />
            </div>
            <button className="btn btn-block" disabled={busy}>
              {busy ? 'Creating account…' : 'Create account'}
            </button>
          </form>
          <p className="small mt-2">
            Already registered? <Link to="/login">Log in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
