"use server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { redirect } from "next/navigation"

export type LoginResult = { ok: true; dest: string } | { ok: false; error: string }

/**
 * Email-only direct login. No emails are sent — the admin API generates a
 * magic-link token and we consume it server-side to mint a session cookie.
 *
 * Security model: anyone who knows a whitelisted email can sign in. This is
 * acceptable for an internal tournament app where the threat model is "trusted
 * coworkers, not internet attackers". If that changes, reintroduce a shared
 * passcode or switch back to actual email magic links.
 */
export async function directLogin(formData: FormData): Promise<LoginResult> {
  const emailRaw = formData.get("email")
  if (typeof emailRaw !== "string" || !emailRaw.includes("@")) {
    return { ok: false, error: "Enter a valid email." }
  }
  const email = emailRaw.trim().toLowerCase()

  const admin = createAdminClient()

  // 1. Whitelist check
  const { data: allowed } = await admin
    .from("allowed_users")
    .select("email, roles")
    .ilike("email", email)
    .maybeSingle()
  if (!allowed) {
    return { ok: false, error: "This email isn't authorized for the tournament app. Ask an admin to add you." }
  }

  // 2. Make sure the auth.users row exists (no-op if it already does)
  const { error: createErr } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
  })
  if (createErr && !/already.*registered|exists/i.test(createErr.message)) {
    return { ok: false, error: createErr.message }
  }

  // 3. Generate a magic-link token (admin API does NOT send an email)
  const { data: link, error: linkErr } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
  })
  if (linkErr || !link?.properties?.hashed_token) {
    return { ok: false, error: linkErr?.message || "Failed to generate session token." }
  }

  // 4. Consume the token to mint a session cookie
  const sb = await createClient()
  const { error: verifyErr } = await sb.auth.verifyOtp({
    token_hash: link.properties.hashed_token,
    type: "magiclink",
  })
  if (verifyErr) {
    return { ok: false, error: verifyErr.message }
  }

  // 5. Tell the client where to land (admin > scorer > /)
  const roles = (allowed.roles ?? []) as string[]
  const dest = roles.includes("admin") ? "/admin" : roles.includes("scorer") ? "/scorer" : "/"
  return { ok: true, dest }
}

export async function signOut() {
  const sb = await createClient()
  await sb.auth.signOut()
  redirect("/")
}
