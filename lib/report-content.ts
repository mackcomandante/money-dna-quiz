// Full Money DNA Report content, one entry per type.
// Adapted from the Money DNA manuscript (chapters 4–7, "The Four Money Personalities"), lightly edited for a
// standalone report: opening stories removed, cross-references to other chapters rewritten.
// Keep this in sync with the book when chapter wording changes.
import type { TypeKey } from './quiz-data';

export interface TitledText { title: string; text: string }

export interface TypeReport {
  tagline: string;
  coreBelief: string;
  traits: {
    relationship: string; cashFlow: string; risk: string; opportunities: string; saving: string;
    spending: string; investing: string; debt: string; wealthGrowth: string; inheritance: string;
  };
  famousIntro: string;
  famous: { name: string; text: string }[];
  famousNote: string;
  research: string[];
  superpowers: TitledText[];
  shadowIntro: string;
  shadow: TitledText[];
  underStress: string;
  relationships: { intro: string; rules: string[]; outro: string };
  advisors: string;
  blueprintIntro: string;
  blueprint: TitledText[];
  coaching: string[];
  closing: string;
}

export const TRAIT_LABELS: [keyof TypeReport['traits'], string][] = [
  ['cashFlow', 'Cash flow'], ['risk', 'Risk'], ['opportunities', 'Opportunities'], ['saving', 'Saving'],
  ['spending', 'Spending'], ['investing', 'Investing'], ['debt', 'Debt'], ['wealthGrowth', 'Wealth growth'],
  ['inheritance', 'Inheritance'],
];

/** The two Money DNA axes and core fear for each type (Chapter 2). */
export const TYPE_AXES: Record<TypeKey, { pace: string; focus: string; moneyMeans: string; coreFear: string }> = {
  D: { pace: 'Active', focus: 'Outcomes', moneyMeans: 'Power, leverage, winning', coreFear: 'Losing control' },
  I: { pace: 'Active', focus: 'People', moneyMeans: 'Freedom, experience, generosity', coreFear: 'Missing out' },
  S: { pace: 'Deliberate', focus: 'People', moneyMeans: 'Safety for loved ones', coreFear: 'Loss and instability' },
  C: { pace: 'Deliberate', focus: 'Outcomes', moneyMeans: 'A system to get right', coreFear: 'A costly mistake' },
};

/** "About the book" section, drawn from the Introduction and Chapter 2. */
export const BOOK_INTRO = {
  title: 'About Money DNA',
  paragraphs: [
    'Two people can earn the same salary, live in the same city and read the same advice, and still end up in completely different places. One builds a business, a portfolio and a legacy. The other is always one emergency away from borrowing. It isn\'t intelligence, and it isn\'t simply discipline. The missing piece is self-knowledge.',
    'Most of us were never taught how we are wired with money: what we believe about it, how fast we act on it, what we fear, and what we do when it runs out. We inherit a money program from our parents, our culture and our experiences, and we run it for the rest of our lives without ever looking at the code. Money DNA: Decode Your Money Personality, Break the Doom Cycle, and Build Real Financial Freedom is Mack Comandante\'s guide to reading that code.',
    'Money DNA adapts the structure of DISC, one of the world\'s most widely used behavioural models, to money. It asks two questions: how fast do you act with money, and what is money for in your mind? The answers reveal four types. Each has real superpowers, a predictable shadow, and a different path to financial freedom.',
    'Most people are a blend of two types, with one dominant. Your dominant type usually shows itself under pressure: when money is tight, when an opportunity appears, or when a crisis hits. No type is better than another. Every type can build wealth, and every type can lose it. The question is never "Which type should I be?" It is "How do I make the most of the type I am?"',
  ],
  quote: 'Wherever you are with money today, it is not a verdict on who you are. It is simply where your programming has taken you so far.',
  disclaimer: 'Money DNA is a coaching framework adapted from the DISC behavioural model. It is not a clinical or psychometric test, and this report is for education only. It is not financial, investment, tax, legal or insurance advice. Before making financial decisions, consult a licensed professional who understands your circumstances. People named as examples are illustrations drawn from public reporting, not assessments of those individuals.',
};

/** "Reading your results" guide, from Chapter 3. */
export const READING_RESULTS = {
  title: 'Reading your results',
  primary: { title: 'Your primary type', text: 'is the type with the highest score out of 20. A score of 10 or more signals a strong preference. A score of 6 to 9 signals a clear lean.' },
  blend: { title: 'Your blend.', text: 'If your second-highest score is within 3 points of your highest, you are a two-type blend. The most common blends are:' },
  blends: [
    { name: 'The Promoter', types: ['D', 'I'] as TypeKey[], text: 'entrepreneurial and network-driven, with big swings in income and spending.' },
    { name: 'The Strategist', types: ['D', 'C'] as TypeKey[], text: "bold but calculated, often the strongest wealth builders when they don't over-control." },
    { name: 'The Host', types: ['I', 'S'] as TypeKey[], text: 'warm and generous, and most at risk of giving away their own security.' },
    { name: 'The Conservator', types: ['S', 'C'] as TypeKey[], text: 'meticulous and very cautious, the safest of all, but the most exposed to inflation and missed growth.' },
  ],
  balanced: { title: 'A balanced profile.', text: 'If three types are within 2 points of each other, you adapt your money behaviour to the situation. To find your core, ask yourself what you do first when money gets tight: take a bold risk, spend to feel better, freeze and protect, or analyze. That reflex is usually your dominant type.' },
  lowest: { title: 'Your lowest score', text: 'shows the type you express least. Pay attention to it. Its strengths often point directly at your biggest blind spot. An Empire Builder with a very low Guardian score probably needs more protection. A Trailblazer with a low Architect score probably needs a system.' },
};

/** What a low score in each type usually means you need more of (follows the book's "lowest score" examples). */
export const LOWEST_SCORE_HINT: Record<TypeKey, string> = {
  D: 'boldness: acting on good opportunities instead of waiting, and owning assets that can grow',
  I: 'connection and enjoyment: a network that brings you opportunities, and room in your plan for joy',
  S: 'protection: an emergency fund, proper insurance and a safety floor you never touch',
  C: 'a system: a budget you track, written rules for investing, and decisions based on the numbers',
};

