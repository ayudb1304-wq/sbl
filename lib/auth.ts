import { createClient } from "./supabase/server"
import type { Profile } from "./supabase/types"

export type Role = Profile["role"]

export type CurrentUser = {
  userId: string
  email: string
  /** Highest role for back-compat / display badges. */
  role: Role
  /** All roles assigned to this user. A single user can hold multiple. */
  roles: Role[]
}

/**
 * Returns the logged-in user's profile (with role array), or null if not signed
 * in or if the profile lookup fails for any reason. Treats auth as best-effort
 * UI affordance — never throws.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  try {
    const sb = await createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return null
    const { data: profile } = await sb
      .from("profiles")
      .select("role, roles, email")
      .eq("id", user.id)
      .maybeSingle<{ role: Role; roles: Role[] | null; email: string }>()
    if (!profile) return null
    const roles = profile.roles && profile.roles.length > 0 ? profile.roles : [profile.role]
    return { userId: user.id, email: profile.email, role: profile.role, roles }
  } catch {
    return null
  }
}

export class UnauthorizedError extends Error {
  constructor(public reason: "unauth" | "forbidden") { super(reason) }
}

/**
 * Throws unless the user holds at least one of the allowed roles.
 * Intersection check — a user with roles=['admin','scorer'] passes
 * requireRole(['scorer']).
 */
export async function requireRole(allowed: Role[]): Promise<CurrentUser> {
  const user = await getCurrentUser()
  if (!user) throw new UnauthorizedError("unauth")
  const ok = user.roles.some(r => allowed.includes(r))
  if (!ok) throw new UnauthorizedError("forbidden")
  return user
}

/** Helper for components that want to gate UI on a role. */
export function hasRole(user: { roles: Role[] } | null | undefined, role: Role): boolean {
  return !!user?.roles.includes(role)
}
