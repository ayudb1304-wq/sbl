import { createClient } from "./supabase/server"
import type { Profile } from "./supabase/types"

export type CurrentUser = {
  userId: string
  email: string
  role: Profile["role"]
}

/**
 * Returns the logged-in user's profile, or null if not authenticated.
 * Reads role from the `profiles` table (auto-created by handle_new_user trigger).
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  try {
    const sb = await createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return null
    const { data: profile } = await sb
      .from("profiles")
      .select("role, email")
      .eq("id", user.id)
      .maybeSingle<{ role: Profile["role"]; email: string }>()
    if (!profile) return null
    return { userId: user.id, email: profile.email, role: profile.role }
  } catch {
    // Auth session edge cases (expired, refresh failure, etc.) shouldn't take
    // down server-rendered pages that call this purely for UI affordances.
    return null
  }
}

export class UnauthorizedError extends Error {
  constructor(public reason: "unauth" | "forbidden") { super(reason) }
}

/**
 * Throws if the user isn't logged in or their role isn't in the allowlist.
 * Use in server actions and protected page guards.
 */
export async function requireRole(roles: Profile["role"][]): Promise<CurrentUser> {
  const user = await getCurrentUser()
  if (!user) throw new UnauthorizedError("unauth")
  if (!roles.includes(user.role)) throw new UnauthorizedError("forbidden")
  return user
}
