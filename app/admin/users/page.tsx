import { Container } from "@/components/Container"
import { UserManager } from "@/components/admin/UserManager"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

export default async function AdminUsersPage() {
  const admin = createAdminClient()
  const [allowedRes, profilesRes] = await Promise.all([
    admin.from("allowed_users").select("email, role").order("email"),
    admin.from("profiles").select("email"),
  ])
  const allowed = allowedRes.data ?? []
  const loggedIn = new Set((profilesRes.data ?? []).map(p => p.email.toLowerCase()))

  const rows = allowed.map(a => ({
    email: a.email,
    role: a.role as "admin" | "scorer" | "none",
    loggedIn: loggedIn.has(a.email.toLowerCase()),
  }))

  return (
    <Container className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Manage who can sign in. Adding an email here does NOT create an account — the user must request a magic link from /login. Their role syncs on first login.
        </p>
      </header>
      <UserManager rows={rows} />
    </Container>
  )
}
