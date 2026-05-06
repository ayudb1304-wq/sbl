/**
 * SBL 2026 fixture seeder.
 *
 * Reads data/SBL_2026_Fixtures.xlsx and idempotently populates Supabase with:
 *   - 1 season (SBL 2026)
 *   - 3 categories (MB / MI / W) with their format rules
 *   - 10 groups
 *   - ~88 unique players (deduped on full_name+company)
 *   - 44 teams + team_players links
 *   - ~88 group-stage matches with court + scheduled_at
 *   - KO match shells (QF/SF/F) with team_a_source/team_b_source feeder JSON
 *   - 1 game row per group match, 3 game rows per KO match
 *
 * Run:
 *   npm run seed:2026          # safe: refuses if SBL 2026 already has data
 *   npm run seed:2026 -- --force   # destructive: deletes the SBL 2026 season then reseeds
 */
import { config as loadEnv } from 'dotenv'
loadEnv({ path: '.env.local' })
import { createClient } from '@supabase/supabase-js'
import * as XLSX from 'xlsx'
import path from 'node:path'

// ---------- Config ----------
const SEASON_YEAR = 2026
const SEASON_NAME = 'SBL 2026'
const TOURNAMENT_DATE = '2026-09-13' // Saturday — admin can edit later via dashboard
const TZ_OFFSET = '+05:30'           // IST (Bengaluru)
const FIXTURES_PATH = path.join(process.cwd(), 'data', 'SBL_2026_Fixtures.xlsx')

const FORCE = process.argv.includes('--force')

const CAT_NAME_TO_CODE: Record<string, string> = {
  "Men's Beginner": 'MB',
  "Men's Intermediate": 'MI',
  "Women's": 'W',
}

const CATEGORIES = [
  {
    code: 'MB',
    name: "Men's Beginner",
    group_format: { games: 1, points_to: 15, cap: null },
    ko_format: { best_of: 3, points_to: 21, cap: 30 },
    has_qf: true,
    sort_order: 1,
  },
  {
    code: 'MI',
    name: "Men's Intermediate",
    group_format: { games: 1, points_to: 21, cap: 30 },
    ko_format: { best_of: 3, points_to: 21, cap: 30 },
    has_qf: true,
    sort_order: 2,
  },
  {
    code: 'W',
    name: "Women's",
    group_format: { games: 1, points_to: 15, cap: null },
    ko_format: { best_of: 3, points_to: 21, cap: 30 },
    has_qf: false,
    sort_order: 3,
  },
] as const

// ---------- Supabase ----------
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}
const sb = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } })

// ---------- Helpers ----------
type Row = (string | number | null)[]

function rowsOf(wb: XLSX.WorkBook, sheetName: string): Row[] {
  const sheet = wb.Sheets[sheetName]
  if (!sheet) throw new Error(`Sheet not found: ${sheetName}`)
  return XLSX.utils.sheet_to_json<Row>(sheet, { header: 1, defval: null })
}

function timeRangeToTimestamp(range: string): { startsAt: string; durationMin: number } {
  const [start, end] = range.split('-').map(s => s.trim())
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  const duration = eh * 60 + em - (sh * 60 + sm)
  return { startsAt: `${TOURNAMENT_DATE}T${start}:00${TZ_OFFSET}`, durationMin: duration }
}

function splitVs(s: string): [string, string] {
  const parts = s.split(/\s+vs\s+/i).map(p => p.trim())
  if (parts.length !== 2) throw new Error(`Cannot split on 'vs': "${s}"`)
  return [parts[0], parts[1]]
}

function splitPlayers(s: string): string[] {
  return s.split(/\s*&\s*/).map(p => p.trim()).filter(Boolean)
}

function groupCodeFromHeader(s: string): string | null {
  // "Group A (MBA)" / "Group A — MBA" / "Group A"
  const m = s.match(/Group\s+([A-D])/i)
  return m ? m[1].toUpperCase() : null
}

