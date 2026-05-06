import Link from "next/link"
import { createAdminClient } from "@/lib/supabase/admin"
import { getActiveSeason } from "@/lib/queries"
import { MarqueeRefresher } from "./MarqueeRefresher"

type Item = {
  id: string
  state: "live" | "done" | "wo"
  category_code: string
  round_label: string
  team_a: string
  team_b: string
  score_a: number[]
  score_b: number[]
  court: string | null
}

async function getMarqueeItems(): Promise<Item[]> {
  const season = await getActiveSeason()
  if (!season) return []
  const admin = createAdminClient()

  const { data: matches } = await admin
    .from("matches")
    .select(`
      id, status, court, round_label, scheduled_at,
      category:categories ( code ),
      team_a:teams!matches_team_a_id_fkey ( name ),
      team_b:teams!matches_team_b_id_fkey ( name ),
      games ( game_number, team_a_score, team_b_score, status )
    `)
    .eq("season_id", season.id)
    .in("status", ["in_progress", "completed", "walkover"])
    .order("status", { ascending: false })   // 'in_progress' < 'completed' alpha — adjust below
    .order("scheduled_at", { ascending: false })
    .limit(20)

  type Row = {
    id: string
    status: "in_progress" | "completed" | "walkover"
    court: string | null
    round_label: string
    category: { code: string } | { code: string }[] | null
    team_a: { name: string } | { name: string }[] | null
    team_b: { name: string } | { name: string }[] | null
    games: { game_number: number; team_a_score: number; team_b_score: number; status: string }[]
  }

  const rows = (matches ?? []) as unknown as Row[]
  const items: Item[] = rows.map(m => {
    const cat = Array.isArray(m.category) ? m.category[0] : m.category
    const a = Array.isArray(m.team_a) ? m.team_a[0] : m.team_a
    const b = Array.isArray(m.team_b) ? m.team_b[0] : m.team_b
    const sortedGames = [...m.games].sort((g1, g2) => g1.game_number - g2.game_number)
    return {
      id: m.id,
      state: m.status === "in_progress" ? "live" : m.status === "walkover" ? "wo" : "done",
      category_code: cat?.code ?? "?",
      round_label: m.round_label,
      team_a: a?.name ?? "TBD",
      team_b: b?.name ?? "TBD",
      score_a: sortedGames.map(g => g.team_a_score),
      score_b: sortedGames.map(g => g.team_b_score),
      court: m.court,
    }
  })

  // Live first, then recent done/walkover
  items.sort((a, b) => {
    const order = (s: string) => (s === "live" ? 0 : s === "wo" ? 1 : 2)
    return order(a.state) - order(b.state)
  })

  return items
}

export async function Marquee() {
  const items = await getMarqueeItems()
  if (items.length === 0) return null

  // Duplicate the content so the loop seam is invisible
  const loop = [...items, ...items]
  const liveCount = items.filter(i => i.state === "live").length

  // Roughly tune speed to total content length so longer lists scroll faster.
  // 5s per item, capped between 30s and 120s.
  const duration = Math.min(120, Math.max(30, items.length * 5))

  return (
    <>
      <MarqueeRefresher />
      <div
        style={{ backgroundColor: "var(--primary)", color: "#FFFFFF" }}
        className="relative overflow-hidden"
        aria-label="Live score ticker"
      >
        <div className="pointer-events-none absolute left-0 top-0 z-10 flex h-full items-center gap-2 bg-[var(--primary)] pl-3 pr-4 text-[10px] font-bold uppercase tracking-widest"
             style={{ boxShadow: "8px 0 12px var(--primary)" }}>
          {liveCount > 0 ? (
            <>
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--live)]" />
              <span>Live · {liveCount}</span>
            </>
          ) : (
            <span>Recent</span>
          )}
        </div>
        <div
          className="flex whitespace-nowrap py-1.5 will-change-transform"
          style={{
            animation: `sblMarquee ${duration}s linear infinite`,
            paddingLeft: "9rem",
          }}
        >
          {loop.map((it, i) => (
            <Link
              key={`${it.id}-${i}`}
              href={`/matches/${it.id}`}
              className="mx-3 inline-flex items-center gap-2 text-sm hover:underline"
            >
              <Pill state={it.state} />
              <span className="font-mono text-[11px] opacity-80">
                {it.category_code} · {it.round_label}{it.court ? ` · ${it.court}` : ""}
              </span>
              <span className="font-medium">{it.team_a}</span>
              <span className="font-mono tabular-nums opacity-90">
                {it.score_a.length > 0 ? `${it.score_a.join("-")}–${it.score_b.join("-")}` : "—"}
              </span>
              <span className="font-medium">{it.team_b}</span>
              <span className="opacity-30">•</span>
            </Link>
          ))}
        </div>
        <style>{`
          @keyframes sblMarquee {
            from { transform: translateX(0); }
            to   { transform: translateX(-50%); }
          }
          [aria-label="Live score ticker"]:hover [class*="will-change-transform"] {
            animation-play-state: paused;
          }
        `}</style>
      </div>
    </>
  )
}

function Pill({ state }: { state: "live" | "done" | "wo" }) {
  const label = state === "live" ? "LIVE" : state === "wo" ? "W/O" : "FT"
  const cls =
    state === "live"
      ? "bg-[var(--live)] text-white"
      : state === "wo"
        ? "bg-[var(--warning)] text-white"
        : "bg-white/15 text-white"
  return (
    <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold tracking-wider ${cls} ${state === "live" ? "animate-pulse" : ""}`}>
      {label}
    </span>
  )
}
