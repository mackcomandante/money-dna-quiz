-- Money DNA quiz responses
create extension if not exists pgcrypto;

create table if not exists public.quiz_responses (
  id                  uuid primary key default gen_random_uuid(),
  created_at          timestamptz not null default now(),

  -- profile (pre-quiz)
  gender              text not null,
  age_range           text not null,
  marital_status      text not null,
  education           text not null,
  employment          text not null,
  dependents          text not null,
  financially_free    text not null,
  balance_happiness   smallint not null check (balance_happiness between 1 and 5),
  worries             text[] not null default '{}',

  -- quiz
  answers             smallint[] not null check (array_length(answers, 1) = 20),
  score_d             smallint not null,
  score_i             smallint not null,
  score_s             smallint not null,
  score_c             smallint not null,
  primary_type        char(1) not null check (primary_type in ('D', 'I', 'S', 'C')),

  -- email capture + consent
  email               text,
  email_submitted_at  timestamptz,
  email_sent_at       timestamptz,
  email_opt_in        boolean not null default false,
  opt_in_at           timestamptz,
  consent_version     text,

  -- attribution
  utm_source          text,
  utm_medium          text,
  utm_campaign        text,
  referrer            text,
  user_agent          text
);

create index if not exists quiz_responses_created_at_idx on public.quiz_responses (created_at desc);
create index if not exists quiz_responses_email_idx on public.quiz_responses (lower(email)) where email is not null;
create index if not exists quiz_responses_primary_type_idx on public.quiz_responses (primary_type);

-- Lock the table down: RLS on, no policies. Only the server (service role) can read/write.
alter table public.quiz_responses enable row level security;
revoke all on public.quiz_responses from anon, authenticated;

-- Handy view for marketing exports: opted-in leads only.
create or replace view public.money_dna_leads with (security_invoker = true) as
  select id, created_at, email, primary_type, score_d, score_i, score_s, score_c,
         age_range, employment, financially_free, worries, opt_in_at, consent_version,
         utm_source, utm_medium, utm_campaign
  from public.quiz_responses
  where email is not null and email_opt_in = true;

revoke all on public.money_dna_leads from anon, authenticated;
