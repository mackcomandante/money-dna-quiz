// Daily real-world news for Four Strands (the game at /fourstrands).
// Free Philippine business RSS feeds -> Gemini (free tier, Flash-Lite first) picks 3 headlines and writes how each
// kind of player is affected. If Gemini is missing, over its free limit or returns something invalid, keyword rules
// write the impacts instead. Only public headlines are ever sent to Gemini; nothing about players.
// The result is cached in memory for the Manila day, so this costs about one Gemini request a day.

const FEEDS: [string, string][] = [
  ['BusinessWorld', 'https://www.bworldonline.com/feed/'],
  ['Inquirer', 'https://business.inquirer.net/feed'],
  ['Philstar', 'https://www.philstar.com/rss/business'],
  ['GMA News', 'https://data.gmanetwork.com/gno/rss/money/feed.xml'],
  ['Manila Times', 'https://www.manilatimes.net/business/feed/'],
];
const MODELS = ['gemini-2.5-flash-lite', 'gemini-2.5-flash', 'gemini-flash-lite-latest', 'gemini-flash-latest'];

const WHO = ['all', 'employed', 'ofw', 'business', 'free', 'retired', 'rural', 'city', 'borrowers', 'savers', 'investors', 'property', 'parents', 'breadwinners'] as const;
const EFFECTS = ['cash', 'living', 'rates', 'paper', 'property', 'business'] as const;
const SIZES = ['s', 'm', 'l'] as const;

export interface Impact { who: string; effect: string; dir: 1 | -1; size: 's' | 'm' | 'l'; story: string }
export interface NewsItem { headline: string; source: string; url: string; summary: string; impacts: Impact[] }
export interface NewsFeed { date: string; engine: 'gemini' | 'rules' | 'none'; items: NewsItem[] }
interface RssItem { title: string; link: string; source: string; time: number; desc: string }

export function manilaDate(now = Date.now()): string {
  return new Date(now + 8 * 3600_000).toISOString().slice(0, 10);
}

