"use client"
import Link from "next/link"
import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"

export type SearchEntry = {
  id: string
  type: "team" | "player"
  name: string
  href: string
  hint?: string // category code or similar
}

export function Search({ entries }: { entries: SearchEntry[] }) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState("")
  const [active, setActive] = useState(0)
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)

  // Open on Cmd-K / Ctrl-K, close on Esc
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setOpen(o => !o)
      } else if (e.key === "Escape" && open) {
        setOpen(false)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open])

  useEffect(() => {
    if (open) {
      setQ("")
      setActive(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  // Lock body scroll when open
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => { document.body.style.overflow = prev }
  }, [open])

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase()
    if (!needle) return entries.slice(0, 12)
    const scored = entries
      .map(e => {
        const name = e.name.toLowerCase()
        let score = 0
        if (name === needle) score = 100
        else if (name.startsWith(needle)) score = 60
        else if (name.includes(needle)) score = 30
        else {
          // Fuzzy: every needle char must appear in order
          let i = 0
          for (const c of name) { if (c === needle[i]) i++; if (i === needle.length) break }
          if (i === needle.length) score = 10
        }
        return { e, score }
      })
      .filter(x => x.score > 0)
      .sort((a, b) => b.score - a.score)
    return scored.slice(0, 12).map(x => x.e)
  }, [q, entries])

  function go(entry: SearchEntry) {
    setOpen(false)
    router.push(entry.href)
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Search"
        className="flex items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-xs text-[var(--muted)] hover:border-[var(--primary)] hover:text-[var(--text)]"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <span className="hidden sm:inline">Search</span>
        <kbd className="hidden sm:inline rounded border border-[var(--border)] bg-[var(--bg)] px-1 py-0.5 text-[10px] font-mono">⌘K</kbd>
      </button>

      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{ position: "fixed", inset: 0, zIndex: 80, backgroundColor: "rgba(0,0,0,0.45)", backdropFilter: "blur(2px)" }}
          className="flex items-start justify-center pt-[10vh]"
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ backgroundColor: "var(--surface)", color: "var(--text)" }}
            className="w-full max-w-lg overflow-hidden rounded-xl border border-[var(--border)] shadow-2xl"
          >
            <div className="flex items-center gap-2 border-b border-[var(--border)] px-4 py-3">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 text-[var(--muted)]">
                <circle cx="11" cy="11" r="7" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <input
                ref={inputRef}
                value={q}
                onChange={e => { setQ(e.target.value); setActive(0) }}
                onKeyDown={e => {
                  if (e.key === "ArrowDown") { e.preventDefault(); setActive(i => Math.min(i + 1, results.length - 1)) }
                  if (e.key === "ArrowUp")   { e.preventDefault(); setActive(i => Math.max(i - 1, 0)) }
                  if (e.key === "Enter" && results[active]) { e.preventDefault(); go(results[active]) }
                }}
                placeholder="Search teams or players..."
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--muted)]"
              />
              <span className="hidden sm:inline rounded border border-[var(--border)] bg-[var(--bg)] px-1.5 py-0.5 text-[10px] font-mono text-[var(--muted)]">esc</span>
            </div>
            <ul className="max-h-[60vh] overflow-y-auto py-1">
              {results.length === 0 ? (
                <li className="px-4 py-6 text-center text-sm text-[var(--muted)]">No matches.</li>
              ) : (
                results.map((r, i) => (
                  <li key={`${r.type}-${r.id}`}>
                    <Link
                      href={r.href}
                      onClick={() => setOpen(false)}
                      onMouseEnter={() => setActive(i)}
                      style={i === active ? { backgroundColor: "var(--surface-alt)" } : undefined}
                      className="flex items-center justify-between gap-3 px-4 py-2 text-sm"
                    >
                      <span className="flex items-center gap-2 truncate">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
                          {r.type === "team" ? "Team" : "Player"}
                        </span>
                        <span className="truncate">{r.name}</span>
                      </span>
                      {r.hint && <span className="text-xs text-[var(--muted)]">{r.hint}</span>}
                    </Link>
                  </li>
                ))
              )}
            </ul>
            <div className="border-t border-[var(--border)] px-4 py-2 text-[10px] text-[var(--muted)]">
              ↑↓ navigate · ⏎ open · esc close
            </div>
          </div>
        </div>
      )}
    </>
  )
}
