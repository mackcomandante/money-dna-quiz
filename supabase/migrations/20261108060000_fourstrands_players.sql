-- Four Strands players: one row per Google account, holding that player's saved game.
-- Only the server (service role) reads or writes it: RLS is on with no policies, like quiz_responses.
create table if not exists public.fourstrands_players (
  google_sub    text primary key,              -- Google's stable account id ("sub" in the ID token)
  email         text not null,
  name          text,
  picture       text,
  created_at    timestamptz not null default now(),
  last_seen_at  timestamptz not null default now(),
  save          jsonb,                         -- the game state; null until the first save
  save_version  integer not null default 0,    -- bumped on every save, to catch two phones writing at once
  saved_at      timestamptz
);

create index if not exists fourstrands_players_email_idx on public.fourstrands_players (lower(email));

alter table public.fourstrands_players enable row level security;
