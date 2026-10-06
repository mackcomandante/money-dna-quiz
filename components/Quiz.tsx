'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  INTERSTITIALS, PROFILE_STEPS, QUESTIONS, TOTAL, TYPES, TYPE_ORDER,
  type ProfileFieldId,
} from '@/lib/quiz-data';
import { percentages, scoreAnswers } from '@/lib/scoring';
import { EMAIL_RE } from '@/lib/validation';

type View = 'intro' | 'profile' | 'quiz' | 'results' | 'email' | 'sent';
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

const BackIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>
);

export default function Quiz() {
  const [view, setView] = useState<View>('intro');
  const [pstep, setPstep] = useState(0);
  const [profile, setProfile] = useState<Profile>({});
  const [i, setI] = useState(0);
  const [sel, setSel] = useState<number | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [onQuote, setOnQuote] = useState(false);
  const [responseId, setResponseId] = useState<string | null>(null);
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
  }, [view, pstep, i, onQuote]);

  const result = useMemo(() => (answers.length === TOTAL ? scoreAnswers(answers) : null), [answers]);
  const emailOk = EMAIL_RE.test(email.trim());

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
    if (INTERSTITIALS[ni]) setOnQuote(true);
    else if (ni >= TOTAL) finish(next);
  }

  function continueFromQuote() {
    setOnQuote(false);
    if (i >= TOTAL) finish(answers);
  }

  function back() {
    if (view === 'profile') {
      if (pstep <= 1) { setView('intro'); setPstep(0); } else setPstep(pstep - 1);
      return;
    }
    if (i === 0 && !onQuote) { setView('profile'); setPstep(PROFILE_STEPS.length); return; }
    const prev = i - 1;
    setOnQuote(false);
    setI(prev);
    setSel(answers[prev] ?? null);
    setAnswers(answers.slice(0, prev));
  }

  function restart() {
    setI(0); setSel(null); setAnswers([]); setOnQuote(false);
    setResponseId(null); setError(null); setNotice(null); setTouched(false);
    setView('quiz');
  }

  async function submitEmail() {
    if (!emailOk || submitting || !result) return;
    setSubmitting(true);
    setError(null);
    setNotice(null);
    try {
      const id = responseId ?? (await saveResponse(answers));
      if (!id) throw new Error('Could not save your answers. Check your connection and try again.');
      const res = await fetch(`/api/responses/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), optIn }),
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
    view === 'intro' ? '20 questions'
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
        <span className="counter" aria-live="polite">{counter}</span>
      </header>

      {inQuiz && (
        <div className="bars" role="progressbar" aria-label="Quiz progress" aria-valuemin={0} aria-valuemax={TOTAL} aria-valuenow={Math.min(filled, TOTAL)}>
          {Array.from({ length: TOTAL }, (_, b) => (
            <span key={b} className="bar" style={b < filled ? { background: TYPES[TYPE_ORDER[b % 4]].color } : undefined} />
          ))}
        </div>
      )}

      {view === 'intro' && (
        <section className="screen" style={{ gap: 18 }}>
          <span className="kicker">The Money DNA Quiz</span>
          <h1 className="hero">Same income.<br /><span>Different futures.</span></h1>
          <p className="lead">Carlo and Joy graduated together, joined the same Makati company and earned the same pay for ten years.</p>
          <div className="pair">
            <div className="tile"><b style={{ color: 'var(--coral)' }}>CARLO AT 35</b><p>A franchise, a rental condo, stocks. And two business loans.</p></div>
            <div className="tile"><b style={{ color: 'var(--teal)' }}>JOY AT 35</b><p>Full emergency fund, insured. A third of her pay goes home.</p></div>
          </div>
          <p className="turn">Who&apos;s doing better? Wrong question. They&apos;re running different money code.</p>
          <p className="lead" style={{ fontSize: 15 }}>Yours was written long before you earned your first income. Twenty questions will show you what it says.</p>
          <div className="grow" />
          <button type="button" className="btn" style={{ flex: 'none', height: 58, fontSize: 17 }} onClick={() => { setView('profile'); setPstep(1); }}>Decode my Money DNA</button>
          <span className="center" style={{ fontSize: 13, fontWeight: 500, color: 'var(--muted)' }}>20 questions · about 4 minutes · no wrong answers</span>
        </section>
      )}

      {view === 'profile' && (
        <section className="screen" style={{ gap: 20 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span className="kicker">{step.kicker}</span>
            <h1 className="h1">{step.title}</h1>
          </div>
          {step.fields.map((f) => (
            <fieldset key={f.id} className="field">
              <legend>{f.label}</legend>
              <div className={`chips${f.scale ? ' scale' : ''}`}>
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
        return (
          <section className="screen quote-screen">
            <div className="grow" />
            <span className="kicker">From the book</span>
            {q.stat ? (
              <div className="stat">
                <strong>{q.stat.big}</strong>
                <p>{q.stat.text}</p>
                <small>{q.stat.source}</small>
              </div>
            ) : (
              <svg width="56" height="44" viewBox="0 0 56 44" fill="#F5B841" aria-hidden="true"><path d="M0 44V27C0 12 7 3 21 0l3 6c-8 3-12 8-12 15h10v23H0zm32 0V27c0-15 7-24 21-27l3 6c-8 3-12 8-12 15h10v23H32z" /></svg>
            )}
            <blockquote className={`quote${q.stat ? ' small' : ''}`}>{q.quote}</blockquote>
            {q.coach && (
              <div className="coach">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3CC3A8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: 'none', marginTop: 2 }}><path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7V16h8v-1.3A7 7 0 0 0 12 2z" /></svg>
                <div><b>Coaching moment</b><p>{q.coach}</p></div>
              </div>
            )}
            <div className="byline">Mack Comandante,&nbsp;<i>Money DNA</i></div>
            <div className="grow" />
            <div className="row">
              <button type="button" className="btn-back" aria-label="Previous question" onClick={back}><BackIcon /></button>
              <button type="button" className="btn" onClick={continueFromQuote}>{q.cta || 'Keep going'}</button>
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
            <button type="button" className="btn" style={{ flex: 'none' }} onClick={() => setView('email')}>See my full profile</button>
            <button type="button" className="btn-text" onClick={restart}>Retake the quiz</button>
          </section>
        );
      })()}

      {view === 'email' && result && (
        <form className="screen" style={{ gap: 20 }} onSubmit={(e) => { e.preventDefault(); void submitEmail(); }} noValidate>
          <span className="kicker">Your full profile</span>
          <h1 className="h1" style={{ fontSize: 32 }}>Where should we send your Money DNA?</h1>
          <p className="lead" style={{ fontSize: 15 }}>Get your Full Money DNA Report for {TYPES[result.primary].name}: your superpowers, your shadow, how you react under stress, your Blueprint and coaching questions. We&apos;ll email it to you as a PDF, and you can download it right away.</p>
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
          <span className="fine">We&apos;ll only use your email as described.{PRIVACY_URL && <> <a href={PRIVACY_URL} target="_blank" rel="noopener">Privacy policy</a></>}</span>
          <div className="row">
            <button type="button" className="btn-back" aria-label="Back to results" onClick={() => setView('results')}><BackIcon /></button>
            <button type="submit" className="btn" disabled={!emailOk || submitting}>{submitting ? 'Sending…' : 'Send my full profile'}</button>
          </div>
        </form>
      )}

      {view === 'sent' && (
        <section className="screen" style={{ gap: 20 }}>
          <div className="grow" />
          <span className="check"><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6L9 17l-5-5" /></svg></span>
          <h1 className="h1" style={{ fontSize: 32 }}>Your report is ready.</h1>
          <p className="lead">We&apos;ve also sent it to <b style={{ color: 'var(--text)' }}>{email.trim()}</b>. Not there in a few minutes? Look in your spam or promotions folder.</p>
          {responseId && (
            <a className="btn-outline" href={`/api/report/${responseId}`} download>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 4v11M7 10l5 5 5-5M5 20h14" /></svg>
              Download my Full Money DNA Report (PDF)
            </a>
          )}
          <div className="next">
            <span className="kicker">Your next step</span>
            <strong>Your full profile is also waiting in the Hermes app.</strong>
            <p>Create your free account to open it anytime, then turn your Money DNA into your Financial Wellness Roadmap.</p>
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
