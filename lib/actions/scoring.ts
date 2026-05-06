"use server"
import { revalidatePath } from "next/cache"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireRole, UnauthorizedError } from "@/lib/auth"
import { runResolver } from "./admin"

export type ActionResult = { ok: true } | { ok: false; error: string }

function fail(e: unknown): ActionResult {
  if (e instanceof UnauthorizedError) {
    return { ok: false, error: e.reason === "unauth" ? "Sign in required." : "Not authorized." }
  }
  const msg = e instanceof Error ? e.message : String(e)
  return { ok: false, error: msg }
}

function revalidateMatch(matchId: string) {
  revalidatePath(`/scorer/match/${matchId}`)
  revalidatePath(`/matches/${matchId}`)
  revalidatePath("/scorer")
  revalidatePath("/")
}

/**
 * Update the score for a single game. First save also flips the match to
 * in_progress and stamps started_at.
 */
export async function updateGameScore(args: {
  gameId: string
  teamAScore: number
  teamBScore: number
}): Promise<ActionResult> {
  try {
    const user = await requireRole(["admin", "scorer"])
    if (args.teamAScore < 0 || args.teamBScore < 0 || args.teamAScore > 99 || args.teamBScore > 99) {
      return { ok: false, error: "Score out of range." }
    }
    const admin = createAdminClient()

    const { data: game, error: gErr } = await admin
      .from("games")
      .select("match_id, team_a_score, team_b_score, status, started_at")
      .eq("id", args.gameId)
      .maybeSingle<{
        match_id: string
        team_a_score: number
        team_b_score: number
        status: "pending" | "in_progress" | "completed"
        started_at: string | null
      }>()
    if (gErr) throw gErr
    if (!game) return { ok: false, error: "Game not found." }

    const { data: match } = await admin
      .from("matches")
      .select("status, locked")
      .eq("id", game.match_id)
      .maybeSingle<{ status: string; locked: boolean }>()
    if (match?.locked && !user.roles.includes("admin")) {
      return { ok: false, error: "Match is locked. Ask an admin to unlock." }
    }
    if (match?.status === "scheduled" && !user.roles.includes("admin")) {
      return { ok: false, error: "Tap Start match before entering scores." }
    }

    const now = new Date().toISOString()
    const { error: uErr } = await admin
      .from("games")
      .update({
        team_a_score: args.teamAScore,
        team_b_score: args.teamBScore,
        // Don't auto-flip game status to in_progress — that happens when the
        // scorer clicks Start Match. Just preserve current game status.
        started_at: game.started_at ?? (game.status === "in_progress" ? now : null),
        updated_by: user.userId,
      })
      .eq("id", args.gameId)
    if (uErr) throw uErr

    await admin.from("score_events").insert({
      match_id: game.match_id,
      game_id: args.gameId,
      prev_a: game.team_a_score,
      prev_b: game.team_b_score,
      new_a: args.teamAScore,
      new_b: args.teamBScore,
      action: "score_update",
      actor_id: user.userId,
      actor_role: user.role,
    })

    revalidateMatch(game.match_id)
    return { ok: true }
  } catch (e) { return fail(e) }
}

/**
 * Flip a scheduled match to in_progress and stamp game 1's started_at.
 * Scorers MUST call this before entering scores (admins can bypass).
 */
export async function startMatch(matchId: string): Promise<ActionResult> {
  try {
    const user = await requireRole(["admin", "scorer"])
    const admin = createAdminClient()
    const { data: match } = await admin
      .from("matches")
      .select("status, locked, team_a_id, team_b_id")
      .eq("id", matchId)
      .maybeSingle<{ status: string; locked: boolean; team_a_id: string | null; team_b_id: string | null }>()
    if (!match) return { ok: false, error: "Match not found." }
    if (match.locked && !user.roles.includes("admin")) {
      return { ok: false, error: "Match is locked. Ask an admin to unlock." }
    }
    if (!match.team_a_id || !match.team_b_id) {
      return { ok: false, error: "Both teams must be set before starting." }
    }
    if (match.status !== "scheduled") {
      return { ok: false, error: `Match is already ${match.status}.` }
    }

    const now = new Date().toISOString()
    const { error: mErr } = await admin
      .from("matches")
      .update({ status: "in_progress" })
      .eq("id", matchId)
    if (mErr) throw mErr

    // Game 1 goes in_progress; later games stay pending until manually started or
    // (in our flow) marked in_progress as scorer enters scores after end-of-game.
    const { error: gErr } = await admin
      .from("games")
      .update({ status: "in_progress", started_at: now })
      .eq("match_id", matchId)
      .eq("game_number", 1)
    if (gErr) throw gErr

    await admin.from("score_events").insert({
      match_id: matchId,
      action: "score_update",
      actor_id: user.userId,
      actor_role: user.role,
      notes: "match started",
    })

    revalidateMatch(matchId)
    return { ok: true }
  } catch (e) { return fail(e) }
}

