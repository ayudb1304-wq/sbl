import Link from "next/link"
import { redirect } from "next/navigation"
import { Container } from "@/components/Container"
import { getCurrentUser } from "@/lib/auth"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()
  if (!user) redirect("/login?next=/admin")
  if (user.role !== "admin") {
    return (
      <Container className="max-w-md">
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6 text-center">
          <h1 className="text-lg font-semibold">Admin only</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            You&apos;re signed in as {user.email} (role: {user.role}). Ask an existing admin to grant you admin access.
          </p>
          <Link href="/" className="mt-4 inline-block text-sm text-[var(--primary)] hover:underline">
            Back to tournament
          </Link>
        </div>
      </Container>
    )
  }
  return (
    <div className="space-y-6">
      <Container>
        <nav className="flex flex-wrap items-center gap-1 text-sm">
          <AdminLink href="/admin">Overview</AdminLink>
          <AdminLink href="/admin/categories/MB">MB</AdminLink>
          <AdminLink href="/admin/categories/MI">MI</AdminLink>
          <AdminLink href="/admin/categories/W">W</AdminLink>
          <span className="mx-1 h-4 w-px bg-[var(--border)]" />
          <AdminLink href="/admin/users">Users</AdminLink>
          <AdminLink href="/admin/seasons">Seasons</AdminLink>
        </nav>
      </Container>
      {children}
    </div>
  )
}

function AdminLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-md px-2.5 py-1.5 text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--text)]"
    >
      {children}
    </Link>
  )
}
