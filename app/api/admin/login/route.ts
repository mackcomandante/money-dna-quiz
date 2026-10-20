import { ADMIN_COOKIE, adminConfigured, checkPassword, createSession } from '@/lib/admin-auth';
import { rateLimit, clientIp, isLimited } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const FAIL_KEY = 'admin-login-fail:all';
const FAIL_LIMIT = 30; // failed attempts from ALL addresses combined…
const FAIL_WINDOW_MS = 15 * 60_000; // …per 15 minutes, to stop guessing spread across many IPs

const tooMany = (msg: string, retryAfter: number) =>
  Response.json({ error: msg }, { status: 429, headers: { 'Retry-After': String(retryAfter) } });

/** Signs the admin in with ADMIN_PASSWORD and sets the session cookie. */
export async function POST(req: Request) {
  if (!adminConfigured()) return Response.json({ error: 'Admin access is not set up. Add ADMIN_PASSWORD to the environment.' }, { status: 503 });
  const ip = clientIp(req);
  if (isLimited(FAIL_KEY, FAIL_LIMIT)) {
    console.warn(`[admin] sign-in paused after ${FAIL_LIMIT} failed attempts; refused attempt from ${ip}`);
    return tooMany('Admin sign-in is paused for 15 minutes after too many failed attempts.', 900);
  }
  if (!rateLimit(`admin-login:${ip}`, 5, 5 * 60_000)) {
    console.warn(`[admin] sign-in rate limit hit from ${ip}`);
    return tooMany('Too many attempts. Wait 5 minutes and try again.', 300);
  }
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return Response.json({ error: 'Invalid request' }, { status: 400 }); }

  if (!checkPassword(body.password)) {
    rateLimit(FAIL_KEY, FAIL_LIMIT, FAIL_WINDOW_MS);
    console.warn(`[admin] failed sign-in from ${ip}`);
    await new Promise((r) => setTimeout(r, 600)); // slow down guessing
    return Response.json({ error: 'Wrong password' }, { status: 401 });
  }
  console.info(`[admin] signed in from ${ip}`);
  const { value, maxAge } = createSession();
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return new Response(JSON.stringify({ ok: true }), {
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': `${ADMIN_COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`,
    },
  });
}
