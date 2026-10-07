'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  INTERSTITIALS, PROFILE_STEPS, QUESTIONS, TOTAL, TYPES, TYPE_ORDER,
  type ProfileFieldId,
} from '@/lib/quiz-data';
import { percentages, scoreAnswers } from '@/lib/scoring';
import { EMAIL_RE, cleanName, firstName } from '@/lib/validation';

type View = 'intro' | 'profile' | 'quiz' | 'results' | 'offer' | 'email' | 'sent';
type Profile = Partial<Record<ProfileFieldId, string | string[]>>;

const LETTERS = ['A', 'B', 'C', 'D'];
const HERMES_URL = process.env.NEXT_PUBLIC_HERMES_URL || 'https://hermes.exoasia.org';
const PRIVACY_URL = process.env.NEXT_PUBLIC_PRIVACY_URL || '';

function hermesLink(): string {
  try {
    const u = new URL(HERMES_URL);
    u.searchParams.set('utm_source', 'money-dna-quiz');
    u.searchParams.set('utm_medium', 'web');
    return u.toString();
  } catch {
    return HERMES_URL;
  }
}

const INTRO_SCREENS = 4;
const TYPE_MEANING: Record<string, string> = {
  D: 'Money is power and leverage',
  I: 'Money is freedom and experience',
  S: 'Money is safety for loved ones',
  C: 'Money is a system to get right',
};

const Dots = ({ at }: { at: number }) => (
  <div className="dots" aria-label={`Intro ${at + 1} of ${INTRO_SCREENS}`}>
    {Array.from({ length: INTRO_SCREENS }, (_, n) => <span key={n} className={n === at ? 'on' : undefined} />)}
  </div>
);

const BackIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>
);

