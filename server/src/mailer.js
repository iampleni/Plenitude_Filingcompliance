import nodemailer from 'nodemailer';
import { query } from './db.js';

const FROM = process.env.SMTP_FROM || 'TaxDesk <no-reply@taxdesk.local>';

let transport = null;
const smtpConfigured = Boolean(process.env.SMTP_HOST);

if (smtpConfigured) {
  transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: String(process.env.SMTP_SECURE) === 'true',
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  });
}

export const emailMode = smtpConfigured ? 'smtp' : 'console';

/**
 * Send an email and record it in the email_log table.
 *
 * When SMTP is not configured (no SMTP_HOST), the message is printed to the
 * server console and logged with status 'logged' — so the whole notification
 * flow is exercisable in local development without a mail provider.
 */
export async function sendMail({ to, subject, text, html, userId = null }) {
  let status = 'logged';
  let error = null;

  if (smtpConfigured) {
    try {
      await transport.sendMail({ from: FROM, to, subject, text, html });
      status = 'sent';
    } catch (e) {
      status = 'failed';
      error = e.message;
    }
  } else {
    console.log(
      `\n──────── [email:console] ────────\nTo:      ${to}\nSubject: ${subject}\n\n${text}\n─────────────────────────────────\n`
    );
  }

  try {
    await query(
      `INSERT INTO email_log (user_id, to_email, subject, body, status, error)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, to, subject, text, status, error]
    );
  } catch (e) {
    console.error('Failed to write email_log:', e.message);
  }

  return { status, error };
}

const STATUS_LABELS = {
  awaiting_payment: 'Awaiting payment',
  submitted: 'Submitted',
  in_progress: 'In progress',
  completed: 'Completed',
  rejected: 'Rejected',
};

const label = (s) => STATUS_LABELS[s] || s;

/** Notification sent when a filing's status changes. */
export function statusChangeEmail({ user, filing, fromStatus, toStatus }) {
  const subject = `Your filing "${filing.title}" is now ${label(toStatus)}`;
  const text =
    `Hi ${user.name},\n\n` +
    `The status of your compliance service has been updated.\n\n` +
    `Service: ${filing.title}\n` +
    `Previous status: ${fromStatus ? label(fromStatus) : '—'}\n` +
    `New status: ${label(toStatus)}\n\n` +
    `You can track it any time from your TaxDesk dashboard.\n\n` +
    `— TaxDesk`;
  const html =
    `<p>Hi ${user.name},</p>` +
    `<p>The status of your compliance service has been updated.</p>` +
    `<table cellpadding="6"><tr><td><strong>Service</strong></td><td>${filing.title}</td></tr>` +
    `<tr><td><strong>Previous status</strong></td><td>${fromStatus ? label(fromStatus) : '—'}</td></tr>` +
    `<tr><td><strong>New status</strong></td><td>${label(toStatus)}</td></tr></table>` +
    `<p>You can track it any time from your TaxDesk dashboard.</p>`;
  return { to: user.email, subject, text, html, userId: user.id };
}

/** Notification sent when an order is paid. */
export function orderPaidEmail({ user, order, filings }) {
  const subject = `Payment received for order ${order.order_number}`;
  const list = filings.map((f) => `  • ${f.title}`).join('\n');
  const text =
    `Hi ${user.name},\n\n` +
    `We've received your payment of ₹${Number(order.total).toFixed(2)} for order ${order.order_number}.\n\n` +
    `Services now in progress:\n${list}\n\n` +
    `You can upload the required documents for each service from your dashboard.\n\n` +
    `— TaxDesk`;
  return { to: user.email, subject, text, userId: user.id };
}
