"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"

export type MobileMenuUser = {
  email: string
  role: "admin" | "scorer" | "none"
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
  brand, seasonName, user, signOutAction,
}: {
  brand: string
  seasonName: string | null
  user: MobileMenuUser
  signOutAction: () => Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  // Close on route change
  useEffect(() => { setOpen(false) }, [pathname])

  // Lock body scroll while drawer is open
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => { document.body.style.overflow = prev }
  }, [open])

  // Close on ESC
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") setOpen(false) }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open])

  const sections: Section[] = [...PUBLIC_SECTIONS]
  if (user?.role === "scorer" || user?.role === "admin") {
    sections.push({
      label: "Scorer",
      links: [{ href: "/scorer", label: "Score matches" }],
    })
  }
  if (user?.role === "admin") {
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

      {/* Backdrop */}
      <div
        onClick={() => setOpen(false)}
        className={`fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity lg:hidden ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        aria-hidden
      />

      {/* Drawer */}
      <aside
        style={{ backgroundColor: "var(--surface)", color: "var(--text)" }}
        className={`fixed inset-y-0 left-0 z-50 flex w-[85%] max-w-sm flex-col shadow-2xl transition-transform duration-200 lg:hidden ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-hidden={!open}
      >
        <header className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
          <Link href="/" className="flex items-baseline gap-2">
            <span className="text-lg font-semibold tracking-tight">{brand}</span>
            {seasonName && <span className="text-xs text-[var(--muted)]">{seasonName}</span>}
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

        <nav className="flex-1 overflow-y-auto px-3 py-4">
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
                        className={`block rounded-md px-3 py-2 text-sm ${
                          active
                            ? "bg-[var(--primary-soft)] font-medium text-[var(--primary)]"
                            : "hover:bg-[var(--surface-alt)]"
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

        <footer className="border-t border-[var(--border)] px-4 py-3 text-sm">
          {user ? (
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="truncate font-medium">{user.email}</div>
                <div className="text-xs text-[var(--muted)] capitalize">{user.role}</div>
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
              className="block rounded-md bg-[var(--primary)] px-3 py-2 text-center text-sm font-medium text-white hover:bg-[var(--primary-hover)]"
            >
              Sign in
            </Link>
          )}
        </footer>
      </aside>
    </>
  )
}
