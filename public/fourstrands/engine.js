/* Four Strands companion: game engine (no DOM). Loaded by index.html and by the balance simulator.
   Money is in pesos. Recurring amounts (salary, living, income, payments) are per month. One turn is one week, one month after 60. */
(function (root) {
  'use strict';

  const P = '₱';
  const DAY = 86400000;
  const CARD_RATE = 0.03;          // credit card interest per month
  const SALE = 0.7;                // forced-sale price
  const RETIRE_AGE = 60;
  const END_AGE = 100;

  // ---------- helpers ----------
  function rand(s) { s.rs = (s.rs + 0x6D2B79F5) | 0; let t = s.rs; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
  function ri(s, a, b) { return a + Math.floor(rand(s) * (b - a + 1)); }
  function pick(s, arr) { return arr[Math.floor(rand(s) * arr.length)]; }
  function chance(s, p) { return rand(s) < p; }
  function wpick(s, items) { const tot = items.reduce((a, x) => a + Math.max(0, x[1]), 0); let r = rand(s) * tot; for (const x of items) { r -= Math.max(0, x[1]); if (r <= 0) return x[0]; } return items[items.length - 1][0]; }
  function r100(n) { return Math.round(n / 100) * 100; }
  function r1000(n) { return Math.round(n / 1000) * 1000; }
  function peso(n) { const v = Math.round(n); return (v < 0 ? '-' : '') + P + Math.abs(v).toLocaleString('en-US'); }
  function short(n) {
    const a = Math.abs(n); let t;
    if (a >= 1e6) t = (a / 1e6).toFixed(a >= 1e7 ? 0 : 1).replace(/\.0$/, '') + 'M';
    else if (a >= 1e4) t = Math.round(a / 1e3) + 'k';
    else t = Math.round(a).toLocaleString('en-US');
    return (n < 0 ? '-' : '') + P + t;
  }
  function isoDay(ms) { return new Date(ms).toISOString().slice(0, 10); }
  function dayMs(iso) { return Date.parse(iso + 'T00:00:00Z'); }
  function daysBetween(a, b) { return Math.round((dayMs(b) - dayMs(a)) / DAY); }
  function fmtDate(ms) { const d = new Date(ms); return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }); }
  function monthOf(s) { return new Date(s.date).getUTCMonth(); }
  let uid = 0;
  function nid(s) { s.nid = (s.nid || 0) + 1; return 'x' + s.nid; }

  // ---------- types and strands ----------
  const TYPES = {
    D: { key: 'D', name: 'The Empire Builder', short: 'Empire Builder', color: '#F26B4B', strand: 'grow', power: 'Leverage',
      shadow: 'All-in', shadowText: 'Betting everything on one move.', move: 'Set a liquidity floor', voice: 'Winners don’t hedge.' },
    I: { key: 'I', name: 'The Trailblazer', short: 'Trailblazer', color: '#F5B841', strand: 'joy', power: 'Network',
      shadow: 'Spend first', shadowText: 'Money leaks out as fast as it comes in.', move: 'Automate your savings', voice: 'Life is short, and so is December.' },
    S: { key: 'S', name: 'The Guardian', short: 'Guardian', color: '#3CC3A8', strand: 'protect', power: 'Steady',
      shadow: 'Rescuer', shadowText: 'Carrying everyone else’s money problems.', move: 'Set a family limit', voice: 'Family first, always.' },
    C: { key: 'C', name: 'The Architect', short: 'Architect', color: '#6F9BF2', strand: 'system', power: 'Planner',
      shadow: 'Waiting', shadowText: 'Analyzing until inflation wins.', move: 'Set a deadline', voice: 'Better safe than sorry.' },
  };
  const TYPE_ORDER = ['D', 'I', 'S', 'C'];
  const STRANDS = {
    grow: { key: 'grow', name: 'Grow', type: 'D', color: '#F26B4B' },
    joy: { key: 'joy', name: 'Joy', type: 'I', color: '#F5B841' },
    protect: { key: 'protect', name: 'Protect', type: 'S', color: '#3CC3A8' },
    system: { key: 'system', name: 'System', type: 'C', color: '#6F9BF2' },
  };
  const STRAND_ORDER = ['grow', 'joy', 'protect', 'system'];
  const LEVELS = {
    grow: [
      { code: 'G1', name: 'Stabilize income', need: 'Keep 10% of your income left over, 3 months in a row' },
      { code: 'G2', name: 'Financial freedom', need: 'Passive income covers your monthly expenses' },
      { code: 'G3', name: 'Build your empire', need: 'Passive income 3× your expenses, from 3 kinds of assets' },
    ],
    joy: [
      { code: 'J1', name: 'Share your time', need: 'Volunteer twice, and make a small dream come true' },
      { code: 'J2', name: 'Random acts of kindness', need: '3 acts of kindness, and a medium dream' },
      { code: 'J3', name: 'Regular tithe', need: 'Give 10% for 6 months in a row, and a big dream' },
      { code: 'J4', name: 'Philanthropist', need: 'Fund a cause, and a legacy dream' },
    ],
    protect: [
      { code: 'P1', name: 'Out of debt', need: '3 months in a row with no new bad debt' },
      { code: 'P2', name: 'Emergency fund', need: 'A safety fund worth 6 months of expenses' },
      { code: 'P3', name: 'Health, life, assets', need: 'Health cover, life insurance and asset insurance' },
      { code: 'P4', name: 'Estate planning', need: 'A will and named beneficiaries (after financial freedom)' },
      { code: 'P5', name: 'Estate distribution', need: 'Happens on your 100th birthday' },
    ],
    system: [
      { code: 'S1', name: 'Money pockets', need: 'Pockets set, and 3 months in a row without the card' },
      { code: 'S2', name: 'Clear bad debt', need: 'Card, salary loans, utang and 5-6 all at zero' },
      { code: 'S3', name: 'Investing', need: 'Invest 10% or more, 6 months in a row' },
    ],
  };
  // The money pockets. Necessities is whatever is left after these, and pays the bills.
  const POCKETS = [
    { key: 'safety', name: 'Emergency fund', sub: 'Calamities and surprises' },
    { key: 'invest', name: 'Investments', sub: 'Index funds, every month' },
    { key: 'growth', name: 'Self development', sub: 'Skills that raise income' },
    { key: 'dream', name: 'Play', sub: 'Treats and your dream' },
    { key: 'giving', name: 'Give', sub: 'Tithe and family help' },
    { key: 'debt', name: 'Debt', sub: 'Extra debt payments' },
  ];
  const NECESSITIES = { name: 'Necessities', sub: 'What\u2019s left, for bills' };

  // ---------- intake ----------
  const BANDS = [
    { label: 'Under ' + P + '15k', mid: 11000 }, { label: P + '15k to 30k', mid: 22000 }, { label: P + '30k to 60k', mid: 44000 },
    { label: P + '60k to 120k', mid: 85000 }, { label: P + '120k to 250k', mid: 170000 }, { label: P + '250k or more', mid: 320000 },
  ];
  const INTAKE = [
    { id: 'name', kind: 'text', q: 'What should we call you?', help: 'Your nickname is fine.' },
    { id: 'age', kind: 'age', q: 'How old are you?', help: 'You play from today until your 100th birthday.' },
    { id: 'type', kind: 'type', q: 'What is your Money DNA?', help: 'Pick the type from your quiz result.' }, // the screen asks for the report first
    { id: 'low', kind: 'low', q: 'Which type is least like you?', help: 'This is your blind spot. It’s where you can grow the most.' },
    { id: 'household', kind: 'chips', q: 'Your household', opts: [['single', 'Single'], ['partner', 'Married or partnered, no kids'], ['kids', 'With kids'], ['solo', 'Single parent']] },
    { id: 'supports', kind: 'multi', q: 'Who else do you support?', help: 'Pick all that apply.', opts: [['parents', 'Parents'], ['siblings', 'Siblings'], ['relatives', 'Relatives'], ['none', 'No one']] },
    { id: 'work', kind: 'chips', q: 'How do you earn?', opts: [['private', 'Employed, private'], ['gov', 'Government'], ['bpo', 'BPO'], ['ofw', 'OFW or seafarer'], ['free', 'Freelancer'], ['biz', 'Business owner'], ['none', 'Not earning yet']] },
    { id: 'pay', kind: 'chips', q: 'How often are you paid?', opts: [['weekly', 'Weekly'], ['kinsenas', 'Every 15th and 30th'], ['monthly', 'Monthly'], ['irregular', 'Irregular']] },
    { id: 'band', kind: 'chips', q: 'Your household’s monthly income', help: 'A range is enough.', opts: BANDS.map((b, i) => [i, b.label]) },
    { id: 'endMonth', kind: 'chips', q: 'At the end of the month, you usually…', opts: [['borrow', 'Borrow to get by'], ['zero', 'Have nothing left'], ['little', 'Save a little'], ['save20', 'Save 20% or more']] },
    { id: 'savings', kind: 'chips', q: 'Savings you could use today', opts: [[0, 'None'], [1, 'Less than 1 month of expenses'], [2, '1 to 3 months'], [3, '3 to 6 months'], [4, '6 months or more']] },
    { id: 'debts', kind: 'multi', q: 'Debts you have', help: 'Pick all that apply.', opts: [['card', 'Credit card'], ['salary', 'Salary loan'], ['utang', 'Utang to family or friends'], ['five6', '5-6 lending'], ['home', 'Car or housing loan'], ['none', 'None']] },
    { id: 'debtAmt', kind: 'amounts', q: 'How much do you owe?', help: 'A range for each, in pesos. Your best guess is fine.' },
    { id: 'has', kind: 'multi', q: 'What you already have', help: 'Pick all that apply.', opts: [['hmo', 'HMO or health cover'], ['life', 'Life insurance'], ['mp2', 'Pag-IBIG MP2'], ['funds', 'Stocks or funds'], ['biz', 'A business'], ['property', 'Property'], ['none', 'None']] },
    { id: 'region', kind: 'chips', q: 'Where you live', opts: [['mm', 'Metro Manila'], ['city', 'Provincial city'], ['rural', 'Town or rural']] },
    { id: 'dream', kind: 'chips', q: 'What kind of dream?', help: 'Your dream cards come from this.', opts: [['house', 'A house'], ['travel', 'Travel'], ['business', 'A business'], ['education', 'Children’s education'], ['parents', 'Retiring my parents'], ['own', 'My own dream']] },
    { id: 'dreamDetail', kind: 'dream', q: 'Tell us your dream', help: 'Name it, and pick roughly what it would cost today.' },
  ];
  // How much is owed on each kind of debt: [label, midpoint in pesos].
  const DEBT_RANGES = {
    card: { name: 'Credit card', opts: [['Under 20k', 12000], ['20k\u201350k', 35000], ['50k\u2013150k', 100000], ['150k\u2013500k', 300000], ['500k+', 650000]] },
    salary: { name: 'Salary loan', opts: [['Under 50k', 30000], ['50k\u2013150k', 100000], ['150k\u2013500k', 300000], ['500k+', 700000]] },
    utang: { name: 'Utang', opts: [['Under 10k', 6000], ['10k\u201350k', 30000], ['50k\u2013200k', 120000], ['200k+', 300000]] },
    five6: { name: '5-6 lending', opts: [['Under 10k', 6000], ['10k\u201330k', 20000], ['30k\u2013100k', 60000], ['100k+', 150000]] },
    home: { name: 'Car or housing loan', opts: [['Under 500k', 300000], ['500k\u20132M', 1200000], ['2M\u20135M', 3500000], ['5M+', 7000000]] },
  };
  const TYPICAL = { name: 'Player', age: 30, household: 'single', supports: ['parents'], work: 'private', pay: 'kinsenas', band: 2, endMonth: 'zero', savings: 1, debts: ['card'], has: ['none'], region: 'mm', dream: 'travel' };
  const QUIZ = [
    { q: 'A ' + P + '50,000 bonus lands. First thought?', a: [['D', 'What can this grow into?'], ['I', 'Finally, that trip!'], ['S', 'Into savings, just in case.'], ['C', 'Let me plan where each peso goes.']] },
    { q: 'A friend pitches a business idea.', a: [['D', 'I’m in. Let’s move fast.'], ['I', 'Sounds fun, count me in!'], ['S', 'What if it fails?'], ['C', 'Show me the numbers.']] },
    { q: 'Your money feels best when…', a: [['D', 'It’s building something big.'], ['I', 'It’s creating memories.'], ['S', 'There’s a cushion for anything.'], ['C', 'Every peso has a job.']] },
    { q: 'A relative asks to borrow money.', a: [['D', 'I’ll offer them work instead.'], ['I', 'Of course! Let’s sort it out.'], ['S', 'I can’t say no to family.'], ['C', 'Only with a written plan.']] },
    { q: 'Your biggest money mistake is usually…', a: [['D', 'Going all in too soon.'], ['I', 'Spending before saving.'], ['S', 'Giving too much away.'], ['C', 'Waiting too long to act.']] },
    { q: 'On payday you…', a: [['D', 'Check what my assets earned.'], ['I', 'Treat myself, I earned it.'], ['S', 'Pay the bills first.'], ['C', 'Update my budget.']] },
  ];
  function quizScores(answers) {
    const sc = { D: 0, I: 0, S: 0, C: 0 };
    answers.forEach((t) => { if (sc[t] != null) sc[t]++; });
    const order = TYPE_ORDER.slice().sort((a, b) => sc[b] - sc[a]);
    return { scores: sc, type: order[0], low: order[3] };
  }

  // ---------- dreams ----------
  const DREAMS = {
    house: [['Repaint and fix up the house', 25000], ['Savings for a lot down payment', 250000], ['Your own house and lot', 2500000], ['Homes for a Gawad Kalinga village', 3000000]],
    travel: [['A weekend in Baguio', 15000], ['Japan with the family', 180000], ['A world trip with the whole family', 1200000], ['A learning trip for 20 public school teachers', 1500000]],
    business: [['A starter kit for a home bakery', 20000], ['Your own food cart', 150000], ['Your own restaurant', 1500000], ['Seed money for 30 small businesses', 1500000]],
    education: [['A laptop for school', 30000], ['A year of college tuition', 120000], ['Full college for your kids', 1600000], ['A scholarship fund for your town', 2000000]],
    parents: [['Nanay and Tatay’s anniversary dinner', 10000], ['Their dental and eye care', 80000], ['A monthly allowance so they can retire', 1500000], ['A home for the elderly in your town', 3000000]],
    own: [['Something small just for you', 15000], ['Something you’ve always wanted', 150000], ['Your life’s big dream', 1200000], ['A gift to your community', 2000000]],
  };
  const DREAM_SIZES = ['Small', 'Medium', 'Big', 'Legacy'];
  // How much the player's own dream costs: [label, midpoint in pesos]. Under 50k is a small dream, up to 300k medium, above that big.
  const DREAM_COSTS = [['Under \u20B150k', 30000], ['\u20B150k\u2013300k', 150000], ['\u20B1300k\u20131M', 600000], ['\u20B11M\u20135M', 2500000], ['\u20B15M or more', 8000000]];
  function dreamSizeFor(cost) { return cost < 50000 ? 0 : cost <= 300000 ? 1 : 2; }
  function drawDream(s, size) {
    // the player's own dream sits at its size on the ladder; the other rungs come from the dream type they picked
    if (s.myDream && s.myDream.size === size) { s.dream = { size, name: s.myDream.name, cost: r1000(s.myDream.cost * s.px), mine: true }; return; }
    const [name, cost] = DREAMS[s.p.dream || 'own'][size];
    s.dream = { size, name, cost: r1000(cost * s.px) };
  }

  // ---------- deals ----------
  const DEALS = [
    { name: 'Food cart franchise', cat: 'business', cost: 60000, inc: 1000, hands: true, lemon: 0.25 },
    { name: 'A bigger sari-sari store', cat: 'business', cost: 40000, inc: 650, hands: true, lemon: 0.2 },
    { name: 'Online resale shop', cat: 'business', cost: 25000, inc: 450, hands: true, lemon: 0.3 },
    { name: 'Tricycle on boundary', cat: 'business', cost: 130000, inc: 1950, hands: true, lemon: 0.2 },
    { name: 'Small carinderia', cat: 'business', cost: 250000, inc: 3750, hands: true, lemon: 0.25 },
    { name: 'Laundry shop', cat: 'business', cost: 350000, inc: 5100, hands: true, lemon: 0.2 },
    { name: 'Milk tea franchise', cat: 'business', cost: 450000, inc: 6250, hands: true, lemon: 0.3 },
    { name: 'Water refilling station', cat: 'business', cost: 600000, inc: 8550, hands: true, lemon: 0.15 },
    { name: 'Room for rent', cat: 'property', cost: 450000, inc: 2700, hands: true, lemon: 0.1 },
    { name: 'Commercial stall', cat: 'property', cost: 900000, inc: 5800, hands: true, lemon: 0.1 },
    { name: 'Apartment unit to rent out', cat: 'property', cost: 2200000, inc: 13000, hands: true, lemon: 0.08 },
    { name: 'Boarding house near a university', cat: 'property', cost: 5000000, inc: 32000, hands: true, lemon: 0.08 },
    { name: 'Lot in the province', cat: 'land', cost: 300000, inc: 0, hands: false, lemon: 0.12 },
    { name: 'Farm land leased to a farmer', cat: 'land', cost: 1200000, inc: 3000, hands: false, lemon: 0.1 },
    { name: 'Index fund', cat: 'paper', flex: true, yield: 0.0035, hands: false, lemon: 0 },
    { name: 'Blue-chip stocks on a dip', cat: 'paper', flex: true, yield: 0.003, hands: false, lemon: 0 },
    { name: 'Pag-IBIG MP2', cat: 'paper', flex: true, yield: 0.005, hands: false, lemon: 0, flat: true },
    { name: 'Retail Treasury Bonds', cat: 'paper', flex: true, yield: 0.005, hands: false, lemon: 0, flat: true },
    { name: 'Crypto tip from a group chat', cat: 'risky', cost: 50000, inc: 5000, hands: false, lemon: 0.8 },
    { name: 'Double-your-money paluwagan', cat: 'risky', cost: 30000, inc: 4500, hands: false, lemon: 0.85 },
  ];
  const GROWTH = { business: 0, property: 0.003, land: 0.005, paper: 0.004, flat: 0, risky: 0, home: 0.003 };
  const CAT_NAME = { business: 'Business', property: 'Property', land: 'Land', paper: 'Paper asset', risky: 'High risk', home: 'Your home' };

  function addAsset(s, a) {
    const asset = Object.assign({ id: nid(s), cond: 1, hands: false, loanId: null, flat: false }, a);
    asset.inc0 = asset.inc0 != null ? asset.inc0 : asset.inc;
    s.assets.push(asset);
    return asset;
  }
  function indexFund(s) {
    let a = s.assets.find((x) => x.fund);
    if (!a) a = addAsset(s, { name: 'Index fund (Investments pocket)', cat: 'paper', value: 0, inc: 0, fund: true });
    return a;
  }
  function addDebt(s, d) {
    const debt = Object.assign({ id: nid(s), bad: true, rate: 0, pay: 0 }, d);
    s.debts.push(debt);
    return debt;
  }
  function card(s) {
    let c = s.debts.find((d) => d.kind === 'card');
    if (!c) c = addDebt(s, { kind: 'card', name: 'Credit card', bal: 0, rate: CARD_RATE, bad: true });
    return c;
  }
  function cardPay(c) { return c.bal <= 0 ? 0 : Math.min(c.bal * (1 + c.rate), Math.max(500, c.bal * 0.05)); }

  // ---------- new life ----------
  function newLife(profile, todayIso, seed) {
    const p = Object.assign({}, TYPICAL, profile);
    if (!Array.isArray(p.supports)) p.supports = [p.supports];
    if (!Array.isArray(p.debts)) p.debts = [p.debts];
    if (!Array.isArray(p.has)) p.has = [p.has];
    if (!p.type) p.type = 'S';
    if (!p.low || p.low === p.type) p.low = TYPE_ORDER.find((t) => t !== p.type && t !== 'S') || 'C';
    p.age = Math.max(18, Math.min(70, Math.round(+p.age || 30)));
    const today = dayMs(todayIso);
    const s = {
      v: 2, rs: (seed >>> 0) || 1, nid: 0, p,
      start: todayIso, date: today, birth: today - p.age * 365.25 * DAY,
      px: 1, retired: false, over: null,
      salary: BANDS[p.band] ? BANDS[p.band].mid : 44000,
      pension: 0, living: 0, support: 0, kids: [], partner: p.household === 'partner' || p.household === 'kids',
      cash: 0, safety: 0, pots: { dream: 0, giving: 0, invest: 0, debt: 0, growth: 0 },
      cardLimit: 0, debts: [], assets: [],
      ins: { health: 0, life: 0, asset: 0, lifeCover: 0 }, will: false,
      pockets: { safety: 0, invest: 0, growth: 0, dream: 0, giving: 0, debt: 0 }, skill: 0,
      dream: null, dreamsDone: [0, 0, 0, 0], timeActs: 0, kindActs: 0, causeFunded: false, given: 0, scholars: 0,
      st: { g1: 0, s1: 0, s3: 0, tithe: 0, titheBest: 0, clean: 0 },
      mf: { newBad: false, cardUsed: false, inflow: 0, out: 0 },
      levels: { grow: 0, joy: 0, protect: 0, system: 0 },
      sh: { meter: 0, moves: 0, mastered: false }, blindPlays: 0, blindDone: false,
      echoes: [], queue: [], card: null, story: [], news: [],
      day: null, streak: 0, bestStreak: 0, lastDone: null, passes: 0, coins: 5,
      spend: { month: '', php: 0, total: 0 }, limit: 0, rewards: {},
      nearBroke: false, spiral: null, comeback: 0, minLeft: 0, luckyNext: false, dreamDiscount: false,
      stats: { cards: 0, turns: 0 },
    };
    const S = s.salary;
    // pay schedule
    if (p.work === 'none' || p.work === 'free' || p.work === 'biz') p.pay = p.pay === 'weekly' || p.pay === 'kinsenas' || p.pay === 'monthly' ? p.pay : 'irregular';
    if (p.work === 'ofw') p.pay = 'monthly';
    // debts
    const has = (arr, k) => arr.indexOf(k) >= 0;
    // amounts owed: the range the player picked (its midpoint), or a typical amount for their income
    const owed = (k, typical) => { const r = DEBT_RANGES[k], i = p.debtAmt && p.debtAmt[k]; return r && i != null && r.opts[i] ? r.opts[i][1] : r1000(typical); };
    const cardBal = has(p.debts, 'card') ? owed('card', 1.1 * S) : 0;
    s.cardLimit = r1000(Math.max(20000, 2 * S, cardBal * 1.25));
    card(s).bal = cardBal;
    if (has(p.debts, 'salary')) { const b = owed('salary', 2 * S); addDebt(s, { kind: 'salary', name: 'Salary loan', bal: b, rate: 0.015, pay: r100(Math.max(1000, b * 0.05)) }); }
    if (has(p.debts, 'utang')) { const b = owed('utang', 0.8 * S); addDebt(s, { kind: 'utang', name: 'Utang to family', bal: b, rate: 0, pay: r100(Math.max(500, b * 0.1)) }); }
    if (has(p.debts, 'five6')) { const b = owed('five6', 0.4 * S); addDebt(s, { kind: 'five6', name: '5-6 loan', bal: b, rate: 0.06, pay: r100(Math.max(500, b * 0.3)) }); }
    if (has(p.debts, 'home')) {
      const b = owed('home', 20 * S);
      const loan = addDebt(s, { kind: 'home', name: 'Housing or car loan', bal: b, rate: 0.006, pay: r100(b * 0.0085), bad: false });
      const home = addAsset(s, { name: 'Your home or car', cat: 'home', value: r1000(b * 1.3), inc: 0 });
      home.loanId = loan.id;
    }
    // kids and support
    if (p.household === 'kids' || p.household === 'solo') {
      const n = p.household === 'kids' ? 2 : 1;
      const oldest = Math.max(0, Math.min(20, p.age - 27));
      for (let i = 0; i < n; i++) s.kids.push({ born: today - Math.max(0, oldest - i * 3) * 365.25 * DAY, cost: r100(0.09 * S) });
    }
    if (has(p.supports, 'parents')) s.support += 0.07 * S;
    if (has(p.supports, 'siblings')) s.support += 0.04 * S;
    if (has(p.supports, 'relatives')) s.support += 0.02 * S;
    s.support = r100(s.support);
    // insurance and assets
    if (has(p.has, 'hmo')) s.ins.health = r100(Math.max(1500, 0.03 * S));
    if (has(p.has, 'life')) { s.ins.life = r100(0.03 * S); s.ins.lifeCover = r1000(24 * S); }
    if (has(p.has, 'mp2')) addAsset(s, { name: 'Pag-IBIG MP2', cat: 'paper', value: r1000(3 * S), inc: r100(3 * S * 0.0055), flat: true, yield: 0.0055 });
    if (has(p.has, 'funds')) addAsset(s, { name: 'Stock fund', cat: 'paper', value: r1000(4 * S), inc: r100(4 * S * 0.0035), yield: 0.0035 });
    if (has(p.has, 'biz')) addAsset(s, { name: 'Your small business', cat: 'business', value: r1000(5 * S), inc: r100(0.14 * S), hands: true });
    if (has(p.has, 'property')) addAsset(s, { name: 'Rental unit', cat: 'property', value: r1000(30 * S), inc: r100(30 * S * 0.006), hands: true });
    // living costs from how the month usually ends
    const ratio = { borrow: 1.0, zero: 0.95, little: 0.88, save20: 0.76 }[p.endMonth] || 0.95;
    const fixed = debtPays(s) + kidsCost(s) + s.support + s.ins.health + s.ins.life;
    s.living = r100(Math.max(0.35 * S, ratio * (S + passiveIncome(s)) - fixed));
    // savings
    const months = [0, 0.5, 2, 4.5, 8][p.savings] || 0;
    const ess = essentials(s);
    s.safety = r1000(months * ess * 0.7);
    s.cash = r1000(months * ess * 0.3 + 0.25 * S);
    // starting at 60 or older: you're already retired, and your income is your pension
    if (p.age >= RETIRE_AGE) { s.retired = true; s.pension = s.salary; s.salary = 0; }
    if (p.dreamCost != null && DREAM_COSTS[p.dreamCost]) {
      const cost = DREAM_COSTS[p.dreamCost][1], size = dreamSizeFor(cost);
      s.myDream = { size, cost, name: String(p.dreamName || '').trim().slice(0, 60) || DREAMS[p.dream || 'own'][size][0] };
    }
    drawDream(s, 0);
    s.card = null;
    updateLevels(s, true);
    s.news = [];
    return s;
  }

  // ---------- derived numbers ----------
  function ageAt(s, ms) { return (ms - s.birth) / (365.25 * DAY); }
  function age(s) { return ageAt(s, s.date); }
  function kidsCost(s) { return s.kids.filter((k) => !k.left).reduce((a, k) => a + k.cost, 0); }
  function premiums(s) { return s.ins.health + s.ins.life + s.ins.asset; }
  function essentials(s) { return s.living + kidsCost(s) + s.support + premiums(s); }
  function debtPays(s) { return s.debts.reduce((a, d) => a + (d.kind === 'card' ? cardPay(d) : Math.min(d.pay, d.bal * (1 + d.rate))), 0); }
  // You can run only so many hands-on assets well; a manager (G3) doubles that.
  function capacity(s) { return s.manager ? 8 : 4; }
  function handsOn(s) { return s.assets.filter((x) => x.hands && x.inc0 > 0).length; }
  function attention(s) { const h = handsOn(s); return h <= capacity(s) ? 1 : capacity(s) / h; }
  function assetIncome(s, x) { return x.inc * (x.cond == null ? 1 : x.cond) * (x.hands ? attention(s) : 1); }
  function passiveIncome(s) { return s.assets.reduce((a, x) => a + assetIncome(s, x), 0); }
  function income(s) { return s.retired ? s.pension : s.salary; }
  function expenses(s) { return essentials(s) + debtPays(s); }
  function badDebt(s) { return s.debts.filter((d) => d.bad).reduce((a, d) => a + d.bal, 0); }
  function assetValue(s) { return s.assets.reduce((a, x) => a + x.value, 0); }
  function netWorth(s) { return s.cash + s.safety + s.pots.dream + s.pots.giving + s.pots.invest + s.pots.debt + assetValue(s) - s.debts.reduce((a, d) => a + d.bal, 0); }
  function monthly(s) {
    const inc = income(s), pas = passiveIncome(s), ess = essentials(s), dp = debtPays(s);
    return { income: inc, passive: pas, living: s.living, kids: kidsCost(s), support: s.support, premiums: premiums(s), essentials: ess, debtPay: dp, expenses: ess + dp, flow: inc + pas - ess - dp };
  }
  function pocketPct(s) { return POCKETS.reduce((a, k) => a + (s.pockets[k.key] || 0), 0); }
  function assetKinds(s) { const k = {}; s.assets.forEach((a) => { if (a.inc > 0 && a.cat !== 'risky') k[a.cat === 'home' ? 'property' : a.cat] = 1; }); return Object.keys(k).length; }
  function cardRoom(s) { return Math.max(0, s.cardLimit - card(s).bal); }
  function blindStrand(s) { return TYPES[s.p.low].strand; }
  function strengthStrand(s) { return TYPES[s.p.type].strand; }

  // ---------- strand levels ----------
  function met(s, strand, i) {
    const m = monthly(s);
    switch (strand + i) {
      case 'grow0': return s.st.g1 >= 3;
      case 'grow1': return m.passive >= m.expenses && m.passive > 0;
      case 'grow2': return m.passive >= 3 * m.expenses && assetKinds(s) >= 3;
      case 'joy0': return s.timeActs >= 2 && s.dreamsDone[0] >= 1;
      case 'joy1': return s.kindActs >= 3 && s.dreamsDone[1] >= 1;
      case 'joy2': return s.st.titheBest >= 6 && s.dreamsDone[2] >= 1;
      case 'joy3': return s.causeFunded && s.dreamsDone[3] >= 1;
      case 'protect0': return s.st.clean >= 3;
      case 'protect1': return s.safety >= 6 * m.essentials;
      case 'protect2': return s.ins.health > 0 && s.ins.life > 0 && s.ins.asset > 0;
      case 'protect3': return s.will;
      case 'protect4': return s.over === 'legacy';
      case 'system0': return s.st.s1 >= 3;
      case 'system1': return badDebt(s) <= 0;
      case 'system2': return s.st.s3 >= 6;
    }
    return false;
  }
  function progress(s, strand, i) {
    const m = monthly(s);
    const f = (a, b) => Math.max(0, Math.min(1, b ? a / b : 0));
    switch (strand + i) {
      case 'grow0': return { frac: s.st.g1 / 3, text: s.st.g1 + ' of 3 months' };
      case 'grow1': return { frac: f(m.passive, m.expenses), text: short(m.passive) + ' of ' + short(m.expenses) + ' a month' };
      case 'grow2': return { frac: f(m.passive, 3 * m.expenses) * 0.8 + 0.2 * Math.min(1, assetKinds(s) / 3), text: short(m.passive) + ' of ' + short(3 * m.expenses) + ', ' + assetKinds(s) + ' of 3 kinds' };
      case 'joy0': return { frac: (Math.min(2, s.timeActs) + Math.min(1, s.dreamsDone[0]) * 2) / 4, text: s.timeActs + ' of 2 volunteer days, ' + (s.dreamsDone[0] ? 'dream done' : 'small dream to go') };
      case 'joy1': return { frac: (Math.min(3, s.kindActs) + Math.min(1, s.dreamsDone[1]) * 3) / 6, text: s.kindActs + ' of 3 kind acts, ' + (s.dreamsDone[1] ? 'dream done' : 'medium dream to go') };
      case 'joy2': return { frac: (Math.min(6, s.st.titheBest) + Math.min(1, s.dreamsDone[2]) * 6) / 12, text: Math.min(6, s.st.titheBest) + ' of 6 months giving 10%, ' + (s.dreamsDone[2] ? 'dream done' : 'big dream to go') };
      case 'joy3': return { frac: ((s.causeFunded ? 1 : 0) + Math.min(1, s.dreamsDone[3])) / 2, text: (s.causeFunded ? 'Cause funded' : 'No cause yet') + ', ' + (s.dreamsDone[3] ? 'legacy dream done' : 'legacy dream to go') };
      case 'protect0': return { frac: s.st.clean / 3, text: s.st.clean + ' of 3 months' };
      case 'protect1': return { frac: f(s.safety, 6 * m.essentials), text: short(s.safety) + ' of ' + short(6 * m.essentials) };
      case 'protect2': { const n = (s.ins.health > 0) + (s.ins.life > 0) + (s.ins.asset > 0); return { frac: n / 3, text: n + ' of 3 covers' }; }
      case 'protect3': return { frac: s.will ? 1 : 0, text: s.will ? 'Will signed' : (s.levels.grow >= 2 ? 'Make a will in Money' : 'Unlocks at financial freedom') };
      case 'protect4': return { frac: 0, text: 'On your 100th birthday' };
      case 'system0': return { frac: s.st.s1 / 3, text: pocketPct(s) ? s.st.s1 + ' of 3 months' : 'Set your pockets first' };
      case 'system1': return { frac: badDebt(s) <= 0 ? 1 : 0.5 * (1 - Math.min(1, badDebt(s) / Math.max(1, s.salary * 3))), text: short(badDebt(s)) + ' bad debt left' };
      case 'system2': return { frac: s.st.s3 / 6, text: s.st.s3 + ' of 6 months' };
    }
    return { frac: 0, text: '' };
  }
  function updateLevels(s, quiet) {
    STRAND_ORDER.forEach((k) => {
      const max = LEVELS[k].length;
      while (s.levels[k] < max && met(s, k, s.levels[k])) {
        const L = LEVELS[k][s.levels[k]];
        s.levels[k]++;
        if (!quiet) {
          s.coins += 3;
          s.news.push({ kind: 'level', strand: k, code: L.code, name: L.name });
          addStory(s, L.code + ' ' + L.name);
          if (k === 'grow' && s.levels.grow === 2) s.freeAge = Math.floor(age(s));
        }
      }
    });
    const b = blindStrand(s);
    const bmax = b === 'protect' ? 4 : LEVELS[b].length;
    if (!quiet && !s.blindDone && s.levels[b] >= bmax) {
      s.blindDone = true; s.coins += 25;
      s.news.push({ kind: 'blind', strand: b });
      addStory(s, 'Grew past your Money DNA');
    }
  }
  function totalLevel(s) { return STRAND_ORDER.reduce((a, k) => a + s.levels[k], 0); }
  function addStory(s, text) { s.story.push({ age: Math.floor(age(s)), text }); }

  // ---------- paying ----------
  // Order: (safety first for emergencies) -> cash -> (retirees: investments) -> safety -> credit card -> pockets -> 5-6 lender -> forced sale -> broke.
  function pay(s, amt, o) {
    o = o || {};
    let left = Math.max(0, Math.round(amt));
    const out = { safety: 0, cash: 0, card: 0, pots: 0, sold: 0, short: 0 };
    const take = (have, key) => { const x = Math.min(Math.max(0, have), left); left -= x; out[key] += x; return x; };
    if (o.emergency) s.safety -= take(s.safety, 'safety');
    s.cash -= take(s.cash, 'cash');
    if (left > 0 && s.retired) {
      s.assets.filter((x) => x.cat === 'paper' && x.value > 0).forEach((x) => {
        if (left <= 0) return;
        const y = Math.min(x.value, left); x.value -= y; x.inc = Math.round(x.value * (x.yield || 0.0035)); left -= y; out.drawn = (out.drawn || 0) + y;
      });
      s.assets = s.assets.filter((x) => x.cat !== 'paper' || x.value > 0 || x.fund);
    }
    if (left > 0) s.safety -= take(s.safety, 'safety');
    if (left > 0 && !o.noCard) {
      const x = take(cardRoom(s), 'card');
      if (x > 0) { card(s).bal += x; s.mf.newBad = true; s.mf.cardUsed = true; }
    }
    ['dream', 'invest', 'giving', 'debt'].forEach((k) => { if (left > 0) s.pots[k] -= take(s.pots[k], 'pots'); });
    if (left > 0 && !o.capped) {
      const grace = inGrace(s); // no going broke in your first game year: family bails you out
      const room56 = Math.max(0, 4 * base(s) - badDebt(s));
      const x = Math.min(left, room56);
      if (x > 0) {
        let d = s.debts.find((y) => y.kind === 'five6');
        if (!d) d = addDebt(s, { kind: 'five6', name: '5-6 loan', bal: 0, rate: 0.06, pay: 0 });
        d.bal += x; d.pay = r100(Math.max(1000, d.bal * 0.2));
        left -= x; out.lend = (out.lend || 0) + x; s.mf.newBad = true;
      }
      if (left > 0 && grace) {
        // early in the game, family bails you out instead of you going broke
        let u = s.debts.find((y) => y.kind === 'utang');
        if (!u) u = addDebt(s, { kind: 'utang', name: 'Utang to family', bal: 0, rate: 0, pay: 0 });
        u.bal += left; u.pay = r100(Math.max(1000, u.bal * 0.05));
        out.family = left; s.mf.newBad = true;
        const n = s.news.find((x) => x.kind === 'bailout');
        if (n) { n.amt += left; n.owe = u.bal; } else s.news.push({ kind: 'bailout', amt: left, owe: u.bal, until: graceUntil(s) });
        left = 0;
      }
    }
    if (left > 0 && !o.capped) {
      s.assets.filter((a) => a.cat === 'paper' && a.value > 0).forEach((a) => {
        if (left <= 0) return;
        const y = Math.min(a.value, left); a.value -= y; a.inc = Math.round(a.value * (a.yield || 0.0035)); left -= y; out.sold += y;
      });
      const sellable = s.assets.filter((a) => a.value > 0 && a.cat !== 'paper').sort((a, b) => (a.cat === 'home') - (b.cat === 'home') || (a.inc / Math.max(1, a.value)) - (b.inc / Math.max(1, b.value)));
      for (const a of sellable) {
        if (left <= 0) break;
        const net = sellAssetRaw(s, a, SALE);
        out.sold += net;
        const x = Math.min(net, left); left -= x;
        s.cash += net - x;
      }
    }
    if (left >= 1) {
      out.short = left;
      if (!o.capped) goBroke(s, o.label || 'a bill you couldn’t cover');
    }
    s.mf.out += amt - out.short;
    checkSpiral(s);
    return out;
  }
  function paidText(o) {
    const parts = [];
    if (o.safety) parts.push(short(o.safety) + ' from safety');
    if (o.cash) parts.push(short(o.cash) + ' cash');
    if (o.drawn) parts.push(short(o.drawn) + ' from your investments');
    if (o.card) parts.push(short(o.card) + ' on the card');
    if (o.pots) parts.push(short(o.pots) + ' from your pockets');
    if (o.lend) parts.push(short(o.lend) + ' from a 5-6 lender');
    if (o.family) parts.push(short(o.family) + ' borrowed from family');
    if (o.sold) parts.push('a forced sale of assets');
    return parts.length ? 'Paid: ' + parts.join(', ') + '.' : '';
  }
  function canAfford(s, amt) { return s.cash >= amt; }
  function sellAssetRaw(s, a, mult) {
    let gross = Math.round(a.value * mult);
    if (a.loanId) {
      const d = s.debts.find((x) => x.id === a.loanId);
      if (d) { const x = Math.min(gross, d.bal); d.bal -= x; gross -= x; if (d.bal <= 1) s.debts = s.debts.filter((y) => y !== d); }
    }
    s.assets = s.assets.filter((x) => x !== a);
    return Math.max(0, gross);
  }
  function checkSpiral(s) {
    const c = card(s);
    const hot = c.bal > 0.8 * s.cardLimit;
    if (hot && !s.nearBroke) { s.nearBroke = true; if (!s.spiral) s.spiral = { age: Math.floor(age(s)), date: s.date }; s.lowNW = netWorth(s); }
    if (s.nearBroke) s.lowNW = Math.min(s.lowNW == null ? 0 : s.lowNW, netWorth(s));
    if (!hot && s.nearBroke && c.bal < 0.3 * s.cardLimit) { s.nearBroke = false; s.comeback = Math.max(s.comeback, netWorth(s) - (s.lowNW || 0)); }
  }
  // the family safety net: for your first game year, family covers what you can't pay (as utang) instead of you going broke
  function graceUntil(s) { const d = new Date(dayMs(s.start)); return Date.UTC(d.getUTCFullYear() + 1, d.getUTCMonth(), d.getUTCDate()); }
  function inGrace(s) { return s.date < graceUntil(s); }
  function goBroke(s, why) {
    if (s.over) return;
    s.over = 'broke';
    s.brokeInfo = { age: Math.floor(age(s)), why, debts: s.debts.filter((d) => d.bal > 0).map((d) => ({ name: d.name, bal: d.bal })), meter: s.sh.meter, spiral: s.spiral };
    addStory(s, 'Went broke');
  }

  // ---------- time ----------
  function addMonth(ms) { const d = new Date(ms); return Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1); }
  function advance(s) {
    const sum = { paid: 0, bills: 0, passive: 0, settled: false, from: s.date };
    const days = s.retired ? Math.round((addMonth(s.date) - s.date) / DAY) : 7;
    for (let i = 0; i < days && !s.over; i++) {
      s.date += DAY;
      const d = new Date(s.date), dom = d.getUTCDate(), dow = d.getUTCDay();
      const lastDom = new Date(s.date + DAY).getUTCDate() === 1;
      if (dom === 1) { settleMonth(s, sum); if (d.getUTCMonth() === 0) newYear(s); }
      if (!s.retired && !s.over) payday(s, dom, dow, lastDom, sum);
      if (!s.retired && age(s) >= RETIRE_AGE) retire(s);
      if (!s.graceOver && !inGrace(s)) { s.graceOver = true; s.news.push({ kind: 'graceover' }); }
      if (age(s) >= END_AGE && !s.over) { finish(s); break; }
    }
    sum.to = s.date;
    return sum;
  }
  function payday(s, dom, dow, lastDom, sum) {
    let amt = 0;
    const S = s.salary;
    switch (s.p.pay) {
      case 'weekly': if (dow === 5) amt = S * 12 / 52; break;
      case 'kinsenas': if (dom === 15 || lastDom) amt = S / 2; break;
      case 'monthly': if (lastDom) amt = S; break;
      default: if (dow === 5) amt = S * 12 / 52 * (0.35 + rand(s) * 1.3);
    }
    if (amt > 0) paycheck(s, amt, sum);
  }
  function paycheck(s, amt, sum) {
    amt = Math.round(amt);
    s.cash += amt; s.mf.inflow += amt; if (sum) sum.paid += amt;
    POCKETS.forEach((k) => {
      const pct = s.pockets[k.key]; if (!pct) return;
      const x = Math.min(Math.max(0, s.cash), Math.round(amt * pct / 100));
      s.cash -= x;
      if (k.key === 'safety') s.safety += x; else s.pots[k.key] += x;
    });
  }
  function settleMonth(s, sum) {
    // income from assets and pension
    let pas = 0;
    s.assets.forEach((a) => { pas += assetIncome(s, a); });
    pas = Math.round(pas);
    s.cash += pas; s.mf.inflow += pas; if (sum) sum.passive += pas;
    if (s.retired && s.pension) { s.cash += s.pension; s.mf.inflow += s.pension; if (sum) sum.paid += s.pension; }
    // living costs
    const ess = Math.round(essentials(s));
    const o1 = pay(s, ess, { label: 'your monthly living costs' });
    if (sum) { sum.bills += ess; sum.settled = true; }
    // debts
    s.debts.slice().forEach((d) => {
      if (d.bal <= 0 || s.debts.indexOf(d) < 0) return; // a forced sale earlier in this loop may have cleared it
      const interest = d.bal * d.rate;
      if (d.kind === 'card') {
        const due = cardPay(d);
        const paid = Math.min(Math.max(0, s.cash), due);
        s.cash -= paid; s.mf.out += paid;
        // interest stops growing the balance past 1.5x the limit (it goes to collections in real life)
        d.bal = Math.min(Math.max(d.bal, s.cardLimit * 1.5), d.bal + interest - paid);
        if (paid < due - 1 && d.bal < s.cardLimit * 1.5) d.bal += 1500;
      } else {
        const due = Math.min(d.pay, d.bal + interest);
        pay(s, due, { label: 'your ' + d.name.toLowerCase() + ' payment' });
        d.bal = d.bal + interest - due;
      }
      if (sum) sum.bills += 0;
    });
    // debt pocket: extra payments, smallest bad debt first
    let dp = s.pots.debt;
    s.debts.filter((d) => d.bad && d.bal > 0).sort((a, b) => a.bal - b.bal).forEach((d) => { const x = Math.min(dp, d.bal); d.bal -= x; dp -= x; });
    s.pots.debt = dp;
    s.debts = s.debts.filter((d) => d.kind === 'card' || d.bal > 1);
    const c = card(s); if (c.bal < 1) c.bal = 0;
    // giving pocket goes out; tithe streak
    if (s.pots.giving > 0) { s.given += s.pots.giving; s.pots.giving = 0; }
    if (s.pockets.giving >= 10 && s.mf.inflow > 0) { s.st.tithe++; s.st.titheBest = Math.max(s.st.titheBest, s.st.tithe); } else s.st.tithe = 0;
    // the safety fund sits in a digital bank and earns a little interest
    if (s.safety > 0) s.safety = Math.round(s.safety * 1.0025);
    // self development: every month of income put into learning raises your income 3%
    if (s.pots.growth > 0) {
      s.skill = (s.skill || 0) + s.pots.growth; s.pots.growth = 0;
      const need = Math.max(10000 * s.px, income(s));
      if (!s.retired && s.salary > 0 && s.skill >= need) { s.skill -= need; s.salary = r100(s.salary * 1.03); s.cardLimit = r1000(Math.max(s.cardLimit, 2 * s.salary)); s.news.push({ kind: 'info', text: 'Your Self development pocket paid off: new skills raised your income 3%, to ' + short(s.salary) + ' a month.' }); }
    }
    // the Investments pocket buys index fund units
    if (s.pots.invest > 0) { const f = indexFund(s); f.value += s.pots.invest; s.pots.invest = 0; }
    // assets grow
    s.assets.forEach((a) => {
      const g = a.flat ? 0 : (GROWTH[a.cat] || 0);
      a.value = Math.round(a.value * (1 + g));
      if (a.cat === 'paper') { a.inc = Math.round(a.value * (a.yield || 0.0035)); a.inc0 = a.inc; }
    });
    // streaks
    const m = monthly(s);
    const left = s.mf.inflow - (s.mf.out);
    const base = s.retired ? Math.max(1, s.pension + passiveIncome(s)) : s.salary;
    s.st.g1 = left >= 0.1 * base ? s.st.g1 + 1 : 0;
    s.st.clean = s.mf.newBad ? 0 : s.st.clean + 1;
    const pocketsSet = POCKETS.filter((k) => s.pockets[k.key] > 0).length >= 2;
    s.st.s1 = pocketsSet && !s.mf.cardUsed ? s.st.s1 + 1 : 0;
    s.st.s3 = s.pockets.invest >= 10 ? s.st.s3 + 1 : 0;
    s.mf = { newBad: false, cardUsed: false, inflow: 0, out: 0 };
    // kids grow up
    s.kids.forEach((k) => { if (!k.left && ageAt({ birth: k.born }, s.date) >= 22) { k.left = true; s.news.push({ kind: 'info', text: 'Your child has graduated and moved out. Your costs go down.' }); addStory(s, 'A child graduated and moved out'); } });
    if (s.support > 0 && age(s) >= 62 && !s.supportEnded) { s.supportEnded = true; s.support = 0; s.news.push({ kind: 'info', text: 'Your parents have passed on. You no longer send them support.' }); }
    updateLevels(s);
  }
  function newYear(s) {
    const inf = 1.035;
    s.px *= inf;
    s.living = r100(s.living * inf);
    s.support = r100(s.support * inf);
    s.kids.forEach((k) => { k.cost = r100(k.cost * inf); });
    ['health', 'life', 'asset'].forEach((k) => { if (s.ins[k]) s.ins[k] = r100(s.ins[k] * inf); });
    if (!s.retired) { s.salary = r100(s.salary * inf); s.cardLimit = r1000(Math.max(s.cardLimit, 2 * s.salary)); }
    else s.pension = r100(s.pension * inf);
  }
  function retire(s) {
    s.retired = true;
    const formal = ['private', 'gov', 'bpo', 'ofw'].indexOf(s.p.work) >= 0;
    s.pension = r100(Math.max(5000 * s.px, s.salary * (formal ? 0.3 : 0.1)));
    s.salary = 0;
    s.living = r100(s.living * 0.7);
    s.news.push({ kind: 'retire', text: 'You retired at 60. Your salary stops. You now live on your pension of ' + short(s.pension) + ' a month, your passive income and your savings. Each turn is now a month.' });
    addStory(s, 'Retired');
  }
  function finish(s) {
    s.over = 'legacy';
    const estate = Math.max(0, netWorth(s));
    const heirs = Math.round(estate * (s.will ? 1 : 0.7) + (s.ins.life > 0 ? s.ins.lifeCover : 0));
    updateLevels(s);
    s.legacy = { estate, heirs, lost: s.will ? 0 : Math.round(estate * 0.3), given: Math.round(s.given), level: totalLevel(s), strandsDone: STRAND_ORDER.filter((k) => s.levels[k] >= LEVELS[k].length).length };
    s.legacy.score = s.legacy.level * 100 + s.legacy.strandsDone * 250 + Math.floor(s.legacy.given / 10000) + Math.floor(heirs / 50000);
  }

  // ---------- cards ----------
  const CALAMITIES = [
    { id: 'typhoon', title: 'A typhoon floods your street', base: 0.3, ins: 'asset', w: (s) => ([6, 7, 8, 9, 10].indexOf(monthOf(s)) >= 0 ? 4 : 0.6) * (s.p.region === 'rural' ? 1.4 : 1) },
    { id: 'hospital', title: 'Dengue: three days in the hospital', base: 0.36, ins: 'health', w: () => 2 },
    { id: 'surgery', title: 'You need surgery', base: 0.9, ins: 'health', w: (s) => age(s) > 45 ? 1.2 : 0.3 },
    { id: 'phone', title: 'Your phone gets snatched', base: 0.15, ins: null, w: (s) => s.p.region === 'mm' ? 1.4 : 0.6 },
    { id: 'motor', title: 'Your motorbike breaks down', base: 0.12, ins: null, w: () => 1 },
    { id: 'fire', title: 'A fire in your neighborhood', base: 0.72, ins: 'asset', w: () => 0.25 },
    { id: 'quake', title: 'An earthquake cracks your walls', base: 0.36, ins: 'asset', w: () => 0.4 },
    { id: 'jobloss', title: 'Company restructuring: a month without pay', base: 0.6, ins: null, w: (s) => s.retired || s.p.work === 'biz' ? 0 : 0.3, salary: true },
    { id: 'parent', title: 'Your father is rushed to the hospital', base: 0.48, ins: null, w: (s) => s.p.supports.indexOf('parents') >= 0 && !s.supportEnded ? 1.4 : 0 },
    { id: 'crops', title: 'Drought ruins the harvest in your town', base: 0.24, ins: null, w: (s) => s.p.region === 'rural' ? 1 : 0 },
  ];
  const ASKS = [
    ['Tita Baby needs help with a hospital bill', 0.5],
    ['Your brother needs tuition money', 0.4],
    ['Your kumpare: “Babayaran ko sa sweldo”', 0.25],
    ['Your parents’ roof is leaking', 0.45],
    ['A cousin’s wedding needs a sponsor', 0.2],
    ['Lola’s maintenance medicine', 0.15],
    ['Your nephew needs a laptop for school', 0.35],
  ];
  const GASTOS = [
    ['11.11 sale: a new phone', 0.6, 0.2, [10]],
    ['12.12 sale: a big-screen TV', 0.7, 0.2, [11]],
    ['A barkada trip to Siargao', 0.6, 0.15, [3, 4]],
    ['Valentine’s dinner at a fancy place', 0.15, 0.05, [1]],
    ['Concert tickets for your favorite band', 0.25, 0.08, []],
    ['Branded sneakers, limited release', 0.3, 0.1, []],
    ['A new laptop “for work”', 0.8, 0.3, []],
    ['Upgrade to a bigger motorbike', 1.5, 0.5, []],
    ['Christmas gifts for the whole clan', 0.5, 0.15, [11]],
  ];
  const WINDFALLS = [['A bonus at work', 0.8], ['A tax refund', 0.3], ['An old debtor pays you back', 0.4], ['You sell your old things online', 0.25], ['A raket client pays a big invoice', 0.6]];
  const BAYANIHAN = ['Coastal cleanup this Saturday', 'Your parish needs volunteers', 'Teach kids to read at the barangay hall', 'Pack relief goods for typhoon victims', 'Help build a classroom with a bayanihan crew'];
  const KINDNESS = [['A delivery rider in the rain', 0.01], ['A stranger short for their medicine', 0.04], ['A classmate’s kid needs school shoes', 0.03], ['The sampaguita vendor at church', 0.01], ['A jeepney driver’s family after a fire', 0.06]];
  const QUIET = [['A quiet week', 'Nothing much happens. Small choices still add up.']];

  function drawCard(s, opts) {
    opts = opts || {};
    // echoes first
    const due = s.echoes.filter((e) => e.due <= s.date).sort((a, b) => a.due - b.due)[0];
    if (due && !opts.noEcho) { s.echoes = s.echoes.filter((e) => e !== due); return echoCard(s, due); }
    if (s.queue.length) { const q = s.queue.shift(); if (q === 'raket') return raketCard(s, true); if (q === 'lucky') return dealCard(s, true); }
    if (s.luckyNext) { s.luckyNext = false; return dealCard(s, true); }
    // calendar
    const d = new Date(s.date), mon = d.getUTCMonth(), dom = d.getUTCDate();
    const weekHas = (m, day) => { for (let i = 0; i < 7; i++) { const x = new Date(s.date - i * DAY); if (x.getUTCMonth() === m && x.getUTCDate() === day) return true; } return false; };
    if (!opts.extra) {
      if (!s.retired && weekHas(11, 15) && s.p.work !== 'none') return windfallCard(s, s.p.work === 'free' || s.p.work === 'biz' ? 'A year-end client bonus' : 'Your 13th month pay', s.p.work === 'free' || s.p.work === 'biz' ? 0.5 : 1);
      if (s.retired && mon === 11) return windfallCard(s, 'Your 13th month pension', s.pension / Math.max(1, s.pension) * 1, s.pension);
      if (weekHas(11, 24)) return pamilyaCard(s, 'The Christmas reunion: everyone needs something', 0.45);
      if (weekHas(5, 8) && schoolKids(s).length) return schoolCard(s);
    }
    // debt help comes first when you're in trouble
    if (!opts.extra && (s.nearBroke || s.debts.some((x) => x.kind === 'five6' && x.bal > 0)) && (!s.lastRescue || s.date - s.lastRescue > 365 * DAY)) return rescueCard(s);
    if (opts.space) return spaceCard(s, opts.space);
    const m = monthly(s);
    const flex = s.p.work === 'free' || s.p.work === 'biz';
    const w = [
      ['deal', 16 + s.sh.meter],
      ['windfall', 6],
      ['pamilya', 5 + (s.support > 0 ? 4 : 0) + (s.p.supports.indexOf('relatives') >= 0 ? 2 : 0)],
      ['budget', monthly(s).flow < 0.08 * Math.max(1, income(s)) ? 6 : 1],
      ['gastos', 5 + ([1, 10, 11].indexOf(mon) >= 0 ? 4 : 0) + (s.p.type === 'I' ? 2 : 0)],
      ['bayanihan', 5],
      ['kindness', 5],
      ['dream', s.dream && s.pots.dream + Math.max(0, s.cash - m.essentials) >= s.dream.cost ? 16 : 3],
      ['seguro', s.ins.health && s.ins.life && s.ins.asset ? 0 : 3],
      ['raket', s.retired ? 2 : (flex ? 7 : 4)],
      ['life', lifeOptions(s).length ? 4 : 0],
      ['calamity', 7],
      ['shadow', s.sh.meter >= 2 && !s.sh.mastered ? 4 + s.sh.meter * 2 : 0],
      ['cause', s.levels.joy >= 3 && !s.causeFunded ? 5 : 0],
      ['estate', s.levels.grow >= 2 && !s.will ? 6 : 0],
      ['market', s.assets.some((a) => a.cat === 'paper' && a.value > 0) ? 3 : 0],
      ['quiet', 3],
    ];
    const kind = wpick(s, w);
    switch (kind) {
      case 'deal': return dealCard(s, false);
      case 'windfall': { const [t, x] = pick(s, WINDFALLS); return windfallCard(s, t, x * (0.7 + rand(s) * 0.6)); }
      case 'pamilya': { const [t, x] = pick(s, ASKS); return pamilyaCard(s, t, x * (0.45 + rand(s) * 0.4)); }
      case 'budget': return budgetCard(s);
      case 'gastos': return gastosCard(s);
      case 'bayanihan': return bayanihanCard(s);
      case 'kindness': return kindnessCard(s);
      case 'dream': return dreamCard(s);
      case 'seguro': return seguroCard(s);
      case 'raket': return raketCard(s, false);
      case 'life': return lifeCard(s);
      case 'calamity': return calamityCard(s);
      case 'shadow': return shadowCard(s);
      case 'cause': return causeCard(s);
      case 'estate': return estateCard(s);
      case 'market': return marketCard(s);
      case 'rescue': return rescueCard(s);
      default: return quietCard(s);
    }
  }
  function base(s) { return Math.max(s.salary, s.pension + passiveIncome(s) * 0.5, 15000 * s.px); }
  function shuffleFirst3(s, arr) {
    const a = arr.slice(0, 3), rest = arr.slice(3);
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand(s) * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a.concat(rest);
  }
  function choice(id, label, sub, extra) { return Object.assign({ id, label, sub: sub || '' }, extra || {}); }

  // DNA choices: strength play (your type), shadow bait (your type), blind-spot play (your lowest type), then a fourth option.
  function dnaChoices(s, kind, data, fourth) {
    const t = s.p.type, l = s.p.low;
    const st = PLAYS[kind][t](s, data), bl = PLAYS[kind][l](s, data), sh = BAITS[kind][t](s, data);
    st.id = 'play:' + t; st.tag = 'strength'; st.type = t;
    bl.id = 'play:' + l; bl.tag = 'blind'; bl.type = l;
    sh.id = 'bait:' + t; sh.tag = 'shadow'; sh.type = t;
    return shuffleFirst3(s, [st, sh, bl]).concat(fourth ? [fourth] : []);
  }

  // ----- deals -----
  function makeDeal(s, lucky) {
    const nw = Math.max(0, netWorth(s)), S = base(s);
    const cap = Math.max(10 * S, nw * 0.6);
    const pool = DEALS.filter((d) => d.flex || d.cost * s.px <= cap);
    const tpl = pick(s, pool);
    let cost, inc;
    if (tpl.flex) { cost = r1000(Math.max(10000 * s.px, Math.min(Math.max(s.cash, S) * (0.4 + rand(s) * 0.6), cap))); inc = Math.round(cost * tpl.yield); }
    else { const k = 0.85 + rand(s) * 0.3; cost = r1000(tpl.cost * s.px * k); inc = r100(tpl.inc * s.px * k); }
    let lemon = chance(s, tpl.lemon);
    if (lucky) { lemon = false; inc = r100(inc * 1.25); cost = r1000(cost * 0.9); }
    return { name: tpl.name, cat: tpl.cat, cost, inc, hands: tpl.hands, lemon, flat: !!tpl.flat, yield: tpl.yield, lucky: !!lucky };
  }
  function dealCard(s, lucky) {
    const deal = makeDeal(s, lucky);
    const body = deal.cat === 'paper' ? 'Put ' + short(deal.cost) + ' in, and earn about ' + short(deal.inc) + ' a month. You don’t have to run it.'
      : deal.cat === 'land' ? 'Land tends to rise in value over the years.' + (deal.inc ? ' The lease pays a little each month.' : ' It pays nothing until you sell.')
      : deal.cat === 'risky' ? 'Your group chat swears it pays ' + short(deal.inc) + ' a month.'
      : 'It needs your attention each week. ' + (deal.hands ? 'Missed days hurt it.' : '');
    return { kind: 'deal', strand: 'grow', title: (lucky ? 'Lucky deal: ' : '') + deal.name, body, deal, choices: dnaChoices(s, 'deal', deal, choice('pass', 'Pass on this one', 'Keep your cash for now.')) };
  }
  function buyAsset(s, deal, share, opts) {
    opts = opts || {};
    const a = addAsset(s, { name: deal.name + (share < 1 ? ' (half share)' : ''), cat: deal.cat, value: Math.round(deal.cost * share), inc: Math.round(deal.inc * share), hands: deal.hands, flat: deal.flat, yield: deal.yield });
    if (deal.lemon || opts.lemon) { s.echoes.push({ due: s.date + ri(s, 10, 30) * 7 * DAY, kind: 'lemon', assetId: a.id, name: a.name }); }
    return a;
  }
  function loanFor(s, amount, name) { return addDebt(s, { kind: 'biz', name: 'Loan: ' + name, bal: amount, rate: 0.01, pay: r100(amount * 0.0143), bad: false }); }

  const PLAYS = {
    deal: {
      D: (s, d) => { const down = r1000(d.cost * 0.1); const pay = r100(d.cost * 0.9 * 0.0143); return choice('', 'Buy it with a loan, 10% down', 'Pay ' + short(down) + ' now. Loan payments ' + short(pay) + ' a month for 10 years.', s.cash < down ? { disabled: true, why: 'You need ' + short(down) + ' in cash.' } : null); },
      I: (s, d) => { const half = r1000(d.cost / 2); return choice('', 'Go in with a partner from your network', 'Pay ' + short(half) + '. Share the income: ' + short(d.inc / 2) + ' a month.', s.cash < half ? { disabled: true, why: 'You need ' + short(half) + ' in cash.' } : null); },
      S: (s, d) => choice('', 'Buy it with cash, safety fund untouched', 'Pay ' + short(d.cost) + ' from your cash.', s.cash < d.cost ? { disabled: true, why: 'You have ' + short(s.cash) + ' in cash.' } : null),
      C: (s, d) => choice('', 'Check the numbers first', 'Spot any red flags. If it’s sound, negotiate 10% off.'),
    },
    windfall: {
      D: (s, w) => choice('', 'Put it to work in an asset', short(w.amt) + ' into your best business, or an index fund.'),
      I: (s, w) => choice('', 'Celebrate a little, then fund your dream', short(w.amt * 0.1) + ' on a treat, the rest to your Play pocket for your dream.'),
      S: (s, w) => choice('', 'Top up your safety fund', 'All ' + short(w.amt) + ' into safety.'),
      C: (s, w) => choice('', 'Split it across your pockets', 'Emergency fund, Play and Investments, by plan.'),
    },
    pamilya: {
      D: (s, a) => choice('', 'Offer them work instead of cash', 'A raket for them. No cash from you.'),
      I: (s, a) => choice('', 'Rally the family to chip in', 'You give ' + short(a.amt * 0.3) + '. Others cover the rest.'),
      S: (s, a) => choice('', 'Give your set amount', short(setAmount(s, a.amt)) + ', no more.'),
      C: (s, a) => choice('', 'Help with a written payment plan', 'Lend ' + short(a.amt) + '. They repay over a few months.', s.cash < a.amt ? { disabled: true, why: 'You have ' + short(s.cash) + ' in cash.' } : null),
    },
  };
  const BAITS = {
    deal: {
      D: (s, d) => choice('', 'Go all in: buy two', 'Double the income: ' + short(d.inc * 2) + ' a month. “' + TYPES.D.voice + '”'),
      I: (s, d) => choice('', 'Say yes on the spot', 'Your friend is so excited. Pay ' + short(d.cost) + ' today, card if needed.'),
      S: (s, d) => choice('', 'Lend the money to your cousin for it', 'He needs the break more than you. “' + TYPES.S.voice + '”'),
      C: (s, d) => choice('', 'Wait and research it some more', '“' + TYPES.C.voice + '” Decide in a few weeks.'),
    },
    windfall: {
      D: (s, w) => choice('', 'Bet it all on a hot stock tip', 'It could double in weeks. “' + TYPES.D.voice + '”'),
      I: (s, w) => choice('', 'Treat the barkada to a beach trip', 'You’ve earned it. “' + TYPES.I.voice + '”'),
      S: (s, w) => choice('', 'Give it all to family', 'They need it more than you. “' + TYPES.S.voice + '”'),
      C: (s, w) => choice('', 'Leave it in the bank until you decide', 'No rush. “' + TYPES.C.voice + '”'),
    },
    pamilya: {
      D: (s, a) => choice('', 'Pay it all now on your card', 'You’ll make it back. “' + TYPES.D.voice + '”'),
      I: (s, a) => choice('', 'Pay it, and treat everyone to dinner', 'Make it a happy day. “' + TYPES.I.voice + '”'),
      S: (s, a) => choice('', 'Pay it all, and offer next month too', 'No one else will. “' + TYPES.S.voice + '”'),
      C: (s, a) => choice('', 'Tell them you’ll think about it', 'Look at it properly next month. “' + TYPES.C.voice + '”'),
    },
  };
  function setAmount(s, amt) { return r100(Math.min(amt, Math.max(s.pots.giving, 0.04 * base(s)))); }

  function resolveDeal(s, c, id) {
    const d = c.deal;
    if (id === 'pass') return { msg: 'You let it go.' };
    if (id === 'play:D') {
      const down = r1000(d.cost * 0.1);
      pay(s, down, { label: 'a down payment' });
      const a = buyAsset(s, d, 1); a.loanId = loanFor(s, d.cost - down, d.name).id;
      return { msg: 'You own ' + d.name + ' with a loan. It earns ' + short(d.inc) + ' a month.', tone: 'good' };
    }
    if (id === 'play:I') {
      pay(s, r1000(d.cost / 2), { label: 'your share of a deal' });
      buyAsset(s, d, 0.5);
      return { msg: 'You and a friend own it together. Your share earns ' + short(d.inc / 2) + ' a month.', tone: 'good' };
    }
    if (id === 'play:S') {
      if (s.cash < d.cost) return { msg: 'You no longer have ' + short(d.cost) + ' in cash, so you let it go.' };
      pay(s, d.cost, { label: 'a deal' });
      buyAsset(s, d, 1);
      return { msg: 'Bought with cash, no debt. It earns ' + short(d.inc) + ' a month.', tone: 'good' };
    }
    if (id === 'play:C') {
      if (d.lemon && chance(s, 0.8)) return { msg: 'Red flags: the numbers don’t add up and the seller won’t show records. You walk away and lose nothing.', tone: 'good' };
      const price = r1000(d.cost * 0.9);
      if (s.cash >= price) { pay(s, price); buyAsset(s, d, 1); return { msg: 'The numbers are sound. You negotiated 10% off and paid ' + short(price) + ' cash.', tone: 'good' }; }
      const down = r1000(price * 0.2);
      if (s.cash >= down) { pay(s, down); const a = buyAsset(s, d, 1); a.value = price; a.loanId = loanFor(s, price - down, d.name).id; return { msg: 'The numbers are sound. 10% off, 20% down, and a loan for the rest.', tone: 'good' }; }
      return { msg: 'The numbers are sound, but you don’t have the cash for it yet. You note it for next time.' };
    }
    shadowUp(s);
    if (id === 'bait:D') {
      const total = d.cost * 2, down = r1000(total * 0.1);
      s.cash += s.safety; s.safety = 0;
      pay(s, down, { label: 'an all-in deal' });
      const a1 = buyAsset(s, d, 1); a1.loanId = loanFor(s, d.cost - down / 2, d.name).id;
      const a2 = buyAsset(s, d, 1, { lemon: d.lemon }); a2.loanId = loanFor(s, d.cost - down / 2, d.name + ' #2').id;
      s.echoes.push({ due: s.date + ri(s, 8, 16) * 7 * DAY, kind: 'nocushion' });
      return { msg: 'You own two. Income: ' + short(d.inc * 2) + ' a month. Your safety fund went into the down payment.', tone: 'good' };
    }
    if (id === 'bait:I') {
      pay(s, d.cost, { label: 'a deal' });
      buyAsset(s, d, 1, { lemon: d.lemon || chance(s, 0.2) });
      pay(s, r100(d.cost * 0.05), { label: 'a celebration' });
      return { msg: 'Done on the spot, with a little celebration. It earns ' + short(d.inc) + ' a month.', tone: 'good' };
    }
    if (id === 'bait:S') {
      const lend = r1000(Math.min(Math.max(0, s.cash) * 0.5, d.cost * 0.3));
      if (lend > 0) { s.cash -= lend; s.echoes.push({ due: s.date + ri(s, 12, 26) * 7 * DAY, kind: 'cousin', amt: lend }); }
      return { msg: lend ? 'Your cousin is so grateful. You lent him ' + short(lend) + '.' : 'You had nothing to lend, but you promised to help next time.', tone: 'good' };
    }
    if (id === 'bait:C') {
      s.echoes.push({ due: s.date + ri(s, 5, 9) * 7 * DAY, kind: 'waited', name: d.name });
      return { msg: 'You start a spreadsheet. There’s no rush.' };
    }
    return { msg: '' };
  }

  // ----- windfall -----
  function windfallCard(s, title, mult, exact) {
    const amt = r1000(exact != null ? exact : base(s) * mult);
    const w = { amt, title };
    const fourth = badDebt(s) > 0 ? choice('debt', 'Pay down your bad debt', 'Clear the most expensive debt first.') : choice('keep', 'Keep it as cash', 'Decide later.');
    return { kind: 'windfall', strand: 'grow', title, body: short(amt) + ' lands in your account.', w, choices: dnaChoices(s, 'windfall', w, fourth) };
  }
  function resolveWindfall(s, c, id) {
    const A = c.w.amt; s.cash += A; s.mf.inflow += A;
    if (id === 'keep') return { msg: short(A) + ' is in your cash.' };
    if (id === 'debt') { const paid = payBadDebt(s, A); return { msg: 'You paid ' + short(paid) + ' off your bad debt.', tone: 'good' }; }
    if (id === 'play:D') {
      s.cash -= A;
      const biz = s.assets.filter((a) => a.cat === 'business' && a.inc > 0).sort((a, b) => b.inc / b.value - a.inc / a.value)[0];
      if (biz) { const r = biz.inc / Math.max(1, biz.value); biz.value += A; biz.inc = Math.round(biz.inc + A * r); biz.inc0 = biz.inc; return { msg: 'You expanded ' + biz.name + '. It now earns ' + short(biz.inc) + ' a month.', tone: 'good' }; }
      const f = indexFund(s); f.value += A; f.inc = Math.round(f.value * 0.0035);
      return { msg: short(A) + ' went into your index fund.', tone: 'good' };
    }
    if (id === 'play:I') { s.cash -= A; s.pots.dream += Math.round(A * 0.9); s.mf.out += A * 0.1; return { msg: 'A good dinner out, and ' + short(A * 0.9) + ' to your dream.', tone: 'good' }; }
    if (id === 'play:S') { s.cash -= A; s.safety += A; return { msg: 'Your safety fund is ' + short(A) + ' stronger.', tone: 'good' }; }
    if (id === 'play:C') {
      s.cash -= A;
      const tot = s.pockets.safety + s.pockets.dream + s.pockets.invest;
      const sh = tot ? { safety: s.pockets.safety / tot, dream: s.pockets.dream / tot, invest: s.pockets.invest / tot } : { safety: 0.3, dream: 0.2, invest: 0.5 };
      s.safety += Math.round(A * sh.safety); s.pots.dream += Math.round(A * sh.dream);
      const f = indexFund(s); f.value += Math.round(A * sh.invest);
      return { msg: 'Split by plan: safety, dream and investing.', tone: 'good' };
    }
    shadowUp(s);
    if (id === 'bait:D') { s.cash -= A; s.echoes.push({ due: s.date + ri(s, 3, 8) * 7 * DAY, kind: 'tip', amt: A }); return { msg: 'You’re in. The chart looks great so far.' }; }
    if (id === 'bait:I') { s.cash -= A; const extra = r100(A * 0.25); pay(s, extra, { label: 'a trip' }); s.echoes.push({ due: s.date + ri(s, 4, 6) * 7 * DAY, kind: 'trip', amt: extra }); return { msg: 'The best trip of the year. The photos are amazing.', tone: 'good' }; }
    if (id === 'bait:S') { s.cash -= A; s.echoes.push({ due: s.date + ri(s, 6, 12) * 7 * DAY, kind: 'askagain', amt: r1000(A * 0.6) }); return { msg: 'Your family is grateful. You feel good.' }; }
    if (id === 'bait:C') { s.echoes.push({ due: s.date + ri(s, 10, 16) * 7 * DAY, kind: 'idle', amt: A }); return { msg: short(A) + ' is safe in the bank while you compare options.' }; }
    return { msg: '' };
  }
  function payBadDebt(s, amt) {
    let left = Math.min(amt, Math.max(0, s.cash)); const start = left;
    s.debts.filter((d) => d.bad && d.bal > 0).sort((a, b) => b.rate - a.rate).forEach((d) => { const x = Math.min(left, d.bal); d.bal -= x; left -= x; });
    s.cash -= start - left;
    s.debts = s.debts.filter((d) => d.kind === 'card' || d.bal > 1);
    return start - left;
  }

  // ----- pamilya -----
  function pamilyaCard(s, title, mult) {
    const amt = r1000(Math.max(2000, base(s) * mult));
    const a = { amt, title };
    return { kind: 'pamilya', strand: 'joy', title, body: 'They need ' + short(amt) + '.', a, choices: dnaChoices(s, 'pamilya', a, choice('no', 'Say no, kindly', 'Explain that your budget is set this month.')) };
  }
  function resolvePamilya(s, c, id) {
    const A = c.a.amt;
    if (id === 'no') return { msg: 'They’re disappointed, but they understand.' };
    if (id === 'play:D') { if (chance(s, 0.6)) { s.kindActs++; return { msg: 'They took the raket and earned it themselves. That counts as kindness.', tone: 'good' }; } return { msg: 'They wanted cash, not work. They’ll ask someone else.' }; }
    if (id === 'play:I') { const x = r100(A * 0.3); pay(s, x, { label: 'family help' }); s.given += x; s.kindActs++; return { msg: 'The whole family chipped in. You gave ' + short(x) + '.', tone: 'good' }; }
    if (id === 'play:S') { const x = setAmount(s, A); const fromPot = Math.min(s.pots.giving, x); s.pots.giving -= fromPot; if (x > fromPot) pay(s, x - fromPot, { label: 'family help' }); s.given += x; s.kindActs++; return { msg: 'You gave your set amount: ' + short(x) + '. It helps, without hurting your plan.', tone: 'good' }; }
    if (id === 'play:C') { if (s.cash < A) return { msg: 'You don\u2019t have ' + short(A) + ' to lend right now.' }; s.cash -= A; s.echoes.push({ due: s.date + ri(s, 8, 16) * 7 * DAY, kind: 'repaid', amt: r100(A * (chance(s, 0.7) ? 0.9 : 0.4)) }); return { msg: 'You lent ' + short(A) + ' with a signed payment plan.' }; }
    shadowUp(s);
    if (id === 'bait:D') { const x = Math.min(A, cardRoom(s)); if (x > 0) { card(s).bal += x; s.mf.newBad = true; s.mf.cardUsed = true; } if (A > x) pay(s, A - x, { label: 'family help' }); s.given += A; return { msg: 'Paid in full, ' + short(x) + ' of it on the card.' }; }
    if (id === 'bait:I') { const x = A + r100(base(s) * 0.08); const o = pay(s, x, { label: 'family help' }); s.given += A; return { msg: 'Paid, and dinner for everyone. ' + paidText(o), tone: 'good' }; }
    if (id === 'bait:S') { const o = pay(s, A, { label: 'family help' }); s.given += A; if (!c.fromEcho) s.echoes.push({ due: s.date + ri(s, 3, 6) * 7 * DAY, kind: 'askagain', amt: A }); return { msg: 'Paid in full, and you promised next month too. ' + paidText(o) }; }
    if (id === 'bait:C') { if (!c.fromEcho) s.echoes.push({ due: s.date + ri(s, 4, 8) * 7 * DAY, kind: 'askagain', amt: r1000(A * 1.4) }); return { msg: 'You tell them you’ll look at it properly.' }; }
    return { msg: '' };
  }

  // ----- other cards -----
  function gastosCard(s) {
    const mon = monthOf(s);
    let pool = GASTOS.filter((g) => (!g[3].length || g[3].indexOf(mon) >= 0) && cooled(s, 'g:' + g[0], 300));
    if (!pool.length) return quietCard(s);
    const g = pick(s, pool);
    s.cool['g:' + g[0]] = s.date;
    const big = r100(base(s) * g[1]), small = r100(base(s) * g[2]);
    const I = s.p.type === 'I';
    const buy = choice('buy', I ? 'Buy it now' : 'Buy it', I ? 'You deserve it. “' + TYPES.I.voice + '”' : short(big) + ', card if needed.', I ? { tag: 'shadow', type: 'I' } : null);
    if (I) buy.sub = short(big) + '. “' + TYPES.I.voice + '”';
    return { kind: 'gastos', strand: 'joy', title: g[0], body: 'It costs ' + short(big) + '.', g: { big, small }, choices: [buy, choice('small', 'Get a smaller version', short(small) + ', planned and paid in cash.'), choice('skip', 'Skip it', 'Keep the money.')] };
  }
  function resolveGastos(s, c, id) {
    if (id === 'buy') { if (s.p.type === 'I') shadowUp(s); const o = pay(s, c.g.big, { label: 'a purchase' }); return { msg: 'It’s yours. ' + paidText(o) }; }
    if (id === 'small') { const o = pay(s, c.g.small, { label: 'a treat' }); return { msg: 'A planned treat. ' + paidText(o), tone: 'good' }; }
    return { msg: 'You skipped it. A week later, you don’t miss it.', tone: 'good' };
  }
  function cooled(s, key, days) { s.cool = s.cool || {}; return !s.cool[key] || s.date - s.cool[key] > days * DAY; }
  function calamityCard(s, sev) {
    const pool = CALAMITIES.map((x) => [x, cooled(s, 'cal:' + x.id, x.id === 'surgery' || x.id === 'fire' ? 1095 : 365) ? x.w(s) : 0]);
    if (!pool.some((x) => x[1] > 0)) return quietCard(s);
    const c = wpick(s, pool);
    s.cool['cal:' + c.id] = s.date;
    let cost = r100(base(s) * c.base * (0.7 + rand(s) * 0.6) * (sev || 1));
    if (c.salary) cost = r100(s.salary);
    const cover = c.ins && s.ins[c.ins] ? r100(cost * 0.8) : 0;
    const rest = cost - cover;
    const ch = [choice('pay', 'Pay for it', (cover ? 'Insurance covers ' + short(cover) + '. ' : '') + 'You pay ' + short(rest) + ', safety fund first.')];
    if (rest >= 3000 && !s.debts.some((d) => d.kind === 'utang' && d.bal > 0)) ch.push(choice('utang', 'Borrow from family', 'Utang of ' + short(rest) + ', repaid monthly.'));
    return { kind: 'calamity', strand: 'protect', title: c.title, body: (c.salary ? 'You lose a month of salary: ' : 'It costs ') + short(cost) + '.' + (cover ? ' Your insurance helps.' : (c.ins ? ' You have no ' + c.ins + ' insurance.' : '')), cal: { id: c.id, cost, cover, rest, salary: c.salary }, choices: ch };
  }
  function resolveCalamity(s, c, id) {
    const x = c.cal;
    if (x.rest <= 0) return { msg: 'Insurance covered it all.', tone: 'good' };
    if (id === 'utang') { addDebt(s, { kind: 'utang', name: 'Utang to family', bal: x.rest, rate: 0, pay: r100(Math.max(1000, x.rest * 0.1)) }); s.mf.newBad = true; return { msg: 'Family lent you ' + short(x.rest) + '. You’ll repay it monthly.' }; }
    const o = pay(s, x.rest, { emergency: true, label: 'an emergency' });
    return { msg: (x.cover ? 'Insurance paid ' + short(x.cover) + '. ' : '') + paidText(o), tone: o.card || o.sold ? 'bad' : '' };
  }
  function seguroCard(s) {
    const S = base(s), ch = [];
    if (!s.ins.health) ch.push(choice('health', 'Health cover (HMO)', short(Math.max(1500 * s.px, 0.03 * S)) + ' a month. Pays 80% of hospital bills.'));
    if (!s.ins.life) ch.push(choice('life', 'Life insurance', short(0.03 * S) + ' a month. Pays your heirs ' + short(24 * S) + '.'));
    if (!s.ins.asset) ch.push(choice('asset', 'Home and property insurance', short(Math.max(800 * s.px, 0.015 * S)) + ' a month. Pays 80% of typhoon and fire damage.'));
    ch.push(choice('no', 'Not now', 'Maybe next time.'));
    return { kind: 'seguro', strand: 'protect', title: 'An insurance advisor visits', body: 'Premiums become a monthly expense.', choices: ch };
  }
  function buyInsurance(s, kind) {
    const S = base(s);
    if (kind === 'health' && !s.ins.health) s.ins.health = r100(Math.max(1500 * s.px, 0.03 * S));
    if (kind === 'life' && !s.ins.life) { s.ins.life = r100(0.03 * S); s.ins.lifeCover = r1000(24 * S); }
    if (kind === 'asset' && !s.ins.asset) s.ins.asset = r100(Math.max(800 * s.px, 0.015 * S));
    updateLevels(s);
  }
  function insuranceQuote(s, kind) {
    const S = base(s);
    return kind === 'health' ? r100(Math.max(1500 * s.px, 0.03 * S)) : kind === 'life' ? r100(0.03 * S) : r100(Math.max(800 * s.px, 0.015 * S));
  }
  function resolveSeguro(s, c, id) {
    if (id === 'no') return { msg: 'Maybe next time.' };
    buyInsurance(s, id);
    return { msg: 'Covered. The premium is now part of your monthly expenses.', tone: 'good' };
  }
  function bayanihanCard(s) {
    const gig = r100(base(s) * 0.08);
    return { kind: 'bayanihan', strand: 'joy', title: pick(s, BAYANIHAN), body: 'They need a few hours of your Saturday.', gig, choices: [choice('go', 'Volunteer', 'Give your time.'), choice('gig', 'Skip it, take a raket instead', 'Earn ' + short(gig) + '.')] };
  }
  function resolveBayanihan(s, c, id) {
    if (id === 'go') { s.timeActs++; return { msg: 'A long, good day. You shared your time.', tone: 'good' }; }
    s.cash += c.gig; s.mf.inflow += c.gig; return { msg: 'You earned ' + short(c.gig) + '.' };
  }
  function kindnessCard(s) {
    const [t, x] = pick(s, KINDNESS);
    const amt = r100(Math.max(300, base(s) * x));
    return { kind: 'kindness', strand: 'joy', title: t, body: short(amt) + ' would make their day.', amt, choices: [choice('give', 'Help them', 'Give ' + short(amt) + '.'), choice('no', 'Not this time', 'Keep walking.')] };
  }
  function resolveKindness(s, c, id) {
    if (id === 'give') { pay(s, c.amt, { label: 'a kind act' }); s.kindActs++; s.given += c.amt; return { msg: 'A small act of kindness. They won’t forget it.', tone: 'good' }; }
    return { msg: 'You walk on.' };
  }
  function dreamCard(s) {
    const d = s.dream;
    if (!d) return quietCard(s);
    const cost = dreamCost(s);
    const need = Math.max(0, cost - s.pots.dream);
    const add = r1000(Math.max(1000, base(s) * 0.1));
    const ch = [];
    ch.push(choice('do', 'Make it come true', need > 0 ? short(s.pots.dream) + ' from your Play pocket, ' + short(need) + ' from cash.' : 'Your Play pocket has enough.', need > Math.max(0, s.cash) ? { disabled: true, why: 'You need ' + short(need) + ' more.' } : null));
    ch.push(choice('add', 'Add ' + short(add) + ' to your Play pocket', 'Get closer.', s.cash < add ? { disabled: true, why: 'Not enough cash.' } : null));
    ch.push(choice('wait', 'Not yet', 'Keep saving.'));
    return { kind: 'dream', strand: 'joy', title: d.name, body: DREAM_SIZES[d.size] + ' dream. Costs ' + short(cost) + '. Your Play pocket: ' + short(s.pots.dream) + '.', add, choices: ch };
  }
  function dreamCost(s) { return s.dream ? r1000(s.dream.cost * (s.dreamDiscount ? 0.8 : 1)) : 0; }
  function fulfilDream(s) {
    const d = s.dream; if (!d) return false;
    const cost = dreamCost(s);
    const fromPot = Math.min(s.pots.dream, cost), rest = cost - fromPot;
    if (rest > s.cash) return false;
    s.pots.dream -= fromPot; s.cash -= rest; s.mf.out += cost;
    s.dreamsDone[d.size]++; s.dreamDiscount = false;
    if (d.size === 3) { s.given += cost; }
    addStory(s, 'Dream come true: ' + d.name);
    s.news.push({ kind: 'dream', text: d.name });
    if (d.size < 3) drawDream(s, d.size + 1); else s.dream = null;
    updateLevels(s);
    return true;
  }
  function resolveDream(s, c, id) {
    if (id === 'do') { if (!s.dream) return { msg: 'Every dream is already done.' }; const name = s.dream.name; if (fulfilDream(s)) return { msg: 'Dream come true: ' + name + '.' + (s.dream ? ' Your next dream: ' + s.dream.name + '.' : ''), tone: 'good' }; return { msg: 'Not enough yet.' }; }
    if (id === 'add') { if (s.cash < c.add) return { msg: 'Not enough cash to add right now.' }; s.cash -= c.add; s.pots.dream += c.add; return { msg: 'Your Play pocket now has ' + short(s.pots.dream) + '.', tone: 'good' }; }
    return { msg: 'Keep saving.' };
  }
  function raketCard(s, bonus) {
    const amt = r100(base(s) * (0.15 + rand(s) * 0.25));
    const course = r100(base(s) * 0.3);
    const ch = [choice('gig', 'Take the gig', 'Earn ' + short(amt) + '.')];
    if (!s.retired && (!s.lastCourse || s.date - s.lastCourse > 2 * 365 * DAY)) ch.push(choice('course', 'Take a short course instead', 'Pay ' + short(course) + '. Your income rises 5% for good.', s.cash < course ? { disabled: true, why: 'Not enough cash.' } : null));
    ch.push(choice('rest', 'Rest this weekend', 'You’ve earned it.'));
    return { kind: 'raket', strand: 'grow', title: bonus ? 'Streak reward: a side gig' : 'A side gig this weekend', body: s.retired ? 'An old client wants your advice.' : 'Someone needs your skills.', amt, course, choices: ch };
  }
  function resolveRaket(s, c, id) {
    if (id === 'gig') { s.cash += c.amt; s.mf.inflow += c.amt; return { msg: 'You earned ' + short(c.amt) + '.', tone: 'good' }; }
    if (id === 'course') { pay(s, c.course); s.lastCourse = s.date; s.salary = r100(s.salary * 1.05); return { msg: 'New skills. Your income is now ' + short(s.salary) + ' a month.', tone: 'good' }; }
    return { msg: 'A restful weekend.' };
  }
  function schoolKids(s) { return s.kids.filter((k) => { const a = ageAt({ birth: k.born }, s.date); return !k.left && a >= 5 && a < 22; }); }
  function schoolCard(s) {
    const n = schoolKids(s).length;
    const pub = r100(base(s) * 0.15 * n), priv = r100(base(s) * 1.2 * n);
    const I = s.p.type === 'I';
    return { kind: 'school', strand: 'protect', title: 'School opening in June', body: n + (n > 1 ? ' kids need' : ' child needs') + ' enrollment, uniforms and supplies.', sc: { pub, priv }, choices: [
      choice('pub', 'Public school, supplies on a budget', 'Pay ' + short(pub) + '.'),
      choice('priv', I ? 'The private school their friends go to' : 'Private school tuition', 'Pay ' + short(priv) + '.' + (I ? ' “' + TYPES.I.voice + '”' : ''), I ? { tag: 'shadow', type: 'I' } : null),
    ] };
  }
  function resolveSchool(s, c, id) {
    if (id === 'priv') { if (s.p.type === 'I') shadowUp(s); const o = pay(s, c.sc.priv, { label: 'tuition' }); return { msg: 'Enrolled. ' + paidText(o) }; }
    const o = pay(s, c.sc.pub, { label: 'school costs' }); return { msg: 'Ready for school. ' + paidText(o), tone: 'good' };
  }
  function lifeOptions(s) {
    const a = age(s), o = [];
    if (!s.partner && a >= 22 && a <= 45) o.push('wedding');
    if (s.partner && a <= 42 && s.kids.length < 3) o.push('baby');
    const promoOk = !s.lastPromo || s.date - s.lastPromo > 3 * 365 * DAY;
    if (promoOk && !s.retired && ['private', 'gov', 'bpo', 'ofw'].indexOf(s.p.work) >= 0 && a < 55) o.push('promotion');
    if (promoOk && !s.retired && (s.p.work === 'biz' || s.p.work === 'free') && a < 55) o.push('client');
    return o;
  }
  function lifeCard(s) {
    const k = pick(s, lifeOptions(s));
    const S = base(s);
    if (k === 'wedding') {
      const simple = r1000(S * 1.5), grand = r1000(S * 6);
      return { kind: 'life', sub: 'wedding', strand: 'joy', title: 'Your partner wants to get married', body: 'Your household changes: more income, more costs.', w: { simple, grand }, choices: [
        choice('simple', 'A simple church wedding', 'Pay ' + short(simple) + '.'),
        choice('grand', 'The wedding of the year', 'Pay ' + short(grand) + ', card if needed.', s.p.type === 'I' ? { tag: 'shadow', type: 'I', sub: short(grand) + '. “' + TYPES.I.voice + '”' } : null),
        choice('later', 'Not yet', 'Wait a while.')] };
    }
    if (k === 'baby') return { kind: 'life', sub: 'baby', strand: 'joy', title: 'Thinking of having a baby', body: 'A child costs about ' + short(S * 0.09) + ' a month, more in school.', choices: [choice('yes', 'Yes, start a family', 'Your monthly costs go up.'), choice('no', 'Not now', 'Maybe later.')] };
    if (k === 'promotion') { const raise = 0.06 + rand(s) * 0.06; return { kind: 'life', sub: 'promotion', strand: 'grow', title: 'You got promoted', body: 'Your salary rises ' + Math.round(raise * 100) + '%.', raise, choices: [
      choice('keep', 'Keep your lifestyle the same', 'Save the difference.'),
      choice('up', 'Upgrade your lifestyle', 'A nicer place, a nicer car.', s.p.type === 'I' ? { tag: 'shadow', type: 'I', sub: 'You’ve worked for this. “' + TYPES.I.voice + '”' } : null)] }; }
    const raise = 0.05 + rand(s) * 0.07;
    return { kind: 'life', sub: 'promotion', strand: 'grow', title: 'A big client signs on', body: 'Your income rises ' + Math.round(raise * 100) + '%.', raise, choices: [choice('keep', 'Keep your lifestyle the same', 'Save the difference.'), choice('up', 'Upgrade your lifestyle', 'A nicer place, a nicer car.')] };
  }
  function resolveLife(s, c, id) {
    if (c.sub === 'wedding') {
      if (id === 'later') return { msg: 'You agree to wait a little longer.' };
      if (id === 'grand' && s.p.type === 'I') shadowUp(s);
      const o = pay(s, id === 'grand' ? c.w.grand : c.w.simple, { label: 'a wedding' });
      s.partner = true; s.salary = r100(s.salary * 1.6); s.living = r100(s.living * 1.35); s.cardLimit = r1000(Math.max(s.cardLimit, 2 * s.salary));
      addStory(s, 'Got married');
      return { msg: 'Congratulations! Your partner’s income joins yours, and so do their costs. ' + paidText(o), tone: 'good' };
    }
    if (c.sub === 'baby') {
      if (id === 'no') return { msg: 'Maybe later.' };
      s.kids.push({ born: s.date, cost: r100(base(s) * 0.09) }); addStory(s, 'A baby was born');
      return { msg: 'Welcome to the world, little one. Your monthly costs go up.', tone: 'good' };
    }
    s.lastPromo = s.date;
    s.salary = r100(s.salary * (1 + c.raise)); s.cardLimit = r1000(Math.max(s.cardLimit, 2 * s.salary));
    if (id === 'up') { if (s.p.type === 'I') shadowUp(s); s.living = r100(s.living * (1 + c.raise * 1.1)); return { msg: 'A nicer life. Your costs rose with your income.' }; }
    return { msg: 'Same lifestyle, bigger margin. Your income is now ' + short(s.salary) + '.', tone: 'good' };
  }
  const MOVES = {
    D: { label: 'Set a liquidity floor', sub: (s) => 'Move ' + short(liquidityAmt(s)) + ' into safety and never invest it.' },
    I: { label: 'Automate your savings', sub: () => 'Your Emergency fund pocket rises to at least 10% of every payday.' },
    S: { label: 'Set a family limit', sub: () => 'A Give pocket of 5%. Family help comes from it, no more.' },
    C: { label: 'Set a deadline', sub: (s) => 'Invest ' + short(deadlineAmt(s)) + ' in an index fund today.' },
  };
  function liquidityAmt(s) { return r1000(Math.min(Math.max(0, s.cash), essentials(s))); }
  function deadlineAmt(s) { return r1000(Math.min(Math.max(0, s.cash) * 0.5, base(s) * 2)); }
  function shadowCard(s) {
    const t = s.p.type, T = TYPES[t];
    return { kind: 'shadow', strand: T.strand, title: 'Your shadow is loud this week', body: T.shadow + ': ' + T.shadowText + ' Your move: ' + T.move.toLowerCase() + '.', choices: [
      choice('move', MOVES[t].label, MOVES[t].sub(s), { tag: 'strength', type: t }),
      choice('later', 'Not now', 'Keep doing what feels natural.')] };
  }
  function useMove(s) {
    const t = s.p.type;
    if (t === 'D') { const x = liquidityAmt(s); s.cash -= x; s.safety += x; }
    if (t === 'I') s.pockets.safety = Math.max(10, s.pockets.safety);
    if (t === 'S') s.pockets.giving = Math.max(5, s.pockets.giving);
    if (t === 'C') { const x = deadlineAmt(s); if (x > 0) { s.cash -= x; const f = indexFund(s); f.value += x; f.inc = Math.round(f.value * 0.0035); } }
    s.sh.meter = Math.max(0, s.sh.meter - 2); s.sh.moves++;
    if (s.sh.moves >= 3 && !s.sh.mastered) { s.sh.mastered = true; s.coins += 10; s.news.push({ kind: 'mastered', type: t }); addStory(s, 'Mastered your shadow'); }
  }
  function resolveShadow(s, c, id) {
    if (id === 'move') { useMove(s); return { msg: s.sh.mastered ? 'Shadow mastered. Its echoes now hit half as hard.' : 'Done. Your shadow is quieter (' + s.sh.moves + ' of 3 moves to master it).', tone: 'good' }; }
    return { msg: 'Your shadow stays loud.' };
  }
  function shadowUp(s) { s.sh.meter = Math.min(5, s.sh.meter + 1); }
  function causeCard(s) {
    const amt = r1000(Math.max(20 * base(s), 0.1 * Math.max(0, netWorth(s))));
    return { kind: 'cause', strand: 'joy', title: 'Fund a scholarship in your town', body: short(amt) + ' sends 4 students through college.', amt, choices: [choice('fund', 'Fund it', 'Pay ' + short(amt) + '.', s.cash + s.safety < amt ? { disabled: true, why: 'You need ' + short(amt) + ' in cash and safety.' } : null), choice('later', 'Not yet', 'Build more first.')] };
  }
  function resolveCause(s, c, id) {
    if (id !== 'fund') return { msg: 'Maybe later.' };
    pay(s, c.amt, { label: 'a cause' }); s.causeFunded = true; s.given += c.amt; s.scholars += 4; addStory(s, 'Funded 4 scholars');
    updateLevels(s); return { msg: 'Four students will finish college because of you.', tone: 'good' };
  }
  function estateCard(s) {
    const fee = willFee(s);
    return { kind: 'estate', strand: 'protect', title: 'A lawyer offers to draft your will', body: 'Without a will, your heirs lose about 30% to taxes, fees and disputes.', fee, choices: [choice('will', 'Make a will', 'Pay ' + short(fee) + '.', s.cash < fee ? { disabled: true, why: 'Not enough cash.' } : null), choice('later', 'Not yet', 'There’s time.')] };
  }
  function willFee(s) { return r1000(Math.max(25000 * s.px, 0.005 * Math.max(0, netWorth(s)))); }
  function makeWill(s) { if (s.will || s.levels.grow < 2) return false; const fee = willFee(s); if (s.cash < fee) return false; s.cash -= fee; s.will = true; addStory(s, 'Signed a will'); updateLevels(s); return true; }
  function resolveEstate(s, c, id) { if (id === 'will' && makeWill(s)) return { msg: 'Your will is signed. Your heirs are protected.', tone: 'good' }; return { msg: 'Maybe later.' }; }
  function marketCard(s) {
    const up = chance(s, 0.45);
    return { kind: 'market', strand: 'grow', title: up ? 'Markets rally' : 'Markets fall 15%', body: up ? 'Your paper assets rise 12%.' : 'Your paper assets drop 15% in value.', up, choices: up
      ? [choice('hold', 'Stay the course', 'Keep investing as planned.'), choice('sell', 'Sell everything at the top', 'Take the cash now.')]
      : [choice('hold', 'Hold steady', 'Markets recover over time.'), choice('buy', 'Buy more on the dip', 'Put ' + short(dipAmt(s)) + ' in.', dipAmt(s) <= 0 ? { disabled: true, why: 'No spare cash.' } : null), choice('sell', 'Sell everything before it falls more', 'Lock in the loss.')] };
  }
  function dipAmt(s) { return r1000(Math.max(0, s.cash - essentials(s)) * 0.5); }
  function resolveMarket(s, c, id) {
    const papers = s.assets.filter((a) => a.cat === 'paper' && !a.flat);
    papers.forEach((a) => { a.value = Math.round(a.value * (c.up ? 1.12 : 0.85)); a.inc = Math.round(a.value * (a.yield || 0.0035)); a.inc0 = a.inc; });
    if (id === 'sell') { let got = 0; papers.forEach((a) => { got += sellAssetRaw(s, a, 1); }); s.cash += got; return { msg: 'You sold for ' + short(got) + '.' + (c.up ? '' : ' The market recovered a few months later.') }; }
    if (id === 'buy') { const x = dipAmt(s); s.cash -= x; const f = indexFund(s); f.value += x; f.inc = Math.round(f.value * 0.0035); return { msg: 'You bought ' + short(x) + ' at a discount.', tone: 'good' }; }
    return { msg: c.up ? 'You stayed the course.' : 'You held steady.', tone: 'good' };
  }
  function rescueDebts(s) { return s.debts.filter((d) => d.bal > 0 && (d.kind === 'card' || d.kind === 'five6' || d.kind === 'utang')); }
  function rescueCard(s) {
    s.lastRescue = s.date;
    const total = r1000(rescueDebts(s).reduce((a, d) => a + d.bal, 0));
    const pay = r100(total * 0.0362);
    return { kind: 'rescue', strand: 'system', title: 'A debt counselor offers help', body: 'Your card and lender debts total ' + short(total) + '. They can roll it into one lower-rate loan.', total, choices: [
      choice('roll', 'Roll it into one loan', 'One payment of ' + short(pay) + ' a month for 3 years, at 1.5% a month.'),
      choice('no', 'Not now', 'Keep paying them separately.')] };
  }
  function resolveRescue(s, c, id) {
    if (id !== 'roll') return { msg: 'You keep juggling.' };
    const total = rescueDebts(s).reduce((a, d) => a + d.bal, 0);
    rescueDebts(s).forEach((d) => { d.bal = 0; });
    s.debts = s.debts.filter((d) => d.kind === 'card' || d.bal > 1);
    addDebt(s, { kind: 'salary', name: 'Debt consolidation loan', bal: Math.round(total), rate: 0.015, pay: r100(total * 0.0362) });
    checkSpiral(s);
    return { msg: 'One loan, one payment, a lower rate. Your card is clear. Don’t fill it again.', tone: 'good' };
  }
  function canCut(s) { return !s.lastCut || s.date - s.lastCut > 180 * DAY; }
  function cutCosts(s) { if (!canCut(s)) return 0; const x = r100(s.living * 0.08); s.living -= x; s.lastCut = s.date; return x; }
  function budgetCard(s) {
    const x = r100(s.living * 0.08);
    return { kind: 'budget', strand: 'system', title: 'A budget check-up', body: 'You spend ' + short(s.living) + ' a month on living costs. Where can you trim?', choices: [
      choice('cut', 'Cut 8% of your living costs', 'Save ' + short(x) + ' a month: cheaper rent, fewer subscriptions.', canCut(s) ? null : { disabled: true, why: 'You cut costs recently. Try again in a few months.' }),
      choice('keep', 'Keep things as they are', 'Your lifestyle stays the same.')] };
  }
  function resolveBudget(s, c, id) { if (id === 'cut') { const x = cutCosts(s); return { msg: 'Trimmed. You save ' + short(x) + ' every month.', tone: 'good' }; } return { msg: 'Nothing changes.' }; }
  function quietCard(s) {
    const save = r100(base(s) * 0.03);
    return { kind: 'quiet', strand: 'system', title: 'A quiet week', body: 'Nothing big happens. Small choices still add up.', save, choices: [choice('cook', 'Cook at home all week', 'Save ' + short(save) + '.'), choice('out', 'Eat out with friends', 'Spend ' + short(save) + '.')] };
  }
  function resolveQuiet(s, c, id) {
    if (id === 'cook') { s.cash += c.save; return { msg: 'You saved ' + short(c.save) + '.', tone: 'good' }; }
    pay(s, c.save); return { msg: 'Good food, good friends.' };
  }

  // ----- echoes -----
  function echoCard(s, e) {
    const sev = s.sh.mastered ? 0.5 : 1 + s.sh.meter * 0.15;
    const base0 = { kind: 'echo', strand: 'shadow', echo: e, choices: [choice('ok', 'Okay', '')] };
    switch (e.kind) {
      case 'lemon': if (!s.assets.some((x) => x.id === e.assetId)) return Object.assign(base0, { title: 'Good thing you sold', body: e.name + ' failed after you sold it. You got out in time.' });
        return Object.assign(base0, { title: 'The deal went bad', body: e.name + ' failed. Most of its value is gone, but any loan on it remains.' });
      case 'nocushion': return Object.assign(base0, { title: 'A surprise bill, and no cushion', body: 'Your all-in move left no safety fund. It costs ' + short(base(s) * 0.5 * sev) + '.', amt: r100(base(s) * 0.5 * sev) });
      case 'tip': return Object.assign(base0, { title: 'Your hot stock tip', body: 'The chart turned.' });
      case 'trip': return Object.assign(base0, { title: 'The trip’s card bill arrives', body: 'Interest and fees: ' + short(e.amt * 0.3 * sev) + '.', amt: r100(e.amt * 0.3 * sev) });
      case 'askagain': return pamilyaCardEcho(s, e);
      case 'idle': return Object.assign(base0, { title: 'Still deciding', body: 'Your ' + short(e.amt) + ' sat in the bank. Inflation took ' + short(e.amt * 0.03 * sev) + ' of its value.', amt: r100(e.amt * 0.03 * sev) });
      case 'waited': return Object.assign(base0, { title: 'The deal is gone', body: 'While you researched, someone else bought ' + e.name + '. Your idle cash lost ' + short(Math.max(0, s.cash) * 0.01 * sev) + ' to inflation.', amt: r100(Math.max(0, s.cash) * 0.01 * sev) });
      case 'cousin': return Object.assign(base0, { title: 'Your cousin’s deal', body: 'You lent him ' + short(e.amt) + '.' });
      case 'repaid': return Object.assign(base0, { title: 'A payment plan pays off', body: 'Your relative paid back ' + short(e.amt) + '.' });
    }
    return Object.assign(base0, { title: 'An echo', body: '' });
  }
  function pamilyaCardEcho(s, e) {
    const c = pamilyaCard(s, 'They’re asking again', e.amt / Math.max(1, base(s)));
    c.body = 'Last time you said yes. Now they need ' + short(c.a.amt) + '.';
    c.fromEcho = true;
    return c;
  }
  function resolveEcho(s, c) {
    const e = c.echo;
    switch (e.kind) {
      case 'lemon': { const a = s.assets.find((x) => x.id === e.assetId); if (a) { a.value = Math.round(a.value * 0.3); a.inc = 0; a.inc0 = 0; a.name += ' (failed)'; a.hands = false; } return { msg: 'A hard lesson. Check the numbers next time.', tone: 'bad' }; }
      case 'tip': { if (chance(s, 0.35)) { s.cash += e.amt * 2; return { msg: 'It doubled! You got ' + short(e.amt * 2) + '. Lucky this time.', tone: 'good' }; } s.cash += Math.round(e.amt * 0.3); return { msg: 'It crashed. You got back ' + short(e.amt * 0.3) + ' of ' + short(e.amt) + '.', tone: 'bad' }; }
      case 'cousin': { const r = rand(s); if (r < 0.3) { s.cash += e.amt; return { msg: 'He paid you back in full. This time.', tone: 'good' }; } if (r < 0.7) { s.cash += Math.round(e.amt * 0.3); return { msg: 'He paid back ' + short(e.amt * 0.3) + '. The rest is “next time.”', tone: 'bad' }; } return { msg: 'He can’t pay you back. You won’t see that money again.', tone: 'bad' }; }
      case 'repaid': s.cash += e.amt; return { msg: 'Repaid as agreed.', tone: 'good' };
      default: if (c.amt) { const o = pay(s, c.amt, { label: 'an echo of an old choice', emergency: e.kind === 'nocushion' }); return { msg: paidText(o), tone: 'bad' }; }
    }
    return { msg: '' };
  }

  // ---------- choosing ----------
  function choose(s, id) {
    const c = s.card; if (!c || s.over) return null;
    const opt = c.choices.find((x) => x.id === id);
    if (!opt || opt.disabled) return null;
    let r;
    const blind = opt.tag === 'blind';
    switch (c.kind) {
      case 'deal': r = resolveDeal(s, c, id); break;
      case 'windfall': r = resolveWindfall(s, c, id); break;
      case 'pamilya': r = resolvePamilya(s, c, id); break;
      case 'gastos': r = resolveGastos(s, c, id); break;
      case 'calamity': r = resolveCalamity(s, c, id); break;
      case 'seguro': r = resolveSeguro(s, c, id); break;
      case 'bayanihan': r = resolveBayanihan(s, c, id); break;
      case 'kindness': r = resolveKindness(s, c, id); break;
      case 'dream': r = resolveDream(s, c, id); break;
      case 'raket': r = resolveRaket(s, c, id); break;
      case 'school': r = resolveSchool(s, c, id); break;
      case 'life': r = resolveLife(s, c, id); break;
      case 'shadow': r = resolveShadow(s, c, id); break;
      case 'cause': r = resolveCause(s, c, id); break;
      case 'estate': r = resolveEstate(s, c, id); break;
      case 'market': r = resolveMarket(s, c, id); break;
      case 'quiet': r = resolveQuiet(s, c, id); break;
      case 'budget': r = resolveBudget(s, c, id); break;
      case 'rescue': r = resolveRescue(s, c, id); break;
      case 'echo': r = resolveEcho(s, c); break;
      default: r = { msg: '' };
    }
    if (blind) { s.blindPlays++; s.coins += 1; r.blind = true; }
    s.card = null;
    s.assets.forEach((a) => { if (a.hands && a.cond < 1) a.cond = Math.min(1, a.cond + 0.04); });
    updateLevels(s);
    r.news = s.news.splice(0);
    finishTurnBookkeeping(s);
    return r;
  }

  // ---------- days, streaks, coins ----------
  function baseTurns(n) { return n === 1 ? 8 : n <= 7 ? 5 : 3; }
  // Saves made by older versions of the game miss newer fields; fill them in so every feature works on old games.
  function upgradeSave(s) {
    if (!s) return s;
    s.pots = s.pots || {}; ['dream', 'giving', 'invest', 'debt', 'growth'].forEach((k) => { if (typeof s.pots[k] !== 'number' || !isFinite(s.pots[k])) s.pots[k] = 0; });
    s.pockets = s.pockets || {}; POCKETS.forEach((k) => { if (typeof s.pockets[k.key] !== 'number' || !isFinite(s.pockets[k.key])) s.pockets[k.key] = 0; });
    if (typeof s.skill !== 'number' || !isFinite(s.skill)) s.skill = 0;
    if (typeof s.pos !== 'number') s.pos = 0;
    s.cool = s.cool || {}; s.newsSeen = s.newsSeen || {}; s.rewards = s.rewards || {};
    s.queue = s.queue || []; s.echoes = s.echoes || []; s.news = s.news || []; s.story = s.story || [];
    s.stats = s.stats || { cards: 0, turns: 0 }; s.spend = s.spend || { month: '', php: 0, total: 0 };
    s.dreamsDone = s.dreamsDone || [0, 0, 0, 0]; s.ins = s.ins || { health: 0, life: 0, asset: 0, lifeCover: 0 }; if (s.ins.lifeCover == null) s.ins.lifeCover = 0;
    s.sh = s.sh || { meter: 0, moves: 0, mastered: false };
    if (s.day) ['baseLeft', 'extraLeft', 'boughtTurns', 'extraCards', 'played'].forEach((k) => { if (typeof s.day[k] !== 'number') s.day[k] = 0; });
    if (typeof s.passes !== 'number') s.passes = 0; if (typeof s.coins !== 'number' || !isFinite(s.coins)) s.coins = 0;
    return s;
  }
  function openDay(s, todayIso) {
    upgradeSave(s);
    if (s.over) return null;
    if (!s.day) { s.day = { n: 1, date: todayIso, base: 8, baseLeft: 8, extraLeft: 0, boughtTurns: 0, extraCards: 0, played: 0, done: false }; return null; }
    if (todayIso === s.day.date) return null;
    const gap = daysBetween(s.day.date, todayIso);
    if (gap < 0) return null;
    const prevDone = s.day.done;
    s.dayReward = null; // an uncelebrated reward from an earlier day is dropped (its coins were already paid)
    const missed = gap - 1;
    let report = null, covered = 0;
    // rest passes only protect a streak that can survive: yesterday finished, at most 6 days missed, enough passes
    const saveable = prevDone && missed <= 6 && missed <= s.passes;
    if (missed > 0) { report = runAbsence(s, missed, saveable); covered = report.covered; }
    const alive = prevDone && covered === missed;
    if (!alive) s.streak = 0;
    const n = s.day.n + gap;
    const b = baseTurns(n);
    s.day = { n, date: todayIso, base: b, baseLeft: b, extraLeft: 0, boughtTurns: 0, extraCards: 0, played: 0, done: false };
    if (report && missed >= 2 && !s.over) { s.coins += 2; s.luckyNext = true; report.comeback = true; }
    return report;
  }
  function turnsLeft(s) { return s.day ? s.day.baseLeft + s.day.extraLeft : 0; }
  // A turn: roll the die, move around the board, live the week, then draw the card for the space you land on.
  function startTurn(s) {
    if (s.over || s.card || !s.day || turnsLeft(s) <= 0) return null;
    if (s.day.baseLeft > 0) s.day.baseLeft--; else s.day.extraLeft--;
    s.day.played++; s.stats.turns++;
    const from = s.pos || 0, roll = ri(s, 1, 6);
    s.pos = (from + roll) % BOARD.length;
    const sum = advance(s);
    if (s.over) { sum.news = s.news.splice(0); return { sum, card: null, roll, from, to: s.pos }; }
    s.card = drawCard(s, { space: BOARD[s.pos] });
    s.stats.cards++;
    sum.news = s.news.splice(0);
    return { sum, card: s.card, roll, from, to: s.pos };
  }
  function finishTurnBookkeeping(s) {
    if (s.day && !s.day.done && !s.over && s.day.baseLeft === 0 && !s.card) completeDay(s);
  }
  function completeDay(s) {
    s.day.done = true;
    s.streak++; s.bestStreak = Math.max(s.bestStreak, s.streak);
    // coins earned today: 2 for completing practice, plus streak bonuses; other rewards are listed separately
    const n = s.streak, got = [];
    let coins = 2;
    if (n === 3) { s.queue.push('raket'); got.push('A bonus side gig'); }
    if (n % 7 === 0) { s.passes++; coins += 5; got.push('A rest pass'); }
    if (n % 30 === 0) { s.queue.push('lucky'); coins += 20; got.push('A lucky deal'); }
    if (n === 100 && !s.rewards.d100) { s.rewards.d100 = 1; s.dreamDiscount = true; got.push('20% off your dream'); }
    if (n === 365 && !s.rewards.d365) { s.rewards.d365 = 1; addAsset(s, { name: 'Legacy seed', cat: 'paper', value: r1000(10 * base(s)), inc: r100(10 * base(s) * 0.004), yield: 0.004 }); got.push('A legacy seed'); }
    s.coins += coins;
    s.dayReward = { streak: n, got, coins };
  }
  const COIN_PACKS = [{ coins: 30, php: 49 }, { coins: 70, php: 99 }, { coins: 200, php: 249 }];
  function monthKey(iso) { return iso.slice(0, 7); }
  function buyCoins(s, i, todayIso) {
    const pk = COIN_PACKS[i]; if (!pk) return { ok: false };
    const mk = monthKey(todayIso);
    if (s.spend.month !== mk) s.spend = { month: mk, php: 0, total: s.spend.total || 0 };
    if (s.limit && s.spend.php + pk.php > s.limit) return { ok: false, why: 'That would go past your monthly limit of ' + peso(s.limit) + '.' };
    s.spend.php += pk.php; s.spend.total += pk.php; s.coins += pk.coins;
    return { ok: true };
  }
  function spentThisMonth(s, todayIso) { return s.spend.month === monthKey(todayIso) ? s.spend.php : 0; }
  function canExtraCard(s) { return !!s.day && !s.over && !s.card && s.day.played > 0 && s.day.extraCards < 3 && s.coins >= 1; }
  function extraCard(s) {
    if (!canExtraCard(s)) return null;
    s.coins -= 1; s.day.extraCards++;
    s.card = drawCard(s, { extra: true, noEcho: true }); s.stats.cards++;
    return s.card;
  }
  function canBuyTurn(s) { return !!s.day && !s.over && s.day.boughtTurns < 3 && s.coins >= 3; }
  function buyTurn(s) { if (!canBuyTurn(s)) return false; s.coins -= 3; s.day.boughtTurns++; s.day.extraLeft++; return true; }

  // ---------- absence ----------
  const SLIPS = {
    D: ['You signed a deal without reading the fine print', 0.3],
    I: ['Your online carts checked themselves out', 0.2],
    S: ['You covered a cousin’s bill without thinking', 0.25],
    C: ['Your cash sat idle while you weren’t looking', 0],
  };
  const MISSED = ['A great lot sold while you were away', 'Your kumpare offered you a deal, then gave it to someone else', 'A client couldn’t reach you and went elsewhere', 'A friend’s business needed a partner. You weren’t there'];
  function runAbsence(s, missed, usePasses) {
    const rep = { days: missed, covered: 0, lines: [], startNW: netWorth(s), stage: 'busy' };
    for (let i = 1; i <= missed && !s.over; i++) {
      const stage = i <= 6 ? 'busy' : i <= 13 ? 'drifting' : 'neglect';
      rep.stage = stage;
      let covered = false;
      if (usePasses && stage === 'busy' && s.passes > 0) { s.passes--; covered = true; rep.covered++; }
      for (let t = 0; t < 3 && !s.over; t++) advance(s);
      if (s.over) break;
      // hands-on assets drift when you're away
      if (stage !== 'busy') {
        const mgr = s.levels.grow >= 3 && s.manager;
        s.assets.forEach((a) => {
          if (!a.hands || a.inc0 <= 0) return;
          a.cond = Math.max(0, a.cond * (mgr ? 0.93 : 0.86));
          if (stage === 'neglect' && a.cat === 'business' && chance(s, mgr ? 0.04 : 0.08)) { a.value = Math.round(a.value * 0.3); a.inc = 0; a.inc0 = 0; a.cond = 0; a.name += ' (closed)'; rep.lines.push(a.name.replace(' (closed)', '') + ' closed while you were away.'); }
        });
      }
      if (covered) continue;
      const sev = stage === 'busy' ? 0.15 : stage === 'drifting' ? 0.4 : 0.7;
      const capped = stage !== 'neglect';
      const roll = rand(s);
      if (roll < 0.35) {
        rep.lines.push(pick(s, MISSED) + '.');
      } else if (roll < 0.75) {
        const pool = CALAMITIES.filter((x) => !x.salary).map((x) => [x, cooled(s, 'cal:' + x.id, 365) ? x.w(s) : 0]);
        if (!pool.some((x) => x[1] > 0)) { rep.lines.push(pick(s, MISSED) + '.'); continue; }
        const c = wpick(s, pool); s.cool['cal:' + c.id] = s.date;
        const cost = r100(Math.max(500, base(s) * Math.min(c.base, 1.5) * sev));
        const cover = c.ins && s.ins[c.ins] ? r100(cost * 0.8) : 0;
        pay(s, cost - cover, { emergency: true, capped, label: 'a setback while you were away' });
        rep.lines.push(c.title + '. ' + (cover ? 'Insurance paid ' + short(cover) + ', you paid ' + short(cost - cover) + '.' : 'It cost ' + short(cost) + '.'));
      } else {
        const [t, x] = SLIPS[s.p.type];
        const cost = s.p.type === 'C' ? r100(Math.max(0, s.cash) * 0.01 * (1 + sev)) : r100(base(s) * x * sev * 2);
        const o = pay(s, cost, { capped, label: 'a shadow slip' });
        rep.lines.push('Shadow slip: ' + t + '. Cost you ' + short(cost - o.short) + '.');
      }
    }
    rep.endNW = netWorth(s);
    rep.lines = rep.lines.slice(-6);
    // keep any notices (levels, bailouts, retirement): they show at the start of the next turn
    return rep;
  }
  function hireManager(s) { if (s.levels.grow < 3 || s.manager) return false; s.manager = true; s.assets.forEach((a) => { if (a.hands) { a.inc = Math.round(a.inc * 0.85); a.inc0 = a.inc; } }); return true; }

  // ---------- money moves ----------
  function setPocket(s, key, pct) { if (s.pockets[key] == null) return; const other = pocketPct(s) - s.pockets[key]; s.pockets[key] = Math.max(0, Math.min(pct, 60 - other)); }
  function payDebt(s, id, amt) { const d = s.debts.find((x) => x.id === id); if (!d) return 0; const x = Math.min(amt, d.bal, Math.max(0, s.cash)); d.bal -= x; s.cash -= x; if (d.kind !== 'card' && d.bal <= 1) s.debts = s.debts.filter((y) => y !== d); updateLevels(s); return x; }
  function toSafety(s, amt) { const x = Math.min(amt, Math.max(0, s.cash)); s.cash -= x; s.safety += x; updateLevels(s); return x; }
  function fromSafety(s, amt) { const x = Math.min(amt, s.safety); s.safety -= x; s.cash += x; return x; }
  function investCash(s, amt) { const x = Math.min(amt, Math.max(0, s.cash)); if (x <= 0) return 0; s.cash -= x; const f = indexFund(s); f.value += x; f.inc = Math.round(f.value * 0.0035); updateLevels(s); return x; }
  function toDream(s, amt) { const x = Math.min(amt, Math.max(0, s.cash)); s.cash -= x; s.pots.dream += x; return x; }
  function sellAsset(s, id) { const a = s.assets.find((x) => x.id === id); if (!a) return 0; const got = sellAssetRaw(s, a, a.cat === 'paper' ? 1 : 0.9); s.cash += got; updateLevels(s); return got; }
  function sellQuote(s, id) { const a = s.assets.find((x) => x.id === id); if (!a) return 0; let g = Math.round(a.value * (a.cat === 'paper' ? 1 : 0.9)); const d = a.loanId && s.debts.find((x) => x.id === a.loanId); if (d) g -= Math.min(g, d.bal); return Math.max(0, g); }
  function dropInsurance(s, kind) { if (!s.ins[kind]) return; s.ins[kind] = 0; if (kind === 'life') s.ins.lifeCover = 0; }

  // ---------- real-world news ----------
  // ---------- the board ----------
  // 20 spaces around the edge of the screen, clockwise from the top-left corner. Corners: 0, 4, 10, 14.
  const BOARD = ['sweldo', 'deal', 'pamilya', 'gastos', 'dream', 'deal', 'buhay', 'bayanihan', 'seguro', 'deal',
    'checkin', 'gastos', 'raket', 'pamilya', 'merkado', 'deal', 'buhay', 'kindness', 'life', 'deal'];
  const SPACES = {
    sweldo: { name: 'Sweldo', strand: 'grow' }, deal: { name: 'Deal', strand: 'grow' }, raket: { name: 'Raket', strand: 'grow' }, merkado: { name: 'Merkado', strand: 'grow' },
    pamilya: { name: 'Pamilya', strand: 'joy' }, gastos: { name: 'Gastos', strand: 'joy' }, dream: { name: 'Pangarap', strand: 'joy' }, bayanihan: { name: 'Bayanihan', strand: 'joy' }, kindness: { name: 'Kindness', strand: 'joy' }, life: { name: 'Life', strand: 'joy' },
    buhay: { name: 'Buhay', strand: 'protect' }, seguro: { name: 'Seguro', strand: 'protect' },
    checkin: { name: 'Check-in', strand: 'system' },
  };
  function spaceCard(s, k) {
    switch (k) {
      case 'sweldo': { const [t, x] = pick(s, WINDFALLS); return windfallCard(s, t, x * (0.7 + rand(s) * 0.6)); }
      case 'deal': return dealCard(s, false);
      case 'raket': return raketCard(s, false);
      case 'merkado': return s.assets.some((a) => a.cat === 'paper' && a.value > 0 && !a.flat) ? marketCard(s) : dealCard(s, false);
      case 'pamilya': { const [t, x] = pick(s, ASKS); return pamilyaCard(s, t, x * (0.45 + rand(s) * 0.4)); }
      case 'gastos': return gastosCard(s);
      case 'dream': return dreamCard(s);
      case 'bayanihan': return bayanihanCard(s);
      case 'kindness': return kindnessCard(s);
      case 'life': return lifeOptions(s).length ? lifeCard(s) : quietCard(s);
      case 'buhay': return chance(s, 0.75) ? calamityCard(s) : quietCard(s); // Buhay: life happens, but not every week
      case 'seguro': return s.ins.health && s.ins.life && s.ins.asset ? quietCard(s) : seguroCard(s);
      case 'checkin':
        if (s.sh.meter >= 2 && !s.sh.mastered) return shadowCard(s);
        if (s.levels.grow >= 2 && !s.will) return estateCard(s);
        if (s.levels.joy >= 3 && !s.causeFunded) return causeCard(s);
        return budgetCard(s);
    }
    return quietCard(s);
  }

  // ---------- real-world news ----------
  // A daily feed of 3 real headlines. Each headline lists impact angles for kinds of people
  // ({who, effect, dir, size, story}); the player gets the first angle that fits their life, in pesos.
  const NEWS_SIZE = { s: 0.02, m: 0.05, l: 0.1 };
  const WHO_LABEL = { all: 'Everyone', employed: 'Employees', ofw: 'OFW families', business: 'Business owners', free: 'Freelancers', retired: 'Retirees',
    rural: 'Rural families', city: 'City dwellers', borrowers: 'Borrowers', savers: 'Savers', investors: 'Investors', property: 'Property owners', parents: 'Parents', breadwinners: 'Breadwinners' };
  function segments(s) {
    const m = monthly(s), w = s.p.work, seg = { all: 1 };
    if (s.retired) seg.retired = 1;
    else if (w === 'ofw') seg.ofw = 1;
    else if (w === 'biz') seg.business = 1;
    else if (w === 'free') seg.free = 1;
    else if (w !== 'none') seg.employed = 1;
    if (s.assets.some((a) => a.cat === 'business' && a.inc > 0)) seg.business = 1;
    if (s.p.region === 'rural') seg.rural = 1; else seg.city = 1;
    if (s.debts.some((d) => d.bal > 0)) seg.borrowers = 1;
    if (s.safety + Math.max(0, s.cash) > 3 * m.essentials) seg.savers = 1;
    if (s.assets.some((a) => a.cat === 'paper' && a.value > 0)) seg.investors = 1;
    if (s.assets.some((a) => (a.cat === 'property' || a.cat === 'land' || a.cat === 'home') && a.value > 0)) seg.property = 1;
    if (s.kids.some((k) => !k.left)) seg.parents = 1;
    if (s.support > 0) seg.breadwinners = 1;
    return seg;
  }
  function newsAmount(s, imp) {
    const m = monthly(s), size = NEWS_SIZE[imp.size] || NEWS_SIZE.s, dir = imp.dir < 0 ? -1 : 1;
    const inc = Math.max(m.income + m.passive, 10000 * s.px), cap = 0.15 * inc;
    const clamp = (x) => Math.max(-cap, Math.min(cap, x));
    switch (imp.effect) {
      case 'living': return { kind: 'cash', amt: r100(clamp(dir * size * m.essentials)) };
      case 'rates': {
        const b = imp.who === 'savers' ? s.safety * 0.1 : Math.max(badDebt(s), m.debtPay) * 0.1;
        return { kind: 'cash', amt: r100(clamp(dir * size * b)) };
      }
      case 'paper': case 'property': {
        const cats = imp.effect === 'paper' ? ['paper'] : ['property', 'land', 'home'];
        const list = s.assets.filter((a) => cats.indexOf(a.cat) >= 0 && a.value > 0 && !a.flat);
        const pct = dir * size / 2;
        return { kind: 'value', amt: Math.round(list.reduce((t, a) => t + a.value * pct, 0)), pct, cats };
      }
      case 'business': {
        const bi = s.assets.filter((a) => a.cat === 'business').reduce((t, a) => t + assetIncome(s, a), 0) + (s.p.work === 'biz' ? s.salary : 0);
        return { kind: 'cash', amt: r100(clamp(dir * size * 3 * bi)) };
      }
      default: return { kind: 'cash', amt: r100(clamp(dir * size * inc)) };
    }
  }
  function applyNews(s, feed, todayIso) {
    if (!feed || !Array.isArray(feed.items) || !feed.date || s.over) return null;
    s.newsSeen = s.newsSeen || {};
    if (s.newsSeen[feed.date]) return null;
    if (todayIso && daysBetween(feed.date, todayIso) > 3) return null; // stale feed
    s.newsSeen[feed.date] = 1;
    const seg = segments(s), out = [];
    feed.items.slice(0, 3).forEach((it) => {
      const imps = Array.isArray(it.impacts) ? it.impacts : [];
      const imp = imps.find((x) => x && x.who !== 'all' && seg[x.who]) || imps.find((x) => x && x.who === 'all');
      const e = { headline: String(it.headline || '').slice(0, 140), source: String(it.source || '').slice(0, 60), url: /^https:\/\//.test(it.url || '') ? it.url : '', summary: String(it.summary || '').slice(0, 260), amt: 0, who: imp ? imp.who : null, story: imp ? String(imp.story || '').slice(0, 220) : 'This one doesn’t touch your money directly.' };
      if (imp) {
        const r = newsAmount(s, imp);
        if (r.kind === 'value') {
          s.assets.forEach((a) => { if (r.cats.indexOf(a.cat) >= 0 && a.value > 0 && !a.flat) { a.value = Math.round(a.value * (1 + r.pct)); if (a.cat === 'paper') a.inc = Math.round(a.value * (a.yield || 0.0035)); } });
          e.amt = r.amt; e.valueOnly = true;
          if (!r.amt) e.story += ' You don’t own any, so it doesn’t touch you.';
        } else if (r.amt > 0) { s.cash += r.amt; e.amt = r.amt; }
        else if (r.amt < 0) { const o = pay(s, -r.amt, { capped: true, label: 'the news' }); e.amt = -(Math.round(-r.amt - o.short)); }
      }
      out.push(e);
    });
    updateLevels(s);
    s.lastNews = { date: feed.date, items: out };
    return out;
  }

  // ---------- life story ----------
  function lifeStory(s) {
    const out = [];
    if (s.freeAge) out.push('Free at ' + s.freeAge + '.');
    if (s.retired && s.p.age < RETIRE_AGE) out.push('Retired at 60.');
    if (s.scholars) out.push('Sent ' + s.scholars + ' scholars to college.');
    const dreams = s.dreamsDone.reduce((a, b) => a + b, 0);
    if (dreams) out.push(dreams + (dreams > 1 ? ' dreams' : ' dream') + ' came true.');
    if (s.sh.mastered) out.push('Mastered the ' + TYPES[s.p.type].shadow.toLowerCase() + ' shadow.');
    if (s.given > 0) out.push('Gave away ' + short(s.given) + '.');
    return out;
  }

  const api = {
    P, peso, short, fmtDate, isoDay, daysBetween,
    NECESSITIES, DEBT_RANGES, DREAM_COSTS, dreamSizeFor, TYPES, TYPE_ORDER, STRANDS, STRAND_ORDER, LEVELS, POCKETS, INTAKE, TYPICAL, QUIZ, BANDS, DREAM_SIZES, COIN_PACKS, CAT_NAME, MOVES,
    upgradeSave, quizScores, newLife, openDay, startTurn, choose, turnsLeft, baseTurns,
    canExtraCard, extraCard, canBuyTurn, buyTurn, buyCoins, spentThisMonth,
    age, monthly, netWorth, capacity, handsOn, attention, assetIncome, badDebt, essentials, cardRoom, card, pocketPct, assetKinds, blindStrand, strengthStrand,
    progress, totalLevel, dreamCost, fulfilDream, lifeStory,
    canCut, cutCosts, setPocket, payDebt, toSafety, fromSafety, toDream, investCash, sellAsset, sellQuote, buyInsurance, insuranceQuote, dropInsurance, makeWill, willFee, hireManager, useMove,
    // for the simulator
    graceUntil, inGrace, BOARD, SPACES, applyNews, segments, WHO_LABEL,
    _advance: advance, _drawCard: drawCard, _runAbsence: runAbsence,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.FS = api;
})(typeof window !== 'undefined' ? window : globalThis);
