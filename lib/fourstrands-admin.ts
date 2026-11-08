import 'server-only';
import { supabaseAdmin } from './supabase-admin';
import { dayKey, RANGES, type Count, type RangeKey } from './admin-data';
import { TYPES, TYPE_ORDER, type TypeKey } from './quiz-data';

// Four Strands usage for /admin/fourstrands: accounts from fourstrands_players, daily activity (players and guest phones)
// from fourstrands_activity. Everything is aggregated in memory, like the quiz dashboard.

const MAX_ROWS = 50000;
const LOOKBACK_DAYS = 120; // activity loaded for first-seen dates and retention

interface PlayerRow {
  google_sub: string; email: string; name: string | null; created_at: string; last_seen_at: string;
  type: string | null; turns: string | null; streak: string | null; best: string | null; over: string | null;
}
interface Snapshot { type?: string | null; age?: number | null; streak?: number | null; best?: number | null; day?: number | null; levels?: number | null; coins?: number | null; spent?: number | null; cards?: number | null; over?: string | null }
interface ActivityRow { day: string; actor: string; signed_in: boolean; device: string | null; turns_total: number | null; snapshot: Snapshot | null }

const addDays = (day: string, n: number) => new Date(Date.parse(day + 'T00:00:00Z') + n * 86400000).toISOString().slice(0, 10);

async function loadAll() {
  const db = supabaseAdmin();
  const since = addDays(dayKey(new Date().toISOString()), -LOOKBACK_DAYS);
  const [players, activity, quiz] = await Promise.all([
    db.from('fourstrands_players')
      .select('google_sub, email, name, created_at, last_seen_at, type:save->s->p->>type, turns:save->s->stats->>turns, streak:save->s->>streak, best:save->s->>bestStreak, over:save->s->>over')
      .order('last_seen_at', { ascending: false }).limit(MAX_ROWS),
    db.from('fourstrands_activity').select('day, actor, signed_in, device, turns_total, snapshot').gte('day', since).order('day').limit(MAX_ROWS),
    db.from('quiz_responses').select('email').not('email', 'is', null).limit(MAX_ROWS),
  ]);
  for (const r of [players, activity, quiz]) if (r.error) throw new Error(`Could not load Four Strands data: ${r.error.message}`);
  return {
    players: (players.data ?? []) as unknown as PlayerRow[],
    activity: (activity.data ?? []) as ActivityRow[],
    quizEmails: new Set(((quiz.data ?? []) as { email: string }[]).map((q) => q.email.toLowerCase())),
  };
}

const AGE_BANDS = ['Under 25', '25–34', '35–44', '45–54', '55–64', '65–79', '80–100'];
const ageBand = (a: number) => (a < 25 ? AGE_BANDS[0] : a < 35 ? AGE_BANDS[1] : a < 45 ? AGE_BANDS[2] : a < 55 ? AGE_BANDS[3] : a < 65 ? AGE_BANDS[4] : a < 80 ? AGE_BANDS[5] : AGE_BANDS[6]);
const STREAK_BANDS = ['0 days', '1–2 days', '3–6 days', '7–13 days', '14–29 days', '30+ days'];
const streakBand = (n: number) => (n <= 0 ? STREAK_BANDS[0] : n < 3 ? STREAK_BANDS[1] : n < 7 ? STREAK_BANDS[2] : n < 14 ? STREAK_BANDS[3] : n < 30 ? STREAK_BANDS[4] : STREAK_BANDS[5]);
const STATUS = { playing: 'Still playing', broke: 'Went broke', legacy: 'Reached 100' } as const;

function tally(values: string[], order: string[]): Count[] {
  const m = new Map<string, number>();
  for (const v of values) m.set(v, (m.get(v) ?? 0) + 1);
  return order.map((label) => ({ label, count: m.get(label) ?? 0 }));
}

