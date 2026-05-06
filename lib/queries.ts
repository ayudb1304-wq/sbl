import { createClient } from "./supabase/server"
import type { FeederSource, Match, Season, Standing } from "./supabase/types"

/**
 * supabase-js relationship-traversal types don't always reconcile with our
 * Database type. Rather than fight inference, every helper here returns a
 * hand-narrowed shape — pages get correct types and queries stay readable.
 */

export type CategoryWithGroups = {
  id: string
  season_id: string
  code: string
  name: string
  has_qf: boolean
  sort_order: number
  groups: { id: string; code: string; name: string; sort_order: number }[]
}

export type EnrichedMatch = Match & {
  team_a: { id: string; name: string; seed: number | null } | null
  team_b: { id: string; name: string; seed: number | null } | null
  category: { code: string; name: string }
  group: { code: string; name: string } | null
  games: { id: string; game_number: number; team_a_score: number; team_b_score: number; status: string }[]
}

export type StandingWithTeam = Standing & {
  team: { id: string; name: string; seed: number | null; company: string | null }
}

export type TeamDetail = {
  id: string
  season_id: string
  category_id: string
  group_id: string | null
  name: string
  seed: number | null
  company: string | null
  category: { code: string; name: string }
  group: { code: string; name: string } | null
  team_players: { player: { id: string; full_name: string; company: string | null } }[]
}

export type GroupDetail = {
  id: string
  category_id: string
  code: string
  name: string
  category: { code: string; name: string }
  teams: {
    id: string
    name: string
    seed: number | null
    company: string | null
    team_players: { player: { id: string; full_name: string } }[]
  }[]
}

export type PlayerDetail = {
  id: string
  full_name: string
  company: string | null
  team_players: {
    team: {
      id: string
      name: string
      seed: number | null
      season: { id: string; year: number; name: string }
      category: { code: string; name: string }
    }
  }[]
}

export async function getActiveSeason(): Promise<Season | null> {
  const sb = await createClient()
  const { data, error } = await sb
    .from("seasons")
    .select("*")
    .order("is_active", { ascending: false })
    .order("year", { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data as Season | null
}

export function feederLabel(src: FeederSource | null | undefined): string {
  if (!src) return "TBD"
  if (src.kind === "group_position") {
    return `${src.category_code}-${src.group_code} ${src.position === 1 ? "Winner" : "Runner-up"}`
  }
  if (src.kind === "match_winner") {
    return `${src.round_label} Winner`
  }
  return "TBD"
}

const matchSelect = `
  *,
  team_a:teams!matches_team_a_id_fkey ( id, name, seed ),
  team_b:teams!matches_team_b_id_fkey ( id, name, seed ),
  category:categories ( code, name ),
  group:groups ( code, name ),
  games ( id, game_number, team_a_score, team_b_score, status )
`

export async function getSeasonMatches(seasonId: string): Promise<EnrichedMatch[]> {
  const sb = await createClient()
  const { data, error } = await sb
    .from("matches")
    .select(matchSelect)
    .eq("season_id", seasonId)
    .order("scheduled_at", { ascending: true })
  if (error) throw error
  return (data ?? []) as unknown as EnrichedMatch[]
}

export async function getMatchById(id: string): Promise<EnrichedMatch | null> {
  const sb = await createClient()
  const { data, error } = await sb
    .from("matches")
    .select(matchSelect)
    .eq("id", id)
    .maybeSingle()
  if (error) throw error
  return data as unknown as EnrichedMatch | null
}

export async function getCategories(seasonId: string): Promise<CategoryWithGroups[]> {
  const sb = await createClient()
  const { data, error } = await sb
    .from("categories")
    .select("*, groups (id, code, name, sort_order)")
    .eq("season_id", seasonId)
    .order("sort_order")
  if (error) throw error
  return (data ?? []) as unknown as CategoryWithGroups[]
}

export async function getCategoryByCode(
  seasonId: string,
  code: string,
): Promise<CategoryWithGroups | null> {
  const sb = await createClient()
  const { data, error } = await sb
    .from("categories")
    .select("*, groups (id, code, name, sort_order)")
    .eq("season_id", seasonId)
    .eq("code", code)
    .maybeSingle()
  if (error) throw error
  return data as unknown as CategoryWithGroups | null
}

export async function getStandingsForGroup(groupId: string): Promise<StandingWithTeam[]> {
  const sb = await createClient()
  const { data, error } = await sb
    .from("standings_view")
    .select("*, team:teams ( id, name, seed, company )")
    .eq("group_id", groupId)
  if (error) throw error
  return (data ?? []) as unknown as StandingWithTeam[]
}

export async function getTeamById(id: string): Promise<TeamDetail | null> {
  const sb = await createClient()
  const { data, error } = await sb
    .from("teams")
    .select(`
      *,
      category:categories ( code, name ),
      group:groups ( code, name ),
      team_players ( player:players ( id, full_name, company ) )
    `)
    .eq("id", id)
    .maybeSingle()
  if (error) throw error
  return data as unknown as TeamDetail | null
}

export async function getGroupById(id: string): Promise<GroupDetail | null> {
  const sb = await createClient()
  const { data, error } = await sb
    .from("groups")
    .select(`
      *,
      category:categories ( code, name ),
      teams ( id, name, seed, company, team_players ( player:players ( id, full_name ) ) )
    `)
    .eq("id", id)
    .maybeSingle()
  if (error) throw error
  return data as unknown as GroupDetail | null
}

export async function getMatchesForGroup(groupId: string): Promise<EnrichedMatch[]> {
  const sb = await createClient()
  const { data, error } = await sb
    .from("matches")
    .select(matchSelect)
    .eq("group_id", groupId)
    .order("scheduled_at")
  if (error) throw error
  return (data ?? []) as unknown as EnrichedMatch[]
}

export async function getMatchesForTeam(teamId: string): Promise<EnrichedMatch[]> {
  const sb = await createClient()
  const { data, error } = await sb
    .from("matches")
    .select(matchSelect)
    .or(`team_a_id.eq.${teamId},team_b_id.eq.${teamId}`)
    .order("scheduled_at")
  if (error) throw error
  return (data ?? []) as unknown as EnrichedMatch[]
}

export async function getPlayerById(id: string): Promise<PlayerDetail | null> {
  const sb = await createClient()
  const { data, error } = await sb
    .from("players")
    .select(`
      *,
      team_players (
        team:teams (
          id, name, seed,
          season:seasons ( id, year, name ),
          category:categories ( code, name )
        )
      )
    `)
    .eq("id", id)
    .maybeSingle()
  if (error) throw error
  return data as unknown as PlayerDetail | null
}
