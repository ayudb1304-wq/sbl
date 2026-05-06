import { createClient as create } from "@supabase/supabase-js"
import type { Database } from "./types"

/**
 * Service-role client. Bypasses RLS — use ONLY in trusted server-side code
 * (server actions, route handlers) AFTER you've checked the caller's role.
 * Never expose this in a client component.
 */
export function createAdminClient() {
  return create<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
}
