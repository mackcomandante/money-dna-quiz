import { todaysNews } from '@/lib/fourstrands-news';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** Today's real-world news for the Four Strands game: 3 headlines with how each kind of player is affected. */
export async function GET() {
  const feed = await todaysNews();
  return Response.json(feed, { headers: { 'Cache-Control': 'public, max-age=900' } });
}