export default function Quiz() {
  const [view, setView] = useState<View>('intro');
  const [introStep, setIntroStep] = useState(0);
  const [pstep, setPstep] = useState(0);
  const [profile, setProfile] = useState<Profile>({});
  const [i, setI] = useState(0);
  const [sel, setSel] = useState<number | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [onQuote, setOnQuote] = useState(false);
  const [quotePart, setQuotePart] = useState(0); // quotes with a stat show the stat first (0), then the quote (1)
  const [responseId, setResponseId] = useState<string | null>(null);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [touched, setTouched] = useState(false);
  const [optIn, setOptIn] = useState(false);
  const [website, setWebsite] = useState(''); // honeypot
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const mainRef = useRef<HTMLElement>(null);

  // Move focus to the top of each new screen for keyboard and screen-reader users.
  useEffect(() => {
    mainRef.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0 });
  }, [view, introStep, pstep, i, onQuote, quotePart]);

  const result = useMemo(() => (answers.length === TOTAL ? scoreAnswers(answers) : null), [answers]);
  const emailOk = EMAIL_RE.test(email.trim());
  const nameOk = cleanName(fullName) !== null;

  async function saveResponse(finalAnswers: number[]): Promise<string | null> {
    try {
      const params = new URLSearchParams(window.location.search);
      const res = await fetch('/api/responses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile,
          answers: finalAnswers,
          website,
          referrer: document.referrer || null,
          utm: { source: params.get('utm_source'), medium: params.get('utm_medium'), campaign: params.get('utm_campaign') },
        }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      if (data.id) setResponseId(data.id);
      return data.id ?? null;
    } catch {
      return null;
    }
  }

  function finish(finalAnswers: number[]) {
    setView('results');
    void saveResponse(finalAnswers);
  }

  // ---- navigation ----
  const step = PROFILE_STEPS[Math.max(0, pstep - 1)];
  const stepIncomplete = step.fields.some((f) => {
    const v = profile[f.id];
    return f.multi ? !Array.isArray(v) || v.length === 0 : !v;
  });

  function pick(id: ProfileFieldId, value: string, multi?: boolean) {
    setProfile((p) => {
      if (!multi) return { ...p, [id]: value };
      const cur = Array.isArray(p[id]) ? (p[id] as string[]) : [];
      return { ...p, [id]: cur.includes(value) ? cur.filter((x) => x !== value) : [...cur, value] };
    });
  }

  function nextQuestion() {
    if (sel === null) return;
    const next = [...answers.slice(0, i), sel];
    const ni = i + 1;
    setAnswers(next);
    setSel(null);
    setI(ni);
    if (INTERSTITIALS[ni]) { setOnQuote(true); setQuotePart(0); }
    else if (ni >= TOTAL) finish(next);
  }

  function continueFromQuote() {
    if (INTERSTITIALS[i]?.stat && quotePart === 0) { setQuotePart(1); return; }
    setOnQuote(false);
    if (i >= TOTAL) finish(answers);
  }

  function back() {
    if (view === 'profile') {
      if (pstep <= 1) { setView('intro'); setIntroStep(INTRO_SCREENS - 1); setPstep(0); } else setPstep(pstep - 1);
      return;
    }
    if (onQuote && quotePart === 1 && INTERSTITIALS[i]?.stat) { setQuotePart(0); return; }
    if (i === 0 && !onQuote) { setView('profile'); setPstep(PROFILE_STEPS.length); return; }
    const prev = i - 1;
    setOnQuote(false);
    setI(prev);
    setSel(answers[prev] ?? null);
    setAnswers(answers.slice(0, prev));
  }

  function restart() {
    setI(0); setSel(null); setAnswers([]); setOnQuote(false); setQuotePart(0);
    setResponseId(null); setError(null); setNotice(null); setTouched(false);
    setView('quiz');
  }

  async function submitEmail() {
    if (!emailOk || !nameOk || submitting || !result) return;
    setSubmitting(true);
    setError(null);
    setNotice(null);
    try {
      const id = responseId ?? (await saveResponse(answers));
      if (!id) throw new Error('Could not save your answers. Check your connection and try again.');
      const res = await fetch(`/api/responses/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName: fullName.trim(), email: email.trim(), optIn }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.notice) { setNotice(data.error); return; }
        throw new Error(data.error || 'Could not send your profile. Try again.');
      }
      setView('sent');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Try again.');
    } finally {
      setSubmitting(false);
    }
  }

  // ---- header ----
  const inQuiz = view === 'quiz';
  const counter =
    view === 'intro' ? '20 questions · 4 min'
      : view === 'profile' ? 'Your profile'
        : inQuiz ? (onQuote ? `${i} of ${TOTAL} answered` : `Question ${i + 1} of ${TOTAL}`)
          : 'Complete';
  const filled = onQuote ? i : i + 1;

  return (
    <main className="shell" ref={mainRef} tabIndex={-1} style={{ outline: 'none' }}>
      <header className="topbar">
        <div className="brand">
          <svg width="26" height="26" viewBox="0 0 26 26" fill="none" stroke="#F5B841" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M7 2c0 7 12 8 12 11S7 17 7 24" /><path d="M19 2c0 7-12 8-12 11s12 4 12 11" /><path d="M9 6h8M9 20h8" /></svg>
          Money DNA
        </div>
        {view === 'intro' && introStep > 0 && introStep < INTRO_SCREENS - 1
          ? <button type="button" className="skip" onClick={() => { setView('profile'); setPstep(1); }}>Skip to the quiz</button>
          : <span className="counter" aria-live="polite">{counter}</span>}
      </header>

      {inQuiz && (
        <div className="bars" role="progressbar" aria-label="Quiz progress" aria-valuemin={0} aria-valuemax={TOTAL} aria-valuenow={Math.min(filled, TOTAL)}>
          {Array.from({ length: TOTAL }, (_, b) => (
            <span key={b} className="bar" style={b < filled ? { background: TYPES[TYPE_ORDER[b % 4]].color } : undefined} />
          ))}
        </div>
      )}

      {view === 'intro' && (() => {
        const startQuiz = () => { setView('profile'); setPstep(1); };
        const next = () => setIntroStep(introStep + 1);
        const nav = (label: string) => (
          <>
            <Dots at={introStep} />
            <div className="row">
              <button type="button" className="btn-back" aria-label="Back" onClick={() => setIntroStep(introStep - 1)}><BackIcon /></button>
              <button type="button" className="btn" onClick={next}>{label}</button>
            </div>
          </>
        );

        if (introStep === 0) return (
          <section className="screen" style={{ gap: 13 }}>
            <span className="kicker">Money DNA</span>
            <h1 className="h1" style={{ fontSize: 30 }}>Why do some people become wealthy while others go broke?</h1>
            <p className="lead" style={{ fontSize: 15 }}>It isn&apos;t intelligence or income. It&apos;s your <b style={{ color: 'var(--text)' }}>Money DNA</b>: the money program you picked up long before you earned your first peso.</p>
            <div className="pair">
              {TYPE_ORDER.map((k) => (
                <div key={k} className="type-chip"><img src={`/avatars/${k}.jpg`} alt="" width={30} height={30} />{TYPES[k].short}</div>
              ))}
            </div>
            <p className="lead" style={{ fontSize: 14, color: 'var(--muted)' }}>Four types. Which one is running your money?</p>
            <div className="grow" />
            <Dots at={0} />
            <button type="button" className="btn" style={{ flex: 'none', height: 56 }} onClick={next}>Find out my Money DNA</button>
            <span className="center" style={{ fontSize: 12, color: 'var(--dim)' }}>From the book Money DNA by Mack Comandante</span>
          </section>
        );

        if (introStep === 1) return (
          <section className="screen" style={{ gap: 14 }}>
            <span className="kicker">What is Money DNA?</span>
            <h1 className="h1">It isn&apos;t intelligence. It isn&apos;t income.</h1>
            <p className="lead" style={{ fontSize: 15 }}>Some of the brightest, best-paid people are one emergency away from borrowing. The missing piece is self-knowledge.</p>
            <p className="lead" style={{ fontSize: 15 }}>Your Money DNA is the money program you picked up from your family, your culture and your experiences. It answers two questions:</p>
            <div className="tile" style={{ padding: '11px 14px' }}><p style={{ color: 'var(--text)', fontWeight: 600 }}>How fast do you act with money?</p></div>
            <div className="tile" style={{ padding: '11px 14px' }}><p style={{ color: 'var(--text)', fontWeight: 600 }}>What is money for, in your mind?</p></div>
            <div className="grow" />
            {nav('Next')}
          </section>
        );

        if (introStep === 2) return (
          <section className="screen" style={{ gap: 10 }}>
            <span className="kicker">The four types</span>
            <h1 className="h1" style={{ fontSize: 24 }}>Every type can build wealth. Every type can lose it.</h1>
            {TYPE_ORDER.map((k) => (
              <div key={k} className="type-row">
                <img src={`/avatars/${k}.jpg`} alt="" width={40} height={40} />
                <div><b style={{ color: TYPES[k].color }}>{TYPES[k].name}</b><span>{TYPE_MEANING[k]}</span></div>
              </div>
            ))}
            <p className="lead" style={{ fontSize: 13, color: 'var(--muted)' }}>No type is better than another. Each has real superpowers and a predictable blind spot.</p>
            <div className="grow" />
            {nav('Next')}
          </section>
        );

        return (
          <section className="screen" style={{ gap: 13 }}>
            <span className="kicker">The Money DNA Quiz</span>
            <h1 className="hero" style={{ fontSize: 38 }}>Same income.<br /><span>Different futures.</span></h1>
            <p className="lead" style={{ fontSize: 15 }}>Carlo and Joy graduated together, joined the same Makati company and earned the same pay for ten years.</p>
            <div className="pair">
              <div className="tile"><b style={{ color: 'var(--coral)' }}>CARLO AT 35</b><p>A franchise, a rental condo, stocks. And two business loans.</p></div>
              <div className="tile"><b style={{ color: 'var(--teal)' }}>JOY AT 35</b><p>Full emergency fund, insured. A third of her pay goes home.</p></div>
            </div>
            <p className="turn">Who&apos;s doing better?<br />Wrong question.<br />They&apos;re running on different Money DNAs.</p>
            <div className="grow" />
            <Dots at={3} />
            <div className="row">
              <button type="button" className="btn-back" aria-label="Back" onClick={() => setIntroStep(2)}><BackIcon /></button>
              <button type="button" className="btn" onClick={startQuiz}>Decode my Money DNA</button>
            </div>
          </section>
        );
      })()}

      {view === 'profile' && (
        <section className="screen" style={{ gap: 20 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span className="kicker">{step.kicker}</span>
            <h1 className="h1" style={step.fields.some((f) => f.multi) ? { fontSize: 25 } : undefined}>{step.title}</h1>
          </div>
          {step.fields.map((f) => (
            <fieldset key={f.id} className="field">
              <legend>{f.label}</legend>
              <div className={`chips${f.scale ? ' scale' : ''}${f.multi ? ' grid' : ''}`}>
                {f.options.map((o) => {
                  const v = profile[f.id];
                  const on = f.multi ? Array.isArray(v) && v.includes(o) : v === o;
                  return (
                    <button key={o} type="button" className="chip" aria-pressed={on} onClick={() => pick(f.id, o, f.multi)}>{o}</button>
                  );
                })}
              </div>
              {f.scale && <div className="scale-labels"><span>{f.scale.low}</span><span>{f.scale.high}</span></div>}
            </fieldset>
          ))}
          <div className="grow" />
          <span className="fine">Used only to tailor your results.{PRIVACY_URL && <> <a href={PRIVACY_URL} target="_blank" rel="noopener">Privacy policy</a></>}</span>
          <div className="row">
            <button type="button" className="btn-back" aria-label="Back" onClick={back}><BackIcon /></button>
            <button type="button" className="btn" disabled={stepIncomplete} onClick={() => (pstep >= PROFILE_STEPS.length ? (setView('quiz'), setPstep(0)) : setPstep(pstep + 1))}>
              {pstep >= PROFILE_STEPS.length ? 'Start the quiz' : 'Continue'}
            </button>
          </div>
        </section>
      )}

      {inQuiz && !onQuote && i < TOTAL && (
        <section className="screen">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <span className="kicker">{QUESTIONS[i].section}</span>
            <h1 className="h-question">{QUESTIONS[i].q}</h1>
          </div>
          <div className="options">
            {QUESTIONS[i].options.map((t, j) => (
              <button key={j} type="button" className="option" aria-pressed={sel === j} onClick={() => setSel(j)}>
                <span className="badge" aria-hidden="true">{LETTERS[j]}</span>
                <span style={{ flex: 1 }}>{t}</span>
              </button>
            ))}
          </div>
          <div className="grow" />
          <div className="row">
            <button type="button" className="btn-back" aria-label="Previous question" onClick={back}><BackIcon /></button>
            <button type="button" className="btn" disabled={sel === null} onClick={nextQuestion}>{i === TOTAL - 1 ? 'Finish' : 'Next question'}</button>
          </div>
        </section>
      )}

      {inQuiz && onQuote && INTERSTITIALS[i] && (() => {
        const q = INTERSTITIALS[i];
        const statPage = !!q.stat && quotePart === 0;
        return (
          <section className="screen quote-screen">
            <div className="grow" />
            <span className="kicker">From the book</span>
            {statPage && q.stat ? (
              <div className="stat">
                <strong>{q.stat.big}</strong>
                <p>{q.stat.text}</p>
                <small>{q.stat.source}</small>
              </div>
            ) : (
              <>
                <svg width="56" height="44" viewBox="0 0 56 44" fill="#F5B841" aria-hidden="true"><path d="M0 44V27C0 12 7 3 21 0l3 6c-8 3-12 8-12 15h10v23H0zm32 0V27c0-15 7-24 21-27l3 6c-8 3-12 8-12 15h10v23H32z" /></svg>
                <blockquote className={`quote${q.coach ? ' small' : ''}`}>{q.quote}</blockquote>
                {q.coach && (
                  <div className="coach">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3CC3A8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: 'none', marginTop: 2 }}><path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7V16h8v-1.3A7 7 0 0 0 12 2z" /></svg>
                    <div><b>Coaching moment</b><p>{q.coach}</p></div>
                  </div>
                )}
                <div className="byline">Mack Comandante,&nbsp;<i>Money DNA</i></div>
              </>
            )}
            <div className="grow" />
            <div className="row">
              <button type="button" className="btn-back" aria-label="Back" onClick={back}><BackIcon /></button>
              <button type="button" className="btn" onClick={continueFromQuote}>{statPage ? 'Keep going' : q.cta || 'Keep going'}</button>
            </div>
          </section>
        );
      })()}

      {view === 'results' && result && (() => {
        const t = TYPES[result.primary];
        const pct = percentages(result.scores);
        return (
          <section className="screen">
            <span className="kicker">Your Money DNA</span>
            <div className="card">
              <span className="chip-type" style={{ background: t.color }}>Money DNA · {t.key}</span>
              <h1 className="h1">{t.name}</h1>
              <p>{t.summary}</p>
              <div className="mixbar" aria-hidden="true">
                {TYPE_ORDER.map((k) => <span key={k} style={{ flex: Math.max(0.04, result.scores[k]), background: TYPES[k].color }} />)}
              </div>
              <div className="legend">
                {TYPE_ORDER.map((k) => (
                  <div key={k}><i style={{ background: TYPES[k].color }} />{TYPES[k].short} <span>{pct[k]}%</span></div>
                ))}
              </div>
            </div>
            <div className="grow" />
            <button type="button" className="btn" style={{ flex: 'none' }} onClick={() => setView('offer')}>See my full profile</button>
            <button type="button" className="btn-text" onClick={restart}>Retake the quiz</button>
          </section>
        );
      })()}

      {view === 'offer' && result && (
        <section className="screen" style={{ gap: 16 }}>
          <span className="kicker">Your full report</span>
          <h1 className="h1">Get your Full Money DNA Report</h1>
          <p className="lead" style={{ fontSize: 15 }}>About 12 pages written for {TYPES[result.primary].name}, adapted from the book:</p>
          <ul className="offer-list">
            <li>How you handle cash flow, risk, saving, spending, investing and debt</li>
            <li>Your superpowers, and the shadow that comes with them</li>
            <li>What you do under stress, and in relationships</li>
            <li>Your {TYPES[result.primary].short} Blueprint: eight moves that fit your type</li>
            <li>Coaching questions to reflect on</li>
          </ul>
          <p className="lead" style={{ fontSize: 14, color: 'var(--muted)' }}>We&apos;ll email it to you as a PDF, and you&apos;ll also find it in your Hermes account.</p>
          <div className="grow" />
          <div className="row">
            <button type="button" className="btn-back" aria-label="Back to results" onClick={() => setView('results')}><BackIcon /></button>
            <button type="button" className="btn" onClick={() => setView('email')}>Get my report</button>
          </div>
        </section>
      )}

      {view === 'email' && result && (
        <form className="screen" style={{ gap: 16 }} onSubmit={(e) => { e.preventDefault(); void submitEmail(); }} noValidate>
          <span className="kicker">Your full report</span>
          <h1 className="h1">Where should we send it?</h1>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label htmlFor="mdna-name" className="label">Full name</label>
            <input
              id="mdna-name" className="input" type="text" autoComplete="name" autoCapitalize="words" placeholder="Juan dela Cruz" maxLength={100}
              value={fullName} onChange={(e) => setFullName(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label htmlFor="mdna-email" className="label">Your best email</label>
            <input
              id="mdna-email" className="input" type="email" inputMode="email" autoComplete="email" placeholder="you@example.com"
              value={email} onChange={(e) => { setEmail(e.target.value); setNotice(null); }} onBlur={() => setTouched(true)}
              aria-invalid={touched && !!email && !emailOk} aria-describedby="mdna-email-error"
            />
            {touched && email && !emailOk && <span id="mdna-email-error" className="error">Please enter a valid email address.</span>}
          </div>
          <label className="optin">
            <input type="checkbox" checked={optIn} onChange={(e) => setOptIn(e.target.checked)} />
            <span>Yes, also send me Money DNA coaching tips and updates from Exoasia. I can unsubscribe anytime.</span>
          </label>
          <div className="hp" aria-hidden="true">
            <label>Website<input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} /></label>
          </div>
          {error && <span className="error" role="alert">{error}</span>}
          {notice && <span className="notice" role="status">{notice}</span>}
          <div className="grow" />
          <span className="fine">We&apos;ll only use your name and email as described.{PRIVACY_URL && <> <a href={PRIVACY_URL} target="_blank" rel="noopener">Privacy policy</a></>}</span>
          <div className="row">
            <button type="button" className="btn-back" aria-label="Back" onClick={() => setView('offer')}><BackIcon /></button>
            <button type="submit" className="btn" disabled={!emailOk || !nameOk || submitting}>{submitting ? 'Sending…' : 'Send my report'}</button>
          </div>
        </form>
      )}

      {view === 'sent' && (
        <section className="screen" style={{ gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span className="check" style={{ flex: 'none' }}><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6L9 17l-5-5" /></svg></span>
            <h1 className="h1" style={{ fontSize: 28 }}>Your report is on its way{firstName(cleanName(fullName)) ? `, ${firstName(cleanName(fullName))}` : ''}.</h1>
          </div>
          <p className="lead" style={{ fontSize: 15 }}>We&apos;ve sent your Full Money DNA Report to <b style={{ color: 'var(--text)' }}>{email.trim()}</b>. Not there in a few minutes? Look in your spam or promotions folder.</p>
          <div className="next">
            <span className="kicker">Your next step</span>
            <strong>Turn your Money DNA into your Financial Wellness Roadmap.</strong>
            <p>Your full profile is also waiting in the Hermes app. Create your free account to open it anytime.</p>
          </div>
          <div className="grow" />
          <a className="btn" style={{ flex: 'none' }} href={hermesLink()}>
            Create my free Hermes account
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
          </a>
          <span className="center" style={{ fontSize: 13, color: 'var(--muted)' }}>{new URL(HERMES_URL).host}</span>
        </section>
      )}
    </main>
  );
}
