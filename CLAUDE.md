# CLAUDE.md — Money DNA Quiz

Handoff notes for Claude Code. Read this first.

## What this is
A mobile-first web app for the **Money DNA Quiz**, Mack Comandante's money-personality framework
(adapted from DISC — always keep that credit). Four types: D Empire Builder, I Trailblazer,
S Guardian, C Architect. The design was finalised in a Claude Design canvas ("Option 1 — Genome")
and ported 1:1 here.

**Flow:** Intro (4 screens) → Profile (5 steps) → 20 questions with book-quote interstitials after Q4/8/12/16/20 (quotes with a stat show it on its own screen first)
→ Results card → "Your full report" offer → Name + email capture (with optional marketing opt-in) → Sent screen
→ hermes.exoasia.org. The Full Money DNA Report PDF is delivered **only by email (and Hermes)**; quiz takers can never download it from this site (signed-in admins can, from /admin).

## Stack
- Next.js 15 (App Router, React 19, TypeScript), plain CSS (`app/globals.css`), `next/font` (Bricolage Grotesque + DM Sans)
- Supabase Postgres via **server-only** service-role client (`lib/supabase-admin.ts`)
- Resend REST API for the profile email (`lib/email.ts`), optional
- Docker (`output: 'standalone'`) → deployed by Coolify from GitHub

## Map
| Path | Purpose |
| --- | --- |
| `lib/quiz-data.ts` | **All content**: questions + scoring keys, interstitial quotes/stats, profile fields, type copy |
| `lib/scoring.ts` | Scoring (shared by client and server). Ties resolve D→I→S→C |
| `lib/validation.ts` | Profile/email validation (server re-validates everything) |
| `components/Quiz.tsx` | The whole client flow as one state machine (`view` + indices) |
| `app/api/responses/route.ts` | `POST` — save completed quiz, recompute scores, return `id` |
| `app/api/responses/[id]/route.ts` | `PATCH` — attach full name + email + opt-in (once, within 2h), send profile email with the report PDF attached |
| `app/api/report/[id]/route.ts` | Dev only: `/api/report/sample?type=D&view` renders a sample report. Always 404 in production |
| `lib/report-content.ts` | Report text per type, adapted from book chapters 4–7, plus the "About Money DNA" intro |
| `lib/report-pdf.tsx` | The PDF layout (`@react-pdf/renderer`); fonts and avatars in `public/report/` |
| `app/api/health/route.ts` | Health check for Coolify / Docker |
| `app/admin/` | Admin at `/admin`: login, dashboard (analytics per profile and quiz question), submissions table + detail, CSV export (`/api/admin/export`), per-person report PDF (`/api/admin/report/[id]`, admin only, and only for submissions with a full name and email) |
| `lib/admin-auth.ts` / `lib/admin-data.ts` | Admin session (single `ADMIN_PASSWORD`, signed HttpOnly cookie, 8h) and the queries/aggregation behind the dashboard |
| `supabase/migrations/*.sql` | Table `quiz_responses` + view `money_dna_leads` |

## Data & privacy rules (do not break)
- RLS is ON with **no policies**; the browser never talks to Supabase directly. Never expose `SUPABASE_SERVICE_ROLE_KEY` or add `NEXT_PUBLIC_` to it.
- Marketing opt-in is **unchecked by default** and optional; the profile email is sent either way. Store `opt_in_at` and `consent_version`; bump `CONSENT_VERSION` whenever the consent wording changes.
- Never put email or other PII in URLs (the Hermes link only carries UTM params).
- Philippine Data Privacy Act (RA 10173) applies: a real privacy notice must be linked via `NEXT_PUBLIC_PRIVACY_URL` before launch.
- The server ignores client-sent scores and recomputes them.
- `/admin` shows names and emails. It requires `ADMIN_PASSWORD` (unset = admin disabled); every admin page calls `requireAdmin()` and every admin API checks `isAdminRequest()`. Pages are `noindex`.
- **One assessment per email.** A second assessment with a used email gets "That email is already associated with a previous assessment." (409). Enforced in the PATCH route and by the unique index on `lower(email)`. The repeat email gets its **original** report re-sent to that inbox, **once per email ever** (`report_resent_at`, claimed atomically; released if the send fails). The original result is never shown in the browser.

## Commands
```bash
npm install
cp .env.example .env.local   # fill in Supabase (and Resend) values
npm run dev                  # http://localhost:3000
npm run typecheck && npm run build
docker build -t money-dna . && docker run -p 3000:3000 --env-file .env.local money-dna
```

## Open TODOs (priority order)
1. **Type copy** — replace `summary` / `stuck` / `move` in `TYPES` (`lib/quiz-data.ts`) with final wording from the book chapters.
2. **Privacy policy URL** and Resend sender domain (verify `exoasia.org` in Resend; set `EMAIL_FROM`).
3. **Hermes handoff** — decide whether Hermes should receive the result (e.g. a signed token or a server-to-server call keyed by response id) so "your full profile is waiting in Hermes" is literally true. Today the link only carries UTMs.
4. Email typo hint ("Did you mean gmail.com?") on the email screen.
5. Blend detection (second score within 3 points → blend name: Promoter, Strategist, Host, Conservator) per the questionnaire's reading guide.
6. Use the `worries` answers on the results/email ("Your top worry: …" + a type-specific next step).
7. Rate limiter is in-memory (single container). Move to Redis/Upstash if Coolify runs >1 replica.
8. Analytics events (start, profile done, each interstitial, completion, email submit, Hermes click).
9. OG image for social sharing (`app/opengraph-image.tsx`).

## Report PDF notes
- Keep `serverExternalPackages` and `outputFileTracingIncludes` (pdfkit font data) in `next.config.mjs`, or the PDF fails in the standalone Docker build.
- Avoid the react-pdf `break` prop; it crashed layout for some content lengths. New pages are separate `<Page>` elements.
- Fonts are Latin-only WOFF subsets, so the ₱ sign won't render in the PDF; write "PHP" instead.

## Style rules
- Colours/tokens are CSS variables at the top of `globals.css`. Type colours: D `#F26B4B`, I `#F5B841`, S `#3CC3A8`, C `#6F9BF2`.
- **No scrolling, ever** (public quiz). Every quiz screen must fit a 375 × 667 phone (iPhone SE) without scrolling down. If content doesn't fit, split it into more screens; don't cut it. The `/admin` area is exempt.
- Keep it one column, max-width 480px, touch targets ≥ 44px, visible focus, `prefers-reduced-motion` respected.
- Copy is sentence case, plain verbs. Book quotes are attributed "Mack Comandante, *Money DNA*".
