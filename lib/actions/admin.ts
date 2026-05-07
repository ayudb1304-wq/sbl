"use server"
import { revalidatePath } from "next/cache"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireRole, UnauthorizedError } from "@/lib/auth"
import type { FeederSource } from "@/lib/supabase/types"

export type Ok = { ok: true }
export type OkWith<T> = { ok: true; data: T }
export type Err = { ok: false; error: string }

function fail(e: unknown): Err {
  if (e instanceof UnauthorizedError) {
    return { ok: false, error: e.reason === "unauth" ? "Sign in required." : "Admin access required." }
  }
  return { ok: false, error: e instanceof Error ? e.message : String(e) }
}

function revalidateAll() {
  revalidatePath("/", "layout") // every page consumes season + standings
}

// ---------- Group qualifier confirmation ----------

export async function confirmGroupQualifiers(args: {
  groupId: string
  qualifier1TeamId: string
  qualifier2TeamId: string
}): Promise<Ok | Err> {
  try {
    await requireRole(["admin"])
    if (args.qualifier1TeamId === args.qualifier2TeamId) {
      return { ok: false, error: "Qualifier 1 and Qualifier 2 must be different teams." }
    }
    const admin = createAdminClient()
    const { error } = await admin
      .from("groups")
      .update({
        qualifier_1_team_id: args.qualifier1TeamId,
        qualifier_2_team_id: args.qualifier2TeamId,
        qualifiers_locked: true,
      })
      .eq("id", args.groupId)
    if (error) throw error

    // Try to advance the bracket immediately
    const { data: g } = await admin
      .from("groups")
      .select("category_id, categories!inner(season_id)")
      .eq("id", args.groupId)
      .maybeSingle<{ category_id: string; categories: { season_id: string } }>()
    if (g) await runResolver(g.categories.season_id, g.category_id)

    revalidateAll()
    return { ok: true }
  } catch (e) { return fail(e) }
}

export async function unlockGroupQualifiers(groupId: string): Promise<Ok | Err> {
  try {
    await requireRole(["admin"])
    const admin = createAdminClient()
    const { error } = await admin
      .from("groups")
      .update({ qualifiers_locked: false })
      .eq("id", groupId)
    if (error) throw error
    revalidateAll()
    return { ok: true }
  } catch (e) { return fail(e) }
}

// ---------- Match locks ----------

export async function setMatchLocked(matchId: string, locked: boolean): Promise<Ok | Err> {
  try {
    await requireRole(["admin"])
    const admin = createAdminClient()
    const { error } = await admin.from("matches").update({ locked }).eq("id", matchId)
    if (error) throw error
    revalidatePath(`/scorer/match/${matchId}`)
    revalidatePath(`/admin/match/${matchId}`)
    revalidatePath(`/matches/${matchId}`)
    return { ok: true }
  } catch (e) { return fail(e) }
}

export async function lockGroupMatches(groupId: string): Promise<Ok | Err> {
  try {
    await requireRole(["admin"])
    const admin = createAdminClient()
    const { error } = await admin
      .from("matches")
      .update({ locked: true })
      .eq("group_id", groupId)
    if (error) throw error
    revalidateAll()
    return { ok: true }
  } catch (e) { return fail(e) }
}

// ---------- Bracket resolver ----------

/**
 * Walks every KO match in the season (or just one category) and fills any
 * team_a_id / team_b_id slots whose feeders are now resolvable. Idempotent.
 *
 * - group_position feeder: needs source group's qualifiers_locked=true.
 * - match_winner feeder: needs source match's winner_team_id set.
 *
 * Used both manually from the admin UI and automatically after a match winner
 * is set (see lib/actions/scoring.ts setMatchWinner).
 */
