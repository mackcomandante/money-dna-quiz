import { isAdminRequest } from '@/lib/admin-auth';
import { getResponse } from '@/lib/admin-data';
import { renderReportPdf, reportFilename } from '@/lib/report-pdf';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** Admin only: downloads the Full Money DNA Report PDF for one submission. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdminRequest(req)) return Response.json({ error: 'Not signed in' }, { status: 401 });
  const r = await getResponse((await params).id);
  if (!r) return Response.json({ error: 'Not found' }, { status: 404 });

  const pdf = await renderReportPdf({
    primary: r.primary_type,
    scores: { D: r.score_d, I: r.score_i, S: r.score_s, C: r.score_c },
    date: new Date(r.created_at),
    name: r.full_name,
  });
  const who = (r.full_name || r.email || r.id.slice(0, 8)).replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '');
  const filename = reportFilename(r.primary_type).replace(/\.pdf$/, `-${who}.pdf`);
  return new Response(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename.replace(/[^\x20-\x7E]/g, '')}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      'Cache-Control': 'private, no-store',
    },
  });
}
