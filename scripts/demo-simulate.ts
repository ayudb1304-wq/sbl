/**
 * Demo simulator — brings SBL 2026 to "early-afternoon" tournament state for
 * UI/UX testing. Idempotent: safe to re-run after `npm run seed:2026 -- --force`.
 *
 * What it produces (against current 87 group matches / 17 KO):
 *   - All MI group matches completed
 *   - All W group matches completed except one W-B match in_progress
 *     (showcases the recently-added Polka Dots group)
 *   - All MB group matches completed except one in_progress + one walkover
 *   - Group qualifiers confirmed for every group → bracket resolved (QFs populated)
 *   - 2 of 4 MB QFs + 2 of 4 MI QFs completed
 *   - 1 MB QF in_progress with a partial first-game score
 *   - 1 W SF completed → triggers W Final auto-fill
 *   - Season status flipped to 'live'
 *
 * Run:
 *   npm run seed:2026 -- --force   # reset
 *   npm run demo:simulate          # populate
 */
import { config as loadEnv } from "dotenv"
loadEnv({ path: ".env.local" })
import { createClient } from "@supabase/supabase-js"
import type { Database } from "../lib/supabase/types"

const SEASON_YEAR = 2026
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error("Missing env vars (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).")
  process.exit(1)
}
const sb = createClient<Database>(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } })

// ---------- helpers ----------
function rand<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)] }
function randInt(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min }

/** Pick a winner with a slight bias toward the lower seed number. */
function pickWinner(seedA: number | null, seedB: number | null): "a" | "b" {
  const a = seedA ?? 99
  const b = seedB ?? 99
  if (a === b) return Math.random() < 0.5 ? "a" : "b"
  // Lower seed = better. Better seed wins ~62% of the time.
  return Math.random() < (a < b ? 0.62 : 0.38) ? "a" : "b"
}

/** Final scores for a single-game group match in this category. */
function groupScores(catCode: string, winnerSide: "a" | "b"): { a: number; b: number } {
  const winnerScore = catCode === "MI" ? 21 : 15
  const loserScore = catCode === "MI" ? randInt(11, 19) : randInt(4, 13)
  return winnerSide === "a"
    ? { a: winnerScore, b: loserScore }
    : { a: loserScore, b: winnerScore }
}

/** Best-of-3 scoreline for a KO match (winner takes 2 games). */
function bo3Scores(winnerSide: "a" | "b"): { a: number; b: number }[] {
  // Either 2-0 (60%) or 2-1 (40%)
  const goesToThree = Math.random() < 0.4
  const games: { a: number; b: number }[] = []
  const winA = winnerSide === "a"

  function gameWonBy(side: "a" | "b"): { a: number; b: number } {
    const winner = 21
    const loser = randInt(12, 19)
    return side === "a" ? { a: winner, b: loser } : { a: loser, b: winner }
  }

  games.push(gameWonBy(winnerSide))
  if (goesToThree) {
    games.push(gameWonBy(winnerSide === "a" ? "b" : "a"))
    games.push(gameWonBy(winnerSide))
  } else {
    games.push(gameWonBy(winnerSide))
  }
  return games
}

async function fetchSeason() {
  const { data } = await sb.from("seasons").select("*").eq("year", SEASON_YEAR).maybeSingle()
  if (!data) throw new Error(`No SBL ${SEASON_YEAR} season found. Run seed:2026 first.`)
  return data
}

async function fetchAll(seasonId: string) {
  const [cats, groups, teams, matches, games] = await Promise.all([
    sb.from("categories").select("id, code, name").eq("season_id", seasonId),
    sb.from("groups").select("id, code, category_id, name, qualifiers_locked"),
    sb.from("teams").select("id, name, seed, group_id, category_id, season_id").eq("season_id", seasonId),
    sb.from("matches").select("id, season_id, category_id, group_id, stage, round_label, court, scheduled_at, team_a_id, team_b_id, status, winner_team_id, team_a_source, team_b_source").eq("season_id", seasonId),
    sb.from("games").select("id, match_id, game_number, team_a_score, team_b_score, status").order("game_number"),
  ])
  return {
    cats: cats.data ?? [],
    groups: groups.data ?? [],
    teams: teams.data ?? [],
    matches: matches.data ?? [],
    games: games.data ?? [],
  }
}

