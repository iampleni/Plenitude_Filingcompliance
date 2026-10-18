import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';

export const UPLOAD_ROOT =
  process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');

// Ensure the root exists at startup.
fs.mkdirSync(UPLOAD_ROOT, { recursive: true });

const ALLOWED = new Set([
  '.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx',
  '.xls', '.xlsx', '.csv', '.txt',
]);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Files are namespaced per user + filing so ownership is easy to verify.
    const dir = path.join(UPLOAD_ROOT, String(req.user.id), String(req.params.id));
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});

const maxBytes = (Number(process.env.MAX_UPLOAD_MB) || 10) * 1024 * 1024;

export const uploadSingle = multer({
  storage,
  limits: { fileSize: maxBytes },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED.has(ext)) {
      return cb(new Error(`Unsupported file type "${ext}". Allowed: PDF, images, Word, Excel, CSV, TXT.`));
    }
    return cb(null, true);
  },
}).single('file');

/** Absolute path to a stored document. */
export function documentPath(userId, filingId, storedName) {
  return path.join(UPLOAD_ROOT, String(userId), String(filingId), storedName);
}
