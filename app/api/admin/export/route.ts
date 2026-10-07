import { isAdminRequest } from '@/lib/admin-auth';
import { listResponses, parseListFilters, formatDate } from '@/lib/admin-data';
import { QUESTIONS } from '@/lib/quiz-data';

export const dynamic = 'force-dynamic';

const cell = (v: unknown) => {
  const s = v === null || v === undefined ? '' : Array.isArray(v) ? v.join('; ') : String(v);
  // Quote everything; neutralise spreadsheet formulas.
  return `"${(/^[=+\-@]/.test(s) ? `'${s}` : s).replace(/"/g, '""')}"`;
};

/** CSV export of submissions, using the same filters as the submissions table. */
export async function GET(req: Request) {
  if (!isAdminRequest(req)) return Response.json({ error: 'Not signed in' }, { status: 401 });
  const sp = Object.fromEntries(new URL(req.url).searchParams);
  const { rows } = await listResponses(parseListFilters(sp), true);

  const header = [
    'Submitted (Manila)', 'Full name', 'Email', 'Marketing opt-in', 'Report emailed', 'Report re-sent', 'Money DNA', 'D', 'I', 'S', 'C',
    'Gender', 'Age', 'Marital status', 'Education', 'How they earn', 'Dependents', 'Financially free', 'Bank balance happiness (1-5)', 'Worries',
    'UTM source', 'UTM medium', 'UTM campaign', 'Referrer',
    ...QUESTIONS.map((_, n) => `Q${n + 1}`),
  ];
  const lines = rows.map((r) => [
    formatDate(r.created_at), r.full_name, r.email, r.email_opt_in ? 'Yes' : 'No', formatDate(r.email_sent_at), formatDate(r.report_resent_at),
    r.primary_type, r.score_d, r.score_i, r.score_s, r.score_c,
    r.gender, r.age_range, r.marital_status, r.education, r.employment, r.dependents, r.financially_free, r.balance_happiness, r.worries,
    r.utm_source, r.utm_medium, r.utm_campaign, r.referrer,
    ...QUESTIONS.map((q, n) => (r.answers?.[n] !== undefined ? `${'ABCD'[r.answers[n]]} (${q.key[r.answers[n]]})` : '')),
  ].map(cell).join(','));

  const stamp = new Date().toISOString().slice(0, 10);
  return new Response('﻿' + [header.map(cell).join(','), ...lines].join('\r\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="money-dna-submissions-${stamp}.csv"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
