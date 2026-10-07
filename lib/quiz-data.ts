// All quiz content lives here. Edit copy, questions, quotes and type content in this one file.
// Scoring key: each question's `key` maps answer a–d (index 0–3) to a Money DNA type.
// Source: the Money DNA Questionnaire scoring table (adapted from DISC).

export type TypeKey = 'D' | 'I' | 'S' | 'C';
export const TYPE_ORDER: TypeKey[] = ['D', 'I', 'S', 'C'];

export interface Question {
  section: string;
  q: string;
  key: string; // 4 chars, e.g. "DSCI" => a=D, b=S, c=C, d=I
  options: [string, string, string, string];
}

export const QUESTIONS: Question[] = [
  { section: 'Relationship with money', q: 'To me, money is mostly…', key: 'DSCI', options: ['A tool to build something big and stay in control', 'A safety net for me and the people I love', 'A system I want to understand and get right', 'Freedom to enjoy life and chase new things'] },
  { section: 'Relationship with money', q: 'When money comes up in conversation, you usually…', key: 'IDSC', options: ["Talk about the next idea or experience you're excited about", 'Talk about results, deals or targets', 'Prefer not to discuss it; it feels private or stressful', 'Compare numbers, rates or the best way to do it'] },
  { section: 'Cash flow', q: 'How do you track money coming in and going out?', key: 'CDIS', options: ['A detailed spreadsheet or app, reviewed regularly', 'I know the big numbers; the details are for someone else', 'Loosely, if at all; I check when something feels off', 'A steady routine and a buffer, so bills are never late'] },
  { section: 'Cash flow', q: 'At the end of a typical month, you…', key: 'DSIC', options: ['Have cash tied up in something new: a deal, a stock, a business', 'Have a buffer left over, as planned', 'Often wonder where it all went', "Know exactly what's left, down to the peso"] },
  { section: 'Risk', q: 'An investment you own drops 25% in a month. You…', key: 'DSCI', options: ['Buy more if you still believe in it', 'Feel anxious and want to move into something safer', 'Review the data to see if your original reasoning still holds', "Shrug; it will come back, and there's always the next one"] },
  { section: 'Risk', q: 'Which statement fits you best?', key: 'SDCI', options: ["I'd rather miss a gain than suffer a loss", 'No risk, no reward; I trust my own judgment', "I take risks only after I've quantified the downside", 'I go with my gut and the excitement of it'] },
  { section: 'Opportunities', q: 'A friend invites you into a promising new business. You…', key: 'ICDS', options: ['Say yes quickly if it sounds exciting and you trust them', 'Ask for the financials and take time to study them', 'Want a controlling stake or a lead role before joining', "Politely decline, or wait until it's proven"] },
  { section: 'Opportunities', q: 'How do you usually hear about new opportunities?', key: 'IDCS', options: ['Early, through my network and social circles', 'I go out and find or create them myself', 'From research, reports and data', "From a trusted advisor or family member, once they're established"] },
  { section: 'Saving', q: 'Your approach to saving is…', key: 'CSID', options: ['Automatic and rule-based, with a target percentage', 'Consistent; saving comes first, before I spend', "I save when there's a specific goal I'm excited about", 'I keep a war chest for the next move, not savings for their own sake'] },
  { section: 'Saving', q: 'An unexpected ₱100,000 bonus arrives. You…', key: 'SDIC', options: ['Put it into savings or the emergency fund', 'Put it into a business or investment that can grow it', 'Celebrate, treat people, maybe plan a trip', 'Split it by plan: set percentages to debt, savings and investments'] },
  { section: 'Spending', q: 'You feel best spending money on…', key: 'IDSC', options: ['Experiences, people and gifts', 'Things that save time or reflect success', "My family's needs, before my own", 'Items that offer the best value after research'] },
  { section: 'Spending', q: 'Before a major purchase, you…', key: 'CDIS', options: ['Compare options, reviews and prices thoroughly', 'Decide quickly; you know what you want', 'Buy it if it feels right in the moment', 'Wait, consult family, and often decide not to'] },
  { section: 'Investing', q: 'Your ideal investment portfolio is…', key: 'DCSI', options: ['Concentrated in a few things I control or believe in strongly', 'Diversified, low-cost and rules-based', 'Safe and guaranteed: deposits, insurance, property', 'Whatever is exciting, or recommended by people I trust'] },
  { section: 'Investing', q: 'How often do you review your investments?', key: 'DCSI', options: ['Constantly; I manage them actively', 'On a fixed schedule, with the data in front of me', 'Rarely; I leave them with someone I trust', 'When something reminds me, or a friend brings it up'] },
  { section: 'Debt', q: 'Your view on borrowing is…', key: 'DCSI', options: ['Leverage is a tool to grow faster', 'Only when the interest rate and expected return make sense', 'Avoid it, and pay everything off as soon as possible', "Credit makes life easier; I'll deal with it later"] },
  { section: 'Debt', q: 'A relative asks to borrow a large amount. You…', key: 'SCID', options: ['Lend it; family comes first, even if it strains me', 'Lend it only on clear written terms, or not at all', 'Say yes on the spot; I hate saying no', 'Decide quickly, based on whether it makes sense to me'] },
  { section: 'Wealth growth', q: 'Wealth is best built by…', key: 'DISC', options: ['Owning businesses and assets, and scaling them', 'Earning well through relationships and opportunities', 'Saving steadily and patiently over time', 'Compounding, efficiency and minimizing taxes and fees'] },
  { section: 'Wealth growth', q: 'Your biggest financial regret is most likely to be…', key: 'ISCD', options: ['Not saving enough', 'Being too cautious and missing out on growth', 'Taking too long to decide', 'Betting too much on one thing'] },
  { section: 'Inheritance', q: 'When it comes to passing on wealth, you…', key: 'CSDI', options: ['Have, or plan, a detailed will, trusts and tax plan', 'Want it split equally so the family stays close', 'Will leave control to whoever is most capable of running things', "Prefer giving while alive, and haven't thought much about a will"] },
  { section: 'Inheritance', q: 'When will you sort out your estate plan?', key: 'SDIC', options: ["Early; it's done or nearly done, and it gives me peace of mind", 'Later; I plan to stay in charge for a long time', 'Whenever I get around to the paperwork', "It's documented and I review it on a schedule"] },
];

