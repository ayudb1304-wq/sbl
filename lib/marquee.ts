import { createAdminClient } from "@/lib/supabase/admin"
import { getActiveSeason } from "@/lib/queries"

export type MarqueeItem = {
  id: string
  state: "live" | "done" | "wo"
  category_code: string
  round_label: string
  team_a: string
  team_b: string
  score_a: number[]
  score_b: number[]
  court: string | null
}

type Row = {
  id: string
  status: "in_progress" | "completed" | "walkover"
  court: string | null
  round_label: string
  category: { code: string } | { code: string }[] | null
  team_a: { name: string } | { name: string }[] | null
  team_b: { name: string } | { name: string }[] | null
  games: { game_number: number; team_a_score: number; team_b_score: number; status: string }[]
}

export async function getMarqueeItems(): Promise<MarqueeItem[]> {
  const season = await getActiveSeason()
  if (!season) return []
  const admin = createAdminClient()

  const { data: matches } = await admin
    .from("matches")
    .select(`
      id, status, court, round_label, scheduled_at,
      category:categories ( code ),
      team_a:teams!matches_team_a_id_fkey ( name ),
      team_b:teams!matches_team_b_id_fkey ( name ),
      games ( game_number, team_a_score, team_b_score, status )
    `)
    .eq("season_id", season.id)
    .in("status", ["in_progress", "completed", "walkover"])
    .order("scheduled_at", { ascending: false })
    .limit(20)

  const rows = (matches ?? []) as unknown as Row[]
  const items: MarqueeItem[] = rows.map(m => {
    const cat = Array.isArray(m.category) ? m.category[0] : m.category
    const a = Array.isArray(m.team_a) ? m.team_a[0] : m.team_a
    const b = Array.isArray(m.team_b) ? m.team_b[0] : m.team_b
    const sortedGames = [...m.games].sort((g1, g2) => g1.game_number - g2.game_number)
    return {
      id: m.id,
      state: m.status === "in_progress" ? "live" : m.status === "walkover" ? "wo" : "done",
      category_code: cat?.code ?? "?",
      round_label: m.round_label,
      team_a: a?.name ?? "TBD",
      team_b: b?.name ?? "TBD",
      score_a: sortedGames.map(g => g.team_a_score),
      score_b: sortedGames.map(g => g.team_b_score),
      court: m.court,
    }
  })

  items.sort((x, y) => {
    const order = (s: string) => (s === "live" ? 0 : s === "wo" ? 1 : 2)
    return order(x.state) - order(y.state)
  })
  return items
}
