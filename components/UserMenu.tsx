import Link from "next/link"
import { signOut } from "@/lib/actions/auth"
import { getCurrentUser } from "@/lib/auth"

export async function UserMenu() {
  const user = await getCurrentUser()

  if (!user) {
    return (
      <Link
        href="/login"
        className="rounded-md border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--muted)] hover:border-[var(--primary)] hover:text-[var(--text)]"
      >
        Sign in
      </Link>
    )
  }

  const isAdmin = user.roles.includes("admin")
  const isScorer = user.roles.includes("scorer")
  const home = isAdmin ? "/admin" : isScorer ? "/scorer" : "/"
  const label =
    isAdmin && isScorer ? "Admin · Scorer" :
    isAdmin ? "Admin" :
    isScorer ? "Scorer" :
    user.email

  return (
    <div className="flex items-center gap-2 text-xs">
      <Link
        href={home}
        className="hidden sm:inline rounded-md border border-[var(--border)] px-2.5 py-1 text-[var(--muted)] hover:border-[var(--primary)] hover:text-[var(--text)]"
      >
        {label}
      </Link>
      <form action={signOut}>
        <button
          type="submit"
          className="rounded-md px-2.5 py-1 text-[var(--muted)] hover:text-[var(--text)]"
          aria-label="Sign out"
        >
          Sign out
        </button>
      </form>
    </div>
  )
}
