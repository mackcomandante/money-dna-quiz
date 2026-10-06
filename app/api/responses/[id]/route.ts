import { supabaseAdmin } from '@/lib/supabase-admin';
import { isValidEmail } from '@/lib/validation';
import { rateLimit, clientIp } from '@/lib/rate-limit';
import { sendProfileEmail } from '@/lib/email';
import type { TypeKey } from '@/lib/quiz-data';

export const dynamic = 'force-dynamic';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EDIT_WINDOW_MS = 2 * 60 * 60 * 1000; // email can be attached within 2h of finishing

/** Attaches an email (+ marketing opt-in) to a response, then emails the full profile. */
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

  if (updErr) {
    console.error('[responses] update failed', updErr);
    return Response.json({ error: 'Could not save your email' }, { status: 500 });
  }

  const scores = { D: row.score_d, I: row.score_i, S: row.score_s, C: row.score_c };
  const sent = await sendProfileEmail(email, row.primary_type as TypeKey, scores);
  if (sent) await db.from('quiz_responses').update({ email_sent_at: new Date().toISOString() }).eq('id', id);

  return Response.json({ ok: true, sent });
}
