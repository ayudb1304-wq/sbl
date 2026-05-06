import Link from "next/link"
import { notFound } from "next/navigation"
import { Container } from "@/components/Container"
import { Breadcrumbs } from "@/components/Breadcrumbs"
import { StatusPill } from "@/components/StatusPill"
import { LiveScoreSubscriber } from "@/components/LiveScoreSubscriber"
import { ScoreEntry } from "@/components/scorer/ScoreEntry"
import { MatchLockToggle } from "@/components/admin/MatchLockToggle"
import { feederLabel, getMatchById } from "@/lib/queries"
import { dateIST, stageLabel, timeIST } from "@/lib/format"
import type { FeederSource } from "@/lib/supabase/types"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

export default async function AdminMatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const m = await getMatchById(id)
  if (!m) return notFound()

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

  // Pull recent audit log
  const adminCli = createAdminClient()
  const { data: events } = await adminCli
    .from("score_events")
    .select("created_at, action, prev_a, prev_b, new_a, new_b, actor_role, notes")
    .eq("match_id", id)
    .order("created_at", { ascending: false })
    .limit(50)

  return (
    <Container className="space-y-6">
      <LiveScoreSubscriber matchId={id} />
      <div className="flex items-center justify-between gap-2">
        <Breadcrumbs items={[
          { label: "Admin", href: "/admin" },
          { label: m.category.name, href: `/admin/categories/${m.category.code}` },
          { label: stageLabel(m.stage, m.round_label) },
        ]} />
        <div className="flex gap-3 text-xs">
          <Link href={`/scorer/match/${id}`} className="text-[var(--muted)] hover:underline">Scorer</Link>
          <Link href={`/matches/${id}`} className="text-[var(--muted)] hover:underline">Public ↗</Link>
        </div>
      </div>

      <header className="space-y-1">
        <p className="text-sm text-[var(--muted)]">
          {m.category.name}{m.group && <> · Group {m.group.code}</>}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">
            {teamAName} <span className="text-[var(--muted)]">vs</span> {teamBName}
          </h1>
          <StatusPill status={m.status} />
          {m.locked && <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">LOCKED</span>}
        </div>
        <p className="text-sm text-[var(--muted)]">
          {m.court} · {dateIST(m.scheduled_at)} · {timeIST(m.scheduled_at)} IST · {format === "single" ? "1 game" : "Best of 3"}
        </p>
        <div className="mt-2"><MatchLockToggle matchId={id} locked={m.locked} /></div>
      </header>

      {!teamsResolved ? (
        <div className="rounded-md border border-amber-300 bg-amber-50/60 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          Waiting on feeder matches. Confirm group qualifiers or wait for prior KO rounds to complete, then hit &ldquo;Resolve bracket&rdquo; on the category admin page.
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
          forceEdit
        />
      )}

      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--muted)]">Audit log</h2>
        {(!events || events.length === 0) ? (
          <p className="text-sm text-[var(--muted)]">No events yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
            <table className="w-full text-xs">
              <thead className="bg-[var(--bg)] text-[var(--muted)]">
                <tr>
                  <th className="px-3 py-2 text-left">When</th>
                  <th className="px-3 py-2 text-left">Action</th>
                  <th className="px-3 py-2 text-left">Actor</th>
                  <th className="px-3 py-2 text-right">Score change</th>
                  <th className="px-3 py-2 text-left">Notes</th>
                </tr>
              </thead>
              <tbody>
                {events.map((e, i) => (
                  <tr key={i} className="border-t border-[var(--border)]">
                    <td className="px-3 py-1.5 font-mono">{new Date(e.created_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", hour12: false })}</td>
                    <td className="px-3 py-1.5">{e.action}</td>
                    <td className="px-3 py-1.5">{e.actor_role ?? "—"}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums">
                      {e.action === "score_update" && e.prev_a !== null
                        ? `${e.prev_a}-${e.prev_b} → ${e.new_a}-${e.new_b}`
                        : "—"}
                    </td>
                    <td className="px-3 py-1.5">{e.notes ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </Container>
  )
}
