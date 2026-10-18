import 'dotenv/config';
import { pool } from './db.js';

const products = [
  // --- Income Tax ---
  {
    sku: 'ITR-1',
    name: 'Income Tax Return — ITR-1 (Salaried)',
    category: 'Income Tax',
    description:
      'Filing of ITR-1 Sahaj for resident individuals with income from salary, one house property and other sources up to ₹50 lakh.',
    price: 1499,
    tax_rate: 18,
    turnaround_days: 3,
  },
  {
    sku: 'ITR-2',
    name: 'Income Tax Return — ITR-2 (Capital Gains)',
    category: 'Income Tax',
    description:
      'Filing of ITR-2 for individuals/HUF with capital gains, more than one house property or foreign assets.',
    price: 3499,
    tax_rate: 18,
    turnaround_days: 5,
  },
  {
    sku: 'ITR-3',
    name: 'Income Tax Return — ITR-3 (Business/Profession)',
    category: 'Income Tax',
    description:
      'Filing of ITR-3 for individuals/HUF carrying on a business or profession with books of accounts.',
    price: 5999,
    tax_rate: 18,
    turnaround_days: 7,
  },
  {
    sku: 'TDS-RET',
    name: 'TDS Return Filing (Quarterly)',
    category: 'Income Tax',
    description:
      'Preparation and filing of quarterly TDS statements (24Q/26Q/27Q) with Form 16/16A generation.',
    price: 2499,
    tax_rate: 18,
    turnaround_days: 5,
  },
  // --- GST ---
  {
    sku: 'GST-REG',
    name: 'GST Registration',
    category: 'GST',
    description:
      'End-to-end GST registration including application drafting, ARN tracking and certificate download.',
    price: 1999,
    tax_rate: 18,
    turnaround_days: 7,
  },
  {
    sku: 'GST-RET-1',
    name: 'GST Return Filing — GSTR-1 & 3B (Monthly)',
    category: 'GST',
    description:
      'Monthly filing of outward supply returns (GSTR-1) and summary returns (GSTR-3B) with reconciliation.',
    price: 1299,
    tax_rate: 18,
    turnaround_days: 2,
  },
  {
    sku: 'GST-RET-Q',
    name: 'GST Return Filing — Quarterly (QRMP)',
    category: 'GST',
    description:
      'Quarterly return filing under the QRMP scheme, including IFF for the first two months.',
    price: 2999,
    tax_rate: 18,
    turnaround_days: 3,
  },
  {
    sku: 'GST-AMD',
    name: 'GST Amendment / Core Field Change',
    category: 'GST',
    description:
      'Amendments to registration details such as address, business name, additional place of business or signatory.',
    price: 999,
    tax_rate: 18,
    turnaround_days: 5,
  },
  // --- Registrations ---
  {
    sku: 'CO-INC',
    name: 'Private Limited Company Incorporation',
    category: 'Registrations',
    description:
      'Company incorporation with SPICe+ including DIN, PAN, TAN, GST and bank account assistance.',
    price: 7999,
    tax_rate: 18,
    turnaround_days: 15,
  },
  {
    sku: 'LLP-INC',
    name: 'LLP Incorporation',
    category: 'Registrations',
    description:
      'Limited Liability Partnership formation with FiLLiP, DPIN and agreement drafting.',
    price: 5999,
    tax_rate: 18,
    turnaround_days: 12,
  },
  {
    sku: 'TRADEMARK',
    name: 'Trademark Registration (TM-A)',
    category: 'Registrations',
    description:
      'Trademark search and filing of TM-A application for one class, including examination response support.',
    price: 6499,
    tax_rate: 18,
    turnaround_days: 10,
  },
  {
    sku: 'MSME-REG',
    name: 'MSME / Udyam Registration',
    category: 'Registrations',
    description:
      'Udyam (MSME) registration for micro, small and medium enterprises with certificate.',
    price: 799,
    tax_rate: 18,
    turnaround_days: 2,
  },
  // --- Other statutory compliance ---
  {
    sku: 'ROC-AOC4',
    name: 'ROC Annual Filing — AOC-4 & MGT-7',
    category: 'ROC & Corporate',
    description:
      'Annual filings with the Registrar of Companies including financial statements and annual return.',
    price: 4499,
    tax_rate: 18,
    turnaround_days: 10,
  },
  {
    sku: 'PF-ESIC',
    name: 'PF & ESIC Registration + Monthly Returns',
    category: 'Payroll Compliance',
    description:
      'Provident Fund and ESIC registration along with monthly ECR return filing.',
    price: 2199,
    tax_rate: 18,
    turnaround_days: 6,
  },
  {
    sku: 'PT-REG',
    name: 'Professional Tax Registration',
    category: 'Payroll Compliance',
    description:
      'State-wise professional tax registration (PTRC/PTEC) and enrolment support.',
    price: 1499,
    tax_rate: 18,
    turnaround_days: 7,
  },
  {
    sku: 'DSC',
    name: 'Digital Signature Certificate (Class 3)',
    category: 'Registrations',
    description:
      'Class 3 DSC issuance for directors, partners and authorised signatories (2-year validity).',
    price: 1299,
    tax_rate: 18,
    turnaround_days: 3,
  },
];

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const p of products) {
      await client.query(
        `INSERT INTO products (sku, name, category, description, price, tax_rate, turnaround_days)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT (sku) DO UPDATE
           SET name = EXCLUDED.name,
               category = EXCLUDED.category,
               description = EXCLUDED.description,
               price = EXCLUDED.price,
               tax_rate = EXCLUDED.tax_rate,
               turnaround_days = EXCLUDED.turnaround_days,
               active = true`,
        [
          p.sku,
          p.name,
          p.category,
          p.description,
          p.price,
          p.tax_rate,
          p.turnaround_days,
        ]
      );
    }
    await client.query('COMMIT');
    console.log(`✓ Seeded ${products.length} products.`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('✗ Seed failed:', err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
