import Link from "next/link"
import { Container } from "@/components/Container"
import { Breadcrumbs } from "@/components/Breadcrumbs"
import { NameGate } from "@/components/NameGate"
import { PredictionCard, type PredictionMatch } from "@/components/PredictionCard"
import { PredictionsLoader } from "@/components/PredictionsLoader"
import { getActiveSeason } from "@/lib/queries"
import { createAdminClient } from "@/lib/supabase/admin"
import { categoryShortName } from "@/lib/format"

export const dynamic = "force-dynamic"

export default async function PredictionsPage() {
  const season = await getActiveSeason()
  if (!season) {
    return <Container><p className="text-sm text-[var(--muted)]">No active season.</p></Container>
  }

  const admin = createAdminClient()
  const { data: cats } = await admin
    .from("categories")
    .select("id, code, name, sort_order")
    .eq("season_id", season.id)
    .order("sort_order")
  const { data: matches } = await admin
    .from("matches")
    .select(`
      id, stage, round_label, status, scheduled_at, category_id, winner_team_id,
      team_a:teams!matches_team_a_id_fkey ( id, name ),
      team_b:teams!matches_team_b_id_fkey ( id, name )
    `)
    .eq("season_id", season.id)
    .neq("stage", "group")
    .order("stage")
    .order("round_label")

  const koMatches = (matches ?? []) as unknown as Array<{
    id: string
    stage: string
    round_label: string
    status: string
    scheduled_at: string | null
    category_id: string
    winner_team_id: string | null
    team_a: { id: string; name: string } | null
    team_b: { id: string; name: string } | null
  }>
  const catById = new Map((cats ?? []).map(c => [c.id, c]))

  // Group by category for display
  const byCategory = new Map<string, typeof koMatches>()
  for (const m of koMatches) {
    const cat = catById.get(m.category_id)
    if (!cat) continue
    const list = byCategory.get(cat.code) ?? []
    list.push(m)
    byCategory.set(cat.code, list)
  }

  return (
    <Container className="space-y-6">
      <header className="space-y-2">
        <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Bracket challenge" }]} />
        <h1 className="text-2xl font-semibold tracking-tight">Bracket challenge</h1>
        <p className="text-sm text-[var(--muted)]">
          Pick the winner of every knockout match. <strong>1 pt</strong> per correct QF, <strong>2 pts</strong> per SF, <strong>4 pts</strong> for a Final. Picks lock once a match starts.
          Highest score on the <Link href="/predictions/leaderboard" className="text-[var(--primary)] hover:underline">leaderboard</Link> at the end of the day wins bragging rights.
        </p>
      </header>

      <NameGate>
        <PredictionsLoader matches={koMatches} catCodeById={Object.fromEntries((cats ?? []).map(c => [c.id, c.code]))} />
      </NameGate>

      {/* Categories with no KO matches yet */}
      {(cats ?? []).map(cat => {
        const list = byCategory.get(cat.code) ?? []
        if (list.length > 0) return null
        return (
          <section key={cat.id} className="rounded-xl border border-dashed border-[var(--border)] p-4">
            <h2 className="font-semibold">{categoryShortName(cat.code)}</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">No KO matches set up yet.</p>
          </section>
        )
      })}
    </Container>
  )
}