export async function fourStrandsAnalytics(range: RangeKey) {
  const { players, activity, quizEmails } = await loadAll();
  const today = dayKey(new Date().toISOString());
  const days = RANGES[range] || 90; // charts show at most 90 days
  const from = addDays(today, -(days - 1));
  const inRange = (d: string) => d >= from && d <= today;
  const sinceIso = RANGES[range] ? new Date(Date.parse(from + 'T00:00:00+08:00')).toISOString() : null;

  // Per actor: days active, first day, latest snapshot, turns played each day (from the lifetime counter).
  const byActor = new Map<string, ActivityRow[]>();
  for (const r of activity) (byActor.get(r.actor) ?? byActor.set(r.actor, []).get(r.actor)!).push(r);
  const turnsPerDay = new Map<string, number>();
  const first = new Map<string, string>();
  const latest = new Map<string, ActivityRow>();
  for (const [actor, rows] of byActor) {
    first.set(actor, rows[0].day);
    latest.set(actor, rows[rows.length - 1]);
    let prev: number | null = null;
    for (const r of rows) {
      const t: number = r.turns_total ?? prev ?? 0;
      const played = prev === null ? 0 : Math.max(0, t - prev); // the first day seen has no baseline
      turnsPerDay.set(r.day, (turnsPerDay.get(r.day) ?? 0) + played);
      prev = t;
    }
  }
  const activeOn = (day: string) => activity.filter((r) => r.day === day);
  const distinct = (fromDay: string) => new Set(activity.filter((r) => r.day >= fromDay && r.day <= today).map((r) => r.actor));

  // Daily series
  const signupsPerDay = new Map<string, number>();
  for (const p of players) signupsPerDay.set(dayKey(p.created_at), (signupsPerDay.get(dayKey(p.created_at)) ?? 0) + 1);
  const series = Array.from({ length: days }, (_, i) => {
    const day = addDays(from, i);
    const rows = activeOn(day);
    const signedIn = rows.filter((r) => r.signed_in).length;
    return { day, signups: signupsPerDay.get(day) ?? 0, signedIn, guests: rows.length - signedIn, turns: turnsPerDay.get(day) ?? 0 };
  });

  // Headline numbers
  const dauToday = activeOn(today);
  const wau = distinct(addDays(today, -6));
  const mau = distinct(addDays(today, -29));
  const last30 = Array.from({ length: 30 }, (_, i) => activeOn(addDays(today, -i)).length);
  const avgDau30 = last30.reduce((a, b) => a + b, 0) / 30;
  const newPlayers = sinceIso ? players.filter((p) => p.created_at >= sinceIso).length : players.length;

  // Retention: of people first seen in this range, how many came back
  const starters = [...first.entries()].filter(([, d]) => inRange(d));
  const activeSet = new Set(activity.map((r) => `${r.actor}|${r.day}`));
  const d1Base = starters.filter(([, d]) => d < today);
  const d1 = d1Base.filter(([a, d]) => activeSet.has(`${a}|${addDays(d, 1)}`)).length;
  const w1Base = starters.filter(([, d]) => d <= addDays(today, -7));
  const w1 = w1Base.filter(([a, d]) => Array.from({ length: 7 }, (_, i) => addDays(d, i + 1)).some((x) => activeSet.has(`${a}|${x}`))).length;

  // Guests who later signed in on the same phone
  const guestDevices = new Set(activity.filter((r) => !r.signed_in && r.device).map((r) => r.device!));
  const signedDevices = new Set(activity.filter((r) => r.signed_in && r.device).map((r) => r.device!));
  const converted = [...guestDevices].filter((d) => signedDevices.has(d)).length;

  // Who is playing (latest snapshot of everyone active in the range)
  const recent = [...latest.values()].filter((r) => inRange(r.day) && r.snapshot);
  const snaps = recent.map((r) => r.snapshot!);
  const typeCounts: Count[] = TYPE_ORDER.map((k) => ({ label: TYPES[k].name, count: snaps.filter((s) => s.type === k).length, color: TYPES[k].color }));
  const withLife = snaps.filter((s) => s.type);
  const statusOf = (o?: string | null) => (o === 'broke' ? STATUS.broke : o === 'legacy' ? STATUS.legacy : STATUS.playing);
  const spentAll = [...latest.values()].reduce((n, r) => n + (r.snapshot?.spent ?? 0), 0);
  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

  const recentPlayers = players.slice(0, 50).map((p) => {
    const snap = latest.get(p.google_sub)?.snapshot ?? null;
    return {
      name: p.name, email: p.email, created: p.created_at, lastSeen: p.last_seen_at,
      type: (snap?.type ?? p.type) as TypeKey | null, age: snap?.age ?? null,
      streak: Number(snap?.streak ?? p.streak ?? 0), best: Number(snap?.best ?? p.best ?? 0), turns: Math.max(Number(p.turns ?? 0), latest.get(p.google_sub)?.turns_total ?? 0),
      status: statusOf(snap?.over ?? p.over), tookQuiz: quizEmails.has(p.email.toLowerCase()),
      daysActive: (byActor.get(p.google_sub) ?? []).length,
    };
  });

  return {
    from, today, days,
    kpis: {
      players: players.length,
      newPlayers,
      dauToday: dauToday.length, dauSignedIn: dauToday.filter((r) => r.signed_in).length,
      wau: wau.size, mau: mau.size,
      stickiness: mau.size ? avgDau30 / mau.size : 0,
      turns: series.reduce((n, d) => n + d.turns, 0),
      d1: d1Base.length ? d1 / d1Base.length : null, d1Base: d1Base.length,
      w1: w1Base.length ? w1 / w1Base.length : null, w1Base: w1Base.length,
      guestPhones: guestDevices.size, converted,
      tookQuiz: players.filter((p) => quizEmails.has(p.email.toLowerCase())).length,
      avgStreak: avg(snaps.map((s) => s.streak ?? 0)), bestStreak: Math.max(0, ...snaps.map((s) => s.best ?? 0)),
      spent: spentAll,
    },
    series,
    activeInRange: snaps.length,
    types: typeCounts,
    ages: tally(withLife.filter((s) => s.age != null).map((s) => ageBand(s.age!)), AGE_BANDS),
    streaks: tally(snaps.map((s) => streakBand(s.streak ?? 0)), STREAK_BANDS),
    status: tally(withLife.map((s) => statusOf(s.over)), Object.values(STATUS)),
    levels: tally(withLife.map((s) => `${s.levels ?? 0} of 16`), Array.from({ length: 17 }, (_, i) => `${i} of 16`)).filter((c) => c.count),
    recentPlayers,
  };
}
