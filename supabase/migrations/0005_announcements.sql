-- Notice board: a single active announcement at a time, posted by admins,
-- shown as a banner across every page.

do $$ begin
  create type announcement_tone as enum ('info','success','warning','urgent');
exception when duplicate_object then null;
end $$;

create table if not exists announcements (
  id uuid primary key default gen_random_uuid(),
  message text not null check (length(trim(message)) between 1 and 280),
  tone announcement_tone not null default 'info',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- At most one active announcement at any time
create unique index if not exists announcements_one_active_idx
  on announcements (is_active) where is_active = true;

drop trigger if exists announcements_updated_at on announcements;
create trigger announcements_updated_at before update on announcements
  for each row execute function set_updated_at();

alter table announcements enable row level security;
create policy "read announcements" on announcements for select to anon, authenticated using (true);