// ---------- Step 1: Season + Categories + Groups + Teams + Players ----------
type ParsedTeam = {
  category_code: string
  group_code: string
  seed: number
  name: string
  players_str: string
  company: string | null
}

function parseTeamsAndGroups(rows: Row[]): {
  groups: { category_code: string; code: string; name: string; sort_order: number }[]
  teams: ParsedTeam[]
} {
  const groups: { category_code: string; code: string; name: string; sort_order: number }[] = []
  const teams: ParsedTeam[] = []
  const seenGroups = new Set<string>()
  let currentCat: string | null = null

  for (const row of rows) {
    const c0 = row[0]

    // Update category context on section header rows: "Men's Beginner — 4 groups ..."
    if (typeof c0 === 'string') {
      for (const [name, code] of Object.entries(CAT_NAME_TO_CODE)) {
        if (c0.startsWith(name + ' —')) {
          currentCat = code
          break
        }
      }
    }

    // Team data row: c0 = "Group A (MBA)", c1 = seed (number), c2 = team name
    if (
      typeof c0 === 'string' &&
      typeof row[1] === 'number' &&
      typeof row[2] === 'string' &&
      currentCat
    ) {
      const gc = groupCodeFromHeader(c0)
      if (!gc) continue
      const groupKey = `${currentCat}|${gc}`
      if (!seenGroups.has(groupKey)) {
        seenGroups.add(groupKey)
        groups.push({
          category_code: currentCat,
          code: gc,
          name: c0,
          sort_order: gc.charCodeAt(0) - 'A'.charCodeAt(0) + 1,
        })
      }
      teams.push({
        category_code: currentCat,
        group_code: gc,
        seed: row[1],
        name: row[2],
        players_str: String(row[3] ?? ''),
        company: row[4] ? String(row[4]) : null,
      })
    }
  }

  return { groups, teams }
}

// ---------- Step 2: Group-stage matches ----------
type ParsedGroupMatch = {
  category_code: string
  group_code: string
  round_label: string
  court: string
  starts_at: string
  duration_min: number
  team_a_name: string
  team_b_name: string
}

function parseGroupMatches(rows: Row[]): ParsedGroupMatch[] {
  const matches: ParsedGroupMatch[] = []
  for (const row of rows) {
    const [, time, court, catName, groupLabel, matchup, round] = row
    if (typeof time !== 'string' || typeof court !== 'string' || typeof catName !== 'string') continue
    if (typeof matchup !== 'string' || typeof round !== 'string') continue
    const cat = CAT_NAME_TO_CODE[catName]
    if (!cat) continue
    const groupCode = groupCodeFromHeader(String(groupLabel ?? ''))
    if (!groupCode) continue
    const [a, b] = splitVs(matchup)
    const { startsAt, durationMin } = timeRangeToTimestamp(time)
    matches.push({
      category_code: cat,
      group_code: groupCode,
      round_label: round,
      court,
      starts_at: startsAt,
      duration_min: durationMin,
      team_a_name: a,
      team_b_name: b,
    })
  }
  return matches
}

// ---------- Step 3: KO match shells ----------
type Source =
  | { kind: 'group_position'; category_code: string; group_code: string; position: 1 | 2 }
  | { kind: 'match_winner'; category_code: string; round_label: string }

type ParsedKoMatch = {
  category_code: string
  stage: 'qf' | 'sf' | 'final'
  round_label: string
  court: string
  starts_at: string
  duration_min: number
  source_a: Source
  source_b: Source
}

function parseFeeder(text: string, currentCat: string): Source {
  // "MB-A Winner" / "MB-D Runner-up"
  const m1 = text.match(/^(MB|MI|W)-([A-D])\s+(Winner|Runner-up)$/i)
  if (m1) {
    return {
      kind: 'group_position',
      category_code: m1[1].toUpperCase(),
      group_code: m1[2].toUpperCase(),
      position: m1[3].toLowerCase() === 'winner' ? 1 : 2,
    }
  }
  // "QF1 Winner" / "SF1 Winner"
  const m2 = text.match(/^(QF|SF)(\d+)\s+Winner$/i)
  if (m2) {
    return {
      kind: 'match_winner',
      category_code: currentCat,
      round_label: `${m2[1].toUpperCase()}${m2[2]}`,
    }
  }
  throw new Error(`Cannot parse feeder: "${text}"`)
}