// ---------- reading the feeds ----------
function clean(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&apos;|&#039;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
function tag(block: string, name: string): string {
  const m = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, 'i'));
  return m ? clean(m[1]) : '';
}
async function readFeed([source, url]: [string, string]): Promise<RssItem[]> {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (FourStrandsNews; +https://moneydna.exoasia.org/fourstrands)' }, signal: AbortSignal.timeout(10_000), cache: 'no-store' });
    if (!res.ok) return [];
    const xml = await res.text();
    return (xml.match(/<item[\s>][\s\S]*?<\/item>/gi) || []).map((b) => ({
      title: tag(b, 'title'), link: tag(b, 'link'), source, time: Date.parse(tag(b, 'pubDate')) || 0, desc: tag(b, 'description').slice(0, 240),
    })).filter((x) => x.title && /^https:\/\//.test(x.link));
  } catch {
    return [];
  }
}
async function recentHeadlines(): Promise<RssItem[]> {
  const all = (await Promise.all(FEEDS.map(readFeed))).flat();
  const cutoff = Date.now() - 48 * 3600_000, seen = new Set<string>();
  return all
    .filter((x) => !x.time || x.time >= cutoff)
    .sort((a, b) => b.time - a.time)
    .filter((x) => { const k = x.title.toLowerCase().slice(0, 60); if (seen.has(k)) return false; seen.add(k); return true; })
    .slice(0, 40);
}

// ---------- checking impacts (from Gemini or the rules) ----------
function validImpacts(list: unknown): Impact[] {
  if (!Array.isArray(list)) return [];
  const out: Impact[] = [];
  for (const x of list) {
    if (!x || typeof x !== 'object') continue;
    const o = x as Record<string, unknown>;
    const who = String(o.who), effect = String(o.effect), size = String(o.size), dir = Number(o.dir), story = String(o.story || '').trim();
    if (!(WHO as readonly string[]).includes(who) || !(EFFECTS as readonly string[]).includes(effect) || !(SIZES as readonly string[]).includes(size)) continue;
    if (dir !== 1 && dir !== -1) continue;
    if (!story || story.length > 220) continue;
    out.push({ who, effect, dir, size: size as Impact['size'], story });
  }
  if (!out.some((i) => i.who === 'all')) return [];
  return out.slice(0, 5);
}

// ---------- Gemini (free tier) ----------
function prompt(items: RssItem[]): string {
  const list = items.map((x, i) => `${i}. [${x.source}] ${x.title}${x.desc ? ' — ' + x.desc : ''}`).join('\n');
  return `You choose today's news for "Four Strands", a money-habits game for ordinary Filipino households.
From the numbered headlines below (Philippine business news from the last 48 hours), pick the 3 that matter most to household money: inflation, the peso, BSP interest rates, fuel and rice prices, wages and jobs, remittances, stocks, typhoons and calamities, taxes and fees. Skip company PR, awards, lifestyle and gadget stories.

For each, write:
- "index": the headline's number
- "headline": a short headline in your own words, at most 90 characters
- "summary": 1 or 2 factual sentences in your own words, at most 200 characters, no quotes
- "impacts": 2 to 5 objects, most specific first, each {"who","effect","dir","size","story"}:
  - who: one of ${WHO.join(', ')} (free = freelancers, breadwinners = people supporting parents or relatives)
  - effect: one of cash (one-off gain or loss), living (this month's living costs), rates (with who "savers" the safety fund, otherwise loans), paper (stocks and funds), property (property and land value), business (business income)
  - dir: 1 for an upside, -1 for a downside
  - size: "s" normal, "m" clear, "l" only for major events
  - story: one sentence, second person, sentence case, at most 25 words, how this touches that kind of person's money
  - include exactly one impact with who "all" as the fallback
Be fair and balanced: include real upsides (a weak peso helps OFW families, higher rates help savers). No financial advice, no politics, no hype.

Reply with JSON only: {"items":[{"index":0,"headline":"...","summary":"...","impacts":[...]}]}

Headlines:
${list}`;
}
async function viaGemini(items: RssItem[]): Promise<NewsItem[] | null> {
  const key = process.env.GEMINI_API_KEY;
  if (!key || !items.length) return null;
  const models = process.env.GEMINI_MODEL ? [process.env.GEMINI_MODEL, ...MODELS] : MODELS;
  for (const model of models) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt(items) }] }], generationConfig: { responseMimeType: 'application/json', temperature: 0.4, maxOutputTokens: 2048 } }),
        signal: AbortSignal.timeout(30_000),
      });
      if (res.status === 404 || res.status === 400) continue; // model not available to this key: try the next one
      if (!res.ok) return null; // 429 (free limit) or an outage: use the rules today
      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text || '').join('') || '';
      const parsed = JSON.parse(text.replace(/^```(?:json)?|```$/g, '').trim());
      const out: NewsItem[] = [];
      for (const it of Array.isArray(parsed?.items) ? parsed.items : []) {
        const src = items[Number(it?.index)];
        const impacts = validImpacts(it?.impacts);
        if (!src || !impacts.length || out.some((o) => o.url === src.link)) continue;
        out.push({ headline: String(it.headline || src.title).slice(0, 110), source: src.source, url: src.link, summary: String(it.summary || '').slice(0, 240), impacts });
        if (out.length === 3) break;
      }
      return out.length ? out : null;
    } catch {
      return null;
    }
  }
  return null;
}

