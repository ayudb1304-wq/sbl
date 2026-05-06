import Link from "next/link"
import { Container } from "./Container"
import { UserMenu } from "./UserMenu"
import { branding } from "@/lib/branding"

export function Nav({ seasonName }: { seasonName: string | null }) {
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--surface)]/90 backdrop-blur">
      <Container className="flex h-14 items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          {branding.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={branding.logoUrl} alt={branding.appName} className="h-7 w-auto" />
          ) : (
            <span className="text-lg">{branding.appName}</span>
          )}
          {seasonName && <span className="text-xs text-[var(--muted)]">{seasonName}</span>}
        </Link>
        <div className="flex items-center gap-3">
          <nav className="flex items-center gap-1 text-sm">
            <NavLink href="/categories/MB">MB</NavLink>
            <NavLink href="/categories/MI">MI</NavLink>
            <NavLink href="/categories/W">W</NavLink>
            <span className="mx-1 h-4 w-px bg-[var(--border)]" />
            <NavLink href="/courts/1">Courts</NavLink>
            <NavLink href="/bracket/MB">Brackets</NavLink>
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
      className="rounded-md px-2.5 py-1.5 text-[var(--muted)] hover:bg-[var(--bg)] hover:text-[var(--text)]"
    >
      {children}
    </Link>
  )
}
