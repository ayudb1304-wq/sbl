import Link from "next/link"
import { notFound } from "next/navigation"
import { Container } from "@/components/Container"
import { Breadcrumbs } from "@/components/Breadcrumbs"
import { StatusPill } from "@/components/StatusPill"
import { LiveScoreSubscriber } from "@/components/LiveScoreSubscriber"
import { Cheers } from "@/components/Cheers"
import { feederLabel, getMatchById } from "@/lib/queries"
import { dateIST, stageLabel, timeIST } from "@/lib/format"
import { createAdminClient } from "@/lib/supabase/admin"
import { getCurrentUser } from "@/lib/auth"
import type { FeederSource } from "@/lib/supabase/types"

export const dynamic = "force-dynamic"

export default async function MatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const m = await getMatchById(id)
  if (!m) return notFound()
  const user = await getCurrentUser()
  const isScorer = !!user?.roles.includes("scorer")
  const isAdmin = !!user?.roles.includes("admin")

  const teamA = m.team_a?.name ?? feederLabel(m.team_a_source as FeederSource | null)
  const teamB = m.team_b?.name ?? feederLabel(m.team_b_source as FeederSource | null)
  const games = [...m.games].sort((a, b) => a.game_number - b.game_number)
  const isWinnerA = m.winner_team_id && m.winner_team_id === m.team_a_id
  const isWinnerB = m.winner_team_id && m.winner_team_id === m.team_b_id

  // Cheer counts (live updates handled by the client component)
  const showCheers = m.status === "in_progress" || m.status === "completed" || m.status === "walkover"
  let cheerCounts = { clap: 0, fire: 0 }
  if (showCheers) {
    const adminCli = createAdminClient()
    const [clapRes, fireRes] = await Promise.all([
      adminCli.from("cheers").select("id", { count: "exact", head: true }).eq("match_id", id).eq("cheer_type", "clap"),
      adminCli.from("cheers").select("id", { count: "exact", head: true }).eq("match_id", id).eq("cheer_type", "fire"),
    ])
    cheerCounts = { clap: clapRes.count ?? 0, fire: fireRes.count ?? 0 }
  }

  return (
    <Container className="space-y-6">
      <LiveScoreSubscriber matchId={id} />
      <header className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Breadcrumbs items={[
            { label: "Home", href: "/" },
            { label: m.category.name, href: `/categories/${m.category.code}` },
            { label: stageLabel(m.stage, m.round_label) },
          ]} />
          {(isScorer || isAdmin) && (
            <div className="flex gap-3 text-xs">
              {isScorer && (
                <Link href={`/scorer/match/${id}`} className="text-[var(--primary)] hover:underline">Score this match ↗</Link>
              )}
              {isAdmin && (
                <Link href={`/admin/match/${id}`} className="text-[var(--muted)] hover:underline">Admin view ↗</Link>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">Match</h1>
          <StatusPill status={m.status} />
        </div>
        <p className="text-sm text-[var(--muted)]">
          {m.court} · {dateIST(m.scheduled_at)} · {timeIST(m.scheduled_at)} IST
        </p>
      </header>

      <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6">
        <div className="grid grid-cols-[1fr_auto] gap-x-6 gap-y-4 text-lg">
          <TeamRow name={teamA} link={m.team_a?.id ? `/teams/${m.team_a.id}` : null} winner={!!isWinnerA} />
          <ScoreRow values={games.map(g => g.team_a_score)} winner={!!isWinnerA} />
          <TeamRow name={teamB} link={m.team_b?.id ? `/teams/${m.team_b.id}` : null} winner={!!isWinnerB} />
          <ScoreRow values={games.map(g => g.team_b_score)} winner={!!isWinnerB} />
        </div>
        {m.walkover_reason && (
          <p className="mt-4 rounded bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-900/30 dark:text-amber-200">
            Walkover: {m.walkover_reason}
          </p>
        )}
      </section>

      {showCheers && <Cheers matchId={id} initialCounts={cheerCounts} />}

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Games</h2>
        <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
          <table className="w-full text-sm">
            <thead className="bg-[var(--bg)] text-[var(--muted)]">
              <tr>
                <th className="px-3 py-2 text-left">Game</th>
                <th className="px-3 py-2 text-right">{teamA}</th>
                <th className="px-3 py-2 text-right">{teamB}</th>
                <th className="px-3 py-2 text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {games.map(g => (
                <tr key={g.id} className="border-t border-[var(--border)]">
                  <td className="px-3 py-2 font-mono">G{g.game_number}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{g.team_a_score}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{g.team_b_score}</td>
                  <td className="px-3 py-2 text-right text-xs uppercase text-[var(--muted)]">{g.status.replace("_", " ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </Container>
  )
}

function TeamRow({ name, link, winner }: { name: string; link: string | null; winner: boolean }) {
  const inner = <span className={winner ? "font-semibold" : ""}>{name}</span>
  return <div className="self-center">{link ? <Link href={link} className="hover:underline">{inner}</Link> : inner}</div>
}

function ScoreRow({ values, winner }: { values: number[]; winner: boolean }) {
  return (
    <div className={`flex items-center justify-end gap-3 font-mono tabular-nums text-2xl ${winner ? "font-semibold" : ""}`}>
      {values.length === 0 ? <span className="text-[var(--muted)]">—</span> : values.map((v, i) => <span key={i}>{v}</span>)}
    </div>
  )
}
