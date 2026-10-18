import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, formatDate, statusMeta } from '../api';
import FilingDocuments from '../components/FilingDocuments.jsx';

export default function Filings() {
  const [filings, setFilings] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState(null);

  useEffect(() => {
    api('/service-requests')
      .then((d) => setFilings(d.service_requests))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="container page">
      <div className="page-head">
        <h1>My filings</h1>
        <p>Track each compliance service and upload the documents it needs.</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <p className="muted">Loading…</p>
      ) : filings.length === 0 ? (
        <div className="card empty">
          <p>No filings yet. Purchase a service to get started.</p>
          <Link to="/" className="btn">Browse services</Link>
        </div>
      ) : (
        <div className="grid">
          {filings.map((f) => {
            const s = statusMeta(f.status);
            const paid = ['paid', 'processing'].includes(f.order_status);
            const open = openId === f.id;
            return (
              <div className="card" key={f.id}>
                <div className="row-between">
                  <div>
                    <h3 style={{ marginBottom: 2 }}>{f.title}</h3>
                    <span className="muted small">
                      {f.category || 'Service'} · submitted {formatDate(f.created_at)}
                    </span>
                  </div>
                  <div className="row" style={{ gap: 10 }}>
                    <span className={`badge ${s.cls}`}>{s.label}</span>
                    <button
                      className="btn-outline btn btn-sm"
                      onClick={() => setOpenId(open ? null : f.id)}
                    >
                      {open ? 'Hide documents' : `Documents${f.document_count ? ` (${f.document_count})` : ''}`}
                    </button>
                  </div>
                </div>

                {f.notes && <p className="small mt-1"><strong>Note from us:</strong> {f.notes}</p>}

                {open && (
                  <div className="mt-2">
                    <FilingDocuments filingId={f.id} canUpload={paid} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