function parseMatchup(matchup: string, currentCat: string): [Source, Source] {
  // Strip optional "Category Name Final: " prefix
  const cleaned = matchup.replace(/^(Men's Beginner|Men's Intermediate|Women's)\s+Final:\s+/i, '')
  const [a, b] = splitVs(cleaned)
  return [parseFeeder(a, currentCat), parseFeeder(b, currentCat)]
}

function parseKnockouts(rows: Row[]): ParsedKoMatch[] {
  const matches: ParsedKoMatch[] = []
  let currentCat: string | null = null
  for (const row of rows) {
    const c0 = row[0]
    if (typeof c0 === 'string') {
      // Section header: "Men's Beginner — Knockout (...)"
      for (const [name, code] of Object.entries(CAT_NAME_TO_CODE)) {
        if (c0.startsWith(name + ' —')) {
          currentCat = code
          break
        }
      }
      // Match row: stage label
      const stageMatch = c0.match(/^(Quarterfinal|Semifinal|FINAL)\s*(\d+)?$/i)
      if (stageMatch && currentCat) {
        const [, stageWord, num] = stageMatch
        const stage: 'qf' | 'sf' | 'final' =
          stageWord.toLowerCase() === 'quarterfinal' ? 'qf' :
          stageWord.toLowerCase() === 'semifinal' ? 'sf' : 'final'
        const round_label = stage === 'final' ? 'F' : `${stage.toUpperCase()}${num}`
        const time = row[1]
        const court = row[2]
        const matchup = row[3]
        if (typeof time !== 'string' || typeof court !== 'string' || typeof matchup !== 'string') continue
        const { startsAt, durationMin } = timeRangeToTimestamp(time)
        const [source_a, source_b] = parseMatchup(matchup, currentCat)
        matches.push({
          category_code: currentCat,
          stage,
          round_label,
          court,
          starts_at: startsAt,
          duration_min: durationMin,
          source_a,
          source_b,
        })
      }
    }
  }
  return matches
}

// ---------- Insert helpers ----------
async function check(label: string, res: { error: unknown }) {
  if (res.error) {
    console.error(`✗ ${label}:`, res.error)
    process.exit(1)
  }
}

async function getOrCreateSeason(): Promise<string> {
  const { data: existing } = await sb.from('seasons').select('id, year').eq('year', SEASON_YEAR).maybeSingle()

  if (existing && !FORCE) {
    // Check if any matches/teams already exist
    const { count } = await sb.from('teams').select('id', { count: 'exact', head: true }).eq('season_id', existing.id)
    if ((count ?? 0) > 0) {
      console.error(`✗ SBL ${SEASON_YEAR} already has ${count} teams. Re-run with --force to wipe and reseed.`)
      process.exit(1)
    }
    return existing.id
  }

  if (existing && FORCE) {
    console.log(`! --force: deleting existing SBL ${SEASON_YEAR} (cascades through teams, matches, games)`)
    await check('delete season', await sb.from('seasons').delete().eq('id', existing.id))
  }

  const { data, error } = await sb
    .from('seasons')
    .insert({
      year: SEASON_YEAR,
      name: SEASON_NAME,
      status: 'upcoming',
      is_active: true,
      starts_at: `${TOURNAMENT_DATE}T09:00:00${TZ_OFFSET}`,
      ends_at: `${TOURNAMENT_DATE}T17:00:00${TZ_OFFSET}`,
    })
    .select('id')
    .single()
  if (error) throw error
  return data.id
}

async function upsertCategories(seasonId: string): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  for (const c of CATEGORIES) {
    const { data, error } = await sb
      .from('categories')
      .upsert({ season_id: seasonId, ...c }, { onConflict: 'season_id,code' })
      .select('id, code')
      .single()
    if (error) throw error
    map.set(data.code, data.id)
  }
  return map
}

async function insertGroups(catMap: Map<string, string>, parsed: ReturnType<typeof parseTeamsAndGroups>['groups']): Promise<Map<string, string>> {
  const rows = parsed.map(g => ({
    category_id: catMap.get(g.category_code)!,
    code: g.code,
    name: g.name,
    sort_order: g.sort_order,
  }))
  const { data, error } = await sb.from('groups').upsert(rows, { onConflict: 'category_id,code' }).select('id, category_id, code')
  if (error) throw error
  const map = new Map<string, string>()
  for (const g of data) {
    const catCode = [...catMap.entries()].find(([, id]) => id === g.category_id)?.[0]
    if (catCode) map.set(`${catCode}|${g.code}`, g.id)
  }
  return map
}

async function upsertPlayers(parsedTeams: ParsedTeam[]): Promise<Map<string, string>> {
  // Dedupe by (full_name, company)
  const seen = new Map<string, { full_name: string; company: string | null }>()
  for (const t of parsedTeams) {
    for (const p of splitPlayers(t.players_str)) {
      const key = `${p}|${t.company ?? ''}`
      if (!seen.has(key)) seen.set(key, { full_name: p, company: t.company })
    }
  }
  const rows = [...seen.values()]
  // Upsert in batches; unique on (full_name, company)
  const { data, error } = await sb.from('players').upsert(rows, { onConflict: 'full_name,company' }).select('id, full_name, company')
  if (error) throw error
  const map = new Map<string, string>()
  for (const p of data) map.set(`${p.full_name}|${p.company ?? ''}`, p.id)
  return map
}

async function insertTeams(
  seasonId: string,
  catMap: Map<string, string>,
  groupMap: Map<string, string>,
  parsedTeams: ParsedTeam[],
): Promise<Map<string, string>> {
  const rows = parsedTeams.map(t => ({
    season_id: seasonId,
    category_id: catMap.get(t.category_code)!,
    group_id: groupMap.get(`${t.category_code}|${t.group_code}`)!,
    name: t.name,
    seed: t.seed,
    company: t.company,
  }))
  const { data, error } = await sb.from('teams').upsert(rows, { onConflict: 'season_id,category_id,name' }).select('id, category_id, name')
  if (error) throw error
  const map = new Map<string, string>()
  for (const team of data) {
    const catCode = [...catMap.entries()].find(([, id]) => id === team.category_id)?.[0]
    if (catCode) map.set(`${catCode}|${team.name}`, team.id)
  }
  return map
}

async function insertTeamPlayers(
  parsedTeams: ParsedTeam[],
  teamMap: Map<string, string>,
  playerMap: Map<string, string>,
) {
  const rows: { team_id: string; player_id: string }[] = []
  for (const t of parsedTeams) {
    const teamId = teamMap.get(`${t.category_code}|${t.name}`)!
    for (const p of splitPlayers(t.players_str)) {
      const playerId = playerMap.get(`${p}|${t.company ?? ''}`)
      if (!playerId) throw new Error(`Player not found: ${p} (${t.company})`)
      rows.push({ team_id: teamId, player_id: playerId })
    }
  }
  // Upsert (PK is composite — onConflict do nothing)
  const { error } = await sb.from('team_players').upsert(rows, { onConflict: 'team_id,player_id', ignoreDuplicates: true })
  if (error) throw error
}

async function insertGroupMatches(
  seasonId: string,
  catMap: Map<string, string>,
  groupMap: Map<string, string>,
  teamMap: Map<string, string>,
  parsed: ParsedGroupMatch[],
): Promise<string[]> {
  const rows = parsed.map(m => {
    const teamA = teamMap.get(`${m.category_code}|${m.team_a_name}`)
    const teamB = teamMap.get(`${m.category_code}|${m.team_b_name}`)
    if (!teamA || !teamB) {
      throw new Error(`Match team lookup failed: ${m.team_a_name} vs ${m.team_b_name} (${m.category_code})`)
    }
    return {
      season_id: seasonId,
      category_id: catMap.get(m.category_code)!,
      group_id: groupMap.get(`${m.category_code}|${m.group_code}`)!,
      stage: 'group' as const,
      round_label: m.round_label,
      court: m.court,
      scheduled_at: m.starts_at,
      duration_minutes: m.duration_min,
      team_a_id: teamA,
      team_b_id: teamB,
      status: 'scheduled' as const,
    }
  })
  const { data, error } = await sb.from('matches').insert(rows).select('id')
  if (error) throw error
  return data.map(r => r.id)
}

async function insertKoMatches(
  seasonId: string,
  catMap: Map<string, string>,
  parsed: ParsedKoMatch[],
): Promise<string[]> {
  const rows = parsed.map(m => ({
    season_id: seasonId,
    category_id: catMap.get(m.category_code)!,
    stage: m.stage,
    round_label: m.round_label,
    court: m.court,
    scheduled_at: m.starts_at,
    duration_minutes: m.duration_min,
    team_a_source: m.source_a,
    team_b_source: m.source_b,
    status: 'scheduled' as const,
  }))
  const { data, error } = await sb.from('matches').insert(rows).select('id')
  if (error) throw error
  return data.map(r => r.id)
}

async function createGames(matchIds: string[], gameCount: 1 | 3) {
  const rows = matchIds.flatMap(mid =>
    Array.from({ length: gameCount }, (_, i) => ({
      match_id: mid,
      game_number: i + 1,
      team_a_score: 0,
      team_b_score: 0,
      status: 'pending' as const,
    })),
  )
  const { error } = await sb.from('games').insert(rows)
  if (error) throw error
}

// ---------- Main ----------
async function main() {
  console.log(`Reading ${FIXTURES_PATH} ...`)
  const wb = XLSX.readFile(FIXTURES_PATH)

  console.log('Step 1: season + categories')
  const seasonId = await getOrCreateSeason()
  const catMap = await upsertCategories(seasonId)

  console.log('Step 2: parsing teams & groups')
  const { groups, teams: parsedTeams } = parseTeamsAndGroups(rowsOf(wb, 'Teams & Groups'))
  console.log(`  parsed ${groups.length} groups, ${parsedTeams.length} teams`)

  console.log('Step 3: groups, players, teams, team_players')
  const groupMap = await insertGroups(catMap, groups)
  const playerMap = await upsertPlayers(parsedTeams)
  console.log(`  inserted ${playerMap.size} players (deduped)`)
  const teamMap = await insertTeams(seasonId, catMap, groupMap, parsedTeams)
  await insertTeamPlayers(parsedTeams, teamMap, playerMap)

  console.log('Step 4: group-stage matches')
  const groupMatches = parseGroupMatches(rowsOf(wb, 'Group Stage Schedule'))
  console.log(`  parsed ${groupMatches.length} group matches`)
  const groupMatchIds = await insertGroupMatches(seasonId, catMap, groupMap, teamMap, groupMatches)
  await createGames(groupMatchIds, 1)

  console.log('Step 5: KO match shells')
  const koMatches = parseKnockouts(rowsOf(wb, 'Knockouts'))
  console.log(`  parsed ${koMatches.length} KO matches`)
  const koMatchIds = await insertKoMatches(seasonId, catMap, koMatches)
  await createGames(koMatchIds, 3)

  console.log(`\nDone. SBL ${SEASON_YEAR} seeded.`)
  console.log(`  ${parsedTeams.length} teams, ${playerMap.size} players, ${groupMatches.length + koMatches.length} matches.`)
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
