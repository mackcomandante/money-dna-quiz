import 'server-only';
import { createHash, createHmac, createPublicKey, timingSafeEqual, verify } from 'node:crypto';
import { supabaseAdmin } from './supabase-admin';

// Four Strands accounts: "Sign in with Google" only, no passwords.
// The browser gets a Google ID token from Google's button; we verify it here against Google's public keys,
// then keep the player signed in with our own signed, HttpOnly cookie. Saves live in public.fourstrands_players.

export const PLAYER_COOKIE = 'fs_session';
const SESSION_DAYS = 60;
const GOOGLE_ISSUERS = ['https://accounts.google.com', 'accounts.google.com'];
const JWKS_URL = 'https://www.googleapis.com/oauth2/v3/certs';
export const MAX_SAVE_BYTES = 600_000;

export interface GoogleUser { sub: string; email: string; name: string | null; picture: string | null }
export interface Player { user: { name: string | null; email: string; picture: string | null }; save: unknown; version: number }

export function googleClientId(): string | null {
  return process.env.GOOGLE_CLIENT_ID || null;
}

/** Today's date in the Philippines (YYYY-MM-DD): new turns unlock at Manila midnight, whatever the phone's clock says. */
export function manilaToday(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

// ---------- Google ID token ----------
type Jwk = { kid: string; kty: string; n: string; e: string; alg?: string };
let jwks: { keys: Jwk[]; expires: number } | null = null;

async function googleKeys(force = false): Promise<Jwk[]> {
  if (!force && jwks && jwks.expires > Date.now()) return jwks.keys;
  const res = await fetch(JWKS_URL, { cache: 'no-store' });
  if (!res.ok) throw new Error('Could not load Google signing keys');
  const maxAge = Number((res.headers.get('cache-control') || '').match(/max-age=(\d+)/)?.[1] || 3600);
  const body = (await res.json()) as { keys: Jwk[] };
  jwks = { keys: body.keys, expires: Date.now() + maxAge * 1000 };
  return body.keys;
}

const b64json = (part: string) => JSON.parse(Buffer.from(part, 'base64url').toString('utf8'));

/** Verifies a Google ID token (signature, issuer, audience, expiry, verified email). Throws if anything is off. */
export async function verifyGoogleIdToken(token: string): Promise<GoogleUser> {
  const clientId = googleClientId();
  if (!clientId) throw new Error('GOOGLE_CLIENT_ID is not set');
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Malformed token');
  const [h, p, s] = parts;
  const header = b64json(h);
  if (header.alg !== 'RS256' || !header.kid) throw new Error('Unexpected token algorithm');
  let key = (await googleKeys()).find((k) => k.kid === header.kid);
  if (!key) key = (await googleKeys(true)).find((k) => k.kid === header.kid); // Google rotates keys
  if (!key) throw new Error('Unknown signing key');
  const publicKey = createPublicKey({ key: { kty: key.kty, n: key.n, e: key.e }, format: 'jwk' });
  if (!verify('RSA-SHA256', Buffer.from(`${h}.${p}`), publicKey, Buffer.from(s, 'base64url'))) throw new Error('Bad signature');
  const c = b64json(p);
  const now = Math.floor(Date.now() / 1000);
  if (!GOOGLE_ISSUERS.includes(c.iss)) throw new Error('Wrong issuer');
  if (c.aud !== clientId) throw new Error('Wrong audience');
  if (typeof c.exp !== 'number' || c.exp < now - 60) throw new Error('Token expired');
  if (!c.sub || !c.email || c.email_verified !== true) throw new Error('Google account email is not verified');
  return { sub: String(c.sub), email: String(c.email).toLowerCase(), name: c.name ? String(c.name).slice(0, 120) : null, picture: c.picture ? String(c.picture).slice(0, 500) : null };
}

// ---------- our session cookie ----------
function signingKey(): Buffer {
  const secret = process.env.FOURSTRANDS_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error('No session secret');
  return createHash('sha256').update(`fourstrands-session:${secret}`).digest();
}
const sign = (data: string) => createHmac('sha256', signingKey()).update(data).digest('base64url');

export function createPlayerSession(sub: string): { value: string; maxAge: number } {
  const maxAge = SESSION_DAYS * 86400;
  const payload = Buffer.from(JSON.stringify({ sub, exp: Date.now() + maxAge * 1000 })).toString('base64url');
  return { value: `${payload}.${sign(payload)}`, maxAge };
}

/** The signed-in player's Google id, or null. */
export function sessionSub(token: string | undefined): string | null {
  if (!token) return null;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return null;
  const a = createHash('sha256').update(sig).digest(), b = createHash('sha256').update(sign(payload)).digest();
  if (!timingSafeEqual(a, b)) return null;
  try {
    const { sub, exp } = b64json(payload);
    return typeof sub === 'string' && typeof exp === 'number' && exp > Date.now() ? sub : null;
  } catch {
    return null;
  }
}

export function readCookie(req: Request, name: string): string | undefined {
  const raw = req.headers.get('cookie') || '';
  for (const part of raw.split(';')) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim());
  }
  return undefined;
}

export function sessionCookie(req: Request, value: string, maxAge: number): string {
  const https = new URL(req.url).protocol === 'https:' || req.headers.get('x-forwarded-proto') === 'https';
  return `${PLAYER_COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${https ? '; Secure' : ''}`;
}

// ---------- players ----------
export async function upsertPlayer(u: GoogleUser): Promise<void> {
  const { error } = await supabaseAdmin().from('fourstrands_players').upsert(
    { google_sub: u.sub, email: u.email, name: u.name, picture: u.picture, last_seen_at: new Date().toISOString() },
    { onConflict: 'google_sub' },
  );
  if (error) throw error;
}

export async function loadPlayer(sub: string): Promise<Player | null> {
  const { data, error } = await supabaseAdmin().from('fourstrands_players').select('email,name,picture,save,save_version').eq('google_sub', sub).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return { user: { name: data.name, email: data.email, picture: data.picture }, save: data.save, version: data.save_version };
}

/** Saves only if nobody saved since `baseVersion` (another phone, say). Returns the new version, or null on a conflict. */
export async function writeSave(sub: string, save: unknown, baseVersion: number): Promise<number | null> {
  const { data, error } = await supabaseAdmin()
    .from('fourstrands_players')
    .update({ save, save_version: baseVersion + 1, saved_at: new Date().toISOString(), last_seen_at: new Date().toISOString() })
    .eq('google_sub', sub)
    .eq('save_version', baseVersion)
    .select('save_version');
  if (error) throw error;
  return data && data.length ? data[0].save_version : null;
}
