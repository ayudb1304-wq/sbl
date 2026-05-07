/**
 * Tournament-day load test. Spawns N concurrent simulated users that exercise
 * the same surfaces real spectators / scorers will: page loads, marquee polls,
 * cheer posts, realtime channel subs.
 *
 * Run:
 *   LOAD_USERS=250 LOAD_DURATION_S=60 SITE=http://localhost:3000 \
 *     npm run loadtest
 *
 * Defaults: 250 users for 60s against http://localhost:3000.
 *
 * Reports success / fail per category at the end. Errors that 5xx or fail
 * to subscribe to realtime are the ones to watch — they signal a hit cap.
 *
 * NOTE: this directly inserts cheers via supabase-js (anon role) just like
 * the browser does. It does NOT exercise the directLogin admin flow or any
 * scorer mutations — those use the service role and shouldn't be load-tested
 * as anonymous users.
 */
import { config as loadEnv } from "dotenv"
loadEnv({ path: ".env.local" })
import { createClient, type SupabaseClient } from "@supabase/supabase-js"

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY
const SITE = process.env.SITE || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
const USERS = Number(process.env.LOAD_USERS || 250)
const DURATION_MS = Number(process.env.LOAD_DURATION_S || 60) * 1000
const RAMP_MS = Number(process.env.LOAD_RAMP_MS || 30) // stagger between user starts

if (!URL || !ANON || !SERVICE) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY")
  process.exit(1)
}

// Single service-role client used for cheer inserts (mirrors what postCheer
// does server-side in the real app). Anon RLS blocks direct cheer inserts.
const writeClient = createClient(URL, SERVICE, { auth: { persistSession: false } })

type Tally = { ok: number; fail: number; latency: number[] }
const stats: Record<string, Tally> = {
  pageHome: { ok: 0, fail: 0, latency: [] },
  pageMatch: { ok: 0, fail: 0, latency: [] },
  pageCategory: { ok: 0, fail: 0, latency: [] },
  marquee: { ok: 0, fail: 0, latency: [] },
  cheer: { ok: 0, fail: 0, latency: [] },
  rtSubscribe: { ok: 0, fail: 0, latency: [] },
}
const errors: string[] = []
let activeRtChannels = 0
let peakRtChannels = 0

function track(label: keyof typeof stats, ok: boolean, ms: number, err?: string) {
  const t = stats[label]
  if (ok) t.ok++
  else { t.fail++; if (err && errors.length < 50) errors.push(`${label}: ${err}`) }
  t.latency.push(ms)
}

async function timed<T>(label: keyof typeof stats, fn: () => Promise<{ ok: boolean; err?: string }>) {
  const t0 = Date.now()
  try {
    const { ok, err } = await fn()
    track(label, ok, Date.now() - t0, err)
  } catch (e) {
    track(label, false, Date.now() - t0, (e as Error).message)
  }
}

