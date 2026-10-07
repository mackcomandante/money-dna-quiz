import Link from 'next/link';
import { buildAnalytics, loadResponses, parseFilters, RANGES, type Filters } from '@/lib/admin-data';
import { TYPES, TYPE_ORDER } from '@/lib/quiz-data';
import { Bars } from '@/components/admin/Bars';

export const dynamic = 'force-dynamic';

const RANGE_LABEL: Record<keyof typeof RANGES, string> = { '7d': 'Last 7 days', '30d': 'Last 30 days', '90d': 'Last 90 days', all: 'All time' };

function href(f: Filters, patch: Partial<Filters>) {
  const n = { ...f, ...patch };
  const p = new URLSearchParams({ range: n.range });
  if (n.type) p.set('type', n.type);
  return `/admin?${p}`;
}

export default async function Dashboard({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const f = parseFilters(await searchParams);
  const rows = await loadResponses(f);
  const a = buildAnalytics(rows, f);
  const total = a.kpis.total;
  const maxDay = Math.max(1, ...a.daily.map((d) => d.count));

  return (
    <>
      <div>
        <h1>Dashboard</h1>
        <p className="adm-sub">{RANGE_LABEL[f.range]}{f.type ? ` · ${TYPES[f.type].name} only` : ''} · times in Manila</p>
      </div>

      <div className="adm-filters">
        {(Object.keys(RANGES) as (keyof typeof RANGES)[]).map((r) => (
          <Link key={r} className={`adm-pill${f.range === r ? ' on' : ''}`} href={href(f, { range: r })}>{RANGE_LABEL[r]}</Link>
        ))}
        <span className="adm-sep" />
        <Link className={`adm-pill${!f.type ? ' on' : ''}`} href={href(f, { type: null })}>All types</Link>
        {TYPE_ORDER.map((k) => (
          <Link key={k} className={`adm-pill${f.type === k ? ' on' : ''}`} href={href(f, { type: k })}><i style={{ background: TYPES[k].color }} />{TYPES[k].short}</Link>
        ))}
      </div>

      <section className="adm-kpis">
        <div className="adm-kpi"><span>Completed quizzes</span><b>{total}</b></div>
        <div className="adm-kpi"><span>Emails captured</span><b>{a.kpis.withEmail}</b><small>{Math.round(a.kpis.emailRate * 100)}% of completed</small></div>
        <div className="adm-kpi"><span>Reports emailed</span><b>{a.kpis.emailsSent}</b></div>
        <div className="adm-kpi"><span>Marketing opt-ins</span><b>{a.kpis.optIns}</b><small>{a.kpis.withEmail ? Math.round((a.kpis.optIns / a.kpis.withEmail) * 100) : 0}% of emails</small></div>
        <div className="adm-kpi"><span>Reports re-sent</span><b>{a.kpis.resent}</b><small>repeat emails</small></div>
      </section>

      {total === 0 ? (
        <div className="adm-empty">No submissions for this filter yet.</div>
      ) : (
        <>
          <section className="adm-card">
            <h3>Completed quizzes per day</h3>
            <div className="adm-daily" role="img" aria-label="Completed quizzes per day">
              {a.daily.map((d) => <div key={d.label} title={`${d.label}: ${d.count}`} style={{ height: `${d.count ? Math.max(4, (d.count / maxDay) * 100) : 1}%`, opacity: d.count ? 1 : 0.25 }} />)}
            </div>
            <div className="adm-daily-axis"><span>{a.daily[0]?.label}</span><span>max {maxDay} per day</span><span>{a.daily[a.daily.length - 1]?.label}</span></div>
          </section>

          <section className="adm-grid">
            <div className="adm-card">
              <h3>Money DNA types</h3>
              <Bars total={total} items={a.types.map((t) => ({ label: TYPES[t.key].name, count: t.count, color: TYPES[t.key].color }))} />
            </div>
            <div className="adm-card">
              <h3>Average scores <small>out of 20</small></h3>
              <div className="adm-bars">
                {a.avgScores.map((s) => (
                  <div key={s.key} className="adm-bar">
                    <div className="lbl"><span>{TYPES[s.key].short}</span><div className="track"><div className="fill" style={{ width: `${(s.avg / 20) * 100}%`, background: TYPES[s.key].color }} /></div></div>
                    <div className="num"><b>{s.avg.toFixed(1)}</b> / 20</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="adm-card">
              <h3>Blends <small>second score within 3 points</small></h3>
              <Bars total={total} items={a.blends} color="#6F9BF2" />
            </div>
            <div className="adm-card">
              <h3>Traffic sources <small>UTM source or referrer</small></h3>
              <Bars total={total} items={a.sources.slice(0, 10)} color="#3CC3A8" />
            </div>
          </section>

          <section>
            <h2>Profile questions</h2>
            <div className="adm-grid">
              {a.profile.map((p) => (
                <div key={p.id} className="adm-card">
                  <h3>{p.id === 'worries' ? 'What keeps them up at night' : p.label}{p.multi && <small> · pick all that apply, % of people</small>}</h3>
                  <Bars total={total} items={p.counts} />
                </div>
              ))}
            </div>
          </section>

          <section className="adm-card">
            <h2>Quiz questions</h2>
            <p className="adm-sub" style={{ marginTop: -6, marginBottom: 14 }}>How people answered each question. The tag shows which Money DNA type each answer scores for.</p>
            {a.questions.map((q) => (
              <div key={q.n} className="adm-q">
                <p>Q{q.n}. {q.q} <span>· {q.section}</span></p>
                <Bars total={total} items={q.options.map((o, j) => ({ label: `${'ABCD'[j]}. ${o.text}  [${TYPES[o.type].short}]`, count: o.count, color: TYPES[o.type].color }))} />
              </div>
            ))}
          </section>
        </>
      )}
    </>
  );
}
