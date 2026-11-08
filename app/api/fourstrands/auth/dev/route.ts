import { createPlayerSession, loadPlayer, manilaToday, sessionCookie, upsertPlayer } from '@/lib/fourstrands-auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Local testing only: signs in a fake test player without Google. Needs FOURSTRANDS_DEV_LOGIN=1 and a localhost
 * request; it is a 404 everywhere else, including production.
 */
export async function POST(req: Request) {
  const host = new URL(req.url).hostname;
  if (process.env.FOURSTRANDS_DEV_LOGIN !== '1' || !['localhost', '127.0.0.1'].includes(host)) return new Response('Not found', { status: 404 });
  const user = { sub: 'dev-test-player', email: 'test.player@example.test', name: 'Test Player', picture: null };
  await upsertPlayer(user);
  const player = await loadPlayer(user.sub);
  const session = createPlayerSession(user.sub);
  return Response.json({ ...player, today: manilaToday() }, { headers: { 'Set-Cookie': sessionCookie(req, session.value, session.maxAge), 'Cache-Control': 'no-store' } });
}
