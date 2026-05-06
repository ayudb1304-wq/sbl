import Link from "next/link"
import { notFound } from "next/navigation"
import { Container } from "@/components/Container"
import { Breadcrumbs } from "@/components/Breadcrumbs"
import { StatusPill } from "@/components/StatusPill"
import { LiveScoreSubscriber } from "@/components/LiveScoreSubscriber"
import { ScoreEntry } from "@/components/scorer/ScoreEntry"
import { feederLabel, getMatchById } from "@/lib/queries"
import { dateIST, stageLabel, timeIST } from "@/lib/format"
import { getCurrentUser } from "@/lib/auth"
import type { FeederSource } from "@/lib/supabase/types"

export const dynamic = "force-dynamic"

export default async function ScorerMatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const m = await getMatchById(id)
  if (!m) return notFound()
  const user = await getCurrentUser()

  const teamAName = m.team_a?.name ?? feederLabel(m.team_a_source as FeederSource | null)
  const teamBName = m.team_b?.name ?? feederLabel(m.team_b_source as FeederSource | null)
  const games = [...m.games]
    .sort((a, b) => a.game_number - b.game_number)
    .map(g => ({
      id: g.id,
      game_number: g.game_number,
      team_a_score: g.team_a_score,
      team_b_score: g.team_b_score,
      status: g.status as "pending" | "in_progress" | "completed",
    }))

  const format: "single" | "bo3" = m.stage === "group" ? "single" : "bo3"
  const teamsResolved = !!m.team_a_id && !!m.team_b_id

  return (
    <Container className="space-y-6">
      <LiveScoreSubscriber matchId={id} />
      <div className="flex items-center justify-between gap-2">
        <Breadcrumbs items={[
          { label: "Scorer", href: "/scorer" },
          { label: stageLabel(m.stage, m.round_label) },
        ]} />
        <div className="flex gap-3 text-xs">
          {user?.role === "admin" && (
            <Link href={`/admin/match/${id}`} className="text-[var(--primary)] hover:underline">Admin view</Link>
          )}
          <Link href={`/matches/${id}`} className="text-[var(--muted)] hover:underline">Public ↗</Link>
        </div>
      </div>

      <header className="space-y-1">
        <p className="text-sm text-[var(--muted)]">
          {m.category.name}{m.group && <> · Group {m.group.code}</>}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{teamAName} <span className="text-[var(--muted)]">vs</span> {teamBName}</h1>
          <StatusPill status={m.status} />
        </div>
        <p className="text-sm text-[var(--muted)]">
          {m.court} · {dateIST(m.scheduled_at)} · {timeIST(m.scheduled_at)} IST · {format === "single" ? "1 game" : "Best of 3"}
        </p>
      </header>

      {!teamsResolved ? (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          This knockout match is waiting on its feeder matches to resolve. Once group standings or prior rounds are confirmed, both teams will appear here.
        </div>
      ) : (
        <ScoreEntry
          matchId={id}
          matchStatus={m.status}
          teamA={{ id: m.team_a_id, name: teamAName }}
          teamB={{ id: m.team_b_id, name: teamBName }}
          format={format}
          games={games}
          winnerTeamId={m.winner_team_id}
        />
      )}
    </Container>
  )
}
