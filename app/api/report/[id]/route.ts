import { supabaseAdmin } from '@/lib/supabase-admin';
import { rateLimit, clientIp } from '@/lib/rate-limit';
import { renderReportPdf, reportFilename } from '@/lib/report-pdf';
import { TYPE_ORDER, type TypeKey } from '@/lib/quiz-data';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function pdfResponse(pdf: Buffer, primary: TypeKey, inline: boolean) {
  return new Response(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `${inline ? 'inline' : 'attachment'}; filename="${reportFilename(primary)}"`,
      'Cache-Control': 'private, no-store',
    },
  });
}

/**
 * Downloads the Full Money DNA Report as a PDF.
 * The report unlocks once an email has been attached to the response (the email step gates it).
 * In development, /api/report/sample?type=D renders a sample without a database row.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const url = new URL(req.url);
  const inline = url.searchParams.has('view');

  if (id === 'sample' && process.env.NODE_ENV !== 'production') {
    const t = (url.searchParams.get('type') || 'D').toUpperCase() as TypeKey;
    const primary = TYPE_ORDER.includes(t) ? t : 'D';
    // Each sample adds up to 20 and shows a different reading: named blend, strong preference, balanced profile.
    const SAMPLES: Record<TypeKey, Record<TypeKey, number>> = {
      D: { D: 9, I: 3, S: 1, C: 7 }, // Strategist blend
      I: { D: 6, I: 8, S: 4, C: 2 }, // Promoter blend
      S: { D: 1, I: 3, S: 12, C: 4 }, // strong preference
      C: { D: 5, I: 2, S: 6, C: 7 }, // Conservator blend + balanced profile
    };
    const scores = SAMPLES[primary];
    return pdfResponse(await renderReportPdf({ primary, scores }), primary, inline);
  }

  if (!UUID_RE.test(id)) return Response.json({ error: 'Not found' }, { status: 404 });
  if (!rateLimit(`report:${clientIp(req)}`, 20)) return Response.json({ error: 'Too many requests' }, { status: 429 });

  const { data: row, error } = await supabaseAdmin()
    .from('quiz_responses')
    .select('created_at, email, primary_type, score_d, score_i, score_s, score_c')
    .eq('id', id)
    .maybeSingle();
  if (error || !row || !row.email) return Response.json({ error: 'Not found' }, { status: 404 });

  const primary = row.primary_type as TypeKey;
  const scores = { D: row.score_d, I: row.score_i, S: row.score_s, C: row.score_c };
  const pdf = await renderReportPdf({ primary, scores, date: new Date(row.created_at) });
  return pdfResponse(pdf, primary, inline);
}
