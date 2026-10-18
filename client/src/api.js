const TOKEN_KEY = 'taxdesk_token';

// In local development Vite proxies /api to the local server (see vite.config.js).
// In production (e.g. a Render static site) set VITE_API_URL to the API
// service's full URL, e.g. VITE_API_URL=https://your-api.onrender.com
const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

/** Build a full request URL for an /api path. */
export const apiUrl = (path) => `${API_BASE}/api${path}`;

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t) =>
  t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY);

/**
 * Thin fetch wrapper around the API.
 * Throws an Error (with .status) on non-2xx responses.
 */
export async function api(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (auth && token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(apiUrl(path), {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let data = {};
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { error: text };
    }
  }

  if (!res.ok) {
    const err = new Error(data.error || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}

export const inr = (n) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(Number(n || 0));

export const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { dateStyle: 'medium' }) : '—';

export const formatDateTime = (d) =>
  d ? new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—';

/** Turn a status string into a readable label + badge class. */
export function statusMeta(status) {
  const map = {
    pending: { label: 'Pending', cls: 'badge-warn' },
    paid: { label: 'Paid', cls: 'badge-ok' },
    processing: { label: 'Processing', cls: 'badge-info' },
    cancelled: { label: 'Cancelled', cls: 'badge-muted' },
    refunded: { label: 'Refunded', cls: 'badge-muted' },
    awaiting_payment: { label: 'Awaiting payment', cls: 'badge-warn' },
    submitted: { label: 'Submitted', cls: 'badge-info' },
    in_progress: { label: 'In progress', cls: 'badge-info' },
    completed: { label: 'Completed', cls: 'badge-ok' },
    rejected: { label: 'Rejected', cls: 'badge-danger' },
  };
  return map[status] || { label: status, cls: 'badge-muted' };
}

/** Upload a single file (multipart) with the auth header attached. */
export async function uploadFile(path, file) {
  const token = getToken();
  const fd = new FormData();
  fd.append('file', file);
  const res = await fetch(apiUrl(path), {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: fd,
  });
  const text = await res.text();
  let data = {};
  if (text) {
    try { data = JSON.parse(text); } catch { data = { error: text }; }
  }
  if (!res.ok) {
    const err = new Error(data.error || `Upload failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}

/** Download a file through an authenticated endpoint, then save it locally. */
export async function downloadFile(path, filename) {
  const token = getToken();
  const res = await fetch(apiUrl(path), {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    let msg = `Download failed (${res.status})`;
    try { const d = await res.json(); if (d.error) msg = d.error; } catch { /* ignore */ }
    throw new Error(msg);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || 'download';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Human-readable file size. */
export const fileSize = (bytes) => {
  const n = Number(bytes) || 0;
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
};
