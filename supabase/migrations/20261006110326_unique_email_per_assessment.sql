-- One assessment (and one report) per email address, case-insensitive.
drop index if exists public.quiz_responses_email_idx;
create unique index if not exists quiz_responses_email_unique_idx
  on public.quiz_responses (lower(email))
  where email is not null;
