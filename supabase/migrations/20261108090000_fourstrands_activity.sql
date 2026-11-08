-- Four Strands daily activity: one row per player (or guest phone) per Manila day, for the admin dashboard.
-- actor = Google sub for signed-in players, 'g:<random device id>' for guests. No names or emails here.
create table if not exists public.fourstrands_activity (
  day          date not null,
  actor        text not null,
  signed_in    boolean not null default false,
  device       text,                          -- the phone's random id, to see guests who later sign up
  first_at     timestamptz not null default now(),
  last_at      timestamptz not null default now(),
  pings        integer not null default 1,
  turns_total  integer,                       -- the game's lifetime turn count at the last ping that day
  snapshot     jsonb,                         -- small game summary: type, age, streak, levels, coins…
  primary key (day, actor)
);
create index if not exists fourstrands_activity_actor_idx on public.fourstrands_activity (actor, day);

alter table public.fourstrands_activity enable row level security;

-- One call per ping: creates today's row or updates it. Only the server (service role) may call it.
create or replace function public.fourstrands_touch(p_actor text, p_signed_in boolean, p_device text, p_turns integer, p_snapshot jsonb)
returns void language sql security invoker set search_path = '' as $$
  insert into public.fourstrands_activity (day, actor, signed_in, device, turns_total, snapshot)
  values ((now() at time zone 'Asia/Manila')::date, p_actor, p_signed_in, p_device, p_turns, p_snapshot)
  on conflict (day, actor) do update set
    last_at = now(),
    pings = public.fourstrands_activity.pings + 1,
    signed_in = public.fourstrands_activity.signed_in or excluded.signed_in,
    device = coalesce(excluded.device, public.fourstrands_activity.device),
    turns_total = coalesce(excluded.turns_total, public.fourstrands_activity.turns_total),
    snapshot = coalesce(excluded.snapshot, public.fourstrands_activity.snapshot);
$$;
revoke execute on function public.fourstrands_touch(text, boolean, text, integer, jsonb) from public, anon, authenticated;