export const TOTAL = QUESTIONS.length;

// Quote interstitials, shown AFTER the given number of answered questions.
export interface Interstitial {
  quote: string;
  stat?: { big: string; text: string; source: string };
  coach?: string;
  cta?: string;
}

export const INTERSTITIALS: Record<number, Interstitial> = {
  4: { quote: 'Wherever you are with money today, it is not a verdict on who you are.' },
  8: {
    stat: { big: '5 years', text: 'Lottery winners who took home $50,000–$150,000 were about as likely to go bankrupt within five years as those who won under $10,000.', source: 'Hankins, Hoekstra & Skiba study of Florida lottery winners' },
    quote: 'More money did not change the outcome. It only changed the timing.',
    coach: 'Nobody is doomed with money. But almost everyone is programmed. The next 12 questions reveal yours.',
  },
  12: {
    stat: { big: '₱12 billion', text: 'Aman Futures promised Mindanao investors 30% returns. Thousands poured in their savings, some selling land or borrowing to invest. When it collapsed in 2012, an estimated ₱12 billion vanished.', source: 'Aman Futures Group collapse, 2012' },
    quote: 'It was not a lack of income. It was not a lack of intelligence. It was a pattern they never examined.',
    coach: 'There is no shame in where you are. What matters is the next step.',
  },
  16: { quote: 'The difference is not the personality. It is whether they learned to manage its shadow.' },
  20: { quote: 'You are not doomed. You are about to be decoded.', cta: 'Reveal my Money DNA' },
};

export interface ProfileField {
  id: ProfileFieldId;
  label: string;
  options: string[];
  multi?: boolean;
  scale?: { low: string; high: string };
}
export type ProfileFieldId = 'gender' | 'age' | 'marital' | 'education' | 'employment' | 'dependents' | 'financiallyFree' | 'balanceHappiness' | 'worries';

