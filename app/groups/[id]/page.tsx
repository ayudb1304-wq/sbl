import Link from "next/link"
import { notFound } from "next/navigation"
import { Container } from "@/components/Container"
import { MatchCard } from "@/components/MatchCard"
import { StandingsTable } from "@/components/StandingsTable"
import { LiveScoreSubscriber } from "@/components/LiveScoreSubscriber"
import { getGroupById, getMatchesForGroup, getStandingsForGroup } from "@/lib/queries"
import { rankGroup } from "@/lib/standings"

export const dynamic = "force-dynamic"

export default async function GroupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const group = await getGroupById(id)
  if (!group) return notFound()

  const [matches, standings] = await Promise.all([
    getMatchesForGroup(id),
    getStandingsForGroup(id),
  ])
  const ranked = rankGroup(standings, matches)
  const teams = [...group.teams].sort((a, b) => (a.seed ?? 99) - (b.seed ?? 99))

  return (
    <Container className="space-y-8">
      <LiveScoreSubscriber />
      <header>
        <p className="text-sm text-[var(--muted)]">
          <Link href={`/categories/${group.category.code}`} className="hover:underline">
            {group.category.name}
          </Link>
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">{group.name}</h1>
      </header>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Standings</h2>
        <StandingsTable rows={ranked} qualifyTopN={2} />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Teams</h2>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {teams.map(t => (
            <Link
              key={t.id}
              href={`/teams/${t.id}`}
              className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-3 hover:border-[var(--primary)]"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">{t.name}</span>
                {t.seed && <span className="text-xs text-[var(--muted)]">#{t.seed}</span>}
              </div>
              <p className="mt-1 text-xs text-[var(--muted)]">
                {(t.team_players ?? []).map(tp => tp.player?.full_name).filter(Boolean).join(" & ")}
              </p>
              {t.company && <p className="mt-0.5 text-xs text-[var(--muted)]">{t.company}</p>}
            </Link>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Matches</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {matches.map(m => <MatchCard key={m.id} m={m} />)}
        </div>
      </section>
    </Container>
  )
}
