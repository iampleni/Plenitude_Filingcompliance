import { useEffect, useState } from 'react';
import { api, uploadFile, downloadFile, fileSize, formatDateTime } from '../api';

/**
 * Document panel for a single filing.
 * Uploads are disabled until the filing's order is paid (server-enforced too).
 */
export default function FilingDocuments({ filingId, canUpload }) {
  const [docs, setDocs] = useState([]);
  const [allowed, setAllowed] = useState(canUpload);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () =>
    api(`/service-requests/${filingId}/documents`)
      .then((d) => {
        setDocs(d.documents);
        setAllowed(d.can_upload);
      })
      .catch((e) => setError(e.message));

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filingId]);

  const onUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      await uploadFile(`/service-requests/${filingId}/documents`, file);
      e.target.value = '';
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id) => {
    setError('');
    try {
      await api(`/service-requests/${filingId}/documents/${id}`, { method: 'DELETE' });
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const download = async (doc) => {
    setError('');
    try {
      await downloadFile(
        `/service-requests/${filingId}/documents/${doc.id}/download`,
        doc.original_name
      );
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="doc-panel">
      {error && <div className="alert alert-error">{error}</div>}

      {!allowed ? (
        <div className="alert alert-info">
          Document upload unlocks once payment for this service is complete.
        </div>
      ) : (
        <div className="row" style={{ alignItems: 'center' }}>
          <label className="btn btn-outline btn-sm" style={{ cursor: 'pointer', margin: 0 }}>
            {busy ? 'Uploading…' : '＋ Upload document'}
            <input
              type="file"
              onChange={onUpload}
              disabled={busy}
              style={{ display: 'none' }}
            />
          </label>
          <span className="muted small">
            PDF, Word, Excel, image or CSV · up to 10 MB
          </span>
        </div>
      )}

      {docs.length === 0 ? (
        <p className="muted small mt-1">No documents uploaded yet.</p>
      ) : (
        <table className="table mt-1">
          <thead>
            <tr><th>File</th><th>Size</th><th>Uploaded</th><th></th></tr>
          </thead>
          <tbody>
            {docs.map((d) => (
              <tr key={d.id}>
                <td>{d.original_name}</td>
                <td>{fileSize(d.size_bytes)}</td>
                <td>{formatDateTime(d.uploaded_at)}</td>
                <td className="row" style={{ gap: 6 }}>
                  <button className="btn-ghost" onClick={() => download(d)}>Download</button>
                  {allowed && (
                    <button className="btn-ghost" onClick={() => remove(d.id)} title="Delete">✕</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
