"use client"
import Link from "next/link"
import { useEffect, useState } from "react"
import { useFollows } from "@/lib/device"
import { timeIST } from "@/lib/format"

type Match = {
  id: string
  status: string
  scheduled_at: string | null
  court: string | null
  team_a_id: string | null
  team_b_id: string | null
  winner_team_id: string | null
  team_a: { id: string; name: string } | null
  team_b: { id: string; name: string } | null
  category: { code: string }
  games: { game_number: number; team_a_score: number; team_b_score: number }[]
}

type TeamLite = { id: string; name: string }

export function YourTeamsRail({
  matches,
  teamsById,
}: {
  matches: Match[]
  teamsById: Record<string, TeamLite>
}) {
  const followed = useFollows()
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  if (!mounted) return null
  if (followed.length === 0) {
    return (
      <section className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--muted)]">Your teams</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Tap the ☆ Follow button on any team page to pin them here. We&apos;ll show their next match and last result at a glance.
        </p>
      </section>
    )
  }

  const cards = followed
    .map(teamId => {
      const team = teamsById[teamId]
      if (!team) return null
      const teamMatches = matches.filter(m => m.team_a_id === teamId || m.team_b_id === teamId)
      const next = teamMatches.find(m => m.status === "scheduled")
      const live = teamMatches.find(m => m.status === "in_progress")
      const recent = [...teamMatches]
        .filter(m => m.status === "completed" || m.status === "walkover")
        .sort((a, b) => (b.scheduled_at ?? "").localeCompare(a.scheduled_at ?? ""))[0]
      return { team, next, live, recent, total: teamMatches.length }
    })
    .filter((x): x is NonNullable<typeof x> => !!x)

  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-semibold tracking-tight">Your teams</h2>
        <span className="text-xs text-[var(--muted)]">{cards.length} followed</span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(c => <TeamCard key={c.team.id} {...c} />)}
      </div>
    </section>
  )
}

function TeamCard({
  team, next, live, recent,
}: {
  team: TeamLite
  next?: Match
  live?: Match
  recent?: Match
  total: number
}) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between">
        <Link href={`/teams/${team.id}`} className="font-semibold hover:underline">{team.name}</Link>
        <span className="text-xs text-[var(--primary)]">★</span>
      </div>
      {live ? (
        <Row title="LIVE NOW" tone="live" match={live} teamId={team.id} />
      ) : next ? (
        <Row title="NEXT" tone="soon" match={next} teamId={team.id} />
      ) : (
        <p className="mt-2 text-xs text-[var(--muted)]">All matches played.</p>
      )}
      {recent && (
        <Row title="LAST" tone="done" match={recent} teamId={team.id} />
      )}
    </div>
  )
}

function Row({
  title, tone, match, teamId,
}: {
  title: string
  tone: "live" | "soon" | "done"
  match: Match
  teamId: string
}) {
  const isA = match.team_a_id === teamId
  const opponent = (isA ? match.team_b : match.team_a)?.name ?? "TBD"
  const myScores = [...match.games].sort((a, b) => a.game_number - b.game_number)
    .map(g => isA ? g.team_a_score : g.team_b_score)
  const oppScores = [...match.games].sort((a, b) => a.game_number - b.game_number)
    .map(g => isA ? g.team_b_score : g.team_a_score)
  const won = match.winner_team_id === teamId
  const lost = match.winner_team_id && match.winner_team_id !== teamId
  const labelColor =
    tone === "live" ? "text-[var(--live)]"
    : tone === "done" ? "text-[var(--success)]"
    : "text-[var(--muted)]"

  return (
    <Link href={`/matches/${match.id}`} className="mt-2 block rounded-md p-2 hover:bg-[var(--surface-alt)]">
      <div className="flex items-center justify-between text-[10px] font-bold tracking-wider">
        <span className={labelColor}>{title}</span>
        <span className="text-[var(--muted)]">
          {match.court}{match.scheduled_at ? ` · ${timeIST(match.scheduled_at)}` : ""}
        </span>
      </div>
      <div className="mt-1 flex items-center justify-between gap-2 text-sm">
        <span className="truncate">vs {opponent}</span>
        <span className={`font-mono tabular-nums ${won ? "font-bold text-[var(--success)]" : ""} ${lost ? "text-[var(--muted)]" : ""}`}>
          {myScores.length > 0 ? `${myScores.join("-")} : ${oppScores.join("-")}` : "—"}
        </span>
      </div>
    </Link>
  )
}
