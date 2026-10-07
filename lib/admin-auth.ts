import 'server-only';
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

// Single-password admin login. Set ADMIN_PASSWORD in the environment; the admin area is disabled without it.
// Sessions are a signed, HttpOnly cookie. The signing key is derived from ADMIN_PASSWORD and the
// Supabase service key, so changing the password signs everyone out.

export const ADMIN_COOKIE = 'mdna_admin';
const SESSION_HOURS = 8;

function signingKey(): Buffer | null {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return null;
  return createHash('sha256').update(`mdna-admin:${password}:${process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''}`).digest();
}

const sign = (data: string, key: Buffer) => createHmac('sha256', key).update(data).digest('base64url');

function safeEqual(a: string, b: string): boolean {
  const x = createHash('sha256').update(a).digest();
  const y = createHash('sha256').update(b).digest();
  return timingSafeEqual(x, y);
}

export function adminConfigured(): boolean {
  return !!process.env.ADMIN_PASSWORD;
}

export function checkPassword(input: unknown): boolean {
  const password = process.env.ADMIN_PASSWORD;
  return !!password && typeof input === 'string' && safeEqual(input, password);
}

export function createSession(): { value: string; maxAge: number } {
  const key = signingKey();
  if (!key) throw new Error('ADMIN_PASSWORD is not set');
  const maxAge = SESSION_HOURS * 3600;
  const payload = Buffer.from(JSON.stringify({ exp: Date.now() + maxAge * 1000 })).toString('base64url');
  return { value: `${payload}.${sign(payload, key)}`, maxAge };
}

export function isValidSession(token: string | undefined): boolean {
  const key = signingKey();
  if (!key || !token) return false;
  const [payload, sig] = token.split('.');
  if (!payload || !sig || !safeEqual(sig, sign(payload, key))) return false;
  try {
    const { exp } = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return typeof exp === 'number' && exp > Date.now();
  } catch {
    return false;
  }
}

/** For admin pages: redirects to the login page unless signed in. */
export async function requireAdmin(): Promise<void> {
  const jar = await cookies();
  if (!isValidSession(jar.get(ADMIN_COOKIE)?.value)) redirect('/admin/login');
}

/** For admin API routes. */
export function isAdminRequest(req: Request): boolean {
  const cookie = req.headers.get('cookie') ?? '';
  const token = cookie.split(/;\s*/).find((c) => c.startsWith(`${ADMIN_COOKIE}=`))?.slice(ADMIN_COOKIE.length + 1);
  return isValidSession(token ? decodeURIComponent(token) : undefined);
}
