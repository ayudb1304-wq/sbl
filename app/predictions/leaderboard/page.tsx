import Link from "next/link"
import { Container } from "@/components/Container"
import { Breadcrumbs } from "@/components/Breadcrumbs"
import { LeaderboardClient } from "@/components/LeaderboardClient"
import { getActiveSeason } from "@/lib/queries"
import { createAdminClient } from "@/lib/supabase/admin"
import { pointsForStage } from "@/lib/predictions"

export const dynamic = "force-dynamic"

export default async function LeaderboardPage() {
  const season = await getActiveSeason()
  if (!season) {
    return <Container><p className="text-sm text-[var(--muted)]">No active season.</p></Container>
  }
  const admin = createAdminClient()

  // All KO matches with their stage, status, winner
  const { data: koMatches } = await admin
    .from("matches")
    .select("id, stage, status, winner_team_id")
    .eq("season_id", season.id)
    .neq("stage", "group")
  const matchById = new Map((koMatches ?? []).map(m => [m.id, m]))

  // All predictions
  const { data: predictions } = await admin
    .from("predictions")
    .select("device_id, match_id, predicted_team_id")
  // All profiles (for display names)
  const { data: profiles } = await admin
    .from("participant_profiles")
    .select("device_id, display_name")
  const nameById = new Map((profiles ?? []).map(p => [p.device_id, p.display_name]))

  // Aggregate
  type Row = { deviceId: string; name: string; points: number; correct: number; total: number; pending: number }
  const rows = new Map<string, Row>()
  for (const p of predictions ?? []) {
    const m = matchById.get(p.match_id)
    if (!m) continue
    const r = rows.get(p.device_id) ?? {
      deviceId: p.device_id,
      name: nameById.get(p.device_id) ?? "(anonymous)",
      points: 0, correct: 0, total: 0, pending: 0,
    }
    r.total++
    if (m.status === "completed" || m.status === "walkover") {
      if (m.winner_team_id === p.predicted_team_id) {
        r.correct++
        r.points += pointsForStage(m.stage)
      }
    } else {
      r.pending++
    }
    rows.set(p.device_id, r)
  }
  const ranked = [...rows.values()]
    .filter(r => r.name !== "(anonymous)") // hide unnamed entries from leaderboard
    .sort((a, b) => b.points - a.points || b.correct - a.correct || a.name.localeCompare(b.name))

  return (
    <Container className="space-y-6">
      <header className="space-y-2">
        <Breadcrumbs items={[
          { label: "Home", href: "/" },
          { label: "Bracket challenge", href: "/predictions" },
          { label: "Leaderboard" },
        ]} />
        <h1 className="text-2xl font-semibold tracking-tight">Leaderboard</h1>
        <p className="text-sm text-[var(--muted)]">
          Scoring as picks resolve. {ranked.length} player{ranked.length === 1 ? "" : "s"} on the board.{" "}
          <Link href="/predictions" className="text-[var(--primary)] hover:underline">Make picks →</Link>
        </p>
      </header>

      <LeaderboardClient rows={ranked} />
    </Container>
  )
}
