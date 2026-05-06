import Link from "next/link"
import { Container } from "./Container"
import { UserMenu } from "./UserMenu"
import { MobileMenu } from "./MobileMenu"
import { branding } from "@/lib/branding"
import { getCurrentUser } from "@/lib/auth"
import { signOut } from "@/lib/actions/auth"

export async function Nav({ seasonName }: { seasonName: string | null }) {
  const user = await getCurrentUser()
  return (
    <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--surface)]/85 backdrop-blur supports-[backdrop-filter]:bg-[var(--surface)]/70">
      <Container className="flex h-14 items-center gap-3">
        <MobileMenu
          brand={branding.appName}
          seasonName={seasonName}
          user={user ? { email: user.email, role: user.role } : null}
          signOutAction={signOut}
        />
        <Link href="/" className="flex items-baseline gap-2 font-semibold tracking-tight">
          {branding.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={branding.logoUrl} alt={branding.appName} className="h-7 w-auto" />
          ) : (
            <span className="text-lg">{branding.appName}</span>
          )}
          {seasonName && <span className="hidden sm:inline text-xs text-[var(--muted)]">{seasonName}</span>}
        </Link>
        <div className="ml-auto flex items-center gap-3">
          <nav className="hidden lg:flex items-center gap-1 text-sm">
            <NavLink href="/categories/MB">MB</NavLink>
            <NavLink href="/categories/MI">MI</NavLink>
            <NavLink href="/categories/W">W</NavLink>
            <span className="mx-1 h-4 w-px bg-[var(--border)]" />
            <NavLink href="/courts/1">Courts</NavLink>
            <NavLink href="/bracket/MB">Brackets</NavLink>
            {user?.role === "scorer" && <NavLink href="/scorer">Score</NavLink>}
            {user?.role === "admin" && <NavLink href="/admin">Admin</NavLink>}
          </nav>
          <UserMenu />
        </div>
      </Container>
    </header>
  )
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-md px-2.5 py-1.5 text-[var(--muted)] hover:bg-[var(--surface-alt)] hover:text-[var(--text)]"
    >
      {children}
    </Link>
  )
}