// ---------- simulation steps ----------

async function completeGroupMatch(args: {
  matchId: string
  gameId: string
  catCode: string
  teamAId: string
  teamBId: string
  seedA: number | null
  seedB: number | null
}) {
  const winner = pickWinner(args.seedA, args.seedB)
  const scores = groupScores(args.catCode, winner)
  const winnerTeamId = winner === "a" ? args.teamAId : args.teamBId

  await sb.from("games").update({
    team_a_score: scores.a,
    team_b_score: scores.b,
    status: "completed",
    started_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
  }).eq("id", args.gameId)

  await sb.from("matches").update({
    status: "completed",
    winner_team_id: winnerTeamId,
  }).eq("id", args.matchId)

  await sb.from("score_events").insert([
    { match_id: args.matchId, game_id: args.gameId, prev_a: 0, prev_b: 0, new_a: scores.a, new_b: scores.b, action: "score_update", actor_role: "scorer" },
    { match_id: args.matchId, action: "set_winner", actor_role: "scorer" },
  ])
}

async function setMatchInProgress(args: {
  matchId: string
  gameId: string
  catCode: string
}) {
  // Partial score, no winner yet
  const targetA = args.catCode === "MI" ? randInt(8, 14) : randInt(5, 11)
  const targetB = args.catCode === "MI" ? randInt(8, 14) : randInt(5, 11)
  await sb.from("games").update({
    team_a_score: targetA,
    team_b_score: targetB,
    status: "in_progress",
    started_at: new Date().toISOString(),
  }).eq("id", args.gameId)
  await sb.from("matches").update({ status: "in_progress" }).eq("id", args.matchId)
  await sb.from("score_events").insert({
    match_id: args.matchId, game_id: args.gameId, prev_a: 0, prev_b: 0, new_a: targetA, new_b: targetB, action: "score_update", actor_role: "scorer",
  })
}

async function declareWalkover(args: {
  matchId: string
  teamAId: string
  teamBId: string
}) {
  // Random winner; loser is the no-show
  const winnerTeamId = Math.random() < 0.5 ? args.teamAId : args.teamBId
  await sb.from("matches").update({
    status: "walkover",
    winner_team_id: winnerTeamId,
    walkover_reason: "Opponent did not show within 5 minutes of scheduled time",
  }).eq("id", args.matchId)
  await sb.from("score_events").insert({
    match_id: args.matchId, action: "walkover", actor_role: "scorer", notes: "demo walkover",
  })
}

async function completeKoMatch(args: {
  matchId: string
  games: { id: string; game_number: number }[]
  teamAId: string
  teamBId: string
  seedA: number | null
  seedB: number | null
}) {
  const winner = pickWinner(args.seedA, args.seedB)
  const winnerTeamId = winner === "a" ? args.teamAId : args.teamBId
  const sortedGames = [...args.games].sort((a, b) => a.game_number - b.game_number)
  const lines = bo3Scores(winner)

  for (let i = 0; i < sortedGames.length; i++) {
    const g = sortedGames[i]
    if (i < lines.length) {
      const s = lines[i]
      await sb.from("games").update({
        team_a_score: s.a, team_b_score: s.b,
        status: "completed",
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
      }).eq("id", g.id)
      await sb.from("score_events").insert({
        match_id: args.matchId, game_id: g.id, prev_a: 0, prev_b: 0, new_a: s.a, new_b: s.b, action: "score_update", actor_role: "scorer",
      })
    } else {
      // Unused 3rd game: leave pending 0-0
    }
  }
  await sb.from("matches").update({ status: "completed", winner_team_id: winnerTeamId }).eq("id", args.matchId)
  await sb.from("score_events").insert({ match_id: args.matchId, action: "set_winner", actor_role: "scorer" })
}

