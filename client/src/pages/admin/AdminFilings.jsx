import { useEffect, useState, Fragment } from 'react';
import { api, formatDate, statusMeta, downloadFile, fileSize, formatDateTime } from '../../api';

const STATUSES = ['awaiting_payment', 'submitted', 'in_progress', 'completed', 'rejected'];

export default function AdminFilings() {
  const [filings, setFilings] = useState([]);
  const [filter, setFilter] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [notesDraft, setNotesDraft] = useState({});
  const [docsOpen, setDocsOpen] = useState(null);
  const [docs, setDocs] = useState([]);

  const load = () => {
    setLoading(true);
    const qs = filter ? `?status=${filter}` : '';
    api(`/admin/service-requests${qs}`)
      .then((d) => setFilings(d.service_requests))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const save = async (filing, patch) => {
    setBusyId(filing.id);
    setError('');
    try {
      const { service_request } = await api(`/admin/service-requests/${filing.id}`, {
        method: 'PATCH',
        body: patch,
      });
      setFilings((prev) => prev.map((f) => (f.id === filing.id ? { ...f, ...service_request } : f)));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyId(null);
    }
  };

  const toggleDocs = async (filing) => {
    if (docsOpen === filing.id) {
      setDocsOpen(null);
      return;
    }
    setDocsOpen(filing.id);
    setDocs([]);
    try {
      const { documents } = await api(`/admin/service-requests/${filing.id}/documents`);
      setDocs(documents);
    } catch (e) {
      setError(e.message);
    }
  };

  const download = async (doc) => {
    setError('');
    try {
      await downloadFile(`/admin/documents/${doc.id}/download`, doc.original_name);
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div>
      <div className="page-head row-between">
        <div><h1>Filings</h1><p className="muted">Every service request across clients.</p></div>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} style={{ maxWidth: 210 }}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{statusMeta(s).label}</option>)}
        </select>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {loading ? (
        <p className="muted">Loading…</p>
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>Service</th><th>Client</th><th>Category</th><th>Submitted</th><th>Status</th><th>Internal notes</th><th>Docs</th></tr>
              </thead>
              <tbody>
                {filings.map((f) => {
                  const s = statusMeta(f.status);
                  return (
                    <Fragment key={f.id}>
                      <tr key={f.id}>
                        <td>{f.title}<br /><span className="muted small">{f.order_number}</span></td>
                        <td>{f.client_name}<br /><span className="muted small">{f.client_email}</span></td>
                        <td>{f.category || '—'}</td>
                        <td>{formatDate(f.created_at)}</td>
                        <td>
                          <select
                            value={f.status}
                            onChange={(e) => save(f, { status: e.target.value })}
                            disabled={busyId === f.id}
                            style={{ minWidth: 140 }}
                          >
                            {STATUSES.map((st) => <option key={st} value={st}>{statusMeta(st).label}</option>)}
                          </select>
                          <div className="mt-1"><span className={`badge ${s.cls}`}>{s.label}</span></div>
                        </td>
                        <td>
                          <input
                            placeholder="Add note…"
                            value={notesDraft[f.id] ?? f.notes ?? ''}
                            onChange={(e) => setNotesDraft({ ...notesDraft, [f.id]: e.target.value })}
                            onBlur={() => {
                              const val = notesDraft[f.id];
                              if (val !== undefined && val !== (f.notes ?? '')) save(f, { notes: val });
                            }}
                            style={{ minWidth: 160 }}
                          />
                        </td>
                        <td>
                          <button className="btn-outline btn btn-sm" onClick={() => toggleDocs(f)}>
                            {docsOpen === f.id ? 'Hide' : 'View'}
                          </button>
                        </td>
                      </tr>
                      {docsOpen === f.id && (
                        <tr key={`${f.id}-docs`}>
                          <td colSpan={7} style={{ background: '#f8fafd' }}>
                            {docs.length === 0 ? (
                              <span className="muted small">No documents uploaded.</span>
                            ) : (
                              <table className="table">
                                <tbody>
                                  {docs.map((d) => (
                                    <tr key={d.id}>
                                      <td>{d.original_name}</td>
                                      <td className="muted small">{fileSize(d.size_bytes)}</td>
                                      <td className="muted small">{formatDateTime(d.uploaded_at)}</td>
                                      <td>
                                        <button className="btn-ghost" onClick={() => download(d)}>Download</button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
          {filings.length === 0 && <p className="empty">No filings found.</p>}
        </div>
      )}
    </div>
  );
}
