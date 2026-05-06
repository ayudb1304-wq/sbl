import Link from "next/link"
import { feederLabel } from "@/lib/queries"
import { timeIST, statusCardClasses } from "@/lib/format"
import { StatusPill } from "./StatusPill"
import type { EnrichedMatch } from "@/lib/queries"
import type { FeederSource } from "@/lib/supabase/types"

export function BracketView({ matches, hasQF }: { matches: EnrichedMatch[]; hasQF: boolean }) {
  const qf = matches.filter(m => m.stage === "qf").sort(byRound)
  const sf = matches.filter(m => m.stage === "sf").sort(byRound)
  const fn = matches.filter(m => m.stage === "final")

  const columns = hasQF
    ? [{ title: "Quarter-finals", items: qf }, { title: "Semi-finals", items: sf }, { title: "Final", items: fn }]
    : [{ title: "Semi-finals", items: sf }, { title: "Final", items: fn }]

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:flex lg:items-stretch lg:gap-8 lg:overflow-x-auto">
      {columns.map(col => (
        <div key={col.title} className="lg:min-w-[260px] lg:flex-1 space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--muted)]">{col.title}</h3>
          <div className="flex flex-col justify-around gap-3 lg:h-full">
            {col.items.map(m => <BracketMatch key={m.id} m={m} />)}
          </div>
        </div>
      ))}
    </div>
  )
}

function byRound(a: EnrichedMatch, b: EnrichedMatch) {
  const num = (s: string) => parseInt(s.replace(/\D/g, "") || "0", 10)
  return num(a.round_label) - num(b.round_label)
}

function BracketMatch({ m }: { m: EnrichedMatch }) {
  const teamA = m.team_a?.name ?? feederLabel(m.team_a_source as FeederSource | null)
  const teamB = m.team_b?.name ?? feederLabel(m.team_b_source as FeederSource | null)
  const games = [...m.games].sort((a, b) => a.game_number - b.game_number)
  const isWA = m.winner_team_id && m.winner_team_id === m.team_a_id
  const isWB = m.winner_team_id && m.winner_team_id === m.team_b_id

  return (
    <Link
      href={`/matches/${m.id}`}
      className={`block rounded-lg border p-3 hover:border-[var(--primary)] ${statusCardClasses(m.status)}`}
    >
      <div className="flex items-center justify-between text-xs text-[var(--muted)]">
        <span className="font-mono">{m.round_label}</span>
        <StatusPill status={m.status} />
      </div>
      <div className="mt-2 space-y-1 text-sm">
        <Row name={teamA} scores={games.map(g => g.team_a_score)} winner={!!isWA} />
        <Row name={teamB} scores={games.map(g => g.team_b_score)} winner={!!isWB} />
      </div>
      <div className="mt-2 text-xs text-[var(--muted)]">{m.court ?? ""} {m.court ? "·" : ""} {timeIST(m.scheduled_at)}</div>
    </Link>
  )
}

function Row({ name, scores, winner }: { name: string; scores: number[]; winner: boolean }) {
  return (
    <div className="grid grid-cols-[1fr_auto] gap-3">
      <span className={`truncate ${winner ? "font-semibold" : ""}`}>{name}</span>
      <span className={`font-mono tabular-nums ${winner ? "font-semibold" : ""}`}>{scores.join(" · ") || "—"}</span>
    </div>
  )
}
