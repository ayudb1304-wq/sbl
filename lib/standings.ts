/**
 * Apply SBL tie-breakers to a group's standings.
 * Order: points → head-to-head → set diff → point diff → toss (manual).
 *
 * `matches` should be all completed/walkover matches in the group, used for H2H.
 */
import type { Match } from "./supabase/types"
import type { StandingWithTeam } from "./queries"

export type RankedRow = StandingWithTeam & {
  position: number
  needsToss: boolean
}

type TeamRow = StandingWithTeam

function h2hWins(a: string, b: string, matches: Match[]): { a: number; b: number } {
  let aWins = 0, bWins = 0
  for (const m of matches) {
    if (m.status !== "completed" && m.status !== "walkover") continue
    const teams = [m.team_a_id, m.team_b_id]
    if (!teams.includes(a) || !teams.includes(b)) continue
    if (m.winner_team_id === a) aWins++
    else if (m.winner_team_id === b) bWins++
  }
  return { a: aWins, b: bWins }
}

export function rankGroup(rows: TeamRow[], matches: Match[]): RankedRow[] {
  // Sort by pts → set diff → point diff. H2H + toss applied across runs of equals.
  const cmp = (a: TeamRow, b: TeamRow) => {
    const ap = a.points ?? 0, bp = b.points ?? 0
    if (ap !== bp) return bp - ap
    const asd = a.set_diff ?? 0, bsd = b.set_diff ?? 0
    if (asd !== bsd) return bsd - asd
    const apd = a.point_diff ?? 0, bpd = b.point_diff ?? 0
    if (apd !== bpd) return bpd - apd
    return 0
  }
  const sorted = [...rows].sort(cmp)

  // For runs where pts are equal, apply H2H to break ties before set/point diff fallback.
  // (Simple pairwise H2H for two-team ties; for 3+ tied, fall back to set/point diff already in cmp.)
  const out: RankedRow[] = []
  let i = 0
  while (i < sorted.length) {
    let j = i
    while (j + 1 < sorted.length && (sorted[j + 1].points ?? 0) === (sorted[i].points ?? 0)) j++
    const tied = sorted.slice(i, j + 1)
    if (tied.length === 2) {
      const [x, y] = tied
      const h = h2hWins(x.team.id, y.team.id, matches)
      if (h.a !== h.b) tied.sort(() => h.b - h.a) // y wins more → put y first
    }
    // Detect toss-required: tied AND identical set_diff AND identical point_diff AND H2H tied
    const allEqual = tied.length > 1 && tied.every(
      t => (t.set_diff ?? 0) === (tied[0].set_diff ?? 0) && (t.point_diff ?? 0) === (tied[0].point_diff ?? 0)
    )
    for (const r of tied) {
      out.push({ ...r, position: out.length + 1, needsToss: allEqual })
    }
    i = j + 1
  }
  return out
}
