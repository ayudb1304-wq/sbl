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

  type Row = {
    deviceId: string
    name: string
    points: number
    correct: number
    picks: number      // total picks across champion + KO
    pending: number    // unresolved picks
    resolved: number   // picks already scored (correct + wrong)
  }
  const rows = new Map<string, Row>()
  function row(deviceId: string): Row {
    const existing = rows.get(deviceId)
    if (existing) return existing
    const r: Row = {
      deviceId,
      name: nameById.get(deviceId) ?? "(anonymous)",
      points: 0, correct: 0, picks: 0, pending: 0, resolved: 0,
    }
    rows.set(deviceId, r)
    return r
  }

  for (const p of predictionsRes.data ?? []) {
    const m = matchById.get(p.match_id)
    if (!m) continue
    const r = row(p.device_id)
    r.picks++
    if (m.status === "completed" || m.status === "walkover") {
      r.resolved++
      if (m.winner_team_id === p.predicted_team_id) {
        r.correct++
        r.points += pointsForStage(m.stage)
      }
    } else {
      r.pending++
    }
  }

  for (const p of championPicksRes.data ?? []) {
    const f = finalByCat.get(p.category_id)
    const r = row(p.device_id)
    r.picks++
    if (f && (f.status === "completed" || f.status === "walkover")) {
      r.resolved++
      if (f.winnerId === p.predicted_team_id) {
        r.correct++
        r.points += CHAMPION_POINTS
      }
    } else {
      r.pending++
    }
  }

  // Sort: points desc → correct desc → picks desc → alpha. With no resolved
  // picks yet (pre-tournament), the picks tiebreaker effectively ranks by
  // engagement: most picks made = top of the board.
  const ranked = [...rows.values()]
    .filter(r => r.name !== "(anonymous)")
    .sort((a, b) =>
      b.points - a.points
      || b.correct - a.correct
      || b.picks - a.picks
      || a.name.localeCompare(b.name)
    )

  const anyResolved = ranked.some(r => r.resolved > 0)
  const totalPicks = ranked.reduce((s, r) => s + r.picks, 0)
  const playerCount = ranked.length

  let phaseLabel: string
  if (playerCount === 0) {
    phaseLabel = "No picks yet — be the first to play."
  } else if (!anyResolved) {
    phaseLabel = "Pre-tournament · ranked by picks made until matches start scoring."
  } else {
    phaseLabel = `Live scoring · ${playerCount} player${playerCount === 1 ? "" : "s"} on the board.`
  }

  return (
    <Container className="space-y-6">
      <header className="space-y-2">
        <Breadcrumbs items={[
          { label: "Home", href: "/" },
          { label: "Bracket challenge", href: "/predictions" },
          { label: "Leaderboard" },
        ]} />
        <h1 className="text-2xl font-semibold tracking-tight">Leaderboard</h1>
        <p className="text-sm text-[var(--muted)]">{phaseLabel}</p>
        {playerCount > 0 && (
          <div className="flex flex-wrap gap-x-6 gap-y-1 pt-1 text-sm text-[var(--muted)]">
            <span><span className="font-semibold text-[var(--text)]">{playerCount}</span> {playerCount === 1 ? "player" : "players"}</span>
            <span><span className="font-semibold text-[var(--text)]">{totalPicks}</span> picks made</span>
            <Link href="/predictions" className="text-[var(--primary)] hover:underline">Make picks →</Link>
          </div>
        )}
      </header>

      <LeaderboardClient rows={ranked} pointsActive={anyResolved} />
    </Container>
  )
}
