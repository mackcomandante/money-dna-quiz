import Link from 'next/link';
import { formatDate, parseFilters, RANGES } from '@/lib/admin-data';
import { fourStrandsAnalytics } from '@/lib/fourstrands-admin';
import { TYPES } from '@/lib/quiz-data';
import { Bars } from '@/components/admin/Bars';

export const dynamic = 'force-dynamic';

const RANGE_LABEL: Record<keyof typeof RANGES, string> = { '7d': 'Last 7 days', '30d': 'Last 30 days', '90d': 'Last 90 days', all: 'All time' };
const pct = (x: number | null) => (x === null ? '—' : `${Math.round(x * 100)}%`);
const peso = (n: number) => '₱' + Math.round(n).toLocaleString('en-PH');

function Daily({ label, values, color, stack }: { label: string; values: { day: string; a: number; b?: number }[]; color: string; stack?: string }) {
  const max = Math.max(1, ...values.map((v) => v.a + (v.b ?? 0)));
  return (
    <>
      <div className="adm-daily" role="img" aria-label={label}>
        {values.map((v) => {
          const total = v.a + (v.b ?? 0);
          return (
            <div key={v.day} className="adm-col" title={`${v.day}: ${total}${stack ? ` (${v.b ?? 0} ${stack})` : ''}`} style={{ height: `${total ? Math.max(4, (total / max) * 100) : 1}%`, opacity: total ? 1 : 0.25, background: 'none' }}>
              {stack && !!v.b && <i style={{ flex: v.b, background: '#6F9BF2' }} />}
              <i style={{ flex: v.a || (total ? 0 : 1), background: color }} />
            </div>
          );
        })}
      </div>
      <div className="adm-daily-axis"><span>{values[0]?.day}</span><span>max {max} per day</span><span>{values[values.length - 1]?.day}</span></div>
    </>
  );
}

