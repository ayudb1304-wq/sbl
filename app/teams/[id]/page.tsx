import Link from "next/link"
import { notFound } from "next/navigation"
import { Container } from "@/components/Container"
import { MatchCard } from "@/components/MatchCard"
import { LiveScoreSubscriber } from "@/components/LiveScoreSubscriber"
import { getMatchesForTeam, getTeamById } from "@/lib/queries"

export const dynamic = "force-dynamic"

export default async function TeamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const team = await getTeamById(id)
  if (!team) return notFound()

  const matches = await getMatchesForTeam(id)
  const players = team.team_players

  return (
    <Container className="space-y-6">
      <LiveScoreSubscriber />
      <header className="space-y-1">
        <p className="text-sm text-[var(--muted)]">
          <Link href={`/categories/${team.category.code}`} className="hover:underline">
            {team.category.name}
          </Link>
          {team.group && <> · Group {team.group.code}</>}
        </p>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{team.name}</h1>
          {team.seed && <span className="rounded bg-[var(--bg)] px-2 py-0.5 text-xs">Seed #{team.seed}</span>}
        </div>
        {team.company && <p className="text-sm text-[var(--muted)]">{team.company}</p>}
      </header>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Players</h2>
        <ul className="grid gap-2 sm:grid-cols-2">
          {players.map(tp => (
            <li key={tp.player.id}>
              <Link
                href={`/players/${tp.player.id}`}
                className="block rounded-md border border-[var(--border)] bg-[var(--surface)] p-3 hover:border-[var(--primary)]"
              >
                <div className="font-medium">{tp.player.full_name}</div>
                {tp.player.company && <div className="text-xs text-[var(--muted)]">{tp.player.company}</div>}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Fixtures</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {matches.map(m => <MatchCard key={m.id} m={m} />)}
        </div>
      </section>
    </Container>
  )
}