export async function resolveBracket(args: { seasonId: string; categoryId?: string }): Promise<OkWith<{ resolved: number }> | Err> {
  try {
    await requireRole(["admin", "scorer"])
    const resolved = await runResolver(args.seasonId, args.categoryId)
    revalidateAll()
    return { ok: true, data: { resolved } }
  } catch (e) { return fail(e) }
}

export async function runResolver(seasonId: string, categoryId?: string): Promise<number> {
  const admin = createAdminClient()

  const { data: cats } = await admin
    .from("categories")
    .select("id, code")
    .eq("season_id", seasonId)
  const codeById = new Map<string, string>((cats ?? []).map(c => [c.id, c.code]))

  const { data: groups } = await admin
    .from("groups")
    .select("id, code, category_id, qualifier_1_team_id, qualifier_2_team_id, qualifiers_locked")
  const groupByKey = new Map<string, { q1: string | null; q2: string | null; locked: boolean }>()
  for (const g of groups ?? []) {
    const code = codeById.get(g.category_id)
    if (!code) continue
    groupByKey.set(`${code}|${g.code}`, {
      q1: g.qualifier_1_team_id,
      q2: g.qualifier_2_team_id,
      locked: g.qualifiers_locked,
    })
  }

  const { data: allMatches } = await admin
    .from("matches")
    .select("id, category_id, round_label, winner_team_id, team_a_id, team_b_id, team_a_source, team_b_source, stage")
    .eq("season_id", seasonId)
  const winnerByKey = new Map<string, string | null>()
  for (const m of allMatches ?? []) {
    const code = codeById.get(m.category_id)
    if (!code) continue
    winnerByKey.set(`${code}|${m.round_label}`, m.winner_team_id)
  }

  const koMatches = (allMatches ?? []).filter(
    m => m.stage !== "group" && (!categoryId || m.category_id === categoryId),
  )

  // Multiple passes: a Final's match_winner feeder depends on SF being resolved,
  // which itself may have just been resolved this run. Loop until no progress.
  let totalResolved = 0
  for (let pass = 0; pass < 4; pass++) {
    let progressThisPass = 0
    for (const m of koMatches) {
      const updates: { team_a_id?: string; team_b_id?: string } = {}
      if (!m.team_a_id && m.team_a_source) {
        const t = resolveSource(m.team_a_source as FeederSource, groupByKey, winnerByKey)
        if (t) updates.team_a_id = t
      }
      if (!m.team_b_id && m.team_b_source) {
        const t = resolveSource(m.team_b_source as FeederSource, groupByKey, winnerByKey)
        if (t) updates.team_b_id = t
      }
      if (Object.keys(updates).length === 0) continue
      const { error } = await admin.from("matches").update(updates).eq("id", m.id)
      if (error) throw error
      if (updates.team_a_id) m.team_a_id = updates.team_a_id
      if (updates.team_b_id) m.team_b_id = updates.team_b_id
      progressThisPass++
    }
    totalResolved += progressThisPass
    if (progressThisPass === 0) break
  }
  return totalResolved
}

function resolveSource(
  src: FeederSource,
  groupByKey: Map<string, { q1: string | null; q2: string | null; locked: boolean }>,
  winnerByKey: Map<string, string | null>,
): string | null {
  if (src.kind === "group_position") {
    const g = groupByKey.get(`${src.category_code}|${src.group_code}`)
    if (!g || !g.locked) return null
    return src.position === 1 ? g.q1 : g.q2
  }
  if (src.kind === "match_winner") {
    return winnerByKey.get(`${src.category_code}|${src.round_label}`) ?? null
  }
  return null
}

// ---------- User management ----------

