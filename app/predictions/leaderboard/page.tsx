import Link from "next/link"
import { Container } from "@/components/Container"
import { Breadcrumbs } from "@/components/Breadcrumbs"
import { LeaderboardClient } from "@/components/LeaderboardClient"
import { getActiveSeason } from "@/lib/queries"
import { createAdminClient } from "@/lib/supabase/admin"
import { pointsForStage } from "@/lib/predictions"

export const dynamic = "force-dynamic"
const CHAMPION_POINTS = 4

export default async function LeaderboardPage() {
  const season = await getActiveSeason()
  if (!season) {
    return <Container><p className="text-sm text-[var(--muted)]">No active season.</p></Container>
  }
  const admin = createAdminClient()

  const [koRes, finalsRes, predictionsRes, championPicksRes, profilesRes] = await Promise.all([
    admin.from("matches").select("id, stage, status, winner_team_id").eq("season_id", season.id).neq("stage", "group"),
    admin.from("matches").select("category_id, status, winner_team_id").eq("season_id", season.id).eq("stage", "final"),
    admin.from("predictions").select("device_id, match_id, predicted_team_id"),
    admin.from("champion_picks").select("device_id, category_id, predicted_team_id").eq("season_id", season.id),
    admin.from("participant_profiles").select("device_id, display_name"),
  ])

  const matchById = new Map((koRes.data ?? []).map(m => [m.id, m]))
  const finalByCat = new Map<string, { status: string; winnerId: string | null }>()
  for (const f of (finalsRes.data ?? []) as { category_id: string; status: string; winner_team_id: string | null }[]) {
    finalByCat.set(f.category_id, { status: f.status, winnerId: f.winner_team_id })
  }
  const nameById = new Map((profilesRes.data ?? []).map(p => [p.device_id, p.display_name]))

  type Row = { deviceId: string; name: string; points: number; correct: number; total: number; pending: number }
  const rows = new Map<string, Row>()
  function row(deviceId: string): Row {
    const existing = rows.get(deviceId)
    if (existing) return existing
    const r: Row = {
      deviceId,
      name: nameById.get(deviceId) ?? "(anonymous)",
      points: 0, correct: 0, total: 0, pending: 0,
    }
    rows.set(deviceId, r)
    return r
  }

  // Score per-match KO predictions
  for (const p of predictionsRes.data ?? []) {
    const m = matchById.get(p.match_id)
    if (!m) continue
    const r = row(p.device_id)
    r.total++
    if (m.status === "completed" || m.status === "walkover") {
      if (m.winner_team_id === p.predicted_team_id) {
        r.correct++
        r.points += pointsForStage(m.stage)
      }
    } else {
      r.pending++
    }
  }

  // Score champion picks
  for (const p of championPicksRes.data ?? []) {
    const f = finalByCat.get(p.category_id)
    const r = row(p.device_id)
    r.total++
    if (f && (f.status === "completed" || f.status === "walkover")) {
      if (f.winnerId === p.predicted_team_id) {
        r.correct++
        r.points += CHAMPION_POINTS
      }
    } else {
      r.pending++
    }
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
          Champion picks + KO match picks. {ranked.length} player{ranked.length === 1 ? "" : "s"} on the board.{" "}
          <Link href="/predictions" className="text-[var(--primary)] hover:underline">Make picks →</Link>
        </p>
      </header>

      <LeaderboardClient rows={ranked} />
    </Container>
  )
}
