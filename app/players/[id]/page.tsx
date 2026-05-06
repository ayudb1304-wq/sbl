import Link from "next/link"
import { notFound } from "next/navigation"
import { Container } from "@/components/Container"
import { Breadcrumbs } from "@/components/Breadcrumbs"
import { getPlayerById } from "@/lib/queries"

export const dynamic = "force-dynamic"

export default async function PlayerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const player = await getPlayerById(id)
  if (!player) return notFound()

  const teams = [...player.team_players].sort(
    (a, b) => b.team.season.year - a.team.season.year,
  )

  return (
    <Container className="space-y-6">
      <header className="space-y-2">
        <Breadcrumbs items={[
          { label: "Home", href: "/" },
          { label: "Players" },
          { label: player.full_name },
        ]} />
        <h1 className="text-2xl font-semibold tracking-tight">{player.full_name}</h1>
        {player.company && <p className="text-sm text-[var(--muted)]">{player.company}</p>}
      </header>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Tournament history</h2>
        {teams.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">No team appearances yet.</p>
        ) : (
          <ul className="space-y-2">
            {teams.map(t => (
              <li key={t.team.id}>
                <Link
                  href={`/teams/${t.team.id}`}
                  className="flex items-center justify-between rounded-md border border-[var(--border)] bg-[var(--surface)] p-3 hover:border-[var(--primary)]"
                >
                  <span>
                    <span className="font-medium">{t.team.name}</span>
                    <span className="ml-2 text-xs text-[var(--muted)]">
                      {t.team.season.name} · {t.team.category.name}
                    </span>
                  </span>
                  {t.team.seed && <span className="text-xs text-[var(--muted)]">Seed #{t.team.seed}</span>}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </Container>
  )
}
