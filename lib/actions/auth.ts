"use server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { redirect } from "next/navigation"

export type LoginResult = { ok: true } | { ok: false; error: string }

/**
 * Sends a magic link to the email — but only if the email is in `allowed_users`.
 * This keeps random people from receiving login emails for the tournament app.
 */
export async function requestMagicLink(formData: FormData): Promise<LoginResult> {
  const emailRaw = formData.get("email")
  if (typeof emailRaw !== "string" || !emailRaw.includes("@")) {
    return { ok: false, error: "Enter a valid email." }
  }
  const email = emailRaw.trim().toLowerCase()

  const admin = createAdminClient()
  const { data: allowed } = await admin
    .from("allowed_users")
    .select("email")
    .ilike("email", email)
    .maybeSingle()

  if (!allowed) {
    // Same wording either way — don't disclose which emails are allowed.
    return { ok: false, error: "This email isn't authorized for the tournament app. Ask an admin to add you." }
  }

  const sb = await createClient()
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
  const { error } = await sb.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${siteUrl}/auth/callback` },
  })
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

export async function signOut() {
  const sb = await createClient()
  await sb.auth.signOut()
  redirect("/")
}
