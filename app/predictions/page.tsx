import Link from "next/link"
import { Container } from "@/components/Container"
import { Breadcrumbs } from "@/components/Breadcrumbs"
import { NameGate } from "@/components/NameGate"
import { PredictionsLoader } from "@/components/PredictionsLoader"
import { ChampionPicks, type ChampionCategory } from "@/components/ChampionPicks"
import { getActiveSeason } from "@/lib/queries"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

export default async function PredictionsPage() {
  const season = await getActiveSeason()
  if (!season) {
    return <Container><p className="text-sm text-[var(--muted)]">No active season.</p></Container>
  }

  const admin = createAdminClient()

  const [catsRes, koRes, teamsRes, finalsRes] = await Promise.all([
    admin.from("categories").select("id, code, name, sort_order").eq("season_id", season.id).order("sort_order"),
    admin.from("matches").select(`
      id, stage, round_label, status, scheduled_at, category_id, winner_team_id,
      team_a:teams!matches_team_a_id_fkey ( id, name ),
      team_b:teams!matches_team_b_id_fkey ( id, name )
    `).eq("season_id", season.id).neq("stage", "group").order("stage").order("round_label"),
    admin.from("teams").select("id, name, seed, category_id").eq("season_id", season.id),
    admin.from("matches").select("category_id, status, winner_team_id")
      .eq("season_id", season.id).eq("stage", "final"),
  ])

  const cats = catsRes.data ?? []
  const koMatches = (koRes.data ?? []) as unknown as Array<{
    id: string; stage: string; round_label: string; status: string
    scheduled_at: string | null; category_id: string; winner_team_id: string | null
    team_a: { id: string; name: string } | null
    team_b: { id: string; name: string } | null
  }>
  const teamsByCat = new Map<string, { id: string; name: string; seed: number | null }[]>()
  for (const t of (teamsRes.data ?? []) as { id: string; name: string; seed: number | null; category_id: string }[]) {
    const list = teamsByCat.get(t.category_id) ?? []
    list.push({ id: t.id, name: t.name, seed: t.seed })
    teamsByCat.set(t.category_id, list)
  }
  const finalByCat = new Map<string, { status: string; winnerId: string | null }>()
  for (const f of (finalsRes.data ?? []) as { category_id: string; status: string; winner_team_id: string | null }[]) {
    finalByCat.set(f.category_id, { status: f.status, winnerId: f.winner_team_id })
  }

  const championCats: ChampionCategory[] = cats.map(c => ({
    id: c.id,
    code: c.code,
    finalStatus: finalByCat.get(c.id)?.status ?? "scheduled",
    finalWinnerId: finalByCat.get(c.id)?.winnerId ?? null,
    teams: teamsByCat.get(c.id) ?? [],
  }))

  // Are any KO matches resolved enough to pick? (both teams set + scheduled)
  const anyPickable = koMatches.some(m => m.status === "scheduled" && m.team_a && m.team_b)

  return (
    <Container className="space-y-8">
      <header className="space-y-2">
        <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Bracket challenge" }]} />
        <h1 className="text-2xl font-semibold tracking-tight">Bracket challenge</h1>
        <p className="text-sm text-[var(--muted)]">
          Two ways to play. <strong>Pick the champions</strong> for each category — 4 pts per correct champion, lockable any time. Once the bracket resolves on match day, individual KO match picks open up too: <strong>1 pt</strong> QF, <strong>2 pts</strong> SF, <strong>4 pts</strong> Final.
          Climb the <Link href="/predictions/leaderboard" className="text-[var(--primary)] hover:underline">leaderboard</Link>.
        </p>
      </header>

      <NameGate>
        <div className="space-y-8">
          <ChampionPicks seasonId={season.id} categories={championCats} />

          <section className="space-y-3">
            <div className="flex items-baseline justify-between">
              <h2 className="text-lg font-semibold tracking-tight">Match-by-match picks</h2>
              <span className="text-xs text-[var(--muted)]">QF · SF · Final</span>
            </div>
            {anyPickable ? (
              <PredictionsLoader
                matches={koMatches}
                catCodeById={Object.fromEntries(cats.map(c => [c.id, c.code]))}
              />
            ) : (
              <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-6 text-center">
                <p className="text-sm text-[var(--muted-strong)]">
                  KO matches open up as the bracket resolves on match day — once group qualifiers are confirmed.
                </p>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  Until then, your champion picks above are the only thing on the line. Come back during the day for the per-match picks.
                </p>
              </div>
            )}
          </section>
        </div>
      </NameGate>
    </Container>
  )
}
