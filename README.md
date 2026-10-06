# Money DNA Quiz

The web app for the Money DNA Quiz. Next.js 15 · Supabase · Resend · Docker/Coolify.
See **CLAUDE.md** for architecture, rules and the TODO list.

## 1. GitHub
```bash
git init && git add . && git commit -m "Money DNA quiz v1"
git branch -M main
git remote add origin git@github.com:<you>/money-dna-quiz.git
git push -u origin main
```

## 2. Supabase
1. Create a project (Singapore region is closest to PH).
2. Run the migration — either paste `supabase/migrations/20261006053640_quiz_responses.sql` into **SQL Editor → Run**, or with the CLI:
   ```bash
   supabase link --project-ref <ref>
   supabase db push
   ```
3. Copy **Project URL** and the **service_role** key (Settings → API). Server-side only.

Export opted-in leads anytime: `select * from money_dna_leads order by created_at desc;`

## 3. Resend (optional but recommended)
1. Add and verify the sending domain (e.g. `exoasia.org`).
2. Create an API key. Without it, answers are still saved but no email goes out.

## 4. Coolify
1. **New Resource → Application → GitHub** (via the GitHub App or a deploy key), pick the repo and `main`.
2. **Build pack: Dockerfile.** Port **3000**. Health check path `/api/health`.
3. **Environment variables** (from `.env.example`):
   - Runtime: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_REPLY_TO`, `CONSENT_VERSION`
   - Build **and** runtime (tick "Build Variable"): `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_HERMES_URL`, `NEXT_PUBLIC_PRIVACY_URL`
4. Set the domain (e.g. `https://moneydna.exoasia.org`) and deploy. Enable auto-deploy on push.

## Local development
```bash
npm install
cp .env.example .env.local
npm run dev
```

## Editing content
Everything users read lives in `lib/quiz-data.ts`: questions, scoring keys, the quote/statistic
interstitials, profile questions and type descriptions.
