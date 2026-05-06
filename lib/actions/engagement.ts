"use server"
import { revalidatePath } from "next/cache"
import { createAdminClient } from "@/lib/supabase/admin"

export type Result = { ok: true } | { ok: false; error: string }

const DEVICE_RX = /^[a-zA-Z0-9-]{8,64}$/
const NAME_RX = /^[\p{L}\p{N} '._-]{1,40}$/u

function valid(args: { deviceId: string }): string | null {
  if (!DEVICE_RX.test(args.deviceId)) return "Invalid device id."
  return null
}

// ---------- Display name ----------

export async function setParticipantName(args: {
  deviceId: string
  displayName: string
}): Promise<Result> {
  const err = valid(args)
  if (err) return { ok: false, error: err }
  const name = args.displayName.trim()
  if (!NAME_RX.test(name)) return { ok: false, error: "Name must be 1–40 letters/numbers/spaces." }
  const admin = createAdminClient()
  const { error } = await admin
    .from("participant_profiles")
    .upsert({ device_id: args.deviceId, display_name: name }, { onConflict: "device_id" })
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

// ---------- Cheers ----------

export async function postCheer(args: {
  deviceId: string
  matchId: string
  cheerType: "clap" | "fire"
}): Promise<Result> {
  const err = valid(args)
  if (err) return { ok: false, error: err }
  const admin = createAdminClient()
  // Soft per-second per-device cap so a stuck button can't flood the table.
  const { count } = await admin
    .from("cheers")
    .select("id", { count: "exact", head: true })
    .eq("device_id", args.deviceId)
    .eq("match_id", args.matchId)
    .gte("created_at", new Date(Date.now() - 1000).toISOString())
  if ((count ?? 0) >= 10) return { ok: false, error: "Slow down a touch." }

  const { error } = await admin.from("cheers").insert({
    match_id: args.matchId,
    device_id: args.deviceId,
    cheer_type: args.cheerType,
  })
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

// ---------- Predictions ----------

export async function setPrediction(args: {
  deviceId: string
  matchId: string
  predictedTeamId: string
}): Promise<Result> {
  const err = valid(args)
  if (err) return { ok: false, error: err }
  const admin = createAdminClient()

  // Lock once the match has started.
  const { data: match } = await admin
    .from("matches")
    .select("status, team_a_id, team_b_id, stage")
    .eq("id", args.matchId)
    .maybeSingle<{ status: string; team_a_id: string | null; team_b_id: string | null; stage: string }>()
  if (!match) return { ok: false, error: "Match not found." }
  if (match.stage === "group") return { ok: false, error: "Predictions only run on knockouts." }
  if (match.status !== "scheduled") return { ok: false, error: "This match is locked — already started." }
  if (args.predictedTeamId !== match.team_a_id && args.predictedTeamId !== match.team_b_id) {
    return { ok: false, error: "Pick must be one of the two teams." }
  }

  const { error } = await admin
    .from("predictions")
    .upsert({
      device_id: args.deviceId,
      match_id: args.matchId,
      predicted_team_id: args.predictedTeamId,
    }, { onConflict: "device_id,match_id" })
  if (error) return { ok: false, error: error.message }

  revalidatePath("/predictions")
  revalidatePath("/predictions/leaderboard")
  return { ok: true }
}