async function confirmGroupQualifiers(groupId: string, ranked: { teamId: string }[]) {
  if (ranked.length < 2) return
  await sb.from("groups").update({
    qualifier_1_team_id: ranked[0].teamId,
    qualifier_2_team_id: ranked[1].teamId,
    qualifiers_locked: true,
  }).eq("id", groupId)
}

// ---------- bracket resolver (mirrors lib/actions/admin.ts runResolver) ----------
type FeederSource =
  | { kind: "group_position"; category_code: string; group_code: string; position: 1 | 2 }
  | { kind: "match_winner"; category_code: string; round_label: string }

async function runResolver(seasonId: string) {
  const cats = await sb.from("categories").select("id, code").eq("season_id", seasonId)
  const codeById = new Map((cats.data ?? []).map(c => [c.id, c.code]))

  const groups = await sb.from("groups").select("id, code, category_id, qualifier_1_team_id, qualifier_2_team_id, qualifiers_locked")
  const groupByKey = new Map<string, { q1: string | null; q2: string | null; locked: boolean }>()
  for (const g of groups.data ?? []) {
    const code = codeById.get(g.category_id)
    if (!code) continue
    groupByKey.set(`${code}|${g.code}`, { q1: g.qualifier_1_team_id, q2: g.qualifier_2_team_id, locked: g.qualifiers_locked })
  }

  const all = await sb.from("matches").select("id, category_id, round_label, winner_team_id, team_a_id, team_b_id, team_a_source, team_b_source, stage").eq("season_id", seasonId)
  const winnerByKey = new Map<string, string | null>()
  for (const m of all.data ?? []) {
    const code = codeById.get(m.category_id)
    if (!code) continue
    winnerByKey.set(`${code}|${m.round_label}`, m.winner_team_id)
  }
  const koMatches = (all.data ?? []).filter(m => m.stage !== "group")

  function resolveOne(src: FeederSource): string | null {
    if (src.kind === "group_position") {
      const g = groupByKey.get(`${src.category_code}|${src.group_code}`)
      if (!g || !g.locked) return null
      return src.position === 1 ? g.q1 : g.q2
    }
    return winnerByKey.get(`${src.category_code}|${src.round_label}`) ?? null
  }

  for (let pass = 0; pass < 4; pass++) {
    let progress = 0
    for (const m of koMatches) {
      const updates: { team_a_id?: string; team_b_id?: string } = {}
      if (!m.team_a_id && m.team_a_source) {
        const t = resolveOne(m.team_a_source as unknown as FeederSource)
        if (t) updates.team_a_id = t
      }
      if (!m.team_b_id && m.team_b_source) {
        const t = resolveOne(m.team_b_source as unknown as FeederSource)
        if (t) updates.team_b_id = t
      }
      if (Object.keys(updates).length === 0) continue
      await sb.from("matches").update(updates).eq("id", m.id)
      if (updates.team_a_id) m.team_a_id = updates.team_a_id
      if (updates.team_b_id) m.team_b_id = updates.team_b_id
      progress++
    }
    if (progress === 0) break
  }
}