export async function addAllowedUser(args: { email: string; roles: ("admin" | "scorer")[] }): Promise<Ok | Err> {
  try {
    await requireRole(["admin"])
    const email = args.email.trim().toLowerCase()
    if (!email.includes("@")) return { ok: false, error: "Enter a valid email." }
    if (args.roles.length === 0) return { ok: false, error: "Pick at least one role." }
    const primary: "admin" | "scorer" = args.roles.includes("admin") ? "admin" : "scorer"
    const admin = createAdminClient()
    const { error } = await admin
      .from("allowed_users")
      .upsert({ email, roles: args.roles, role: primary }, { onConflict: "email" })
    if (error) throw error
    // Sync to existing profile if any
    await admin
      .from("profiles")
      .update({ roles: args.roles, role: primary })
      .ilike("email", email)
    revalidatePath("/admin/users")
    return { ok: true }
  } catch (e) { return fail(e) }
}

export async function removeAllowedUser(email: string): Promise<Ok | Err> {
  try {
    await requireRole(["admin"])
    const admin = createAdminClient()
    const { error } = await admin.from("allowed_users").delete().eq("email", email)
    if (error) throw error
    revalidatePath("/admin/users")
    return { ok: true }
  } catch (e) { return fail(e) }
}

export async function updateAllowedUserRoles(args: { email: string; roles: ("admin" | "scorer")[] }): Promise<Ok | Err> {
  try {
    await requireRole(["admin"])
    if (args.roles.length === 0) return { ok: false, error: "Pick at least one role (or remove the user)." }
    const primary: "admin" | "scorer" = args.roles.includes("admin") ? "admin" : "scorer"
    const admin = createAdminClient()
    const { error } = await admin
      .from("allowed_users")
      .update({ roles: args.roles, role: primary })
      .eq("email", args.email)
    if (error) throw error
    // Reflect on existing profile (so they don't have to re-login)
    await admin.from("profiles").update({ roles: args.roles, role: primary }).eq("email", args.email)
    revalidatePath("/admin/users")
    return { ok: true }
  } catch (e) { return fail(e) }
}

// ---------- Season management ----------

export async function createSeason(args: { year: number; name: string }): Promise<Ok | Err> {
  try {
    await requireRole(["admin"])
    const admin = createAdminClient()
    const { error } = await admin.from("seasons").insert({
      year: args.year,
      name: args.name,
      status: "upcoming",
    })
    if (error) throw error
    revalidatePath("/admin/seasons")
    return { ok: true }
  } catch (e) { return fail(e) }
}

// ---------- Announcements ----------

export async function postAnnouncement(args: {
  message: string
  tone: "info" | "success" | "warning" | "urgent"
}): Promise<Ok | Err> {
  try {
    await requireRole(["admin"])
    const message = args.message.trim()
    if (message.length < 1) return { ok: false, error: "Message cannot be empty." }
    if (message.length > 280) return { ok: false, error: "Keep it under 280 characters." }
    const admin = createAdminClient()
    // Deactivate any current active row first (partial unique index requires it)
    await admin.from("announcements").update({ is_active: false }).eq("is_active", true)
    const { error } = await admin
      .from("announcements")
      .insert({ message, tone: args.tone, is_active: true })
    if (error) throw error
    revalidatePath("/", "layout")
    return { ok: true }
  } catch (e) { return fail(e) }
}

export async function clearAnnouncement(): Promise<Ok | Err> {
  try {
    await requireRole(["admin"])
    const admin = createAdminClient()
    const { error } = await admin.from("announcements").update({ is_active: false }).eq("is_active", true)
    if (error) throw error
    revalidatePath("/", "layout")
    return { ok: true }
  } catch (e) { return fail(e) }
}

export async function setActiveSeason(seasonId: string): Promise<Ok | Err> {
  try {
    await requireRole(["admin"])
    const admin = createAdminClient()
    // Partial unique index allows only one is_active=true at a time, so flip in two steps.
    const { error: e1 } = await admin.from("seasons").update({ is_active: false }).eq("is_active", true)
    if (e1) throw e1
    const { error: e2 } = await admin.from("seasons").update({ is_active: true }).eq("id", seasonId)
    if (e2) throw e2
    revalidateAll()
    return { ok: true }
  } catch (e) { return fail(e) }
}
