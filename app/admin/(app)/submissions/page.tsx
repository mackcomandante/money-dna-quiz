import Link from 'next/link';
import { formatDate, hasReport, listResponses, PAGE_SIZE, parseListFilters, RANGES, type ListFilters } from '@/lib/admin-data';
import { TYPES, TYPE_ORDER } from '@/lib/quiz-data';

export const dynamic = 'force-dynamic';

const RANGE_LABEL: Record<keyof typeof RANGES, string> = { '7d': '7 days', '30d': '30 days', '90d': '90 days', all: 'All time' };

function qs(f: ListFilters, patch: Partial<ListFilters> = {}) {
  const n = { ...f, page: 1, ...patch };
  const p = new URLSearchParams({ range: n.range });
  if (n.type) p.set('type', n.type);
  if (n.q) p.set('q', n.q);
  if (n.page > 1) p.set('page', String(n.page));
  return p.toString();
}

export default async function Submissions({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const f = parseListFilters(await searchParams);
  const { rows, count } = await listResponses(f);
  const pages = Math.max(1, Math.ceil(count / PAGE_SIZE));

  return (
    <>
      <div>
        <h1>Submissions</h1>
        <p className="adm-sub">{count} {count === 1 ? 'submission' : 'submissions'} · newest first · times in Manila</p>
      </div>

      <form className="adm-search" action="/admin/submissions">
        <input type="search" name="q" defaultValue={f.q} placeholder="Search name or email" aria-label="Search name or email" />
        <input type="hidden" name="range" value={f.range} />
        {f.type && <input type="hidden" name="type" value={f.type} />}
        <button className="adm-btn" type="submit">Search</button>
        {f.q && <Link className="adm-btn ghost" href={`/admin/submissions?${qs(f, { q: '' })}`}>Clear</Link>}
        <a className="adm-btn ghost" href={`/api/admin/export?${qs(f)}`}>Export CSV</a>
      </form>

      <div className="adm-filters">
        {(Object.keys(RANGES) as (keyof typeof RANGES)[]).map((r) => (
          <Link key={r} className={`adm-pill${f.range === r ? ' on' : ''}`} href={`/admin/submissions?${qs(f, { range: r })}`}>{RANGE_LABEL[r]}</Link>
        ))}
        <span className="adm-sep" />
        <Link className={`adm-pill${!f.type ? ' on' : ''}`} href={`/admin/submissions?${qs(f, { type: null })}`}>All types</Link>
        {TYPE_ORDER.map((k) => (
          <Link key={k} className={`adm-pill${f.type === k ? ' on' : ''}`} href={`/admin/submissions?${qs(f, { type: k })}`}><i style={{ background: TYPES[k].color }} />{TYPES[k].short}</Link>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="adm-empty">No submissions match.</div>
      ) : (
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr><th>Submitted</th><th>Name</th><th>Email</th><th>Money DNA</th><th>D · I · S · C</th><th>Age</th><th>How they earn</th><th>Opt-in</th><th>Report</th><th>PDF</th></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td style={{ whiteSpace: 'nowrap' }}><Link href={`/admin/submissions/${r.id}`}>{formatDate(r.created_at)}</Link></td>
                  <td>{r.full_name || <span className="adm-muted">—</span>}</td>
                  <td>{r.email || <span className="adm-muted">No email</span>}</td>
                  <td style={{ whiteSpace: 'nowrap' }}><span className="adm-tag" style={{ background: TYPES[r.primary_type].color }}>{r.primary_type}</span> {TYPES[r.primary_type].short}</td>
                  <td style={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{r.score_d} · {r.score_i} · {r.score_s} · {r.score_c}</td>
                  <td>{r.age_range}</td>
                  <td>{r.employment}</td>
                  <td>{r.email_opt_in ? 'Yes' : <span className="adm-muted">No</span>}</td>
                  <td>{r.email_sent_at ? `Sent${r.report_resent_at ? ' + re-sent' : ''}` : <span className="adm-muted">—</span>}</td>
                  <td>{hasReport(r) ? <a className="adm-dl-link" href={`/api/admin/report/${r.id}`} download>Download</a> : <span className="adm-muted" title="No report without a full name and email">—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 && (
        <div className="adm-pager">
          <span>Page {f.page} of {pages}</span>
          {f.page > 1 && <Link className="adm-btn ghost" href={`/admin/submissions?${qs(f, { page: f.page - 1 })}`}>Previous</Link>}
          {f.page < pages && <Link className="adm-btn ghost" href={`/admin/submissions?${qs(f, { page: f.page + 1 })}`}>Next</Link>}
        </div>
      )}
    </>
  );
}
