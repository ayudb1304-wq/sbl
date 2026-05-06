# SBL — Testing Guide

End-to-end manual test plan for SBL 2026, organized by user persona. Use this to walk through the app before tournament day, after major changes, or whenever onboarding a new tester.

---

## Setup

### One-time
```bash
npm install
cp .env.example .env.local   # paste Supabase keys
```

Make sure these are set in `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SITE_URL` (e.g. `http://localhost:3000`)

In **Supabase Dashboard → Authentication → URL Configuration → Redirect URLs**, allow:
- `http://localhost:3000/**`
- `https://sbl.vercel.app/**` (when deployed)

### Reset to a clean tournament
```bash
npm run seed:2026 -- --force
```
Wipes SBL 2026 entirely and re-imports `data/SBL_2026_Fixtures.xlsx`. Result: 44 teams, 88 players, 99 matches (all `scheduled`), 0 scores entered.

### Jump to mid-tournament for UI testing
```bash
npm run demo:simulate
```
After a fresh seed, this brings the app to a realistic "early afternoon" state:

- All MI and W group matches **completed** with realistic scores
- Most MB group matches **completed**, plus one **in_progress** (partial score) and one **walkover**
- Group qualifiers **confirmed** for every group → bracket resolved → QFs have real teams
- **2 of 4 MB QFs completed** + 1 MB QF **in_progress** (live)
- 2 of 4 MI QFs completed
- 1 of 2 Women's SFs completed → Women's Final auto-populates with the winner
- Season status flipped to `live`

To go back to a clean state, re-run the seed command above.

### Run the dev server
```bash
npm run dev
# http://localhost:3000
```
Use Chrome DevTools' device toolbar to test mobile layout.

---

## Personas

### 1. Participant (no account)

**Goal**: A player or spectator browses the tournament without signing in. Should see live scores, standings, brackets, and find their team / matches easily.

| # | Action | Expected |
|---|---|---|
| P-1 | Open `/` | Hero shows season name + match counts (total / completed / live). "Live now", "Up next", and "Recent results" sections render. Per-category mini-standings card per category. |
| P-2 | Click MB → MI → W in top nav | Each category page shows all groups with standings + fixture cards. Top 2 highlighted in green. |
| P-3 | Click into a group | Group detail: standings table, list of teams (with players), all match cards. Status tints visible (red=live, green=done). |
| P-4 | Click a team | Team detail: players list (each is a link), all fixtures the team has. Breadcrumb at top. |
| P-5 | Click a player | Cross-season tournament history page. |
| P-6 | Open a live match | Live score updates without refresh (open in 2 tabs and have someone else change a score → it should propagate within 1–2 sec). |
| P-7 | `/courts/3` | Court schedule + currently playing on that court. Court chip selector lets you switch courts. |
| P-8 | `/bracket/MB` | Visual bracket with QF → SF → F. Resolved matches show real names; unresolved feeders show "MB-A Winner" etc. |
| P-9 | Resize to phone width (<1024 px) | Top nav collapses; hamburger appears. Tap hamburger → slide-in sidebar with Tournament / Brackets / Courts sections. Backdrop dims, body scroll locked. ESC / tap-outside / route change closes it. |
| P-10 | Try `/admin` or `/scorer` | Redirects to `/login`. (No participant account, no access.) |

**Status colors to verify on cards:**
- Scheduled → plain
- Live → red wash + pulsing LIVE pill
- Completed → green wash + FT pill
- Walkover → amber wash + W/O pill

---

### 2. Scorer (logged in)

**Goal**: Tournament-day scorer enters scores on a tablet/laptop. Should be fast, hard to mess up, and obvious when something is wrong.

**Login**: scorer email is whitelisted in `allowed_users` (currently `ayucorp1304@gmail.com`).

| # | Action | Expected |
|---|---|---|
| S-1 | `/login` → enter scorer email → submit | Magic link sent (check inbox). Click link → routed to `/scorer`. |
| S-2 | `/scorer` dashboard | Match list with court / category / status filter chips. Tap any chip → URL updates and list filters. |
| S-3 | Tap a scheduled match | Score entry page. Two big score columns (team A / team B), `+`/`−` buttons, number input. Walkover, winner, reset buttons. |
| S-4 | Tap `+` on team A | Score increments by 1 immediately (optimistic), persisted to DB, audit log entry created. |
| S-5 | Type a score in the number input | Value held locally until you blur (Tab) or press Enter. Then it commits. Esc reverts. |
| S-6 | After scores entered, click "End game N" | Game marked complete (green border), inputs locked for that game. |
| S-7 | Click "Winner: <Team>" | Match status flips to `completed`, winner team name is bold. Card on every other page now shows green tint. |
| S-8 | Click "Walkover…" → pick winner + reason → confirm | Match status `walkover`, amber card, reason saved. |
| S-9 | Click "Reset match" | All games back to 0-0 pending, match `scheduled`, winner cleared. Confirmation prompt before resetting. |
| S-10 | Open the same match in a 2nd tab + change score | Other tab updates within 1–2 sec via realtime. The actively-typing user's draft survives until they blur. |
| S-11 | Try a KO match whose feeders haven't resolved | "Waiting on feeder matches" banner appears. Score entry hidden. |
| S-12 | Try to score a locked match | Friendly "Match is locked, ask an admin to unlock" error. (Admin can override; scorer cannot.) |

