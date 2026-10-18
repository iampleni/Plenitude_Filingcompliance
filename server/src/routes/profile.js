import { Router } from 'express';
import { query } from '../db.js';
import { asyncHandler, authRequired } from '../utils.js';

const router = Router();

router.use(authRequired);

const ENTITY_TYPES = [
  'individual',
  'proprietorship',
  'partnership',
  'llp',
  'private_limited',
  'public_limited',
  'trust',
  'huf',
];

/** GET /api/profile — the client's statutory profile (empty defaults if unset). */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { rows } = await query(
      `SELECT u.name, u.email, u.phone,
              p.entity_type, p.legal_name, p.pan, p.gstin, p.aadhaar_last4,
              p.date_of_birth, p.address_line1, p.address_line2,
              p.city, p.state, p.pincode, p.updated_at
       FROM users u
       LEFT JOIN client_profiles p ON p.user_id = u.id
       WHERE u.id = $1`,
      [req.user.id]
    );
    const row = rows[0] || {};
    return res.json({
      profile: {
        ...row,
        entity_type: row.entity_type || 'individual',
        entity_types: ENTITY_TYPES,
      },
    });
  })
);

/** PUT /api/profile — create or update the profile. */
router.put(
  '/',
  asyncHandler(async (req, res) => {
    const {
      entity_type = 'individual',
      legal_name, pan, gstin, aadhaar_last4, date_of_birth,
      address_line1, address_line2, city, state, pincode,
    } = req.body || {};

    if (!ENTITY_TYPES.includes(entity_type)) {
      return res
        .status(400)
        .json({ error: `entity_type must be one of: ${ENTITY_TYPES.join(', ')}` });
    }

    const panNorm = pan ? String(pan).trim().toUpperCase() : null;
    if (panNorm && !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(panNorm)) {
      return res.status(400).json({ error: 'PAN must be in the format ABCDE1234F' });
    }

    const gstinNorm = gstin ? String(gstin).trim().toUpperCase() : null;
    if (gstinNorm && gstinNorm.length !== 15) {
      return res.status(400).json({ error: 'GSTIN must be 15 characters' });
    }

    const pin = pincode ? String(pincode).trim() : null;
    if (pin && !/^[1-9][0-9]{5}$/.test(pin)) {
      return res.status(400).json({ error: 'Pincode must be 6 digits' });
    }

    const clean = (v) => (v === undefined || v === '' ? null : v);

    await query(
      `INSERT INTO client_profiles
         (user_id, entity_type, legal_name, pan, gstin, aadhaar_last4, date_of_birth,
          address_line1, address_line2, city, state, pincode, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12, now())
       ON CONFLICT (user_id) DO UPDATE SET
         entity_type = EXCLUDED.entity_type,
         legal_name = EXCLUDED.legal_name,
         pan = EXCLUDED.pan,
         gstin = EXCLUDED.gstin,
         aadhaar_last4 = EXCLUDED.aadhaar_last4,
         date_of_birth = EXCLUDED.date_of_birth,
         address_line1 = EXCLUDED.address_line1,
         address_line2 = EXCLUDED.address_line2,
         city = EXCLUDED.city,
         state = EXCLUDED.state,
         pincode = EXCLUDED.pincode,
         updated_at = now()`,
      [
        req.user.id, entity_type, clean(legal_name), panNorm, gstinNorm,
        clean(aadhaar_last4), clean(date_of_birth), clean(address_line1),
        clean(address_line2), clean(city), clean(state), pin,
      ]
    );

    const { rows } = await query(
      'SELECT * FROM client_profiles WHERE user_id = $1',
      [req.user.id]
    );
    return res.json({ profile: { ...rows[0], entity_types: ENTITY_TYPES } });
  })
);

export { ENTITY_TYPES };
export default router;