export default async function FourStrandsDashboard({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const f = parseFilters(await searchParams);
  const a = await fourStrandsAnalytics(f.range);
  const k = a.kpis;

  return (
    <>
      <div>
        <h1>Four Strands</h1>
        <p className="adm-sub">{RANGE_LABEL[f.range]}{f.range === 'all' ? ' (charts show the last 90 days)' : ''} · times in Manila · daily activity counted from Nov 8, 2026</p>
      </div>

      <div className="adm-filters">
        {(Object.keys(RANGES) as (keyof typeof RANGES)[]).map((r) => (
          <Link key={r} className={`adm-pill${f.range === r ? ' on' : ''}`} href={`/admin/fourstrands?range=${r}`}>{RANGE_LABEL[r]}</Link>
        ))}
      </div>

      <section>
        <h2>Users</h2>
        <div className="adm-kpis">
          <div className="adm-kpi"><span>Accounts (Google)</span><b>{k.players}</b><small>all time</small></div>
          <div className="adm-kpi"><span>New sign-ups</span><b>{k.newPlayers}</b><small>{RANGE_LABEL[f.range].toLowerCase()}</small></div>
          <div className="adm-kpi"><span>Guest phones</span><b>{k.guestPhones}</b><small>played without signing in</small></div>
          <div className="adm-kpi"><span>Guests who signed up</span><b>{k.converted}</b><small>{k.guestPhones ? pct(k.converted / k.guestPhones) : '—'} of guest phones</small></div>
          <div className="adm-kpi"><span>Also took the quiz</span><b>{k.tookQuiz}</b><small>{k.players ? pct(k.tookQuiz / k.players) : '—'} of accounts</small></div>
        </div>
      </section>

      <section>
        <h2>Usage</h2>
        <div className="adm-kpis">
          <div className="adm-kpi"><span>Playing today</span><b>{k.dauToday}</b><small>{k.dauSignedIn} signed in · {k.dauToday - k.dauSignedIn} guests</small></div>
          <div className="adm-kpi"><span>Last 7 days</span><b>{k.wau}</b><small>different players</small></div>
          <div className="adm-kpi"><span>Last 30 days</span><b>{k.mau}</b><small>different players</small></div>
          <div className="adm-kpi"><span>Stickiness</span><b>{pct(k.mau ? k.stickiness : null)}</b><small>daily ÷ monthly players</small></div>
          <div className="adm-kpi"><span>Turns played</span><b>{k.turns.toLocaleString('en-PH')}</b><small>{RANGE_LABEL[f.range].toLowerCase()}</small></div>
          <div className="adm-kpi"><span>Came back next day</span><b>{pct(k.d1)}</b><small>of {k.d1Base} new players</small></div>
          <div className="adm-kpi"><span>Came back within 7 days</span><b>{pct(k.w1)}</b><small>of {k.w1Base} new players</small></div>
          <div className="adm-kpi"><span>Average streak</span><b>{k.avgStreak.toFixed(1)}</b><small>longest {k.bestStreak} days</small></div>
          <div className="adm-kpi"><span>Coin purchases</span><b>{peso(k.spent)}</b><small>in-game, all players</small></div>
        </div>
      </section>

      <section className="adm-grid">
        <div className="adm-card">
          <h3>Players per day <small>amber signed in · blue guests</small></h3>
          <Daily label="Players per day" color="#F5B841" stack="guests" values={a.series.map((d) => ({ day: d.day, a: d.signedIn, b: d.guests }))} />
        </div>
        <div className="adm-card">
          <h3>New sign-ups per day</h3>
          <Daily label="New sign-ups per day" color="#3CC3A8" values={a.series.map((d) => ({ day: d.day, a: d.signups }))} />
        </div>
        <div className="adm-card">
          <h3>Turns played per day</h3>
          <Daily label="Turns played per day" color="#F26B4B" values={a.series.map((d) => ({ day: d.day, a: d.turns }))} />
        </div>
      </section>

      <section>
        <h2>Who is playing <small className="adm-muted" style={{ fontSize: 13, fontWeight: 500 }}>· {a.activeInRange} players active {RANGE_LABEL[f.range].toLowerCase()}</small></h2>
        {a.activeInRange === 0 ? <div className="adm-empty">No one has played in this period yet.</div> : (
          <div className="adm-grid">
            <div className="adm-card"><h3>Money DNA type</h3><Bars total={a.activeInRange} items={a.types} /></div>
            <div className="adm-card"><h3>Age in the game</h3><Bars total={a.activeInRange} items={a.ages} color="#F5B841" /></div>
            <div className="adm-card"><h3>Current streak</h3><Bars total={a.activeInRange} items={a.streaks} color="#F26B4B" /></div>
            <div className="adm-card"><h3>Game status</h3><Bars total={a.activeInRange} items={a.status} color="#3CC3A8" /></div>
            <div className="adm-card"><h3>Strand levels reached <small>out of 16</small></h3><Bars total={a.activeInRange} items={a.levels} color="#6F9BF2" /></div>
          </div>
        )}
      </section>

      <section>
        <h2>Players <small className="adm-muted" style={{ fontSize: 13, fontWeight: 500 }}>· most recently active, up to 50</small></h2>
        {a.recentPlayers.length === 0 ? <div className="adm-empty">No accounts yet. Players appear here after they sign in with Google.</div> : (
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead><tr><th>Name</th><th>Email</th><th>Signed up</th><th>Last played</th><th>Type</th><th>Age</th><th>Streak · best</th><th>Turns</th><th>Days active</th><th>Status</th><th>Quiz</th></tr></thead>
              <tbody>
                {a.recentPlayers.map((p) => (
                  <tr key={p.email}>
                    <td>{p.name || <span className="adm-muted">—</span>}</td>
                    <td>{p.email}</td>
                    <td>{formatDate(p.created)}</td>
                    <td>{formatDate(p.lastSeen)}</td>
                    <td>{p.type && TYPES[p.type] ? <span className="adm-tag" style={{ background: TYPES[p.type].color }}>{p.type}</span> : <span className="adm-muted">—</span>}</td>
                    <td>{p.age ?? <span className="adm-muted">—</span>}</td>
                    <td>{p.streak} · {p.best}</td>
                    <td>{p.turns}</td>
                    <td>{p.daysActive}</td>
                    <td>{p.status}</td>
                    <td>{p.tookQuiz ? 'Yes' : <span className="adm-muted">No</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
