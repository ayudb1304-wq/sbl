# SBL — Sysfore Badminton League

Tournament tracking app for the Sysfore Badminton League (SBL 2026 onwards). Multi-year by design — every domain row is `season_id`-scoped, so SBL 2027 is a new season insert plus a fresh fixture seed.

## Stack

- **Next.js 16** (App Router, TS, Tailwind 4) on Vercel → `sbl.vercel.app`
- **Supabase**: Postgres, Auth (magic-link for admins/scorers), Realtime (live score push)
- Public read access for participants — no account required

## Setup

```bash
npm install
cp .env.example .env.local   # then fill in Supabase keys
```

## Database

Migrations live in `supabase/migrations/`. Apply via the Supabase MCP `apply_migration` tool or `supabase db push`.

| Table | Purpose |
| --- | --- |
| `seasons` | One row per year (SBL 2026, 2027, ...) |
| `categories` | MB / MI / W per season, with format rules in JSONB |
| `groups` | Group A/B/C/D per category |
| `players` | Cross-season identity (deduped on full_name+company) |
| `teams` | Per-season; FK to category + group |
| `team_players` | Composite link |
| `matches` | Group + KO; KO uses `team_a_source`/`team_b_source` JSONB feeders |
| `games` | One row per game in a match (1 for group, 3 for KO) |
| `score_events` | Audit log of every score mutation |
| `allowed_users` | Whitelist of admin/scorer emails |
| `profiles` | Auto-populated from `auth.users` via trigger; role from `allowed_users` |
| `standings_view` | Live per-team stats per group |

## Seed SBL 2026 fixtures

```bash
npm run seed:2026                # safe — refuses if season already populated
npm run seed:2026 -- --force     # destructive — wipes SBL 2026 then reseeds
```

Source: `data/SBL_2026_Fixtures.xlsx`. Produces 44 teams, 88 players, 99 matches (82 group + 17 KO), 133 games.

## Roadmap

- M2 — Public read pages (home, category, group, team, match, court, bracket)
- M3 — Auth + scorer flow
- M4 — Admin: standings lock, bracket auto-advancement, score corrections
- M5 — Branding + responsive QA
