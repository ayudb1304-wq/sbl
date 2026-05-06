import Link from "next/link"
import { Container } from "@/components/Container"
import { MatchCard } from "@/components/MatchCard"
import { LiveScoreSubscriber } from "@/components/LiveScoreSubscriber"
import { YourTeamsRail } from "@/components/YourTeamsRail"
import { getActiveSeason, getCategories, getSeasonMatches, getStandingsForGroup } from "@/lib/queries"
import { rankGroup } from "@/lib/standings"
import { createAdminClient } from "@/lib/supabase/admin"
import { branding } from "@/lib/branding"
import type { EnrichedMatch } from "@/lib/queries"

export const dynamic = "force-dynamic" // tournament data is live; never cache

export default async function Home() {
  const season = await getActiveSeason()
  if (!season) {
    return (
      <Container>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-8 text-center text-[var(--muted)]">
          No active season. Admin needs to mark a season as active.
        </div>
      </Container>
    )
  }

  const [matches, categories] = await Promise.all([
    getSeasonMatches(season.id),
    getCategories(season.id),
  ])

  const live = matches.filter(m => m.status === "in_progress")
  const upcoming = matches.filter(m => m.status === "scheduled").slice(0, 6)
  const recent = matches
    .filter(m => m.status === "completed" || m.status === "walkover")
    .sort((a, b) => (b.scheduled_at ?? "").localeCompare(a.scheduled_at ?? ""))
    .slice(0, 6)

  const totalMatches = matches.length
  const completed = matches.filter(m => m.status === "completed" || m.status === "walkover").length

  // Lightweight team index for the Your-Teams rail (client-side filter by localStorage IDs).
  const adminCli = createAdminClient()
  const { data: teamRows } = await adminCli.from("teams").select("id, name").eq("season_id", season.id)
  const teamsById = Object.fromEntries((teamRows ?? []).map(t => [t.id, { id: t.id, name: t.name }]))

  return (
    <Container className="space-y-10">
      <LiveScoreSubscriber />

      <section className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-gradient-to-br from-[var(--primary-soft)] via-[var(--surface)] to-[var(--surface)] p-6 sm:p-12">
        <div className="relative flex flex-col items-center text-center space-y-5">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)]/80 px-3 py-1 text-xs font-medium text-[var(--muted-strong)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--primary)]" />
            {season.name} · {season.status}
          </span>
          {branding.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={branding.logoUrl}
              alt={branding.appTagline}
              className="h-20 w-auto sm:h-28"
            />
          ) : (
            <h1 className="display text-3xl sm:text-5xl text-[var(--text-strong)]">
              {branding.appTagline}
            </h1>
          )}
          <p className="display text-2xl sm:text-4xl tracking-tight text-[var(--primary)]">
            {branding.heroTagline}
          </p>
          <p className="max-w-2xl text-sm sm:text-base text-[var(--muted-strong)]">
            Doubles · 6 courts · {categories.length} categories · live scores updated as the tournament unfolds.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-1 pt-2 text-sm text-[var(--muted)]">
            <span><span className="font-semibold text-[var(--text)]">{totalMatches}</span> matches</span>
            <span><span className="font-semibold text-[var(--success)]">{completed}</span> completed</span>
            <span><span className="font-semibold text-[var(--live)]">{live.length}</span> live</span>
          </div>
        </div>
      </section>

      <YourTeamsRail matches={matches} teamsById={teamsById} />

      <Section
        title={live.length > 0 ? `Live now (${live.length})` : "No matches in progress"}
        empty={live.length === 0 ? "Check back when matches are underway." : null}
      >
        <Grid>{live.map(m => <MatchCard key={m.id} m={m} />)}</Grid>
      </Section>

      <Section title="Up next" empty={upcoming.length === 0 ? "All matches scheduled have started." : null}>
        <Grid>{upcoming.map(m => <MatchCard key={m.id} m={m} />)}</Grid>
      </Section>

      {recent.length > 0 && (
        <Section title="Recent results">
          <Grid>{recent.map(m => <MatchCard key={m.id} m={m} />)}</Grid>
        </Section>
      )}

      <section className="space-y-6">
        <h2 className="text-xl font-semibold tracking-tight">Standings snapshot</h2>
        <div className="grid gap-6 md:grid-cols-3">
          {categories.map(cat => (
            <CategorySnapshot
              key={cat.id}
              code={cat.code}
              name={cat.name}
              groups={cat.groups}
              matches={matches}
            />
          ))}
        </div>
      </section>
    </Container>
  )
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
}

function Section({ title, empty, children }: { title: string; empty?: string | null; children?: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      {empty ? <p className="text-sm text-[var(--muted)]">{empty}</p> : children}
    </section>
  )
}

async function CategorySnapshot({
  code, name, groups, matches,
}: {
  code: string
  name: string
  groups: { id: string; code: string; name: string; sort_order: number }[]
  matches: EnrichedMatch[]
}) {
  const sortedGroups = [...groups].sort((a, b) => a.sort_order - b.sort_order)
  const firstGroup = sortedGroups[0]
  if (!firstGroup) return null
  const standings = await getStandingsForGroup(firstGroup.id)
  const groupMatches = matches.filter(m => m.group_id === firstGroup.id)
  const ranked = rankGroup(standings, groupMatches)
  const top3 = ranked.slice(0, 3)
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{name}</h3>
        <Link href={`/categories/${code}`} className="text-xs text-[var(--primary)] hover:underline">
          View all →
        </Link>
      </div>
      <p className="mt-1 text-xs text-[var(--muted)]">Group {firstGroup.code} top 3</p>
      {top3.length === 0 ? (
        <p className="mt-3 text-sm text-[var(--muted)]">No matches completed yet.</p>
      ) : (
        <ol className="mt-3 space-y-1 text-sm">
          {top3.map(r => (
            <li key={r.team.id} className="flex items-center justify-between">
              <span><span className="mr-2 font-mono text-[var(--muted)]">{r.position}</span>{r.team.name}</span>
              <span className="font-mono tabular-nums">{r.points ?? 0}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
