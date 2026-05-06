import Link from "next/link"
import { notFound } from "next/navigation"
import { Container } from "@/components/Container"
import { StandingsTable } from "@/components/StandingsTable"
import { GroupQualifierForm } from "@/components/admin/GroupQualifierForm"
import { ResolveBracketButton } from "@/components/admin/ResolveBracketButton"
import {
  getActiveSeason, getCategoryByCode, getMatchesForGroup, getStandingsForGroup,
} from "@/lib/queries"
import { rankGroup } from "@/lib/standings"
import { categoryShortName } from "@/lib/format"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

const CATS = ["MB", "MI", "W"]

export default async function AdminCategoryPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const codeUpper = code.toUpperCase()
  if (!CATS.includes(codeUpper)) return notFound()

  const season = await getActiveSeason()
  if (!season) return notFound()
  const category = await getCategoryByCode(season.id, codeUpper)
  if (!category) return notFound()

  // Pull qualifier state for each group + teams in each group
  const admin = createAdminClient()
  const { data: groupsRaw } = await admin
    .from("groups")
    .select("id, code, name, qualifier_1_team_id, qualifier_2_team_id, qualifiers_locked, sort_order, teams ( id, name, seed )")
    .eq("category_id", category.id)
    .order("sort_order")
  const groups = (groupsRaw ?? []) as unknown as {
    id: string
    code: string
    name: string
    qualifier_1_team_id: string | null
    qualifier_2_team_id: string | null
    qualifiers_locked: boolean
    sort_order: number
    teams: { id: string; name: string; seed: number | null }[]
  }[]

  return (
    <Container className="space-y-8">
      <header>
        <p className="text-sm text-[var(--muted)]">{season.name} · admin</p>
        <h1 className="text-2xl font-semibold tracking-tight">{categoryShortName(codeUpper)}</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Confirm each group&apos;s top-2 qualifiers, then re-resolve the bracket. Qualifiers default to the live ranking — override only if a toss decides a tie.{" "}
          <Link href={`/categories/${codeUpper}`} className="text-[var(--primary)] hover:underline">Public view ↗</Link>
        </p>
        <div className="mt-3">
          <ResolveBracketButton seasonId={season.id} categoryId={category.id} label={`Resolve ${codeUpper} bracket`} />
        </div>
      </header>

      <div className="space-y-8">
        {groups.map(g => (
          <GroupAdminBlock key={g.id} group={g} />
        ))}
      </div>
    </Container>
  )
}

async function GroupAdminBlock({
  group,
}: {
  group: {
    id: string
    code: string
    name: string
    qualifier_1_team_id: string | null
    qualifier_2_team_id: string | null
    qualifiers_locked: boolean
    teams: { id: string; name: string; seed: number | null }[]
  }
}) {
  const [standings, matches] = await Promise.all([
    getStandingsForGroup(group.id),
    getMatchesForGroup(group.id),
  ])
  const ranked = rankGroup(standings, matches)

  // Default qualifier picks: top of computed ranking.
  const computedQ1 = ranked[0]?.team.id ?? group.teams[0]?.id ?? null
  const computedQ2 = ranked[1]?.team.id ?? group.teams[1]?.id ?? null

  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-semibold">{group.name}</h2>
        <Link href={`/groups/${group.id}`} className="text-xs text-[var(--primary)] hover:underline">
          Public group page →
        </Link>
      </div>
      <StandingsTable rows={ranked} qualifyTopN={2} />
      <GroupQualifierForm
        groupId={group.id}
        teams={[...group.teams].sort((a, b) => (a.seed ?? 99) - (b.seed ?? 99))}
        defaultQ1={group.qualifier_1_team_id ?? computedQ1}
        defaultQ2={group.qualifier_2_team_id ?? computedQ2}
        locked={group.qualifiers_locked}
      />
    </section>
  )
}
