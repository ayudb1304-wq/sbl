import Link from "next/link"
import type { EnrichedMatch } from "@/lib/queries"
import { feederLabel } from "@/lib/queries"
import { timeIST, stageLabel } from "@/lib/format"
import { StatusPill } from "./StatusPill"
import type { FeederSource } from "@/lib/supabase/types"

export function MatchCard({ m }: { m: EnrichedMatch }) {
  const teamA = m.team_a?.name ?? feederLabel(m.team_a_source as FeederSource | null)
  const teamB = m.team_b?.name ?? feederLabel(m.team_b_source as FeederSource | null)
  const games = [...m.games].sort((a, b) => a.game_number - b.game_number)
  const isWinnerA = m.winner_team_id && m.winner_team_id === m.team_a_id
  const isWinnerB = m.winner_team_id && m.winner_team_id === m.team_b_id

  return (
    <Link
      href={`/matches/${m.id}`}
      className="block rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 transition hover:border-[var(--primary)]"
    >
      <div className="flex items-center justify-between text-xs text-[var(--muted)]">
        <span>{m.category.code} · {stageLabel(m.stage, m.round_label)}{m.group ? ` · Group ${m.group.code}` : ""}</span>
        <StatusPill status={m.status} />
      </div>
      <div className="mt-2 grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 text-sm">
        <span className={isWinnerA ? "font-semibold" : ""}>{teamA}</span>
        <span className="font-mono text-right tabular-nums">{games.map(g => g.team_a_score).join(" · ") || "—"}</span>
        <span className={isWinnerB ? "font-semibold" : ""}>{teamB}</span>
        <span className="font-mono text-right tabular-nums">{games.map(g => g.team_b_score).join(" · ") || "—"}</span>
      </div>
      <div className="mt-2 flex items-center justify-between text-xs text-[var(--muted)]">
        <span>{m.court ?? "—"}</span>
        <span>{timeIST(m.scheduled_at)}</span>
      </div>
    </Link>
  )
}
