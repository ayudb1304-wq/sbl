-- Champion picks: per-device prediction of each category's eventual winner.
-- Pickable any time before that category's Final goes live. Worth 4 pts.

create table if not exists champion_picks (
  device_id text not null,
  season_id uuid not null references seasons(id) on delete cascade,
  category_id uuid not null references categories(id) on delete cascade,
  predicted_team_id uuid not null references teams(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (device_id, season_id, category_id)
);
create index if not exists champion_picks_season_cat_idx on champion_picks(season_id, category_id);

drop trigger if exists champion_picks_updated_at on champion_picks;
create trigger champion_picks_updated_at before update on champion_picks
  for each row execute function set_updated_at();

alter table champion_picks enable row level security;
create policy "read champion_picks" on champion_picks for select to anon, authenticated using (true);
