import { supabaseAdmin } from '@/lib/supabase-admin';
import { isValidEmail } from '@/lib/validation';
import { rateLimit, clientIp } from '@/lib/rate-limit';
import { sendProfileEmail, type EmailAttachment } from '@/lib/email';
import { renderReportPdf, reportFilename } from '@/lib/report-pdf';
import type { TypeKey } from '@/lib/quiz-data';

export const dynamic = 'force-dynamic';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EDIT_WINDOW_MS = 2 * 60 * 60 * 1000; // email can be attached within 2h of finishing
const EMAIL_TAKEN = 'That email is already associated with a previous assessment.';

type ReportRow = { id: string; created_at: string; primary_type: string; score_d: number; score_i: number; score_s: number; score_c: number };

/** Renders the Full Money DNA Report for a stored response and emails it. Sends without the PDF if rendering fails. */
async function emailReport(to: string, row: ReportRow, resend = false): Promise<boolean> {
  const scores = { D: row.score_d, I: row.score_i, S: row.score_s, C: row.score_c };
  const primary = row.primary_type as TypeKey;
  let report: EmailAttachment | undefined;
  try {
    report = { filename: reportFilename(primary), content: await renderReportPdf({ primary, scores, date: new Date(row.created_at) }) };
  } catch (e) {
    console.error('[responses] report render failed; sending email without it', e);
  }
  return sendProfileEmail(to, primary, scores, report, { resend });
}

/**
 * A repeat email gets its ORIGINAL report re-sent to that inbox, once per email ever.
 * Nothing about the original result is returned to this browser.
 */
async function resendOriginal(db: ReturnType<typeof supabaseAdmin>, email: string, original: ReportRow & { report_resent_at: string | null }) {
  const already = () => Response.json(
    { error: `${EMAIL_TAKEN} We've already re-sent the original report to that address once. Check the inbox and spam folder.`, notice: true },
    { status: 409 },
  );
  if (original.report_resent_at) return already();

  // Claim the single re-send atomically, so two simultaneous requests can't both send.
  const { data: claimed } = await db
    .from('quiz_responses')
    .update({ report_resent_at: new Date().toISOString() })
    .eq('id', original.id)
    .is('report_resent_at', null)
    .select('id');
  if (!claimed?.length) return already();

  const sent = await emailReport(email, original, true);
  if (!sent) {
    // Release the claim so a failed send doesn't use up the one re-send.
    await db.from('quiz_responses').update({ report_resent_at: null }).eq('id', original.id);
    return Response.json({ error: `${EMAIL_TAKEN} We couldn't re-send the report just now. Try again later.` }, { status: 409 });
  }
  await db.from('quiz_responses').update({ email_sent_at: new Date().toISOString() }).eq('id', original.id);
  return Response.json({ error: `${EMAIL_TAKEN} We've sent the original report to that address again.`, notice: true }, { status: 409 });
}

/** Attaches an email (+ marketing opt-in) to a response, then emails the profile with the Full Money DNA Report attached. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_RE.test(id)) return Response.json({ error: 'Not found' }, { status: 404 });
  if (!rateLimit(`email:${clientIp(req)}`, 5)) return Response.json({ error: 'Too many requests' }, { status: 429 });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return Response.json({ error: 'Invalid JSON' }, { status: 400 }); }

  if (!isValidEmail(body.email)) return Response.json({ error: 'Enter a valid email address' }, { status: 400 });
  const email = body.email.trim().toLowerCase();
  const optIn = body.optIn === true;

  const db = supabaseAdmin();
  const { data: row, error: readErr } = await db
    .from('quiz_responses')
    .select('id, created_at, email, primary_type, score_d, score_i, score_s, score_c')
    .eq('id', id)
    .maybeSingle();

  if (readErr || !row) return Response.json({ error: 'Not found' }, { status: 404 });
  if (row.email) return Response.json({ error: 'An email is already attached to this result' }, { status: 409 });
  if (Date.now() - new Date(row.created_at).getTime() > EDIT_WINDOW_MS) {
    return Response.json({ error: 'This result has expired. Please retake the quiz.' }, { status: 410 });
  }

  // One assessment per email (emails are stored lowercased). The unique index on lower(email) also guards against races.
  const { data: original } = await db
    .from('quiz_responses')
    .select('id, created_at, primary_type, score_d, score_i, score_s, score_c, report_resent_at')
    .eq('email', email)
    .neq('id', id)
    .maybeSingle();
  if (original) return resendOriginal(db, email, original);

  const now = new Date().toISOString();
  const { error: updErr } = await db
    .from('quiz_responses')
    .update({
      email,
      email_submitted_at: now,
      email_opt_in: optIn,
      opt_in_at: optIn ? now : null,
      consent_version: process.env.CONSENT_VERSION || null,
    })
    .eq('id', id)
    .is('email', null);

  if (updErr?.code === '23505') return Response.json({ error: EMAIL_TAKEN }, { status: 409 });
  if (updErr) {
    console.error('[responses] update failed', updErr);
    return Response.json({ error: 'Could not save your email' }, { status: 500 });
  }

  const sent = await emailReport(email, row);
  if (sent) await db.from('quiz_responses').update({ email_sent_at: new Date().toISOString() }).eq('id', id);

  return Response.json({ ok: true, sent });
}
