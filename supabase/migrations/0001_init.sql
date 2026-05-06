-- SBL tournament schema — multi-year, doubles badminton league
-- All domain rows are season-scoped via season_id.

-- ========== Enums ==========
do $$ begin create type season_status as enum ('upcoming','live','completed'); exception when duplicate_object then null; end $$;
do $$ begin create type match_stage   as enum ('group','qf','sf','final');     exception when duplicate_object then null; end $$;
do $$ begin create type match_status  as enum ('scheduled','in_progress','completed','walkover','cancelled'); exception when duplicate_object then null; end $$;
do $$ begin create type game_status   as enum ('pending','in_progress','completed'); exception when duplicate_object then null; end $$;
do $$ begin create type score_action  as enum ('score_update','set_winner','walkover','reset','correction'); exception when duplicate_object then null; end $$;
do $$ begin create type user_role     as enum ('admin','scorer','none'); exception when duplicate_object then null; end $$;

-- ========== Helpers ==========
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ========== seasons ==========
create table if not exists seasons (
  id uuid primary key default gen_random_uuid(),
  year int not null unique,
  name text not null,
  status season_status not null default 'upcoming',
  is_active boolean not null default false,
  starts_at timestamptz,
  ends_at timestamptz,
  branding jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists seasons_one_active_idx on seasons (is_active) where is_active = true;
drop trigger if exists seasons_updated_at on seasons;
create trigger seasons_updated_at before update on seasons for each row execute function set_updated_at();

-- ========== categories ==========
create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references seasons(id) on delete cascade,
  code text not null,           -- 'MB','MI','W'
  name text not null,
  group_format jsonb not null,  -- {games:1, points_to:15, cap:null}
  ko_format jsonb not null,     -- {best_of:3, points_to:21, cap:30}
  has_qf boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (season_id, code)
);

-- ========== groups ==========
create table if not exists groups (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references categories(id) on delete cascade,
  code text not null,           -- 'A','B','C','D'
  name text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (category_id, code)
);

-- ========== players (cross-season identity) ==========
create table if not exists players (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  company text,
  email text,
  created_at timestamptz not null default now(),
  unique (full_name, company)
);

-- ========== teams (per-season) ==========
create table if not exists teams (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references seasons(id) on delete cascade,
  category_id uuid not null references categories(id) on delete cascade,
  group_id uuid references groups(id) on delete set null,
  name text not null,
  seed int,
  company text,
  created_at timestamptz not null default now(),
  unique (season_id, category_id, name)
);

create table if not exists team_players (
  team_id uuid not null references teams(id) on delete cascade,
  player_id uuid not null references players(id) on delete restrict,
  primary key (team_id, player_id)
);

-- ========== matches ==========
create table if not exists matches (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references seasons(id) on delete cascade,
  category_id uuid not null references categories(id) on delete cascade,
  stage match_stage not null,
  round_label text not null,
  group_id uuid references groups(id) on delete set null,
  court text,
  scheduled_at timestamptz,
  duration_minutes int,
  team_a_id uuid references teams(id) on delete set null,
  team_b_id uuid references teams(id) on delete set null,
  team_a_source jsonb,
  team_b_source jsonb,
  status match_status not null default 'scheduled',
  winner_team_id uuid references teams(id) on delete set null,
  walkover_reason text,
  notes text,
  locked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (team_a_id is null or team_b_id is null or team_a_id <> team_b_id),
  check (winner_team_id is null or winner_team_id = team_a_id or winner_team_id = team_b_id)
);
create index if not exists matches_season_idx on matches(season_id);
create index if not exists matches_category_idx on matches(category_id);
create index if not exists matches_group_idx on matches(group_id);
create index if not exists matches_court_time_idx on matches(court, scheduled_at);
create index if not exists matches_status_idx on matches(status);
drop trigger if exists matches_updated_at on matches;
create trigger matches_updated_at before update on matches for each row execute function set_updated_at();

-- ========== games ==========
create table if not exists games (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references matches(id) on delete cascade,
  game_number int not null check (game_number between 1 and 3),
  team_a_score int not null default 0 check (team_a_score >= 0),
  team_b_score int not null default 0 check (team_b_score >= 0),
  status game_status not null default 'pending',
  started_at timestamptz,
  completed_at timestamptz,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  unique (match_id, game_number)
);
create index if not exists games_match_idx on games(match_id);
drop trigger if exists games_updated_at on games;
create trigger games_updated_at before update on games for each row execute function set_updated_at();

