import 'server-only';
import { TYPES, TYPE_ORDER, type TypeKey } from './quiz-data';
import { percentages, type Scores } from './scoring';

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

export function hermesUrl(): string {
  const base = process.env.NEXT_PUBLIC_HERMES_URL || 'https://hermes.exoasia.org';
  const u = new URL(base);
  u.searchParams.set('utm_source', 'money-dna-quiz');
  u.searchParams.set('utm_medium', 'email');
  return u.toString();
}

export function profileEmailHtml(primary: TypeKey, scores: Scores, resend = false): string {
  const t = TYPES[primary];
  const pct = percentages(scores);
  const rows = TYPE_ORDER.map((k) => `
    <tr><td style="padding:6px 0;font:600 14px Arial,sans-serif;color:#F2F5F9"><span style="display:inline-block;width:10px;height:10px;border-radius:5px;background:${TYPES[k].color};margin-right:8px"></span>${esc(TYPES[k].short)}</td>
    <td style="padding:6px 0;font:600 14px Arial,sans-serif;color:#A9B6C8;text-align:right">${pct[k]}%</td></tr>`).join('');
  return `<!doctype html><html><body style="margin:0;background:#0F1B2D">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0F1B2D"><tr><td align="center" style="padding:32px 16px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px">
    <tr><td style="font:800 20px Arial,sans-serif;color:#F2F5F9;padding-bottom:24px">Money DNA</td></tr>
    ${resend ? '<tr><td style="padding:0 4px 18px;font:400 15px/1.55 Arial,sans-serif;color:#C9D4E3">Someone asked us to send your Money DNA report to this address again. Here is your original result. If that wasn\'t you, you can ignore this email.</td></tr>' : ''}
    <tr><td style="background:#17263D;border:2px solid #24364F;border-radius:20px;padding:24px">
      <span style="display:inline-block;padding:6px 12px;border-radius:14px;background:${t.color};color:#0F1B2D;font:800 12px Arial,sans-serif;letter-spacing:.06em">MONEY DNA · ${primary}</span>
      <h1 style="margin:14px 0 10px;font:800 30px Arial,sans-serif;color:#FFFFFF">${esc(t.name)}</h1>
      <p style="margin:0 0 18px;font:400 16px/1.55 Arial,sans-serif;color:#C9D4E3">${esc(t.summary)}</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>
    </td></tr>
    <tr><td style="padding:24px 4px 0;font:400 15px/1.55 Arial,sans-serif;color:#C9D4E3"><b style="color:#FFFFFF">Your Full Money DNA Report is attached.</b> It covers how you handle money, your superpowers and shadow, how you react under stress, your ${esc(t.short)} Blueprint and coaching questions.</td></tr>
    <tr><td style="padding:24px 4px 0;font:700 16px Arial,sans-serif;color:#F5B841">Where your type gets stuck</td></tr>
    <tr><td style="padding:8px 4px 0;font:400 15px/1.55 Arial,sans-serif;color:#C9D4E3">${esc(t.stuck)}</td></tr>
    <tr><td style="padding:20px 4px 0;font:700 16px Arial,sans-serif;color:#3CC3A8">Your first move</td></tr>
    <tr><td style="padding:8px 4px 0;font:400 15px/1.55 Arial,sans-serif;color:#C9D4E3">${esc(t.move)}</td></tr>
    <tr><td style="padding:28px 0 0">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:2px solid #F5B841;border-radius:18px"><tr><td style="padding:20px">
        <p style="margin:0 0 6px;font:700 18px Arial,sans-serif;color:#FFFFFF">Your full profile is also waiting in the Hermes app.</p>
        <p style="margin:0 0 16px;font:400 14px/1.5 Arial,sans-serif;color:#C9D4E3">Create your free account to open it anytime, then turn your Money DNA into your Financial Wellness Roadmap.</p>
        <a href="${esc(hermesUrl())}" style="display:inline-block;padding:14px 22px;border-radius:14px;background:#F5B841;color:#0F1B2D;font:700 15px Arial,sans-serif;text-decoration:none">Create my free Hermes account</a>
      </td></tr></table>
    </td></tr>
    <tr><td style="padding:28px 4px 0;font:400 12px/1.5 Arial,sans-serif;color:#8796AB">Money DNA is adapted from the DISC behavioural model. You received this because you asked for your Money DNA profile.</td></tr>
  </table></td></tr></table></body></html>`;
}

/** Sends via Resend's REST API. Returns false (without throwing) if email isn't configured or fails. */
export interface EmailAttachment { filename: string; content: Buffer }

export async function sendProfileEmail(
  to: string, primary: TypeKey, scores: Scores, attachment?: EmailAttachment, opts: { resend?: boolean } = {},
): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!key || !from) {
    console.warn('[email] RESEND_API_KEY or EMAIL_FROM not set; skipping send');
    return false;
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to: [to],
        reply_to: process.env.EMAIL_REPLY_TO || undefined,
        subject: opts.resend ? `Your Money DNA report, sent again: ${TYPES[primary].name}` : `Your Money DNA: ${TYPES[primary].name}`,
        html: profileEmailHtml(primary, scores, opts.resend),
        attachments: attachment ? [{ filename: attachment.filename, content: attachment.content.toString('base64') }] : undefined,
      }),
    });
    if (!res.ok) console.error('[email] Resend error', res.status, await res.text());
    return res.ok;
  } catch (e) {
    console.error('[email] send failed', e);
    return false;
  }
}