/**
 * Mark a game complete (no more score changes accepted via normal updates).
 */
export async function completeGame(gameId: string): Promise<ActionResult> {
  try {
    const user = await requireRole(["admin", "scorer"])
    const admin = createAdminClient()
    const { data: game } = await admin
      .from("games")
      .select("match_id, team_a_score, team_b_score, status")
      .eq("id", gameId)
      .maybeSingle<{ match_id: string; team_a_score: number; team_b_score: number; status: string }>()
    if (!game) return { ok: false, error: "Game not found." }
    if (game.team_a_score === 0 && game.team_b_score === 0) {
      return { ok: false, error: "Enter a score before ending the game." }
    }
    const { error } = await admin
      .from("games")
      .update({ status: "completed", completed_at: new Date().toISOString(), updated_by: user.userId })
      .eq("id", gameId)
    if (error) throw error

    await admin.from("score_events").insert({
      match_id: game.match_id,
      game_id: gameId,
      prev_a: game.team_a_score,
      prev_b: game.team_b_score,
      new_a: game.team_a_score,
      new_b: game.team_b_score,
      action: "score_update",
      actor_id: user.userId,
      actor_role: user.role,
      notes: "game ended",
    })

    revalidateMatch(game.match_id)
    return { ok: true }
  } catch (e) { return fail(e) }
}

/**
 * Set the match winner. Used both for normal end-of-match (winnerTeamId comes
 * from completed games) and walkover (caller passes a reason).
 */
export async function setMatchWinner(args: {
  matchId: string
  winnerTeamId: string
  walkoverReason?: string | null
}): Promise<ActionResult> {
  try {
    const user = await requireRole(["admin", "scorer"])
    const admin = createAdminClient()

    const { data: match } = await admin
      .from("matches")
      .select("season_id, team_a_id, team_b_id, locked, status")
      .eq("id", args.matchId)
      .maybeSingle<{ season_id: string; team_a_id: string | null; team_b_id: string | null; locked: boolean; status: string }>()
    if (!match) return { ok: false, error: "Match not found." }
    if (match.locked && !user.roles.includes("admin")) return { ok: false, error: "Match is locked." }
    if (args.winnerTeamId !== match.team_a_id && args.winnerTeamId !== match.team_b_id) {
      return { ok: false, error: "Winner must be one of the two teams." }
    }

    const isWalkover = !!args.walkoverReason
    const { error } = await admin
      .from("matches")
      .update({
        winner_team_id: args.winnerTeamId,
        walkover_reason: args.walkoverReason ?? null,
        status: isWalkover ? "walkover" : "completed",
      })
      .eq("id", args.matchId)
    if (error) throw error

    await admin.from("score_events").insert({
      match_id: args.matchId,
      action: isWalkover ? "walkover" : "set_winner",
      actor_id: user.userId,
      actor_role: user.role,
      notes: args.walkoverReason ?? null,
    })

    // Auto-advance: if this match's winner feeds into a downstream KO match,
    // populate that match's team slot now so the next scorer can pick it up.
    await runResolver(match.season_id)

    revalidateMatch(args.matchId)
    return { ok: true }
  } catch (e) { return fail(e) }
}

/**
 * Reset a match: clears winner, sets all games to pending 0-0, returns to scheduled.
 * Useful if scores were entered against the wrong match.
 */
export async function resetMatch(matchId: string): Promise<ActionResult> {
  try {
    const user = await requireRole(["admin", "scorer"])
    const admin = createAdminClient()

    const { data: match } = await admin
      .from("matches")
      .select("locked")
      .eq("id", matchId)
      .maybeSingle<{ locked: boolean }>()
    if (match?.locked && !user.roles.includes("admin")) return { ok: false, error: "Match is locked." }

    await admin
      .from("games")
      .update({ team_a_score: 0, team_b_score: 0, status: "pending", started_at: null, completed_at: null, updated_by: user.userId })
      .eq("match_id", matchId)

    await admin
      .from("matches")
      .update({ winner_team_id: null, walkover_reason: null, status: "scheduled" })
      .eq("id", matchId)

    await admin.from("score_events").insert({
      match_id: matchId,
      action: "reset",
      actor_id: user.userId,
      actor_role: user.role,
    })

    revalidateMatch(matchId)
    return { ok: true }
  } catch (e) { return fail(e) }
}
