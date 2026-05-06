-- M4 admin: per-group qualifier picks (manual override for toss case)
-- and the columns the bracket resolver reads from.

alter table groups
  add column if not exists qualifier_1_team_id uuid references teams(id) on delete set null,
  add column if not exists qualifier_2_team_id uuid references teams(id) on delete set null,
  add column if not exists qualifiers_locked boolean not null default false;

-- (No backfill — admin will pick qualifiers via the dashboard.)
