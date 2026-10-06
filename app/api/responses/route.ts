import { supabaseAdmin } from '@/lib/supabase-admin';
import { isValidAnswers, scoreAnswers } from '@/lib/scoring';
import { cleanProfile, shortText } from '@/lib/validation';
import { rateLimit, clientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

/** Saves a completed quiz (profile + 20 answers). Scores are recomputed server-side. */
export async function POST(req: Request) {
  if (!rateLimit(`create:${clientIp(req)}`, 10)) return Response.json({ error: 'Too many requests' }, { status: 429 });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return Response.json({ error: 'Invalid JSON' }, { status: 400 }); }

  if (body.website) return Response.json({ id: null }); // honeypot: silently ignore bots

  const profile = cleanProfile(body.profile);
  if (!profile) return Response.json({ error: 'Profile is incomplete' }, { status: 400 });
  if (!isValidAnswers(body.answers)) return Response.json({ error: 'Answers are invalid' }, { status: 400 });

  const { scores, primary } = scoreAnswers(body.answers);
  const utm = (body.utm && typeof body.utm === 'object' ? body.utm : {}) as Record<string, unknown>;

  const { data, error } = await supabaseAdmin()
    .from('quiz_responses')
    .insert({
      gender: profile.gender,
      age_range: profile.age,
      marital_status: profile.marital,
      education: profile.education,
      employment: profile.employment,
      dependents: profile.dependents,
      financially_free: profile.financiallyFree,
      balance_happiness: Number(profile.balanceHappiness),
      worries: profile.worries,
      answers: body.answers,
      score_d: scores.D, score_i: scores.I, score_s: scores.S, score_c: scores.C,
      primary_type: primary,
      utm_source: shortText(utm.source), utm_medium: shortText(utm.medium), utm_campaign: shortText(utm.campaign),
      referrer: shortText(body.referrer, 500),
      user_agent: shortText(req.headers.get('user-agent'), 500),
    })
    .select('id')
    .single();

  if (error) {
    console.error('[responses] insert failed', error);
    return Response.json({ error: 'Could not save your answers' }, { status: 500 });
  }
  return Response.json({ id: data.id, primary, scores });
}