async function user(id: number, deadline: number, matchIds: string[]) {
  const sb = createClient(URL!, ANON!, { auth: { persistSession: false } })
  const myMatchId = matchIds[id % matchIds.length]

  // Subscribe to a per-match channel (mimics what /matches/[id] does)
  await new Promise<void>((resolve) => {
    const t0 = Date.now()
    const ch = sb.channel(`load-${id}`)
      .on("postgres_changes", {
        event: "*", schema: "public", table: "games", filter: `match_id=eq.${myMatchId}`,
      }, () => {})
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          track("rtSubscribe", true, Date.now() - t0)
          activeRtChannels++
          peakRtChannels = Math.max(peakRtChannels, activeRtChannels)
          resolve()
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          if (status !== "CLOSED") track("rtSubscribe", false, Date.now() - t0, status)
          activeRtChannels = Math.max(0, activeRtChannels - 1)
          resolve()
        }
      })
    // Hard timeout
    setTimeout(() => resolve(), 8000)
  })

  while (Date.now() < deadline) {
    const r = Math.random()
    if (r < 0.45) {
      // Marquee poll — most frequent action
      await timed("marquee", async () => {
        const res = await fetch(`${SITE}/api/marquee`, { cache: "no-store" })
        return { ok: res.ok, err: res.ok ? undefined : `HTTP ${res.status}` }
      })
    } else if (r < 0.65) {
      await timed("pageHome", async () => {
        const res = await fetch(`${SITE}/`, { cache: "no-store" })
        return { ok: res.ok, err: res.ok ? undefined : `HTTP ${res.status}` }
      })
    } else if (r < 0.8) {
      await timed("pageMatch", async () => {
        const res = await fetch(`${SITE}/matches/${myMatchId}`, { cache: "no-store" })
        return { ok: res.ok, err: res.ok ? undefined : `HTTP ${res.status}` }
      })
    } else if (r < 0.9) {
      const cat = ["MB", "MI", "W"][Math.floor(Math.random() * 3)]
      await timed("pageCategory", async () => {
        const res = await fetch(`${SITE}/categories/${cat}`, { cache: "no-store" })
        return { ok: res.ok, err: res.ok ? undefined : `HTTP ${res.status}` }
      })
    } else {
      await timed("cheer", async () => {
        const { error } = await writeClient.from("cheers").insert({
          match_id: myMatchId,
          device_id: `loadtest-${id}`,
          cheer_type: Math.random() < 0.5 ? "clap" : "fire",
        })
        return { ok: !error, err: error?.message }
      })
    }
    // Wait 1-4s between actions to mimic real browsing pace
    await new Promise(r => setTimeout(r, 1000 + Math.random() * 3000))
  }

  // Cleanup
  await sb.removeAllChannels()
  activeRtChannels = Math.max(0, activeRtChannels - 1)
}

async function pickMatchIds(sb: SupabaseClient): Promise<string[]> {
  const { data } = await sb.from("matches").select("id").limit(20)
  return (data ?? []).map((m: { id: string }) => m.id)
}

function pct(latencies: number[], p: number): number {
  if (latencies.length === 0) return 0
  const sorted = [...latencies].sort((a, b) => a - b)
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))
  return sorted[idx]
}

async function main() {
  console.log(`SBL load test`)
  console.log(`  site:     ${SITE}`)
  console.log(`  users:    ${USERS} (ramped over ${(USERS * RAMP_MS) / 1000}s)`)
  console.log(`  duration: ${DURATION_MS / 1000}s`)
  console.log("")

  const sb = createClient(URL!, ANON!)
  const matchIds = await pickMatchIds(sb)
  if (matchIds.length === 0) {
    console.error("No matches available. Run `npm run seed:2026 -- --force` first.")
    process.exit(1)
  }

  const startedAt = Date.now()
  const deadline = startedAt + DURATION_MS + USERS * RAMP_MS
  const promises: Promise<void>[] = []
  for (let i = 0; i < USERS; i++) {
    promises.push(user(i, deadline, matchIds))
    await new Promise(r => setTimeout(r, RAMP_MS))
  }

  // Live progress every 5s
  const reporter = setInterval(() => {
    const elapsed = ((Date.now() - startedAt) / 1000).toFixed(0)
    const total = Object.values(stats).reduce((s, t) => s + t.ok + t.fail, 0)
    process.stdout.write(`  ${elapsed}s · ${total} reqs · ${peakRtChannels} peak RT channels · ${errors.length} errors\r`)
  }, 5000)

  await Promise.all(promises)
  clearInterval(reporter)
  process.stdout.write("\n\n")

  // Report
  console.log("=".repeat(72))
  console.log("RESULTS")
  console.log("=".repeat(72))
  console.log(`Peak realtime channels:  ${peakRtChannels} (Supabase free tier cap: 200)`)
  console.log("")
  console.log("Action        |    OK   FAIL   p50ms   p95ms   p99ms")
  console.log("-".repeat(60))
  for (const [name, t] of Object.entries(stats)) {
    console.log(
      `${name.padEnd(13)} | ${String(t.ok).padStart(5)}  ${String(t.fail).padStart(5)}` +
      `   ${String(pct(t.latency, 50)).padStart(5)}   ${String(pct(t.latency, 95)).padStart(5)}   ${String(pct(t.latency, 99)).padStart(5)}`
    )
  }
  if (errors.length > 0) {
    console.log("\nFirst errors (sample):")
    for (const e of errors.slice(0, 12)) console.log(`  - ${e}`)
  }
  process.exit(0)
}

main().catch(e => { console.error(e); process.exit(1) })
