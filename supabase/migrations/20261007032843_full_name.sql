-- Full name, collected with the email on the report step.
alter table public.quiz_responses add column if not exists full_name text;

-- Add full_name to the marketing export of opted-in leads.
drop view if exists public.money_dna_leads;
create view public.money_dna_leads with (security_invoker = true) as
  select id, created_at, full_name, email, primary_type, score_d, score_i, score_s, score_c,
         age_range, employment, financially_free, worries, opt_in_at, consent_version,
         utm_source, utm_medium, utm_campaign
  from public.quiz_responses
  where email is not null and email_opt_in = true;

revoke all on public.money_dna_leads from anon, authenticated;
