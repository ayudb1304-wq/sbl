import Link from "next/link"
import { notFound } from "next/navigation"
import { Container } from "@/components/Container"
import { MatchCard } from "@/components/MatchCard"
import { StandingsTable } from "@/components/StandingsTable"
import { LiveScoreSubscriber } from "@/components/LiveScoreSubscriber"
import {
  getActiveSeason, getCategoryByCode, getSeasonMatches, getStandingsForGroup,
} from "@/lib/queries"
import { rankGroup } from "@/lib/standings"
import { categoryShortName } from "@/lib/format"

export const dynamic = "force-dynamic"

export default async function CategoryPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const season = await getActiveSeason()
  if (!season) return notFound()

  const category = await getCategoryByCode(season.id, code.toUpperCase())
  if (!category) return notFound()

  const allMatches = await getSeasonMatches(season.id)
  const catMatches = allMatches.filter(m => m.category_id === category.id)
  const groups = [...category.groups].sort((a, b) => a.sort_order - b.sort_order)

  return (
    <Container className="space-y-8">
      <LiveScoreSubscriber />
      <header>
        <p className="text-sm text-[var(--muted)]">{season.name}</p>
        <h1 className="text-2xl font-semibold tracking-tight">{categoryShortName(category.code)}</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          {groups.length} groups · {catMatches.length} matches scheduled ·{" "}
          <Link href={`/bracket/${category.code}`} className="text-[var(--primary)] hover:underline">View bracket →</Link>
        </p>
      </header>

      <section className="space-y-6">
        {groups.map(group => (
          <GroupBlock
            key={group.id}
            group={group}
            categoryCode={category.code}
            allMatches={catMatches}
          />
        ))}
      </section>
    </Container>
  )
}

async function GroupBlock({
  group, categoryCode, allMatches,
}: {
  group: { id: string; code: string; name: string }
  categoryCode: string
  allMatches: Awaited<ReturnType<typeof getSeasonMatches>>
}) {
  const standings = await getStandingsForGroup(group.id)
  const groupMatches = allMatches.filter(m => m.group_id === group.id)
  const ranked = rankGroup(standings, groupMatches)
  // For display: highlight top 2 as qualifiers (works for all current groups)
  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-semibold">{group.name}</h2>
        <Link href={`/groups/${group.id}`} className="text-xs text-[var(--primary)] hover:underline">
          Group detail →
        </Link>
      </div>
      <StandingsTable rows={ranked} qualifyTopN={2} />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {groupMatches.map(m => <MatchCard key={m.id} m={m} />)}
      </div>
    </div>
  )
}
