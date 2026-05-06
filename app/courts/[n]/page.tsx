import Link from "next/link"
import { notFound } from "next/navigation"
import { Container } from "@/components/Container"
import { Breadcrumbs } from "@/components/Breadcrumbs"
import { MatchCard } from "@/components/MatchCard"
import { LiveScoreSubscriber } from "@/components/LiveScoreSubscriber"
import { getActiveSeason, getSeasonMatches } from "@/lib/queries"

export const dynamic = "force-dynamic"

const COURTS = ["1", "2", "3", "4", "5", "6"]

export default async function CourtPage({ params }: { params: Promise<{ n: string }> }) {
  const { n } = await params
  if (!COURTS.includes(n)) notFound()
  const courtName = `Court ${n}`

  const season = await getActiveSeason()
  if (!season) return notFound()

  const all = await getSeasonMatches(season.id)
  const courtMatches = all.filter(m => m.court === courtName)

  const live = courtMatches.find(m => m.status === "in_progress")

  return (
    <Container className="space-y-6">
      <LiveScoreSubscriber />
      <header className="space-y-2">
        <Breadcrumbs items={[
          { label: "Home", href: "/" },
          { label: "Courts" },
          { label: courtName },
        ]} />
        <h1 className="text-2xl font-semibold tracking-tight">{courtName}</h1>
        <nav className="mt-3 flex gap-1 text-sm">
          {COURTS.map(c => (
            <Link
              key={c}
              href={`/courts/${c}`}
              className={`rounded-md px-3 py-1.5 ${c === n ? "bg-[var(--primary)] text-white" : "border border-[var(--border)] text-[var(--muted)] hover:bg-[var(--bg)]"}`}
            >
              Court {c}
            </Link>
          ))}
        </nav>
      </header>

      {live && (
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Now playing</h2>
          <MatchCard m={live} />
        </section>
      )}

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Schedule</h2>
        {courtMatches.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">No matches scheduled on this court.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {courtMatches.map(m => <MatchCard key={m.id} m={m} />)}
          </div>
        )}
      </section>
    </Container>
  )
}
