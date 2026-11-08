import { googleClientId, loadPlayer, manilaToday, PLAYER_COOKIE, readCookie, sessionSub } from '@/lib/fourstrands-auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** Who is signed in (if anyone), their saved game, today's date in Manila, and the Google client id for the button. */
export async function GET(req: Request) {
  const base = { clientId: googleClientId(), today: manilaToday(), devLogin: process.env.FOURSTRANDS_DEV_LOGIN === '1' && ['localhost', '127.0.0.1'].includes(new URL(req.url).hostname) };
  const sub = sessionSub(readCookie(req, PLAYER_COOKIE));
  const player = sub ? await loadPlayer(sub) : null;
  return Response.json({ ...base, ...(player || { user: null }) }, { headers: { 'Cache-Control': 'no-store' } });
}
