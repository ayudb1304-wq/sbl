import Link from "next/link"
import { notFound } from "next/navigation"
import { Container } from "@/components/Container"
import { StatusPill } from "@/components/StatusPill"
import { LiveScoreSubscriber } from "@/components/LiveScoreSubscriber"
import { feederLabel, getMatchById } from "@/lib/queries"
import { dateIST, stageLabel, timeIST } from "@/lib/format"
import type { FeederSource } from "@/lib/supabase/types"

export const dynamic = "force-dynamic"

export default async function MatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const m = await getMatchById(id)
  if (!m) return notFound()

  const teamA = m.team_a?.name ?? feederLabel(m.team_a_source as FeederSource | null)
  const teamB = m.team_b?.name ?? feederLabel(m.team_b_source as FeederSource | null)
  const games = [...m.games].sort((a, b) => a.game_number - b.game_number)
  const isWinnerA = m.winner_team_id && m.winner_team_id === m.team_a_id
  const isWinnerB = m.winner_team_id && m.winner_team_id === m.team_b_id

  return (
    <Container className="space-y-6">
      <LiveScoreSubscriber matchId={id} />
      <header className="space-y-1">
        <p className="text-sm text-[var(--muted)]">
          <Link href={`/categories/${m.category.code}`} className="hover:underline">{m.category.name}</Link>
          {" · "}{stageLabel(m.stage, m.round_label)}
          {m.group && <> · <Link href={`/categories/${m.category.code}`} className="hover:underline">Group {m.group.code}</Link></>}
        </p>
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