-- ========== score_events (audit log) ==========
create table if not exists score_events (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references matches(id) on delete cascade,
  game_id uuid references games(id) on delete set null,
  prev_a int, prev_b int,
  new_a int, new_b int,
  action score_action not null,
  actor_id uuid references auth.users(id) on delete set null,
  actor_role user_role,
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists score_events_match_idx on score_events(match_id);
create index if not exists score_events_created_idx on score_events(created_at desc);

-- ========== auth: allowed_users + profiles ==========
create table if not exists allowed_users (
  email text primary key,
  role user_role not null default 'scorer',
  created_at timestamptz not null default now()
);

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text,
  role user_role not null default 'none',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
drop trigger if exists profiles_updated_at on profiles;
create trigger profiles_updated_at before update on profiles for each row execute function set_updated_at();

-- Auto-create profile when a user signs up via magic link, role from allowed_users
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_role user_role;
begin
  select role into v_role from allowed_users where lower(email) = lower(new.email);
  insert into profiles (id, email, role)
  values (new.id, new.email, coalesce(v_role, 'none'::user_role))
  on conflict (id) do update set role = excluded.role, email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ========== standings view ==========
-- Per-team stats per group, computed from completed/walkover group-stage matches.
-- Walkovers count as wins (2 pts) but contribute 0 to set/point differentials.
-- H2H tie-break is applied in application code over this view's output.
create or replace view standings_view as
with per_match as (
  select
    m.season_id,
    m.category_id,
    m.group_id,
    t.team_id,
    case when m.winner_team_id = t.team_id then 1 else 0 end as is_win,
    case when m.winner_team_id is not null and m.winner_team_id <> t.team_id then 1 else 0 end as is_loss,
    coalesce(sum(case when t.is_team_a then
      case when g.status = 'completed' and g.team_a_score > g.team_b_score then 1 else 0 end
    else
      case when g.status = 'completed' and g.team_b_score > g.team_a_score then 1 else 0 end
    end), 0) as sets_won,
    coalesce(sum(case when t.is_team_a then
      case when g.status = 'completed' and g.team_b_score > g.team_a_score then 1 else 0 end
    else
      case when g.status = 'completed' and g.team_a_score > g.team_b_score then 1 else 0 end
    end), 0) as sets_lost,
    coalesce(sum(case when t.is_team_a then g.team_a_score else g.team_b_score end), 0) as points_for,
    coalesce(sum(case when t.is_team_a then g.team_b_score else g.team_a_score end), 0) as points_against
  from matches m
  cross join lateral (values (m.team_a_id, true), (m.team_b_id, false)) as t(team_id, is_team_a)
  left join games g on g.match_id = m.id
  where m.stage = 'group'
    and m.status in ('completed','walkover')
    and t.team_id is not null
  group by m.id, m.season_id, m.category_id, m.group_id, t.team_id, t.is_team_a, m.winner_team_id
)
select
  season_id,
  category_id,
  group_id,
  team_id,
  count(*)::int as matches_played,
  sum(is_win)::int as wins,
  sum(is_loss)::int as losses,
  (sum(is_win) * 2)::int as points,
  sum(sets_won)::int as sets_won,
  sum(sets_lost)::int as sets_lost,
  (sum(sets_won) - sum(sets_lost))::int as set_diff,
  sum(points_for)::int as points_for,
  sum(points_against)::int as points_against,
  (sum(points_for) - sum(points_against))::int as point_diff
from per_match
group by season_id, category_id, group_id, team_id;

-- ========== Row Level Security ==========
alter table seasons        enable row level security;
alter table categories     enable row level security;
alter table groups         enable row level security;
alter table players        enable row level security;
alter table teams          enable row level security;
alter table team_players   enable row level security;
alter table matches        enable row level security;
alter table games          enable row level security;
alter table score_events   enable row level security;
alter table profiles       enable row level security;
alter table allowed_users  enable row level security;

-- Public read on tournament data
create policy "read seasons"      on seasons      for select to anon, authenticated using (true);
create policy "read categories"   on categories   for select to anon, authenticated using (true);
create policy "read groups"       on groups       for select to anon, authenticated using (true);
create policy "read players"      on players      for select to anon, authenticated using (true);
create policy "read teams"        on teams        for select to anon, authenticated using (true);
create policy "read team_players" on team_players for select to anon, authenticated using (true);
create policy "read matches"      on matches      for select to anon, authenticated using (true);
create policy "read games"        on games        for select to anon, authenticated using (true);
create policy "read score_events" on score_events for select to authenticated using (true);
create policy "read own profile"  on profiles     for select to authenticated using (id = auth.uid());
-- allowed_users: no policies → only service-role can access. profiles writes also restricted to service-role.
-- All mutations to tournament data flow through server-side code using the service-role key,
-- which bypasses RLS. This keeps the policy surface minimal.
