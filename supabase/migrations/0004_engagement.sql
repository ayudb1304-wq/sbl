-- Participant engagement: cheers, predictions, display-name profiles.
-- All tied to a localStorage UUID (text) — no auth.users required.

do $$ begin create type cheer_type as enum ('clap','fire'); exception when duplicate_object then null; end $$;

-- A device's display name (optional; surfaces them on prediction leaderboard).
create table if not exists participant_profiles (
  device_id text primary key,
  display_name text not null check (length(display_name) between 1 and 40),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
drop trigger if exists participant_profiles_updated_at on participant_profiles;
create trigger participant_profiles_updated_at before update on participant_profiles
  for each row execute function set_updated_at();

-- Anonymous cheers — one row per tap. Aggregate via count() per match+type.
create table if not exists cheers (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references matches(id) on delete cascade,
  device_id text not null,
  cheer_type cheer_type not null,
  created_at timestamptz not null default now()
);
create index if not exists cheers_match_idx on cheers(match_id);
create index if not exists cheers_match_type_idx on cheers(match_id, cheer_type);

-- One pick per device per KO match. Scoring done in app code.
create table if not exists predictions (
  device_id text not null,
  match_id uuid not null references matches(id) on delete cascade,
  predicted_team_id uuid not null references teams(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (device_id, match_id)
);
create index if not exists predictions_match_idx on predictions(match_id);
drop trigger if exists predictions_updated_at on predictions;
create trigger predictions_updated_at before update on predictions
  for each row execute function set_updated_at();

-- RLS: public read on all three; writes go through server actions (which use
-- service-role and validate constraints — e.g., predictions only before match start).
alter table participant_profiles enable row level security;
alter table cheers enable row level security;
alter table predictions enable row level security;

create policy "read participant_profiles" on participant_profiles for select to anon, authenticated using (true);
create policy "read cheers" on cheers for select to anon, authenticated using (true);
create policy "read predictions" on predictions for select to anon, authenticated using (true);