// ---------- main ----------
async function main() {
  console.log("Demo simulator starting...")
  const season = await fetchSeason()
  console.log(`  season: ${season.name} (${season.id})`)

  const data = await fetchAll(season.id)
  const teamMap = new Map(data.teams.map(t => [t.id, t]))
  const gamesByMatch = new Map<string, typeof data.games>()
  for (const g of data.games) {
    const list = gamesByMatch.get(g.match_id) ?? []
    list.push(g)
    gamesByMatch.set(g.match_id, list)
  }

  // Sanity: refuse if anything has already been simulated
  const alreadyDone = data.matches.filter(m => m.status !== "scheduled").length
  if (alreadyDone > 0) {
    console.error(`! ${alreadyDone} matches already have a non-scheduled status. Run \`npm run seed:2026 -- --force\` first to reset.`)
    process.exit(1)
  }

  // Step 1: complete most group matches
  console.log("Step 1: simulating group stage")
  const groupMatches = data.matches.filter(m => m.stage === "group" && m.team_a_id && m.team_b_id)
  // Special-case picks: one MB in_progress, one MB walkover, one W-B in_progress
  // (so the new Polka Dots group has a live match on the dashboard).
  const mbCat = data.cats.find(c => c.code === "MB")!
  const wCat  = data.cats.find(c => c.code === "W")!
  const mbGroupMatches = groupMatches.filter(m => m.category_id === mbCat.id)
  const wbGroup = data.groups.find(g => g.category_id === wCat.id && g.code === "B")
  const wbGroupMatches = wbGroup ? groupMatches.filter(m => m.group_id === wbGroup.id) : []

  const mbInProgress = mbGroupMatches[Math.floor(mbGroupMatches.length / 2)]
  const mbWalkover   = mbGroupMatches[mbGroupMatches.length - 2]
  const wbInProgress = wbGroupMatches[Math.floor(wbGroupMatches.length / 2)]

  let completedGroup = 0, inProgressGroup = 0, walkovers = 0
  for (const m of groupMatches) {
    const teamA = teamMap.get(m.team_a_id!)
    const teamB = teamMap.get(m.team_b_id!)
    const cat = data.cats.find(c => c.id === m.category_id)
    if (!teamA || !teamB || !cat) continue
    const games = gamesByMatch.get(m.id) ?? []
    if (games.length === 0) continue

    if (m.id === mbInProgress?.id || m.id === wbInProgress?.id) {
      await setMatchInProgress({ matchId: m.id, gameId: games[0].id, catCode: cat.code })
      inProgressGroup++
    } else if (m.id === mbWalkover?.id) {
      await declareWalkover({ matchId: m.id, teamAId: teamA.id, teamBId: teamB.id })
      walkovers++
    } else {
      await completeGroupMatch({
        matchId: m.id, gameId: games[0].id, catCode: cat.code,
        teamAId: teamA.id, teamBId: teamB.id, seedA: teamA.seed, seedB: teamB.seed,
      })
      completedGroup++
    }
  }
  console.log(`  group: ${completedGroup} completed, ${inProgressGroup} in_progress, ${walkovers} walkover`)

  // Step 2: confirm qualifiers per group (use already-set match results to compute standings)
  console.log("Step 2: confirming group qualifiers")
  // Re-fetch matches with their results
  const refreshed = await sb.from("matches").select("id, group_id, team_a_id, team_b_id, winner_team_id, status").eq("season_id", season.id).eq("stage", "group")
  const groupResults = new Map<string, Map<string, { wins: number; played: number }>>()
  for (const m of refreshed.data ?? []) {
    if (!m.group_id || !m.team_a_id || !m.team_b_id) continue
    if (m.status !== "completed" && m.status !== "walkover") continue
    const inner = groupResults.get(m.group_id) ?? new Map()
    const a = inner.get(m.team_a_id) ?? { wins: 0, played: 0 }
    const b = inner.get(m.team_b_id) ?? { wins: 0, played: 0 }
    a.played++; b.played++
    if (m.winner_team_id === m.team_a_id) a.wins++
    else if (m.winner_team_id === m.team_b_id) b.wins++
    inner.set(m.team_a_id, a); inner.set(m.team_b_id, b)
    groupResults.set(m.group_id, inner)
  }
  let qualifiersConfirmed = 0
  for (const g of data.groups) {
    const inner = groupResults.get(g.id)
    if (!inner) continue
    const ranked = [...inner.entries()]
      .map(([teamId, s]) => ({ teamId, ...s }))
      .sort((a, b) => b.wins - a.wins)
    if (ranked.length >= 2) {
      await confirmGroupQualifiers(g.id, ranked)
      qualifiersConfirmed++
    }
  }
  console.log(`  qualifiers locked for ${qualifiersConfirmed}/${data.groups.length} groups`)

  // Step 3: resolve bracket
  console.log("Step 3: resolving bracket (filling QF/SF/F team slots)")
  await runResolver(season.id)

  // Step 4: complete some KO matches to show advancement
  console.log("Step 4: simulating KO progress")
  const koAfter = await sb.from("matches").select("id, category_id, round_label, stage, team_a_id, team_b_id").eq("season_id", season.id).neq("stage", "group")
  const koMatches = koAfter.data ?? []

  const mbQfs = koMatches.filter(m => m.stage === "qf" && data.cats.find(c => c.id === m.category_id)?.code === "MB")
  const miQfs = koMatches.filter(m => m.stage === "qf" && data.cats.find(c => c.id === m.category_id)?.code === "MI")
  const wSfs  = koMatches.filter(m => m.stage === "sf" && data.cats.find(c => c.id === m.category_id)?.code === "W")

  // Complete first half of MB QFs
  let koCompleted = 0
  for (const qf of mbQfs.slice(0, 2)) {
    if (!qf.team_a_id || !qf.team_b_id) continue
    const games = gamesByMatch.get(qf.id) ?? []
    const teamA = teamMap.get(qf.team_a_id)
    const teamB = teamMap.get(qf.team_b_id)
    if (!teamA || !teamB) continue
    await completeKoMatch({
      matchId: qf.id, games: games.map(g => ({ id: g.id, game_number: g.game_number })),
      teamAId: teamA.id, teamBId: teamB.id, seedA: teamA.seed, seedB: teamB.seed,
    })
    koCompleted++
  }

  // Set one MB QF in progress with partial score
  let koInProgress = 0
  const inProgQf = mbQfs[2]
  if (inProgQf?.team_a_id && inProgQf?.team_b_id) {
    const games = (gamesByMatch.get(inProgQf.id) ?? []).sort((a, b) => a.game_number - b.game_number)
    if (games[0]) {
      await sb.from("games").update({
        team_a_score: 14, team_b_score: 11, status: "in_progress", started_at: new Date().toISOString(),
      }).eq("id", games[0].id)
      await sb.from("matches").update({ status: "in_progress" }).eq("id", inProgQf.id)
      await sb.from("score_events").insert({
        match_id: inProgQf.id, game_id: games[0].id, prev_a: 0, prev_b: 0, new_a: 14, new_b: 11, action: "score_update", actor_role: "scorer",
      })
      koInProgress++
    }
  }

  // Complete first 2 MI QFs
  for (const qf of miQfs.slice(0, 2)) {
    if (!qf.team_a_id || !qf.team_b_id) continue
    const games = gamesByMatch.get(qf.id) ?? []
    const teamA = teamMap.get(qf.team_a_id)
    const teamB = teamMap.get(qf.team_b_id)
    if (!teamA || !teamB) continue
    await completeKoMatch({
      matchId: qf.id, games: games.map(g => ({ id: g.id, game_number: g.game_number })),
      teamAId: teamA.id, teamBId: teamB.id, seedA: teamA.seed, seedB: teamB.seed,
    })
    koCompleted++
  }

  // Complete 1 of 2 W SFs to show Final auto-fill
  for (const sf of wSfs.slice(0, 1)) {
    if (!sf.team_a_id || !sf.team_b_id) continue
    const games = gamesByMatch.get(sf.id) ?? []
    const teamA = teamMap.get(sf.team_a_id)
    const teamB = teamMap.get(sf.team_b_id)
    if (!teamA || !teamB) continue
    await completeKoMatch({
      matchId: sf.id, games: games.map(g => ({ id: g.id, game_number: g.game_number })),
      teamAId: teamA.id, teamBId: teamB.id, seedA: teamA.seed, seedB: teamB.seed,
    })
    koCompleted++
  }

  // Re-resolve to advance any winners into next-round slots
  await runResolver(season.id)
  console.log(`  KO: ${koCompleted} completed, ${koInProgress} in_progress`)

  // Step 5: tag season as live
  await sb.from("seasons").update({ status: "live" }).eq("id", season.id)
  console.log("\nDone — open http://localhost:3000 to see the mid-tournament state.")
  console.log("Reset with: npm run seed:2026 -- --force")
}

main().catch(e => { console.error(e); process.exit(1) })