// ---------- the no-AI fallback: keyword rules ----------
const UP = /\b(rise|rises|rising|up|higher|gain|gains|surge|hike|hikes|increase|jump|rally|grow|grows|growth|record high|strong)\b/i;
const DOWN = /\b(fall|falls|drop|drops|down|lower|decline|cut|cuts|slump|dip|dips|ease|eases|rollback|weak|slows?)\b/i;
type Rule = { key: string; re: RegExp; impacts: (up: boolean) => Impact[] };
const im = (who: string, effect: string, dir: 1 | -1, size: Impact['size'], story: string): Impact => ({ who, effect, dir, size, story });
const RULES: Rule[] = [
  { key: 'inflation', re: /\binflation|consumer prices|\bcpi\b/i, impacts: (up) => up
    ? [im('retired', 'living', -1, 'm', 'Your pension doesn’t rise with prices, so this month’s groceries and medicine take a bigger bite.'), im('business', 'business', 1, 's', 'You can pass part of the increase to customers, and your margin improves a little.'), im('all', 'living', -1, 's', 'Rice, fares and electricity cost a little more this month.')]
    : [im('all', 'living', 1, 's', 'Prices are rising more slowly, so your money stretches a little further this month.')] },
  { key: 'peso', re: /\bpeso\b|\bforex\b|exchange rate/i, impacts: (up) => up
    ? [im('ofw', 'cash', -1, 's', 'A stronger peso means each dollar you send home buys a little less.'), im('all', 'living', 1, 's', 'A stronger peso makes imported goods and fuel slightly cheaper.')]
    : [im('ofw', 'cash', 1, 'm', 'Every dollar you send home buys more pesos, so your family’s remittance stretches further.'), im('all', 'living', -1, 's', 'A weaker peso makes imported goods and fuel pricier.')] },
  { key: 'rates', re: /\bbsp\b|interest rate|policy rate|rate hike|rate cut|monetary/i, impacts: (up) => up
    ? [im('borrowers', 'rates', -1, 'm', 'Higher rates make your loans and card interest more expensive.'), im('savers', 'rates', 1, 's', 'Banks pay a little more on deposits, so your safety fund earns extra.'), im('all', 'cash', -1, 's', 'Borrowing gets pricier across the economy this month.')]
    : [im('borrowers', 'rates', 1, 'm', 'Lower rates make your loans a little cheaper to carry.'), im('savers', 'rates', -1, 's', 'Deposits earn a little less as rates come down.'), im('all', 'cash', 1, 's', 'Cheaper borrowing gives the economy a small lift.')] },
  { key: 'fuel', re: /\bfuel|\boil\b|gasoline|diesel|petrol|\blpg\b/i, impacts: (up) => up
    ? [im('business', 'business', -1, 's', 'Higher fuel costs squeeze your delivery and transport costs.'), im('all', 'living', -1, 's', 'Fares and deliveries cost more as fuel prices climb.')]
    : [im('business', 'business', 1, 's', 'Cheaper fuel trims your delivery and transport costs.'), im('all', 'living', 1, 's', 'Fuel prices eased, so fares and deliveries cost a little less.')] },
  { key: 'food', re: /\b(rice|food|sugar|vegetable|pork|chicken|egg)s?\b.*\bprices?\b|\bprices? of (rice|food|sugar)/i, impacts: (up) => up
    ? [im('rural', 'cash', 1, 's', 'Better farm prices bring a little more income to your town.'), im('parents', 'living', -1, 's', 'Feeding growing kids costs more as food prices climb.'), im('all', 'living', -1, 's', 'Food costs a little more at the market this month.')]
    : [im('all', 'living', 1, 's', 'Food prices eased a little at the market.')] },
  { key: 'farm', re: /harvest|farm output|\bagri|palay|crop/i, impacts: (up) => up
    ? [im('rural', 'cash', 1, 'm', 'A good harvest brings more income from crops and farm work.'), im('all', 'living', 1, 's', 'A bigger harvest keeps food prices in check.')]
    : [im('rural', 'cash', -1, 'm', 'A weaker harvest means less income from crops and farm work.'), im('all', 'living', -1, 's', 'A smaller harvest pushes food prices up a little.')] },
  { key: 'stocks', re: /\bpsei\b|\bstocks?\b|\bshares\b|stock market/i, impacts: (up) => up
    ? [im('investors', 'paper', 1, 's', 'Stocks rallied, and your investments rose with them.'), im('all', 'cash', 1, 's', 'Market confidence is up, a small lift for the economy.')]
    : [im('investors', 'paper', -1, 's', 'Stocks slipped, and your investments dipped.'), im('all', 'cash', -1, 's', 'A weak market mood weighs a little on the economy.')] },
  { key: 'jobs', re: /minimum wage|wage hike|\bjobs? (data|report)|employment rate|unemployment|jobless|layoffs?/i, impacts: (up) => up
    ? [im('employed', 'cash', 1, 's', 'A better job market gives you a little more bargaining power.'), im('all', 'cash', 1, 's', 'More jobs and better pay lift spending across the economy.')]
    : [im('employed', 'cash', -1, 's', 'A softer job market makes raises harder to win this month.'), im('all', 'cash', -1, 's', 'Fewer jobs means a little less money moving around.')] },
  { key: 'remit', re: /remittance|\bofw|overseas filipino/i, impacts: (up) => up
    ? [im('ofw', 'cash', 1, 's', 'Remittance flows are strong, and your family’s budget feels it.'), im('all', 'cash', 1, 's', 'Money from abroad keeps household spending steady.')]
    : [im('ofw', 'cash', -1, 's', 'Remittances slowed, so your family’s budget is tighter.'), im('all', 'cash', -1, 's', 'Less money from abroad slows household spending a little.')] },
  { key: 'calamity', re: /typhoon|\bstorm|flood|earthquake|el niño|la niña|el nino|la nina|drought/i, impacts: () =>
    [im('rural', 'cash', -1, 'l', 'Your town was hit hard, and crops and work were lost.'), im('property', 'property', -1, 's', 'Storm damage dents property values in affected areas.'), im('all', 'living', -1, 'm', 'Repairs and higher food prices follow the storm.')] },
  { key: 'fees', re: /\b(tax|vat) (hike|increase|cut)|toll (hike|increase)|fare (hike|increase)|power rates?|meralco|water rates?|electricity rates?/i, impacts: (up) => up
    ? [im('all', 'living', -1, 's', 'Bills and fees go up, so this month’s budget is tighter.')]
    : [im('all', 'living', 1, 's', 'Bills and fees come down, so this month’s budget breathes a little.')] },
];
function viaRules(items: RssItem[]): NewsItem[] {
  const out: NewsItem[] = [], used = new Set<string>();
  for (const x of items) {
    const text = x.title;
    const rule = RULES.find((r) => !used.has(r.key) && r.re.test(text));
    if (!rule) continue;
    const isUp = UP.test(text), isDown = DOWN.test(text);
    if (isUp === isDown && rule.key !== 'calamity') continue; // can't tell which way it went: don't guess
    used.add(rule.key);
    const up = isUp;
    out.push({ headline: x.title.slice(0, 110), source: x.source, url: x.link, summary: '', impacts: rule.impacts(up) });
    if (out.length === 3) break;
  }
  return out;
}

// ---------- once a day, cached ----------
let cache: { feed: NewsFeed; at: number } | null = null;
let pending: Promise<NewsFeed> | null = null;

async function build(): Promise<NewsFeed> {
  const date = manilaDate();
  const items = await recentHeadlines();
  const ai = await viaGemini(items);
  if (ai) return { date, engine: 'gemini', items: ai };
  const rules = viaRules(items);
  return { date, engine: rules.length ? 'rules' : 'none', items: rules };
}

/** Today's feed. Built once per Manila day; a fallback (rules) result is retried with Gemini after an hour. */
export async function todaysNews(): Promise<NewsFeed> {
  const date = manilaDate(), now = Date.now();
  if (cache && cache.feed.date === date && (cache.feed.engine === 'gemini' || now - cache.at < 3600_000)) return cache.feed;
  if (!pending) {
    pending = build()
      .then((feed) => { if (feed.items.length || !cache || cache.feed.date !== date) cache = { feed, at: Date.now() }; return cache!.feed; })
      .finally(() => { pending = null; });
  }
  return pending;
}
