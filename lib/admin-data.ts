import 'server-only';
import { supabaseAdmin } from './supabase-admin';
import { ALL_PROFILE_FIELDS, QUESTIONS, TYPE_ORDER, type ProfileFieldId, type TypeKey } from './quiz-data';
import { READING_RESULTS } from './report-content';

export const RANGES = { '7d': 7, '30d': 30, '90d': 90, all: 0 } as const;
export type RangeKey = keyof typeof RANGES;
export const TZ = 'Asia/Manila';

export interface Filters { range: RangeKey; type: TypeKey | null }

export function parseFilters(sp: Record<string, string | string[] | undefined>): Filters {
  const r = typeof sp.range === 'string' && sp.range in RANGES ? (sp.range as RangeKey) : '30d';
  const t = typeof sp.type === 'string' && (TYPE_ORDER as string[]).includes(sp.type) ? (sp.type as TypeKey) : null;
  return { range: r, type: t };
}

export interface ResponseRow {
  id: string; created_at: string; full_name: string | null; email: string | null;
  gender: string; age_range: string; marital_status: string; education: string; employment: string; dependents: string;
  financially_free: string; balance_happiness: number; worries: string[]; answers: number[];
  score_d: number; score_i: number; score_s: number; score_c: number; primary_type: TypeKey;
  email_opt_in: boolean; email_sent_at: string | null; report_resent_at: string | null;
  utm_source: string | null; utm_medium: string | null; utm_campaign: string | null; referrer: string | null;
}

const COLUMNS = 'id, created_at, full_name, email, gender, age_range, marital_status, education, employment, dependents, financially_free, balance_happiness, worries, answers, score_d, score_i, score_s, score_c, primary_type, email_opt_in, email_sent_at, report_resent_at, utm_source, utm_medium, utm_campaign, referrer';

/** Maps each profile question to its column in quiz_responses. */
export const PROFILE_COLUMN: Record<ProfileFieldId, keyof ResponseRow> = {
  gender: 'gender', age: 'age_range', marital: 'marital_status', education: 'education', employment: 'employment',
  dependents: 'dependents', financiallyFree: 'financially_free', balanceHappiness: 'balance_happiness', worries: 'worries',
};

const MAX_ROWS = 20000; // aggregation runs in memory; plenty for this quiz

export function sinceDate(range: RangeKey): string | null {
  const days = RANGES[range];
  return days ? new Date(Date.now() - days * 86400000).toISOString() : null;
}

/** Loads responses for the dashboard, newest first. */
export async function loadResponses(f: Filters): Promise<ResponseRow[]> {
  let q = supabaseAdmin().from('quiz_responses').select(COLUMNS).order('created_at', { ascending: false }).limit(MAX_ROWS);
  const since = sinceDate(f.range);
  if (since) q = q.gte('created_at', since);
  if (f.type) q = q.eq('primary_type', f.type);
  const { data, error } = await q;
  if (error) throw new Error(`Could not load responses: ${error.message}`);
  return (data ?? []) as ResponseRow[];
}

export interface Count { label: string; count: number; color?: string }

const scoresOf = (r: ResponseRow): Record<TypeKey, number> => ({ D: r.score_d, I: r.score_i, S: r.score_s, C: r.score_c });

function blendOf(r: ResponseRow): string {
  const s = scoresOf(r);
  const ranked = [...TYPE_ORDER].sort((a, b) => s[b] - s[a] || TYPE_ORDER.indexOf(a) - TYPE_ORDER.indexOf(b));
  if (s[ranked[0]] - s[ranked[1]] > 3) return 'No blend (clear primary)';
  const named = READING_RESULTS.blends.find((b) => b.types.includes(ranked[0]) && b.types.includes(ranked[1]));
  return named ? named.name : 'Other two-type blend';
}

function sourceOf(r: ResponseRow): string {
  if (r.utm_source) return r.utm_source;
  if (r.referrer) {
    try { return new URL(r.referrer).hostname.replace(/^www\./, ''); } catch { /* fall through */ }
  }
  return 'Direct';
}

const tally = (values: string[], order?: string[]): Count[] => {
  const m = new Map<string, number>();
  for (const v of values) m.set(v, (m.get(v) ?? 0) + 1);
  const keys = order ? [...order, ...[...m.keys()].filter((k) => !order.includes(k))] : [...m.keys()].sort((a, b) => m.get(b)! - m.get(a)!);
  return keys.map((label) => ({ label, count: m.get(label) ?? 0 }));
};

export function dayKey(iso: string): string {
  return new Date(iso).toLocaleDateString('en-CA', { timeZone: TZ }); // YYYY-MM-DD in Manila time
}

