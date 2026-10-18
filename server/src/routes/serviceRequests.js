import { Router } from 'express';
import fs from 'node:fs';
import { query } from '../db.js';
import { asyncHandler, authRequired } from '../utils.js';
import { uploadSingle, documentPath } from '../middleware/upload.js';

const router = Router();

router.use(authRequired);

const CLIENT_STATUSES = ['submitted', 'in_progress', 'completed'];

/** Load a filing the caller owns, joined with its order status. */
async function loadOwnedFiling(userId, filingId) {
  const { rows } = await query(
    `SELECT sr.*, o.status AS order_status, o.order_number
     FROM service_requests sr
     LEFT JOIN orders o ON o.id = sr.order_id
     WHERE sr.id = $1 AND sr.user_id = $2`,
    [filingId, userId]
  );
  return rows[0];
}

/** Documents may be uploaded only after the filing's order is paid. */
function isPaid(filing) {
  if (!filing.order_status) return true; // no linked order — allow
  return ['paid', 'processing'].includes(filing.order_status);
}

/** GET /api/service-requests — my filings. */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { rows } = await query(
      `SELECT sr.*, p.category, o.status AS order_status,
              (SELECT COUNT(*)::int FROM filing_documents d WHERE d.service_request_id = sr.id) AS document_count
       FROM service_requests sr
       LEFT JOIN products p ON p.id = sr.product_id
       LEFT JOIN orders o ON o.id = sr.order_id
       WHERE sr.user_id = $1
       ORDER BY sr.created_at DESC`,
      [req.user.id]
    );
    return res.json({ service_requests: rows });
  })
);

/** GET /api/service-requests/:id */
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const filing = await loadOwnedFiling(req.user.id, req.params.id);
    if (!filing) return res.status(404).json({ error: 'Request not found' });
    return res.json({ service_request: filing });
  })
);

/** PATCH /api/service-requests/:id — clients may add notes only. */
router.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const { notes } = req.body || {};
    const { rows } = await query(
      `UPDATE service_requests SET notes = COALESCE($1, notes)
       WHERE id = $2 AND user_id = $3 RETURNING *`,
      [notes ?? null, req.params.id, req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Request not found' });
    return res.json({ service_request: rows[0] });
  })
);

// ------------------------- Documents -------------------------

/** GET /api/service-requests/:id/documents */
router.get(
  '/:id/documents',
  asyncHandler(async (req, res) => {
    const filing = await loadOwnedFiling(req.user.id, req.params.id);
    if (!filing) return res.status(404).json({ error: 'Request not found' });

    const { rows } = await query(
      `SELECT id, original_name, mime_type, size_bytes, uploaded_at
       FROM filing_documents WHERE service_request_id = $1 ORDER BY uploaded_at DESC`,
      [filing.id]
    );
    return res.json({
      documents: rows,
      can_upload: isPaid(filing),
      order_status: filing.order_status,
    });
  })
);

/** POST /api/service-requests/:id/documents — upload a document (paid only). */
router.post(
  '/:id/documents',
  asyncHandler(async (req, res, next) => {
    const filing = await loadOwnedFiling(req.user.id, req.params.id);
    if (!filing) return res.status(404).json({ error: 'Request not found' });
    if (!isPaid(filing)) {
      return res.status(403).json({
        error: 'Documents can be uploaded once payment for this service is complete.',
      });
    }
    return uploadSingle(req, res, async (err) => {
      if (err) {
        const status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
        return res.status(status).json({ error: err.message });
      }
      if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

      try {
        const { rows } = await query(
          `INSERT INTO filing_documents
             (service_request_id, user_id, original_name, stored_name, mime_type, size_bytes)
           VALUES ($1,$2,$3,$4,$5,$6)
           RETURNING id, original_name, mime_type, size_bytes, uploaded_at`,
          [
            filing.id,
            req.user.id,
            req.file.originalname,
            req.file.filename,
            req.file.mimetype,
            req.file.size,
          ]
        );
        return res.status(201).json({ document: rows[0] });
      } catch (e) {
        return next(e);
      }
    });
  })
);

/** GET /api/service-requests/:id/documents/:docId/download — stream the file. */
router.get(
  '/:id/documents/:docId/download',
  asyncHandler(async (req, res) => {
    const filing = await loadOwnedFiling(req.user.id, req.params.id);
    if (!filing) return res.status(404).json({ error: 'Request not found' });

    const { rows } = await query(
      `SELECT * FROM filing_documents WHERE id = $1 AND service_request_id = $2`,
      [req.params.docId, filing.id]
    );
    const doc = rows[0];
    if (!doc) return res.status(404).json({ error: 'Document not found' });

    const abs = documentPath(doc.user_id, filing.id, doc.stored_name);
    if (!fs.existsSync(abs)) {
      return res.status(410).json({ error: 'File is no longer available on the server' });
    }
    res.setHeader('Content-Type', doc.mime_type || 'application/octet-stream');
    return res.download(abs, doc.original_name);
  })
);

/** DELETE /api/service-requests/:id/documents/:docId */
router.delete(
  '/:id/documents/:docId',
  asyncHandler(async (req, res) => {
    const filing = await loadOwnedFiling(req.user.id, req.params.id);
    if (!filing) return res.status(404).json({ error: 'Request not found' });

    const { rows } = await query(
      `DELETE FROM filing_documents WHERE id = $1 AND service_request_id = $2
       RETURNING stored_name, user_id`,
      [req.params.docId, filing.id]
    );
    const doc = rows[0];
    if (!doc) return res.status(404).json({ error: 'Document not found' });

    const abs = documentPath(doc.user_id, filing.id, doc.stored_name);
    fs.rm(abs, { force: true }, () => {});
    return res.json({ success: true });
  })
);

export { CLIENT_STATUSES, isPaid };
export default router;
