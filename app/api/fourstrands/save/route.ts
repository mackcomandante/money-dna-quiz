import { rateLimit } from '@/lib/rate-limit';
import { loadPlayer, MAX_SAVE_BYTES, PLAYER_COOKIE, readCookie, sessionSub, writeSave } from '@/lib/fourstrands-auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Saves the signed-in player's game. The client sends the version it last loaded; if another device saved since,
 * we answer 409 with the newer save so the client can switch to it instead of overwriting it.
 */
export async function PUT(req: Request) {
  const sub = sessionSub(readCookie(req, PLAYER_COOKIE));
  if (!sub) return Response.json({ error: 'Not signed in.' }, { status: 401 });
  if (!rateLimit(`fs-save:${sub}`, 60, 60_000)) return Response.json({ error: 'Saving too often.' }, { status: 429 });
  const raw = await req.text();
  if (raw.length > MAX_SAVE_BYTES) return Response.json({ error: 'Save is too large.' }, { status: 413 });
  let body: { save?: unknown; baseVersion?: unknown };
  try {
    body = JSON.parse(raw);
  } catch {
    return Response.json({ error: 'Bad save.' }, { status: 400 });
  }
  const baseVersion = Number(body.baseVersion);
  if (!Number.isInteger(baseVersion) || baseVersion < 0 || !body.save || typeof body.save !== 'object') return Response.json({ error: 'Bad save.' }, { status: 400 });
  const version = await writeSave(sub, body.save, baseVersion);
  if (version === null) {
    const player = await loadPlayer(sub);
    return Response.json({ error: 'conflict', save: player?.save ?? null, version: player?.version ?? 0 }, { status: 409, headers: { 'Cache-Control': 'no-store' } });
  }
  return Response.json({ version }, { headers: { 'Cache-Control': 'no-store' } });
}