export function buildAnalytics(rows: ResponseRow[], f: Filters) {
  const total = rows.length;
  const withEmail = rows.filter((r) => r.email).length;

  // Submissions per day, oldest to newest, filling gaps (capped at 90 days for "all").
  const days = RANGES[f.range] || Math.min(90, Math.max(7, rows.length ? Math.ceil((Date.now() - new Date(rows[rows.length - 1].created_at).getTime()) / 86400000) + 1 : 7));
  const perDay = new Map<string, number>();
  for (const r of rows) perDay.set(dayKey(r.created_at), (perDay.get(dayKey(r.created_at)) ?? 0) + 1);
  const daily = Array.from({ length: days }, (_, n) => {
    const d = dayKey(new Date(Date.now() - (days - 1 - n) * 86400000).toISOString());
    return { label: d, count: perDay.get(d) ?? 0 };
  });

  const avg = (k: TypeKey) => (total ? rows.reduce((n, r) => n + scoresOf(r)[k], 0) / total : 0);

  const profile = ALL_PROFILE_FIELDS.map((field) => {
    const col = PROFILE_COLUMN[field.id];
    const values = field.multi
      ? rows.flatMap((r) => (r[col] as string[]) ?? [])
      : rows.map((r) => String(r[col]));
    return { id: field.id, label: field.label, multi: !!field.multi, counts: tally(values, field.options) };
  });

  const questions = QUESTIONS.map((q, qi) => {
    const counts = [0, 0, 0, 0];
    for (const r of rows) {
      const a = r.answers?.[qi];
      if (a !== undefined && a >= 0 && a <= 3) counts[a]++;
    }
    return { n: qi + 1, section: q.section, q: q.q, options: q.options.map((text, j) => ({ text, type: q.key[j] as TypeKey, count: counts[j] })) };
  });

  return {
    kpis: {
      total,
      withEmail,
      emailRate: total ? withEmail / total : 0,
      optIns: rows.filter((r) => r.email_opt_in).length,
      emailsSent: rows.filter((r) => r.email_sent_at).length,
      resent: rows.filter((r) => r.report_resent_at).length,
    },
    daily,
    types: TYPE_ORDER.map((k) => ({ key: k, count: rows.filter((r) => r.primary_type === k).length })),
    avgScores: TYPE_ORDER.map((k) => ({ key: k, avg: avg(k) })),
    blends: tally(rows.map(blendOf), [...READING_RESULTS.blends.map((b) => b.name), 'Other two-type blend', 'No blend (clear primary)']),
    sources: tally(rows.map(sourceOf)),
    profile,
    questions,
  };
}

export type Analytics = ReturnType<typeof buildAnalytics>;

// ---------- Submissions list ----------

export const PAGE_SIZE = 50;

export interface ListFilters extends Filters { q: string; page: number }

export function parseListFilters(sp: Record<string, string | string[] | undefined>): ListFilters {
  const base = parseFilters({ ...sp, range: typeof sp.range === 'string' ? sp.range : 'all' });
  const q = typeof sp.q === 'string' ? sp.q.trim().slice(0, 100) : '';
  const page = Math.max(1, Number(typeof sp.page === 'string' ? sp.page : 1) || 1);
  return { ...base, q, page };
}

/** Lists submissions with search, filters and paging. `all` returns every match (for CSV export). */
export async function listResponses(f: ListFilters, all = false): Promise<{ rows: ResponseRow[]; count: number }> {
  let q = supabaseAdmin().from('quiz_responses').select(COLUMNS, { count: 'exact' }).order('created_at', { ascending: false });
  const since = sinceDate(f.range);
  if (since) q = q.gte('created_at', since);
  if (f.type) q = q.eq('primary_type', f.type);
  if (f.q) {
    const term = f.q.replace(/[%_\\,()]/g, ' ').trim(); // keep PostgREST filter syntax and LIKE wildcards out of the search
    if (term) q = q.or(`full_name.ilike.%${term}%,email.ilike.%${term}%`);
  }
  q = all ? q.limit(MAX_ROWS) : q.range((f.page - 1) * PAGE_SIZE, f.page * PAGE_SIZE - 1);
  const { data, count, error } = await q;
  if (error) throw new Error(`Could not load submissions: ${error.message}`);
  return { rows: (data ?? []) as ResponseRow[], count: count ?? 0 };
}

export async function getResponse(id: string): Promise<ResponseRow | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data } = await supabaseAdmin().from('quiz_responses').select(COLUMNS).eq('id', id).maybeSingle();
  return (data as ResponseRow) ?? null;
}

/** A report exists only for submissions that gave both a full name and an email, same rule as the quiz. */
export const hasReport = (r: Pick<ResponseRow, 'full_name' | 'email'>) => !!(r.full_name && r.email);

export function formatDate(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleString('en-PH', { timeZone: TZ, year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}
