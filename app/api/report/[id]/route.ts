import { renderReportPdf, reportFilename } from '@/lib/report-pdf';
import { TYPE_ORDER, type TypeKey } from '@/lib/quiz-data';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Development only: /api/report/sample?type=D renders a sample Full Money DNA Report for proofreading.
 * Reports are delivered by email (and Hermes), never downloaded from this site, so production always returns 404.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (process.env.NODE_ENV === 'production' || id !== 'sample') return Response.json({ error: 'Not found' }, { status: 404 });

  const url = new URL(req.url);
  const t = (url.searchParams.get('type') || 'D').toUpperCase() as TypeKey;
  const primary = TYPE_ORDER.includes(t) ? t : 'D';
  // Each sample adds up to 20 and shows a different reading: named blend, strong preference, balanced profile.
  const SAMPLES: Record<TypeKey, Record<TypeKey, number>> = {
    D: { D: 9, I: 3, S: 1, C: 7 }, // Strategist blend
    I: { D: 6, I: 8, S: 4, C: 2 }, // Promoter blend
    S: { D: 1, I: 3, S: 12, C: 4 }, // strong preference
    C: { D: 5, I: 2, S: 6, C: 7 }, // Conservator blend + balanced profile
  };
  const pdf = await renderReportPdf({ primary, scores: SAMPLES[primary], name: 'Juan dela Cruz' });
  return new Response(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `${url.searchParams.has('view') ? 'inline' : 'attachment'}; filename="${reportFilename(primary)}"`,
      'Cache-Control': 'no-store',
    },
  });
}
