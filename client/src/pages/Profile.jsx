import { useEffect, useState } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

const STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry',
];

const ENTITY_LABELS = {
  individual: 'Individual',
  proprietorship: 'Proprietorship',
  partnership: 'Partnership firm',
  llp: 'LLP',
  private_limited: 'Private Limited',
  public_limited: 'Public Limited',
  trust: 'Trust / Society',
  huf: 'HUF',
};

const EMPTY = {
  entity_type: 'individual', legal_name: '', pan: '', gstin: '', aadhaar_last4: '',
  date_of_birth: '', address_line1: '', address_line2: '', city: '', state: '', pincode: '',
};

export default function Profile() {
  const { user } = useAuth();
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api('/profile')
      .then((d) => {
        const p = d.profile || {};
        setForm({
          ...EMPTY,
          ...Object.fromEntries(
            Object.keys(EMPTY).map((k) => [k, p[k] ?? EMPTY[k]])
          ),
          date_of_birth: p.date_of_birth ? String(p.date_of_birth).slice(0, 10) : '',
        });
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const set = (k) => (e) => {
    setForm({ ...form, [k]: e.target.value });
    setSaved(false);
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api('/profile', { method: 'PUT', body: form });
      setSaved(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="container page"><p className="muted">Loading profile…</p></div>;

  return (
    <div className="container page">
      <div className="page-head">
        <h1>My profile</h1>
        <p>These statutory details are used to prepare your filings and registrations.</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {saved && <div className="alert alert-ok">Profile saved.</div>}

      <form onSubmit={submit} className="card">
        <h3>Account</h3>
        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <div className="field">
            <label>Name</label>
            <input value={user?.name || ''} disabled />
          </div>
          <div className="field">
            <label>Email</label>
            <input value={user?.email || ''} disabled />
          </div>
        </div>

        <h3 className="mt-2">Business / entity details</h3>
        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <div className="field">
            <label>Entity type</label>
            <select value={form.entity_type} onChange={set('entity_type')}>
              {Object.entries(ENTITY_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Legal / registered name</label>
            <input value={form.legal_name} onChange={set('legal_name')} />
          </div>
          <div className="field">
            <label>PAN</label>
            <input
              value={form.pan}
              onChange={set('pan')}
              placeholder="ABCDE1234F"
              style={{ textTransform: 'uppercase' }}
            />
          </div>
          <div className="field">
            <label>GSTIN (if registered)</label>
            <input
              value={form.gstin}
              onChange={set('gstin')}
              placeholder="15-character GSTIN"
              style={{ textTransform: 'uppercase' }}
            />
          </div>
          <div className="field">
            <label>Date of birth</label>
            <input type="date" value={form.date_of_birth} onChange={set('date_of_birth')} />
          </div>
          <div className="field">
            <label>Aadhaar (last 4 digits)</label>
            <input
              value={form.aadhaar_last4}
              onChange={set('aadhaar_last4')}
              maxLength={4}
              placeholder="1234"
            />
          </div>
        </div>

        <h3 className="mt-2">Address</h3>
        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <div className="field">
            <label>Address line 1</label>
            <input value={form.address_line1} onChange={set('address_line1')} />
          </div>
          <div className="field">
            <label>Address line 2</label>
            <input value={form.address_line2} onChange={set('address_line2')} />
          </div>
          <div className="field">
            <label>City</label>
            <input value={form.city} onChange={set('city')} />
          </div>
          <div className="field">
            <label>State</label>
            <select value={form.state} onChange={set('state')}>
              <option value="">Select state…</option>
              {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Pincode</label>
            <input value={form.pincode} onChange={set('pincode')} maxLength={6} placeholder="560001" />
          </div>
        </div>

        <button className="btn mt-1" disabled={saving}>
          {saving ? 'Saving…' : 'Save profile'}
        </button>
      </form>
    </div>
  );
}