// Two questions per step (worries on its own) so every step fits a small phone without scrolling.
export const PROFILE_STEPS: { kicker: string; title: string; fields: ProfileField[] }[] = [
  {
    kicker: 'Step 1 of 5 · About you', title: 'First, a little about you', fields: [
      { id: 'gender', label: 'Gender', options: ['Female', 'Male', 'Prefer not to say'] },
      { id: 'age', label: 'Age', options: ['18–24', '25–34', '35–44', '45–54', '55+'] },
    ],
  },
  {
    kicker: 'Step 2 of 5 · About you', title: 'Your life right now', fields: [
      { id: 'marital', label: 'Marital status', options: ['Single', 'Married', 'Live-in', 'Separated', 'Widowed'] },
      { id: 'education', label: 'Highest educational attainment', options: ['High school', 'Vocational', 'College', "Master's", 'Doctorate'] },
    ],
  },
  {
    kicker: 'Step 3 of 5 · Your money today', title: 'How you earn', fields: [
      { id: 'employment', label: 'How you earn', options: ['Employed', 'Business owner', 'Freelance', 'OFW', 'Not working'] },
      { id: 'dependents', label: 'People who depend on you financially', options: ['None', '1–2', '3–4', '5+'] },
    ],
  },
  {
    kicker: 'Step 4 of 5 · Your money today', title: 'Now, where you stand', fields: [
      { id: 'financiallyFree', label: 'Are you financially free?', options: ['Yes', 'Getting there', 'Not yet'] },
      { id: 'balanceHappiness', label: 'How happy are you with your bank balance?', options: ['1', '2', '3', '4', '5'], scale: { low: 'Not at all', high: 'Very happy' } },
    ],
  },
  {
    kicker: 'Step 5 of 5 · Your worries', title: 'What keeps you up at night about money?', fields: [
      { id: 'worries', label: 'Pick all that apply', multi: true, options: ['Making ends meet', 'Paying off debts', 'Emergencies, illness or accidents', "My children's education costs", 'Sustaining my retirement', 'Supporting parents or family', 'Losing my job or income', 'Not growing my wealth fast enough', 'None — I feel secure'] },
    ],
  },
];

export const ALL_PROFILE_FIELDS: ProfileField[] = PROFILE_STEPS.flatMap((s) => s.fields);

export interface MoneyType {
  key: TypeKey;
  name: string;
  short: string;
  color: string;
  summary: string;
  stuck: string; // how this type ends up stuck
  move: string; // the one design-around move
}

// TODO(Mack): replace `summary`, `stuck` and `move` with the final wording from each type chapter.
export const TYPES: Record<TypeKey, MoneyType> = {
  D: { key: 'D', name: 'The Empire Builder', short: 'Empire Builder', color: '#F26B4B', summary: "Money is your tool for growth and control. Your edge is bold, decisive moves; your watch-out is risk you haven't sized.", stuck: 'Empire Builders lose big: everything goes into one bet, borrowed against, with no protection underneath.', move: 'Set a liquidity floor you never touch, and protect it before you scale.' },
  I: { key: 'I', name: 'The Trailblazer', short: 'Trailblazer', color: '#F5B841', summary: 'Money is fuel for experiences and people. Your edge is generosity and optimism; your watch-out is spending ahead of the plan.', stuck: 'Trailblazers get buried slowly: money leaks out as it arrives, and the numbers go unchecked.', move: 'Automate your savings so the money moves before it reaches your hands.' },
  S: { key: 'S', name: 'The Guardian', short: 'Guardian', color: '#3CC3A8', summary: 'Money means security for the people you love. Your edge is steadiness; your watch-out is playing it too safe to grow.', stuck: "Guardians stay stuck rather than broke: generous to family, parked in low-yield savings, carrying other people's debts.", move: 'Put a fixed limit on family support, and let the rest of your money grow.' },
  C: { key: 'C', name: 'The Architect', short: 'Architect', color: '#6F9BF2', summary: 'Money is a system to be designed. Your edge is discipline and detail; your watch-out is analysis that delays action.', stuck: 'Architects stall: waiting for certainty that never comes while inflation eats the cash.', move: 'Set a deadline for every decision, and follow your rule instead of the fear.' },
};