export const REPORTS: Record<TypeKey, TypeReport> = {
  D: {
    "tagline": "Money is a lever. I use it to build, to win, and to stay in control.",
    "coreBelief": "For the Empire Builder, money is power, independence and proof of winning. It is a lever to build something bigger than yourself, and a scoreboard that tells you how you're doing. You are Active and Outcome-focused. You decide quickly, you trust your own judgment, and you are energized by results. You would rather make a bold move and learn from it than wait for permission or certainty. Your core fear is losing control: being dependent on others, being left behind, or being forced to play small.",
    "traits": {
      "relationship": "You see money as a tool, not a treasure. You are not especially attached to cash itself. What excites you is what money can build: businesses, assets, influence and freedom from other people's control. Your net worth is your scorecard, and you check it often.",
      "cashFlow": "You think in big numbers. You know your revenue, your margins and the bottom line, but the details bore you. Your cash tends to move quickly from where it lands to where the next win is. As a result, you often run lean on liquidity, even when your net worth is high. You are \"asset rich, cash poor\" more often than you'd like to admit.",
      "risk": "You have a high tolerance for risk, and you take it on your own terms. You trust your judgment more than consensus, which is often a strength. But you tend to underweight the downside. You plan carefully for how a deal will succeed, and very little for how it might fail.",
      "opportunities": "This is where you shine. You spot opportunities early and act on them first. You prefer deals you can control: your own business, real estate, private stakes, franchises. You are less interested in being a passive investor in someone else's vision.",
      "saving": "You don't save as a habit. You build a war chest for the next move. Idle money feels wasteful to you. If there's a lot of cash in your account, you start looking for somewhere to deploy it.",
      "spending": "You spend decisively and without much agonizing. You'll pay for things that save time, increase your capacity or signal success: a good car, a well-located office, a business-class seat. You have little patience for budgets, which you see as constraints on growth.",
      "investing": "Your portfolio tends to be concentrated, active and high-conviction. You'd rather own a big stake in a few things you understand and control than a small slice of everything. Slow compounding feels frustrating. You want results you can see.",
      "debt": "You see debt as leverage, a tool to grow faster. You are comfortable with large loans when you believe in the return. This can be powerful. It can also be the thing that breaks you, because leverage multiplies losses as efficiently as it multiplies gains.",
      "wealthGrowth": "You build wealth through enterprise, ownership and leverage. Your wealth curve tends to grow fast, with bigger swings than other types. You may experience several cycles of building, losing and rebuilding in a lifetime.",
      "inheritance": "You plan late, because you intend to stay in charge for a long time. You tend to favour the most capable heir, or you try to keep the business intact rather than split it. You often attach conditions to what you leave behind. The danger is that you postpone the conversation until it's too late, and leave your family uninformed and unprepared."
    },
    "famousIntro": "The Empire Builder pattern shows up in many of the world's most successful entrepreneurs, and in some of its most spectacular collapses.",
    "famous": [
      {
        "name": "Elon Musk",
        "text": "reportedly put nearly all of his PayPal proceeds into Tesla and SpaceX, and came close to running out of money in 2008. It is the classic Empire Builder move: concentrated, all-in conviction."
      },
      {
        "name": "Jeff Bezos",
        "text": "reinvested Amazon's profits for years, prioritizing scale and control over short-term earnings. He thought in decades, not quarters."
      },
      {
        "name": "Masayoshi Son",
        "text": "built SoftBank through bold, leveraged, high-conviction bets. He has lost enormous fortunes and rebuilt them more than once, a pattern that is pure Empire Builder."
      },
      {
        "name": "Rupert Murdoch",
        "text": "built a global media empire through relentless acquisitions. His long and public family succession struggles show the Empire Builder's typical blind spot around inheritance."
      },
      {
        "name": "Ramon S. Ang",
        "text": "in the Philippines led San Miguel's expansion from food and beverages into infrastructure, power and more, using ambitious, debt-funded growth. It is a vivid example of leverage used as a strategic tool."
      }
    ],
    "famousNote": "On the other side of the ledger sit Bill Hwang, whose Archegos fund collapsed in 2021, and Eike Batista, once Brazil's richest man, who lost nearly everything within two years. Same boldness, same conviction, same use of leverage, but without the guardrails.",
    "research": [
      "Morgan Housel draws a line in The Psychology of Money (2020) that every Empire Builder should tape to their desk: getting wealthy and staying wealthy require different skills. Getting wealthy demands risk-taking, optimism and putting yourself out there. Staying wealthy demands the opposite: humility, frugality and a healthy fear that what you've built can be taken away. Empire Builders are naturally gifted at the first and often blind to the second. Housel's remedy is what he calls room for error, or a margin of safety. Because the future is uncertain, the goal is not to maximize returns in the best case but to make sure you survive the worst case, so you can stay in the game long enough for compounding to work. Leverage removes room for error. The Archegos collapse is what happens when it reaches zero.",
      "Robert Kiyosaki's Rich Dad's Cashflow Quadrant (1998) describes four ways people earn money: as as an Employee (E), as a Self-employed professional or small business owner (S), as a Business owner whose systems run without them (B), and as an Investor (I) whose money works for them. Empire Builders are drawn to the B and I quadrants, which is where much large-scale wealth is built. The danger is building a B-quadrant empire that still depends entirely on one person, which is really an S-quadrant job with more risk."
    ],
    "superpowers": [
      {
        "title": "Decisiveness",
        "text": "You act while others are still deliberating. In business and investing, speed is often the difference between capturing an opportunity and watching someone else take it."
      },
      {
        "title": "High agency",
        "text": "You don't wait for wealth to happen to you. You create it. You build businesses, negotiate deals and open doors."
      },
      {
        "title": "Comfort with ownership and leverage",
        "text": "Most people are afraid of debt and afraid of owning things that could fail. You are not. Used wisely, this lets you build assets far faster than salary alone ever could."
      },
      {
        "title": "Resilience",
        "text": "You treat setbacks as tuition. Many Empire Builders fail more than once before they succeed, and they come back stronger."
      },
      {
        "title": "Vision",
        "text": "You can see what something could become before anyone else can, and you can get others to follow you there."
      }
    ],
    "shadowIntro": "Every superpower has a shadow. Yours are predictable.",
    "shadow": [
      {
        "title": "Overconfidence and concentration risk",
        "text": "Because you trust your judgment, you put too much in one place. One deal, one business, one asset class. When it works, you look like a genius. When it doesn't, everything goes down together."
      },
      {
        "title": "Thin buffers",
        "text": "You hate idle cash, so you rarely keep enough of it. When a downturn, a typhoon or a defaulting customer arrives, you have no cushion. You are forced to sell assets at the worst possible time, or borrow at the worst possible rate."
      },
      {
        "title": "Underinsurance",
        "text": "Deep down, many Empire Builders believe nothing will happen to them. They insure their cars but not their lives. They protect their buildings but not their businesses. Key-person insurance, business continuity cover and a proper health plan are often missing, even though your business may depend entirely on you."
      },
      {
        "title": "Dismissing advice",
        "text": "You're used to being right, so you don't always listen. Advisors, partners and family members who see risks are often brushed aside as negative or slow."
      },
      {
        "title": "Unilateral decisions",
        "text": "You make big financial moves without consulting the people who will be affected. Your spouse may learn about a loan after it's signed."
      },
      {
        "title": "Succession procrastination",
        "text": "You plan to stay in charge for a long time, so you postpone wills, succession plans and the hard conversations about who will run things. If something happens to you suddenly, your family may inherit a complex empire with no map."
      }
    ],
    "underStress": "When money gets tight, you double down. You take bigger risks to win back what you lost. You borrow more to keep the empire afloat. You stop listening and start pushing. This is the most dangerous moment for an Empire Builder. The instinct that built your wealth is the same instinct that can destroy it when you're under pressure. The single most valuable habit you can build is the pause: a rule that no major financial decision gets made in the 48 hours after bad news.",
    "relationships": {
      "intro": "Empire Builders are often attracted to Guardians. You bring vision, energy and growth. They bring stability, care and caution. It can be a powerful partnership, but only if you respect what they bring. The classic conflict is \"grow it\" versus \"protect it\". You see their caution as fear holding you back. They see your boldness as recklessness putting the family at risk. Both of you are partly right. The fix is not to convert each other. It is to agree on rules together:",
      "rules": [
        "A safety floor: an amount of cash and protection that is never touched, no matter how good the opportunity.",
        "A growth allocation: an amount you are free to deploy without debate.",
        "A consultation threshold: any decision above an agreed amount is discussed first."
      ],
      "outro": "With Trailblazers, you share a love of speed and opportunity, which can be exciting and dangerous. With Architects, you share a focus on outcomes, and they can be your best reality check, if you let them."
    },
    "advisors": "Lead with results, return on investment and control. Be brief. Get to the bottom line in the first five minutes. Present options, not lectures, and let them choose. Avoid telling them what they can't do. Instead, frame protection as protecting the empire. An Empire Builder may ignore \"you need life insurance\" but will listen to \"if something happens to you, who keeps the business running, and what happens to your loans?\" The biggest gaps to close are usually liquidity, key-person cover, business continuity, and succession planning.",
    "blueprintIntro": "You don't need to stop being bold. You need to make boldness survivable. Here is your blueprint.",
    "blueprint": [
      {
        "title": "Set a liquidity floor",
        "text": "Decide on an amount of cash, at least six to twelve months of personal and essential business expenses, that you will never invest. Put it in a separate account. Treat it as untouchable as your best asset."
      },
      {
        "title": "Cap your concentration",
        "text": "Set a rule for how much of your net worth can sit in any single asset or venture. Many Empire Builders start with no more than 30% to 40% in one bet, outside their core business."
      },
      {
        "title": "Protect the engine",
        "text": "You are your empire's most important asset. Put proper life, health, critical illness and disability cover in place. If you have business partners, set up a buy-sell agreement funded by insurance. If your business depends on you, consider key-person cover."
      },
      {
        "title": "Stress-test every leveraged deal",
        "text": "Before signing a loan, ask: if revenue drops 30%, rates rise 3 points, and the deal takes twice as long, can I still pay? If the answer is no, reduce the size."
      },
      {
        "title": "Install the 48-hour rule",
        "text": "No major financial decision within 48 hours of bad news."
      },
      {
        "title": "Bring in a challenger",
        "text": "Have at least one advisor or partner whose job is to tell you what could go wrong, and listen to them."
      },
      {
        "title": "Write the map",
        "text": "Create a will, a succession plan and a simple document that tells your family what you own, what you owe, who to call and what you want. Review it every year."
      },
      {
        "title": "Start the succession conversation now",
        "text": "Don't wait until you're ready to step back. Identify and develop your successors while you're still in charge."
      }
    ],
    "coaching": [
      "If I were wrong about my biggest bet, what would happen to my family?",
      "How many months could I survive if my income stopped today?",
      "Who in my life is allowed to challenge my financial decisions, and do I actually listen to them?",
      "What does my family know about what I own and owe?",
      "What would I be building if I knew my empire had to survive without me?"
    ],
    "closing": "Your boldness is a gift. The world needs people who build, who take risks, who create jobs and opportunities where none existed. Don't let anyone shame you for wanting more. But the greatest empires are not the ones that grow fastest. They are the ones that last. Build yours to survive your worst year, your biggest mistake and, eventually, your absence. That is what turns an empire into a legacy."
  },
  I: {
    "tagline": "Money is fuel for what's next. Life is meant to be lived, and shared.",
    "coreBelief": "For the Trailblazer, money is fuel for what's next: freedom, experience, connection and generosity. It is meant to be enjoyed and shared, not hoarded. You are Active and People-focused. You move fast, you follow your instincts and your enthusiasm, and you are energized by people, ideas and new experiences. Your core fear is missing out: on life, on fun, on the next big thing, or on being part of the group.",
    "traits": {
      "relationship": "Your relationship with money is emotional and optimistic. You believe money is for living, and that looking at it too closely feels joyless, even a little stingy. You'd rather have a great story than a large savings account.",
      "cashFlow": "Money tends to go out as fast as it comes in. You track loosely, if at all. Your income may be strong, but month-end is often tight, and you're not always sure why.",
      "risk": "You take risks easily, but your risk assessment is emotional rather than analytical. You assume things will work out, and often they do, which reinforces the habit. But you tend to underestimate the downside, especially when someone you like is pitching the opportunity.",
      "opportunities": "You hear about trends early through your network. That is a genuine advantage. It is also your biggest vulnerability, because hype, fear of missing out and friends' schemes all arrive through the same channel.",
      "saving": "Saving is your hardest habit. You can save for goals you can picture vividly, such as a trip, a wedding or a new car. You struggle with abstract goals like an emergency fund or retirement, because they don't feel real.",
      "spending": "Your spending is social and experiential: travel, dining out, gifts, treating others, events. Image and belonging matter to you. Impulse purchases are common, especially when you're with people or scrolling through social media.",
      "investing": "You invest based on stories and recommendations from people you trust. You start with enthusiasm, then drift. Many Trailblazers have a graveyard of half-started investments: an insurance policy that lapsed, a stock account opened once, a crypto wallet whose password they no longer remember.",
      "debt": "Credit cards and consumer debt build quietly in your life. You borrow for lifestyle and convenience, and you avoid checking balances. Buy-now-pay-later apps and online lending platforms were practically designed for your blind spot.",
      "wealthGrowth": "You are strong at earning, through relationships, persuasion, sales and visibility, and weak at keeping. Your wealth grows only when something forces money to stay put.",
      "inheritance": "You give generously while you're alive. You may have no will, or outdated beneficiaries on your policies. You may have made informal promises (\"This house will be yours someday\") that later conflict with each other."
    },
    "famousIntro": "",
    "famous": [
      {
        "name": "Richard Branson",
        "text": "built the Virgin empire around brand, adventure and experience. He famously sold Virgin Records to fund his airline, following his passion over conventional wisdom."
      },
      {
        "name": "Oprah Winfrey",
        "text": "built enormous wealth on influence, connection and audience trust, and is famous for her generosity."
      },
      {
        "name": "Gary Vaynerchuk",
        "text": "was early to e-commerce, social media and NFTs, spotting trends through his network and visibility."
      },
      {
        "name": "Ashton Kutcher",
        "text": "turned celebrity relationships into deal flow, investing early in companies such as Skype, Airbnb and Uber."
      },
      {
        "name": "Manny Pacquiao",
        "text": "earned a fortune through charisma, talent and a global following, and became known for extraordinary generosity to his community and a large entourage."
      }
    ],
    "famousNote": "Notice the pattern: the successful Trailblazers learned to pair their gift for people and opportunity with structures that kept the money working. Many athletes and entertainers who lost their fortunes had the same gift, without the structure.",
    "research": [
      "Thomas Stanley and William Danko surveyed America's wealthy for The Millionaire Next Door (1996) and found a surprise: income was a poor predictor of wealth. They divided people into prodigious accumulators of wealth (PAWs), who had far more net worth than their age and income would predict, and under-accumulators of wealth (UAWs), who had far less. Many UAWs were high earners living high-status lifestyles. Their budgets rose every time their income rose. That is the Trailblazer's shadow in a single statistic.",
      "Morgan Housel adds a sharper insight: wealth is what you don't see. The car, the clothes and the restaurant bills are visible, but they are money already spent. Real wealth is the money that was not spent: the investments, the savings and the options it creates. Spending money to show people how much money you have, Housel notes, is the fastest way to have less of it.",
      "Brad Klontz's research also helps explain the pattern. The money worship script (\"more money will fix my problems\") and the money status script (\"my self-worth is my net worth\") were both associated with lower savings, higher debt and compulsive spending (Klontz et al., 2011). Trailblazers often carry one or both.",
      "There is good news for Trailblazers in T. Harv Eker's work, too. His money management system in Secrets of the Millionaire Mind includes a dedicated \"play\" account that must be spent on enjoyment. Eker's point is that a plan that bans joy will not last. A plan that schedules it can."
    ],
    "superpowers": [
      {
        "title": "Your network",
        "text": "You are relationship-rich. Your connections are a real asset that produce opportunities, clients, partners and support."
      },
      {
        "title": "Opportunity radar",
        "text": "You see trends before others do. When you pair this with discipline, it can be extraordinarily profitable."
      },
      {
        "title": "Earning power",
        "text": "You can sell, persuade and inspire. Trailblazers are often among the highest earners in sales, entrepreneurship, entertainment and leadership."
      },
      {
        "title": "Generosity",
        "text": "You give freely and make people feel valued. This builds loyalty and goodwill that money can't buy."
      },
      {
        "title": "Low money anxiety",
        "text": "You genuinely enjoy what you have. You are less likely than other types to be paralyzed by worry."
      }
    ],
    "shadowIntro": "",
    "shadow": [
      {
        "title": "Impulsive spending",
        "text": "Your purchases are driven by emotion, mood and the moment. You often spend more than you planned, especially when you're happy, stressed or with friends."
      },
      {
        "title": "Lifestyle creep",
        "text": "Every raise is matched by a new expense. You never quite feel richer, because your spending rises as fast as your income."
      },
      {
        "title": "Low savings rate",
        "text": "You save what's left over, and there rarely is anything left over."
      },
      {
        "title": "Hidden debt",
        "text": "Your credit card balances grow without you noticing, because you don't look. Minimum payments feel manageable until they aren't."
      },
      {
        "title": "Susceptibility to hype",
        "text": "Pyramid schemes, too-good-to-be-true investments and \"sure things\" from friends often target exactly your profile: optimistic, trusting and eager to be part of something."
      },
      {
        "title": "Avoiding paperwork",
        "text": "Budgets, wills, beneficiary forms, tax filings and insurance reviews all feel tedious. So they don't get done."
      },
      {
        "title": "Difficulty saying no",
        "text": "When a friend or relative asks to borrow money, you say yes, even when you can't afford it."
      }
    ],
    "underStress": "When money gets tight, you either spend to feel better or avoid looking at the numbers entirely. Often both. Shopping lifts your mood temporarily. Not opening the credit card statement protects you from the bad feeling. Both make the problem worse. The most important habit for a Trailblazer under stress is simple: look. Open the statements. List the debts. Face the number. The number is almost never as bad as the dread.",
    "relationships": {
      "intro": "Trailblazers are often drawn to Architects. You bring joy, spontaneity and connection. They bring structure, discipline and planning. Together, you can balance each other beautifully, or drive each other crazy. The classic conflict is \"enjoy it\" versus \"track it\". You feel judged and controlled by their spreadsheets. They feel anxious and disrespected by your spending. The solution is to stop fighting over every purchase and agree on a structure instead:",
      "rules": [
        "A shared savings and investment rate that is automated and non-negotiable.",
        "A personal fun budget for each partner that requires no explanation or justification.",
        "A monthly money date: thirty minutes, once a month, to review where things stand, ideally somewhere enjoyable."
      ],
      "outro": "With Empire Builders, you share speed and excitement, which can lead to great adventures and great losses. With Guardians, you share a love of people, which can make you both generous to a fault."
    },
    "advisors": "Lead with stories, vivid goals and the relationship. Help them picture the future they want: the trip with their kids at 50, the business they'll start, the home they'll build. Abstract numbers won't stick; images will. Avoid spreadsheets, jargon and anything that feels like a lecture or a guilt trip. Keep it simple, visual and conversational. The biggest gaps to close are usually an emergency fund, consumer debt, a will and updated beneficiaries, and protection that doesn't lapse. Automation is the Trailblazer's best friend: anything that happens without a decision is far more likely to happen.",
    "blueprintIntro": "You don't need to stop enjoying life. You need to make sure your future self gets invited to the party too.",
    "blueprint": [
      {
        "title": "Pay yourself first, automatically",
        "text": "Set up an automatic transfer on payday, before you see the money, into a separate savings account at a different bank. Start with 10%. If that feels impossible, start with 5% and raise it every time you get a raise."
      },
      {
        "title": "Create a guilt-free fun account",
        "text": "Give yourself a fixed amount every month that you can spend on anything, no questions asked. When it's gone, it's gone. This lets you enjoy life without blowing up your plan."
      },
      {
        "title": "Face your debt",
        "text": "List every debt you have: the balance, the interest rate, the minimum payment. Then attack the highest-interest debt first while paying minimums on the rest. Close or freeze the cards you can't control."
      },
      {
        "title": "Install a 72-hour rule",
        "text": "For any non-essential purchase above an amount you choose, wait 72 hours. If you still want it, buy it. Most of the time, you won't."
      },
      {
        "title": "Vet every opportunity",
        "text": "Before investing in anything a friend recommends, ask three questions: Is it registered with the SEC? Can I explain how it makes money? What happens if I lose all of it? If the returns sound too good to be true, they are."
      },
      {
        "title": "Set a lending policy",
        "text": "Decide in advance how much you can afford to lend or give to friends and family each year, and treat it as a gift rather than a loan. When it's used up, you have a clear, kind answer."
      },
      {
        "title": "Get an accountability partner",
        "text": "Choose a friend, partner or advisor you check in with monthly. Trailblazers thrive on connection, so use that."
      },
      {
        "title": "Do the paperwork once",
        "text": "Spend one afternoon writing a simple will, updating beneficiaries and setting up auto-pay for your insurance. Then you never have to think about it again until your next annual review."
      }
    ],
    "coaching": [
      "If my income stopped today, how many weeks could I live on what I have?",
      "What do I actually know about my total debt right now?",
      "Which of my recent purchases do I still feel good about?",
      "What future experience would I love to give myself at 60, and what am I doing today to fund it?",
      "Who in my life needs me to be financially stable, and are they protected if I'm not?"
    ],
    "closing": "Your joy is contagious. Your generosity changes lives. Your instinct for people and opportunity is a gift that many other types envy. The goal is not to turn you into an Architect. The goal is to build just enough structure that your gifts can compound. The most successful Trailblazers are not the ones who stopped enjoying life. They are the ones who built a system that let them enjoy it for the rest of their lives."
  },
  S: {
    "tagline": "Money is safety. As long as my family is okay, I'm okay.",
    "coreBelief": "For the Guardian, money is safety and security, above all for the people you love. It is a shield against loss, instability and hardship. You are Deliberate and People-focused. You take your time, you seek reassurance, and you are energized by stability, harmony and caring for others. Your core fear is loss: of money, of stability, of the people you love, and of harmony in the family.",
    "traits": {
      "relationship": "Money means security and the ability to take care of your family. You worry about it more than you talk about it. For you, money is less about what you can have and more about what you can prevent.",
      "cashFlow": "Your cash flow is steady and predictable. You prefer a fixed salary to variable income. You keep a buffer, pay your bills early and dislike surprises.",
      "risk": "Your risk tolerance is low. Research by psychologists Daniel Kahneman and Amos Tversky showed that most people feel the pain of a loss about twice as strongly as the pleasure of an equal gain. For Guardians, that ratio can feel even stronger. You prefer guarantees, and you may hold far too much in cash.",
      "opportunities": "You wait for proof and for a trusted endorsement before acting. You often miss the window, but you rarely get burned.",
      "saving": "You are a natural, consistent saver, and often for others: your children's education, your parents' care, emergencies that haven't happened yet.",
      "spending": "You are frugal with yourself and generous with your family. You feel guilty about personal wants. Support for relatives is often one of the largest lines in your budget, even if you've never written it down.",
      "investing": "You favour deposits, insurance, pension plans and property your family lives in. You tend to stay loyal to one bank or one advisor for decades. You underweight growth assets, which means inflation slowly erodes your savings.",
      "debt": "You are debt-averse and pay loans off early. You borrow mainly for a home or a family emergency, and sometimes on behalf of relatives who couldn't borrow themselves.",
      "wealthGrowth": "You build wealth slowly and steadily through discipline and time. Your growth is capped by caution and by family obligations.",
      "inheritance": "You plan early and want fairness and family harmony above all. You default to equal splits and often use life insurance as a gift to those you leave behind. You may avoid hard conversations about unequal needs, such as a child with special needs or a sibling who contributed more."
    },
    "famousIntro": "",
    "famous": [
      {
        "name": "Sam Walton",
        "text": ", the founder of Walmart, lived modestly and famously drove an old pickup truck. He moved ownership of his business into a family partnership early, protecting his family's future and keeping the company together."
      },
      {
        "name": "Chuck Feeney",
        "text": ", co-founder of Duty Free Shoppers, lived frugally while quietly giving away nearly his entire fortune during his lifetime, a philosophy he called \"giving while living.\""
      },
      {
        "name": "Jim Sinegal",
        "text": ", co-founder of Costco, kept a modest salary and put employee and customer loyalty first, building a company famous for treating people well."
      },
      {
        "name": "Ingvar Kamprad",
        "text": ", the founder of IKEA, was known for extreme personal frugality and for structuring the company to protect its long-term continuity."
      },
      {
        "name": "Henry Sy Sr.",
        "text": "in the Philippines grew SM from a single shoe store into one of the country's largest conglomerates through steady, patient expansion. He brought all of his children into the business and planned for succession early, keeping the family united."
      }
    ],
    "famousNote": "These Guardians show what the type looks like at its best: discipline, loyalty and long-term thinking, combined with a willingness to grow.",
    "research": [
      "The Guardian's caution has deep roots in human psychology. In their landmark work on prospect theory, Daniel Kahneman and Amos Tversky (1979) showed that people weigh losses more heavily than equivalent gains. Guardians feel that asymmetry intensely, which keeps them safe but can also keep them from growing.",
      "The Guardian's generosity is examined directly in The Millionaire Next Door (1996). Stanley and Danko coined the term \"economic outpatient care\" for substantial financial gifts from parents to adult children, and found that it often weakened rather than strengthened the recipients' own ability to build wealth. In the Filipino context, the same dynamic often extends to siblings, cousins and parents. Love is never the problem. Unlimited, unplanned support sometimes is.",
      "Brad Klontz's research is encouraging for Guardians. Of the four money scripts, money vigilance (careful, saving, living within one's means) was the one most associated with healthy financial behaviour (Klontz et al., 2011). Guardians already have the foundation most people lack. Their work is to add growth and boundaries on top of it."
    ],
    "superpowers": [
      {
        "title": "Discipline",
        "text": "You save consistently, avoid debt and live within your means. These habits are the foundation of all lasting wealth."
      },
      {
        "title": "Protection",
        "text": "You are usually well insured and prepared for emergencies. When disaster strikes, your family is less likely to be ruined."
      },
      {
        "title": "Patience and loyalty",
        "text": "You don't chase fads, you don't panic-sell, and you stick with good plans and good people for the long term."
      },
      {
        "title": "Family first",
        "text": "You plan for continuity and care deeply about the people who depend on you. Your sacrifices change lives."
      },
      {
        "title": "Trustworthiness",
        "text": "People trust you with their money and their secrets. You are often the family's financial anchor."
      }
    ],
    "shadowIntro": "",
    "shadow": [
      {
        "title": "Too conservative",
        "text": "Keeping everything in savings accounts and time deposits feels safe, but inflation quietly erodes your purchasing power every year. Over decades, \"safe\" money can lose a significant share of its value."
      },
      {
        "title": "Self-sacrifice",
        "text": "You put everyone else's needs before your own, including your own retirement. You may reach your 50s or 60s with nothing set aside for yourself."
      },
      {
        "title": "Enabling",
        "text": "Your generosity can keep relatives dependent. Some never learn to stand on their own because you always catch them."
      },
      {
        "title": "Difficulty saying no",
        "text": "Guilt, utang na loob and family expectations make it very hard for you to refuse a request, even when it hurts you."
      },
      {
        "title": "Avoiding conflict",
        "text": "You avoid money conversations that might cause tension: about who pays for what, who inherits what, or when support needs to end."
      },
      {
        "title": "Slow decisions",
        "text": "Your caution means you often miss opportunities that would have been safe enough."
      }
    ],
    "underStress": "When money gets tight, you freeze, hoard cash and defer decisions. You cut your own spending further but keep supporting everyone else. You stop investing. You worry silently and don't ask for help. The most important habit for a Guardian under stress is to put yourself on the list. Your security is not selfish. It is what makes your care for others sustainable.",
    "relationships": {
      "intro": "Guardians are often drawn to Empire Builders. You bring stability and care. They bring energy and growth. The classic conflict is \"protect it\" versus \"grow it\". The answer is the same set of rules that serves the Empire Builder:",
      "rules": [
        "A safety floor: an amount of cash and protection that is never touched.",
        "A growth allocation: an amount you agree can be invested for growth.",
        "A consultation threshold: above an agreed amount, all decisions are made together."
      ],
      "outro": "When these rules are in place, you can relax, because the family's security is protected. And they can build, because they have a clear space to do it. With Trailblazers, you share a love of people. Together, you may be the most generous household in the family, and the most vulnerable to giving away your own security. With Architects, you share caution, which can lead to a very safe household that never grows enough."
    },
    "advisors": "Lead with reassurance, family benefit and a step-by-step approach. Take your time. Build trust before you build a plan. Explain how each recommendation protects the people they love. Avoid pressure, artificial deadlines and jargon. Guardians will quietly disappear if they feel pushed. The biggest gaps to close are usually their own retirement, inflation protection and boundaries on family support. Frame paying themselves first as an act of love: \"The best gift you can give your children is never needing to depend on them.\"",
    "blueprintIntro": "You don't need to stop caring for your family. You need to care for them in a way that lasts, and that includes caring for yourself.",
    "blueprint": [
      {
        "title": "Put yourself on the list",
        "text": "Before you budget for anyone else, budget for your own retirement. Even 10% of your income, consistently, changes your future."
      },
      {
        "title": "Set a family support budget",
        "text": "Decide how much you can give each month or year, write it down, and stick to it. When requests come, you can say: \"This is what I have set aside. I've already given what I can this month.\""
      },
      {
        "title": "Distinguish gifts from loans",
        "text": "If you lend money to family, decide in advance whether you'll accept not being repaid. If you can't, put the terms in writing, kindly."
      },
      {
        "title": "Grow gradually",
        "text": "Move a portion of your savings into diversified, long-term investments, a little at a time. Start with conservative options and build your comfort as you go. Peso-cost averaging lets you start small without having to time anything."
      },
      {
        "title": "Protect against inflation",
        "text": "Calculate what your savings will be worth in 20 years at current inflation. Then let that number motivate you to grow at least part of what you have."
      },
      {
        "title": "Have the hard conversations",
        "text": "Talk with your family about expectations: who will care for your parents, what support you can sustain, and what will happen to your assets. These conversations are uncomfortable. Not having them is worse."
      },
      {
        "title": "Teach, don't just give",
        "text": "Instead of always solving problems for relatives, help them build skills, budgets and income. Independence is a greater gift than dependence."
      },
      {
        "title": "Plan for your own old age",
        "text": "Ask yourself honestly: who will take care of me? Then build a plan that doesn't depend on the answer."
      }
    ],
    "coaching": [
      "If I stopped working today, who would take care of me?",
      "How much of my income goes to supporting others, and is it sustainable?",
      "Which family requests do I say yes to out of love, and which out of guilt?",
      "What will my savings actually be worth in 20 years?",
      "What would it mean for my family if I were financially independent in my old age?"
    ],
    "closing": "You are the quiet hero of so many families. Your sacrifices have educated children, healed parents and built homes. Your discipline is the foundation of every lasting fortune. But a guardian who collapses can no longer guard anyone. Protecting yourself is not betraying your family. It is the only way to keep protecting them for the rest of your life."
  },
  C: {
    "tagline": "Money is a system. If I understand it well enough, I can get it right.",
    "coreBelief": "For the Architect, money is a system to understand, optimize and get right. You value accuracy, independence and preparedness. You believe that if you study something well enough, you can avoid mistakes. You are Deliberate and Outcome-focused. You take your time, you need data, and you are energized by getting things right. Your core fear is making a costly mistake, and the embarrassment of having made one that you could have avoided.",
    "traits": {
      "relationship": "You see money as a system with rules. When you understand the rules, you feel in control. When you don't, you feel anxious. You take pride in being informed and independent.",
      "cashFlow": "You track closely, often with spreadsheets or apps. You budget in detail and forecast ahead. You usually know exactly where your money is and where it's going.",
      "risk": "You are measured. You quantify risk before acting, diversify by design, and dislike uncertainty you can't model. Volatility doesn't scare you as much as not understanding what's happening.",
      "opportunities": "You research thoroughly and spot bad deals faster than anyone. Scammers hate you. But you can over-analyze until the window closes. By the time you're sure, the opportunity is gone.",
      "saving": "You save systematically, with rules, targets and automation. Your savings rate is often the highest of all four types. Sometimes you are rigid about it, even when flexibility would serve you better.",
      "spending": "You are value-driven. You compare options, read reviews and calculate cost per use before buying. You can be stingy with yourself and sometimes with others, and you can spend hours deciding on something that doesn't matter much.",
      "investing": "You prefer diversified, low-cost, long-term, rules-based investing. You read the fine print and compare fees. Your risks are tinkering too much, switching strategies, or staying on the sidelines waiting for certainty.",
      "debt": "You borrow only when the math works, comparing the interest rate against the expected return. You scrutinize fees, terms and prepayment penalties. You are rarely in trouble with debt.",
      "wealthGrowth": "You build wealth through compounding, cost efficiency and tax efficiency. It is reliable, but it is often capped by caution and slow action.",
      "inheritance": "You plan carefully: a detailed will, trusts if needed, tax planning and clear documentation. The risks are rigid conditions that don't account for real life, and heirs who are prepared on paper but not in conversation."
    },
    "famousIntro": "",
    "famous": [
      {
        "name": "Warren Buffett",
        "text": "built one of history's great fortunes through value investing, patient analysis and a strict margin of safety. He still lives in the Omaha house he bought in 1958, and he has laid out in detail how his estate will be handled."
      },
      {
        "name": "Charlie Munger",
        "text": ", Buffett's long-time partner, was famous for checklists, mental models and the patience to wait years for the right opportunity, then act decisively."
      },
      {
        "name": "Ray Dalio",
        "text": "runs money by written principles and systems, including the All Weather portfolio designed to perform across economic environments."
      },
      {
        "name": "Jim Simons",
        "text": "built Renaissance Technologies on mathematical models rather than gut feel, producing some of the most remarkable investment returns ever recorded."
      },
      {
        "name": "Washington SyCip",
        "text": "founded SGV, the Philippines' largest professional services firm, and co-founded the Asian Institute of Management. His legacy was built on precision, rigour and governance."
      }
    ],
    "famousNote": "Notice what separates these Architects from Paolo: they studied deeply, but they acted. Munger's patience was not paralysis. It was waiting with a plan, then moving decisively when the criteria were met.",
    "research": [
      "The Architect's instincts are well supported by research. Stanley and Danko found that the prodigious accumulators of wealth in The Millionaire Next Door (1996) tended to budget carefully, live below their means and invest steadily rather than trade actively. That is the Architect's natural operating system.",
      "But the same research points to the Architect's trap. Wealth comes from investing consistently over long periods, not from finding the perfect entry point. Ronald Read, a Vermont gas station attendant and janitor who left an estate of about $8 million, didn't out-analyze anyone. He simply kept buying quality and kept holding, for decades. Morgan Housel observes that time in the market is what allows compounding to do its work, and that the person who stays invested reasonably will usually beat the person who waits for certainty.",
      "Robert Kiyosaki is blunt on this point: money \"parked\" in savings loses ground to inflation every year. You don't have to accept all of Kiyosaki's views to accept this one.",
      "T. Harv Eker offers the Architect a three-word antidote: \"Ready, fire, aim.\" Prepare as well as you can in a short time, act, and then correct as you go. For most Architects, the risk of acting imperfectly is far smaller than the cost of never acting at all."
    ],
    "superpowers": [
      {
        "title": "Accuracy",
        "text": "You know your numbers. You catch errors others miss."
      },
      {
        "title": "Planning",
        "text": "Your budgets, forecasts, investment policies and estate plans are often already in place, long before others think about them."
      },
      {
        "title": "Efficiency",
        "text": "You minimize fees, taxes and waste. Over a lifetime, those savings compound into a significant advantage."
      },
      {
        "title": "Diversification",
        "text": "You spread risk by design, so a single failure rarely sinks you."
      },
      {
        "title": "Skepticism",
        "text": "You are very hard to sell a bad deal to. You ask the questions that expose weak investments and outright scams."
      }
    ],
    "shadowIntro": "",
    "shadow": [
      {
        "title": "Analysis paralysis",
        "text": "You keep researching because deciding feels risky. Every new piece of information raises another question."
      },
      {
        "title": "Cash drag",
        "text": "While you wait for the right moment, inflation quietly eats your savings. Money that sits safely in cash for a decade can lose a large share of its purchasing power."
      },
      {
        "title": "Perfectionism",
        "text": "You second-guess decisions you've already made. You switch strategies, rebalance too often and abandon good plans because they aren't perfect."
      },
      {
        "title": "Missed opportunities",
        "text": "By the time you're certain, the opportunity has usually moved on. Certainty is expensive."
      },
      {
        "title": "Difficulty trusting",
        "text": "You struggle to delegate to advisors, partners or family. You believe you can do it better yourself, which is often true, but not always worth your time."
      },
      {
        "title": "Neglecting the emotional side",
        "text": "You can treat money as purely numerical and forget that your spouse, children and parents experience it emotionally. You may criticize others' habits instead of understanding them."
      }
    ],
    "underStress": "When money gets tight, you over-analyze, withdraw and become rigid. You build more spreadsheets. You cut spending to the bone, sometimes on things that matter to your family. You stop talking about it, because you feel you should have seen it coming. The most important habit for an Architect under stress is to decide on a rule in advance. Before the crisis arrives, write down what you will do if markets fall 20%, if you lose your job, or if a big expense hits. Then, when it happens, you follow the rule instead of the fear.",
    "relationships": {
      "intro": "Architects are often drawn to Trailblazers, and the attraction makes sense. You bring order; they bring joy. But the classic conflict is \"track it\" versus \"enjoy it\". You see their spending as careless. They see your tracking as control. What helps:",
      "rules": [
        "Agree on the big numbers, not the small ones. Settle the savings rate and the investment plan together. Then stop reviewing every purchase.",
        "Give your partner a personal budget with no reporting required.",
        "Share the why, not just the what."
      ],
      "outro": "Explain what your plans are for: the freedom, the security, the future you want together. Numbers alone don't persuade people who think in stories. With Guardians, you share caution, which can make for a very safe household that never grows. With Empire Builders, you share a focus on outcomes, and you can be their most valuable reality check."
    },
    "advisors": "Lead with data, illustrations, fee disclosures and written proposals. Give them time to review. Expect detailed questions, and welcome them; they are a sign of engagement, not resistance. Avoid hype, vague claims, pressure and anything that sounds like a sales pitch. Architects lose trust instantly when numbers don't add up. The biggest gap to close is usually action. Help them set decision criteria and deadlines in advance, and show them the cost of waiting in concrete numbers.",
    "blueprintIntro": "You don't need to stop thinking. You need to stop waiting.",
    "blueprint": [
      {
        "title": "Write an investment policy statement",
        "text": "One page: your goals, your time horizon, your target allocation, and your rules for rebalancing. Once it's written, follow it, and stop re-deciding."
      },
      {
        "title": "Automate your investing",
        "text": "Set up regular monthly contributions into a diversified, low-cost fund. Peso-cost averaging removes the need to time the market, which is exactly the decision that paralyzes you."
      },
      {
        "title": "Set decision deadlines",
        "text": "For every financial decision, decide in advance when you will decide. \"I will choose a fund by the 30th.\" Then choose."
      },
      {
        "title": "Define \"good enough.\" Not every decision needs the optimal answer",
        "text": "A good plan executed today beats a perfect plan executed in five years. Set thresholds: if an option meets your core criteria, it's good enough."
      },
      {
        "title": "Calculate the cost of waiting",
        "text": "Before delaying a decision, estimate what the delay costs in lost growth. Seeing that number often breaks the paralysis."
      },
      {
        "title": "Limit your reviews",
        "text": "Check your portfolio quarterly, not daily. Rebalance annually, or when allocations drift beyond a set band."
      },
      {
        "title": "Delegate one thing",
        "text": "Choose one area, such as insurance, taxes or estate planning, and hand it to a qualified advisor with clear rules. Free your mind for what you do best."
      },
      {
        "title": "Talk to your family",
        "text": "Share your plans in plain language with your spouse and heirs. A perfect estate plan that nobody understands can still cause conflict."
      }
    ],
    "coaching": [
      "What decision have I been researching for more than six months?",
      "What has waiting cost me in the last five years?",
      "If I had to choose today with what I already know, what would I choose?",
      "Where am I trading my time for small savings that don't matter?",
      "Does my family understand my financial plan, or just trust that I have one?"
    ],
    "closing": "Your mind is a fortress. You protect your family from scams, waste and foolish risks. You build systems that last. The world's greatest investors are mostly Architects. But every great Architect knows that a blueprint is not a building. At some point, you have to break ground. Your plan doesn't need to be perfect. It needs to be started."
  }
};
