// Simple in-memory limiter. Fine for a single Coolify container; swap for Redis/Upstash if you scale out.
const hits = new Map<string, { count: number; reset: number }>();

export function rateLimit(key: string, limit = 20, windowMs = 60_000): boolean {
  const now = Date.now();
  const entry = hits.get(key);
  if (!entry || entry.reset < now) {
    hits.set(key, { count: 1, reset: now + windowMs });
    if (hits.size > 10_000) for (const [k, e] of hits) if (e.reset < now) hits.delete(k);
    return true;
  }
  entry.count++;
  return entry.count <= limit;
}

/** True if `key` has already reached `limit` in its current window (does not count as a hit). */
export function isLimited(key: string, limit: number): boolean {
  const entry = hits.get(key);
  return !!entry && entry.reset >= Date.now() && entry.count >= limit;
}

/**
 * The caller's IP. Clients can send their own X-Forwarded-For, so take the RIGHTMOST entry: the one our
 * reverse proxy (Coolify's Caddy) appended. Assumes exactly one trusted proxy in front of the app.
 */
export function clientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for');
  const last = fwd?.split(',').map((s) => s.trim()).filter(Boolean).pop();
  return last || req.headers.get('x-real-ip')?.trim() || 'unknown';
}
