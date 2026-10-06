import { ALL_PROFILE_FIELDS, type ProfileFieldId } from './quiz-data';

export type Profile = Partial<Record<ProfileFieldId, string | string[]>>;

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function isValidEmail(email: unknown): email is string {
  return typeof email === 'string' && email.length <= 254 && EMAIL_RE.test(email.trim());
}

/** Keeps only known fields with allowed option values. Returns null if anything required is missing. */
export function cleanProfile(input: unknown): Profile | null {
  if (!input || typeof input !== 'object') return null;
  const raw = input as Record<string, unknown>;
  const out: Profile = {};
  for (const f of ALL_PROFILE_FIELDS) {
    const v = raw[f.id];
    if (f.multi) {
      if (!Array.isArray(v) || v.length === 0) return null;
      const vals = Array.from(new Set(v.filter((x): x is string => typeof x === 'string' && f.options.includes(x))));
      if (vals.length === 0) return null;
      out[f.id] = vals;
    } else {
      if (typeof v !== 'string' || !f.options.includes(v)) return null;
      out[f.id] = v;
    }
  }
  return out;
}

export function shortText(v: unknown, max = 200): string | null {
  return typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null;
}
