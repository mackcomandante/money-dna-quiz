import Link from 'next/link';
import { notFound } from 'next/navigation';
import { formatDate, getResponse, hasReport } from '@/lib/admin-data';
import { QUESTIONS, TYPES, TYPE_ORDER } from '@/lib/quiz-data';
import { percentages } from '@/lib/scoring';

export const dynamic = 'force-dynamic';

export default async function Submission({ params }: { params: Promise<{ id: string }> }) {
  const r = await getResponse((await params).id);
  if (!r) notFound();
  const scores = { D: r.score_d, I: r.score_i, S: r.score_s, C: r.score_c };
  const pct = percentages(scores);
  const t = TYPES[r.primary_type];

  return (
    <>
      <div>
        <Link href="/admin/submissions" className="adm-muted" style={{ fontSize: 13 }}>← All submissions</Link>
        <h1 style={{ marginTop: 8 }}>{r.full_name || r.email || 'Anonymous submission'}</h1>
        <p className="adm-sub">{formatDate(r.created_at)}</p>
      </div>
      {hasReport(r)
        ? <div><a className="adm-btn" href={`/api/admin/report/${r.id}`} download>Download Full Money DNA Report (PDF)</a></div>
        : <div className="adm-empty" style={{ padding: 14, textAlign: 'left' }}>No report: {r.email ? 'this submission has no full name (it was made before names were collected).' : 'this person finished the quiz but did not give their name and email.'}</div>}

      <section className="adm-grid">
        <div className="adm-card">
          <h3>Result</h3>
          <p style={{ margin: '0 0 12px' }}><span className="adm-tag" style={{ background: t.color }}>{r.primary_type}</span> <b>{t.name}</b></p>
          <div className="adm-bars">
            {TYPE_ORDER.map((k) => (
              <div key={k} className="adm-bar">
                <div className="lbl"><span>{TYPES[k].short}</span><div className="track"><div className="fill" style={{ width: `${(scores[k] / 20) * 100}%`, background: TYPES[k].color }} /></div></div>
                <div className="num"><b>{scores[k]}</b>/20 · {pct[k]}%</div>
              </div>
            ))}
          </div>
        </div>
        <div className="adm-card">
          <h3>Contact and delivery</h3>
          <dl className="adm-dl">
            <dt>Full name</dt><dd>{r.full_name || '—'}</dd>
            <dt>Email</dt><dd>{r.email || 'Not given'}</dd>
            <dt>Marketing opt-in</dt><dd>{r.email_opt_in ? 'Yes' : 'No'}</dd>
            <dt>Report emailed</dt><dd>{formatDate(r.email_sent_at) || '—'}</dd>
            <dt>Report re-sent</dt><dd>{formatDate(r.report_resent_at) || '—'}</dd>
            <dt>Source</dt><dd>{[r.utm_source, r.utm_medium, r.utm_campaign].filter(Boolean).join(' / ') || r.referrer || 'Direct'}</dd>
          </dl>
        </div>
        <div className="adm-card">
          <h3>Profile</h3>
          <dl className="adm-dl">
            <dt>Gender</dt><dd>{r.gender}</dd>
            <dt>Age</dt><dd>{r.age_range}</dd>
            <dt>Marital status</dt><dd>{r.marital_status}</dd>
            <dt>Education</dt><dd>{r.education}</dd>
            <dt>How they earn</dt><dd>{r.employment}</dd>
            <dt>Dependents</dt><dd>{r.dependents}</dd>
            <dt>Financially free</dt><dd>{r.financially_free}</dd>
            <dt>Bank balance happiness</dt><dd>{r.balance_happiness} / 5</dd>
            <dt>Worries</dt><dd>{r.worries?.join(', ')}</dd>
          </dl>
        </div>
      </section>

      <section className="adm-card">
        <h2>Answers</h2>
        <table className="adm-table">
          <thead><tr><th>#</th><th>Question</th><th>Answer</th><th>Scores for</th></tr></thead>
          <tbody>
            {QUESTIONS.map((q, n) => {
              const a = r.answers?.[n];
              const type = a !== undefined ? (q.key[a] as keyof typeof TYPES) : null;
              return (
                <tr key={n}>
                  <td>{n + 1}</td>
                  <td>{q.q}</td>
                  <td>{a !== undefined ? `${'ABCD'[a]}. ${q.options[a]}` : '—'}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{type && <><span className="adm-tag" style={{ background: TYPES[type].color }}>{type}</span> {TYPES[type].short}</>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </>
  );
}
