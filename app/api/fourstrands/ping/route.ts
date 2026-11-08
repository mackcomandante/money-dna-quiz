import { clientIp, rateLimit } from '@/lib/rate-limit';
import { PLAYER_COOKIE, readCookie, sessionSub } from '@/lib/fourstrands-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const num = (v: unknown, max: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.min(max, Math.round(v))) : null);

/**
 * The game says "I'm playing" (on open, and as turns are played) so the admin dashboard can count daily players,
 * guests included. Only a random phone id and a small game summary are stored; nothing personal.
 */
export async function POST(req: Request) {
  if (!rateLimit(`fs-ping:${clientIp(req)}`, 60, 60_000)) return new Response(null, { status: 429 });
  let b: { device?: unknown; turns?: unknown; snap?: Record<string, unknown> };
  try {
    const raw = await req.text();
    if (raw.length > 2000) return new Response(null, { status: 413 });
    b = JSON.parse(raw);
  } catch {
    return new Response(null, { status: 400 });
  }
  const device = typeof b.device === 'string' && /^[a-z0-9-]{8,40}$/i.test(b.device) ? b.device : null;
  const sub = sessionSub(readCookie(req, PLAYER_COOKIE));
  if (!sub && !device) return new Response(null, { status: 400 });
  const s = b.snap && typeof b.snap === 'object' ? b.snap : {};
  const snapshot = {
    type: typeof s.type === 'string' && /^[DISC]$/.test(s.type) ? s.type : null,
    age: num(s.age, 120), streak: num(s.streak, 100000), best: num(s.best, 100000), day: num(s.day, 100000),
    levels: num(s.levels, 40), coins: num(s.coins, 1e6), spent: num(s.spent, 1e7), cards: num(s.cards, 1e6),
    over: s.over === 'broke' || s.over === 'legacy' ? s.over : null,
  };
  const { error } = await supabaseAdmin().rpc('fourstrands_touch', {
    p_actor: sub || `g:${device}`, p_signed_in: !!sub, p_device: device, p_turns: num(b.turns, 1e6), p_snapshot: snapshot,
  });
  if (error) console.warn('[fourstrands] ping failed:', error.message);
  return new Response(null, { status: 204 });
}
