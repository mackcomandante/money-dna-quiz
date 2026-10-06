-- When the original report was re-sent to a repeat email. Only one re-send is allowed per email.
alter table public.quiz_responses add column if not exists report_resent_at timestamptz;
