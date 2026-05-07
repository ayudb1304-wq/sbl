# SBL Load Test

Tool for finding the breaking point of the app on a given Supabase + Vercel tier *before* tournament day.

## What it does

Spawns N concurrent simulated users, each of which:

1. **Subscribes to a per-match Supabase Realtime channel** (mirrors what `/matches/[id]` does in the browser).
2. **Polls the marquee endpoint, opens random pages, and posts cheers** in a 1–4-second loop, with weighted action mix:
   - 45% marquee polls
   - 20% home page
   - 15% match detail page
   - 10% category page
   - 10% cheer post

All against the live deployment (or local dev). It does **not** exercise admin/scorer mutations.

## Quick start

```bash
# Local dev server
npm run dev   # in another terminal

# Run a 60-second test with 250 users, ramped in over 30s × 250 = 7.5s
LOAD_USERS=250 LOAD_DURATION_S=60 SITE=http://localhost:3000 npm run loadtest

# Or against your Vercel preview / prod
LOAD_USERS=250 LOAD_DURATION_S=120 SITE=https://sbl.vercel.app npm run loadtest
```

## Env knobs

| Variable | Default | What it does |
|---|---|---|
| `LOAD_USERS` | `250` | Concurrent simulated users |
| `LOAD_DURATION_S` | `60` | How long each user runs after ramp completes |
| `LOAD_RAMP_MS` | `30` | Stagger between user starts (avoid thundering herd) |
| `SITE` | `http://localhost:3000` | Target origin |

The test pulls Supabase URL + anon key from `.env.local`.

## Reading the output

```
Peak realtime channels:  198 (Supabase free tier cap: 200)

Action        |    OK   FAIL   p50ms   p95ms   p99ms
------------------------------------------------------------
pageHome      |   412      8     145     680    1240
pageMatch     |   183      0      90     320     510
pageCategory  |    98      2     200     710    1100
marquee       |   742      3      35     180     310
cheer         |    52      1      80     220     390
rtSubscribe   |   245      5     110     420     850
```

### What to look for

- **`Peak realtime channels`** > 200 with `rtSubscribe FAIL` > 0 → you blew through Supabase free-tier connection cap. Upgrade to Pro or further reduce subscriptions.
- **`pageHome FAIL` / `pageCategory FAIL` clusters of `HTTP 5xx`** → Vercel function or database under load. Usually database; check Supabase dashboard during the run.
- **High `p95` / `p99` latency** (>2s on page loads, >1s on marquee) → you'll have a sluggish day even if nothing fails outright.
- **`cheer FAIL` with `Too many requests` / rate-limit errors** → `postCheer` rate limit or Postgres write throughput.

## Recommended runs before the event

| Goal | Setting |
|---|---|
| Smoke test | `LOAD_USERS=50 LOAD_DURATION_S=30` |
| Realistic peak | `LOAD_USERS=210 LOAD_DURATION_S=180` |
| Headroom check | `LOAD_USERS=300 LOAD_DURATION_S=120` |
| Sustained worst case | `LOAD_USERS=250 LOAD_DURATION_S=600` (10 min) |

Run the realistic-peak test against the **production** Vercel deployment, not local dev — local doesn't capture Vercel function cold starts or Supabase connection pooler behavior.

## After the test

If you see meaningful failures:

1. Check **Supabase → Reports → Realtime** for connection / message graphs during the test window.
2. Check **Vercel → Project → Logs / Functions** for 5xx clusters.
3. Decide: optimize further, or upgrade tiers.
4. Re-run after any change.

## Cleanup

The test inserts cheer rows with `device_id = 'loadtest-N'`. To delete them after a run:

```sql
delete from cheers where device_id like 'loadtest-%';
```
