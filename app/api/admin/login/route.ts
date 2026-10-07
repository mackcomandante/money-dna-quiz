import { ADMIN_COOKIE, adminConfigured, checkPassword, createSession } from '@/lib/admin-auth';
import { rateLimit, clientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

/** Signs the admin in with ADMIN_PASSWORD and sets the session cookie. */
export async function POST(req: Request) {
  if (!adminConfigured()) return Response.json({ error: 'Admin access is not set up. Add ADMIN_PASSWORD to the environment.' }, { status: 503 });
  if (!rateLimit(`admin-login:${clientIp(req)}`, 5, 5 * 60_000)) {
    return Response.json({ error: 'Too many attempts. Wait 5 minutes and try again.' }, { status: 429 });
  }
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return Response.json({ error: 'Invalid request' }, { status: 400 }); }

  if (!checkPassword(body.password)) {
    await new Promise((r) => setTimeout(r, 600)); // slow down guessing
    return Response.json({ error: 'Wrong password' }, { status: 401 });
  }
  const { value, maxAge } = createSession();
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return new Response(JSON.stringify({ ok: true }), {
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': `${ADMIN_COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`,
    },
  });
}