---

### 3. Admin (logged in)

**Goal**: Admin runs the tournament. Confirms qualifiers, advances brackets, fixes scoring mistakes, manages users and seasons.

**Login**: admin emails currently whitelisted are `abhiogade@gmail.com` and `yeshj2009@gmail.com`. Admins can do everything a scorer can plus admin-only actions.

| # | Action | Expected |
|---|---|---|
| A-1 | Sign in as admin | After magic link, routed to `/admin`. Top of page shows tournament stats: total matches, scheduled / live / done counts, groups confirmed, locked matches. |
| A-2 | Click `/admin/categories/MB` | Per-group standings + qualifier picker. Defaults pre-filled from live ranking. Override only if a toss decided a tie. |
| A-3 | Confirm qualifiers for a group | Top-2 locked. Banner turns green. Bracket resolver runs immediately — KO match team slots fill in if all upstream feeders are now resolved. |
| A-4 | "Lock all group matches" for a group | Every match in that group gets `locked=true`. Scorers see lock-banner; admin can still edit. |
| A-5 | Click "Resolve MB bracket" | Walks the resolver explicitly. Toast shows N slots resolved. Idempotent — re-clicking shows 0 if nothing has changed since. |
| A-6 | Open `/admin/match/[id]` | Lock toggle visible. Audit log shows every score event with timestamp, action, actor role, score deltas, notes. |
| A-7 | Edit a `completed` match's score | Force-edit works (scorer's view would have inputs disabled). Update propagates everywhere; audit log records the correction. |
| A-8 | Click "Unlock match" | `locked` flag flips off. Scorer can now edit. |
| A-9 | `/admin/users` | List of allowed users. Add a new email + role. Change a role (auto-syncs to existing profile if user has logged in). Remove. |
| A-10 | `/admin/seasons` | Create a new season (e.g., "SBL 2027" / year 2027). It appears in the table. Click "Set active" → it becomes the active season; old season's `is_active` flips off. The new season has no fixtures yet — you'd need a seeder script for it. |
| A-11 | Score a QF match → check the SF | When a QF winner is set, the corresponding SF's team slot auto-fills (no manual resolve click needed). Same for SF → Final. |

---

## Demo flow — full smoke test in 5 minutes

```bash
npm run seed:2026 -- --force
npm run demo:simulate
npm run dev
```

Then in the browser:

1. `/` — verify hero shows roughly 60-70% completion, live count > 0.
2. `/categories/MB` — most groups have all matches completed; 1 group has an in_progress + walkover row.
3. `/groups/[any MB group id]` — standings show real wins/losses, top 2 highlighted green, qualifier badge visible.
4. `/bracket/MB` — QF column has real team names. 2 QFs are green (done), 1 is red (live). Their respective SFs show one resolved team and one feeder placeholder.
5. `/bracket/W` — Final column has one resolved team (the winner of the completed SF) and one "SF2 Winner" placeholder.
6. Login as admin (`abhiogade@gmail.com` or `yeshj2009@gmail.com`).
7. `/admin` — overview reflects the simulated state.
8. `/admin/categories/MB` — all groups show "Qualifiers locked" green banner.
9. `/scorer` (or `/admin/match/<live MB QF id>`) — finish the in_progress QF → check `/bracket/MB` immediately to confirm the SF auto-advanced.
10. Reset: `npm run seed:2026 -- --force` brings everything back to scheduled.

---

## Common edge cases to test

- **Realtime resilience**: kill the dev server with a match open, restart → page should resubscribe and resume getting updates.
- **Concurrent scorers**: two tabs entering different scores on different matches → no interference, each updates independently.
- **Magic link expiry**: leave a magic link unclicked for >24 hours → login shows error; user can request a new link.
- **Walkover after scores entered**: enter a couple of game scores, then click Walkover → match should still mark walkover with reason, scores preserved in audit log.
- **Toss tie-break**: simulate two MB-A teams ending 4-1 with same set/point diff → standings show TOSS badge → admin must use the qualifier picker to choose 1st/2nd manually.
- **Locked match**: scorer attempts to update → error toast. Admin opens same match → can edit freely.
- **Mobile drawer**: open on phone, scroll inside drawer when it's tall, swipe doesn't dismiss accidentally.
- **Dark mode**: toggle OS dark mode → all colors adapt, status tints still distinguishable.

---

## Bug reporting

If you find an issue, capture:
1. What you expected
2. What happened
3. URL / persona / which match
4. Browser + viewport size
5. Terminal output (if dev server) or Vercel function-log digest

Drop it in the repo's GitHub Issues or share with the team directly.
