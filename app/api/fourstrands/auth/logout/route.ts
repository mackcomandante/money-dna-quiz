import { sessionCookie } from '@/lib/fourstrands-auth';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  return Response.json({ ok: true }, { headers: { 'Set-Cookie': sessionCookie(req, '', 0), 'Cache-Control': 'no-store' } });
}
