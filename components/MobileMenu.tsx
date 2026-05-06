"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"

export type MobileMenuUser = {
  email: string
  roles: ("admin" | "scorer" | "none")[]
} | null

type Section = { label: string; links: { href: string; label: string; sublabel?: string }[] }

const PUBLIC_SECTIONS: Section[] = [
  {
    label: "Tournament",
    links: [
      { href: "/", label: "Home", sublabel: "Live + standings" },
      { href: "/categories/MB", label: "Men's Beginner" },
      { href: "/categories/MI", label: "Men's Intermediate" },
      { href: "/categories/W",  label: "Women's" },
    ],
  },
  {
    label: "Brackets",
    links: [
      { href: "/bracket/MB", label: "MB bracket" },
      { href: "/bracket/MI", label: "MI bracket" },
      { href: "/bracket/W",  label: "W bracket" },
    ],
  },
  {
    label: "Play along",
    links: [
      { href: "/predictions",            label: "Bracket challenge", sublabel: "Pick KO winners, climb the leaderboard" },
      { href: "/predictions/leaderboard", label: "Leaderboard" },
    ],
  },
  {
    label: "Courts",
    links: [
      { href: "/courts/1", label: "Court 1" },
      { href: "/courts/2", label: "Court 2" },
      { href: "/courts/3", label: "Court 3" },
      { href: "/courts/4", label: "Court 4" },
      { href: "/courts/5", label: "Court 5" },
      { href: "/courts/6", label: "Court 6" },
    ],
  },
]

export function MobileMenu({
  brand, logoUrl, seasonName, user, signOutAction,
}: {
  brand: string
  logoUrl: string | null
  seasonName: string | null
  user: MobileMenuUser
  signOutAction: () => Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => { setOpen(false) }, [pathname])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => { document.body.style.overflow = prev }
  }, [open])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") setOpen(false) }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open])

  const isAdmin = !!user?.roles.includes("admin")
  const isScorer = !!user?.roles.includes("scorer")
  const sections: Section[] = [...PUBLIC_SECTIONS]
  if (isAdmin || isScorer) {
    sections.push({
      label: "Scorer",
      links: [{ href: "/scorer", label: "Score matches" }],
    })
  }
  if (isAdmin) {
    sections.push({
      label: "Admin",
      links: [
        { href: "/admin",                label: "Overview" },
        { href: "/admin/categories/MB",  label: "MB review" },
        { href: "/admin/categories/MI",  label: "MI review" },
        { href: "/admin/categories/W",   label: "W review" },
        { href: "/admin/users",          label: "Users" },
        { href: "/admin/seasons",        label: "Seasons" },
      ],
    })
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        className="lg:hidden rounded-md border border-[var(--border)] bg-[var(--surface)] p-2 hover:border-[var(--primary)]"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      {/* Backdrop — fully opaque solid color so page content can't bleed through. */}
      <div
        onClick={() => setOpen(false)}
        style={{
          position: "fixed",
          top: 0, right: 0, bottom: 0, left: 0,
          zIndex: 60,
          backgroundColor: "rgba(0, 0, 0, 0.55)",
          backdropFilter: "blur(2px)",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          transition: "opacity 200ms ease",
        }}
        className="lg:hidden"
        aria-hidden
      />

      {/* Drawer — inline styles for positioning + dimensions + bg so it can't
          accidentally render with bleed-through, regardless of browser/CSS context. */}
      <aside
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          height: "100dvh",
          width: "min(86vw, 340px)",
          zIndex: 70,
          backgroundColor: "var(--surface)",
          color: "var(--text)",
          boxShadow: "0 20px 50px rgba(0, 0, 0, 0.35)",
          transform: open ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 220ms cubic-bezier(0.32, 0.72, 0, 1)",
          display: "flex",
          flexDirection: "column",
        }}
        className="lg:hidden"
        aria-hidden={!open}
      >
        <header
          style={{ backgroundColor: "var(--surface)", borderBottom: "1px solid var(--border)" }}
          className="flex items-center justify-between px-4 py-3"
        >
          <Link href="/" className="flex items-center gap-2">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt={brand} className="h-8 w-auto" />
            ) : (
              <>
                <span className="text-lg font-semibold tracking-tight">{brand}</span>
                {seasonName && <span className="text-xs text-[var(--muted)]">{seasonName}</span>}
              </>
            )}
          </Link>
          <button
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            className="rounded-md p-1.5 hover:bg-[var(--surface-alt)]"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
              <path d="M6 6 L18 18 M18 6 L6 18" />
            </svg>
          </button>
        </header>

        <nav
          style={{ backgroundColor: "var(--surface)" }}
          className="flex-1 min-h-0 overflow-y-auto px-3 py-4"
        >
          {sections.map(s => (
            <div key={s.label} className="mb-5">
              <div className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-widest text-[var(--muted)]">
                {s.label}
              </div>
              <ul className="space-y-0.5">
                {s.links.map(l => {
                  const active = pathname === l.href
                  return (
                    <li key={l.href}>
                      <Link
                        href={l.href}
                        style={
                          active
                            ? { backgroundColor: "var(--primary-soft)", color: "var(--primary)" }
                            : undefined
                        }
                        className={`block rounded-md px-3 py-2 text-sm ${
                          active ? "font-medium" : "hover:bg-[var(--surface-alt)]"
                        }`}
                      >
                        <div>{l.label}</div>
                        {l.sublabel && <div className="text-xs text-[var(--muted)]">{l.sublabel}</div>}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </nav>

        <footer
          style={{ backgroundColor: "var(--surface)", borderTop: "1px solid var(--border)" }}
          className="px-4 py-3 text-sm"
        >
          {user ? (
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="truncate font-medium">{user.email}</div>
                <div className="text-xs text-[var(--muted)] capitalize">{user.roles.filter(r => r !== "none").join(" · ") || "no role"}</div>
              </div>
              <form action={signOutAction}>
                <button className="rounded-md border border-[var(--border)] px-2.5 py-1 text-xs hover:border-[var(--primary)]">
                  Sign out
                </button>
              </form>
            </div>
          ) : (
            <Link
              href="/login"
              style={{ backgroundColor: "var(--primary)" }}
              className="block rounded-md px-3 py-2 text-center text-sm font-medium text-white hover:opacity-90"
            >
              Sign in
            </Link>
          )}
        </footer>
      </aside>
    </>
  )
}
