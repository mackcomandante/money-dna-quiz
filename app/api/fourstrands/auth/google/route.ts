import { clientIp, rateLimit } from '@/lib/rate-limit';
import { createPlayerSession, loadPlayer, manilaToday, sessionCookie, upsertPlayer, verifyGoogleIdToken } from '@/lib/fourstrands-auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** "Continue with Google": swaps a Google ID token for our session cookie, and returns the player's saved game. */
export async function POST(req: Request) {
  if (!rateLimit(`fs-login:${clientIp(req)}`, 20, 5 * 60_000)) return Response.json({ error: 'Too many sign-ins. Try again in a few minutes.' }, { status: 429 });
  let credential = '';
  try {
    credential = String(((await req.json()) as { credential?: unknown }).credential || '');
  } catch {}
  if (!credential || credential.length > 5000) return Response.json({ error: 'Missing Google sign-in.' }, { status: 400 });
  let user;
  try {
    user = await verifyGoogleIdToken(credential);
  } catch (e) {
    console.warn('[fourstrands] Google sign-in rejected:', (e as Error).message);
    return Response.json({ error: 'Google sign-in could not be verified.' }, { status: 401 });
  }
  await upsertPlayer(user);
  const player = await loadPlayer(user.sub);
  const session = createPlayerSession(user.sub);
  return Response.json({ ...player, today: manilaToday() }, { headers: { 'Set-Cookie': sessionCookie(req, session.value, session.maxAge), 'Cache-Control': 'no-store' } });
}
