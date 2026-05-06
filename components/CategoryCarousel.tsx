"use client"
import Link from "next/link"
import { useEffect, useState } from "react"

export type CarouselGroup = {
  id: string
  code: string
  top: { teamId: string; teamName: string; points: number; position: number }[]
}

export type CarouselCategory = {
  code: string
  name: string
  groups: CarouselGroup[]
}

const ROTATE_MS = 5000

export function CategoryCarousel({ category }: { category: CarouselCategory }) {
  const [idx, setIdx] = useState(0)
  const [paused, setPaused] = useState(false)
  const [fade, setFade] = useState(true)

  // Auto-rotate (paused after any user interaction)
  useEffect(() => {
    if (paused || category.groups.length <= 1) return
    const t = setInterval(() => {
      setFade(false)
      setTimeout(() => {
        setIdx(i => (i + 1) % category.groups.length)
        setFade(true)
      }, 180)
    }, ROTATE_MS)
    return () => clearInterval(t)
  }, [paused, category.groups.length])

  function jump(target: number) {
    if (target === idx) return
    setPaused(true)
    setFade(false)
    setTimeout(() => { setIdx(target); setFade(true) }, 180)
  }

  const current = category.groups[idx]
  if (!current) return null

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{category.name}</h3>
        <Link href={`/categories/${category.code}`} className="text-xs text-[var(--primary)] hover:underline">
          View all →
        </Link>
      </div>

      <div
        className={`mt-3 transition-opacity duration-200 ${fade ? "opacity-100" : "opacity-0"}`}
        // Avoid layout shifts as the inner content swaps
        style={{ minHeight: "8.5rem" }}
      >
        <p className="text-xs uppercase tracking-wider text-[var(--muted)]">
          Group {current.code} <span className="text-[var(--text)]">top 3</span>
        </p>
        {current.top.length === 0 ? (
          <p className="mt-3 text-sm text-[var(--muted)]">No matches completed yet.</p>
        ) : (
          <ol className="mt-2 space-y-1.5 text-sm">
            {current.top.map(t => (
              <li key={t.teamId} className="flex items-center justify-between">
                <span className="flex items-center gap-2 truncate">
                  <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                    t.position === 1 ? "bg-[var(--primary)] text-white" :
                    t.position === 2 ? "bg-[var(--primary-soft)] text-[var(--primary)]" :
                    "bg-[var(--surface-alt)] text-[var(--muted-strong)]"
                  }`}>
                    {t.position}
                  </span>
                  <Link href={`/teams/${t.teamId}`} className="truncate hover:underline">
                    {t.teamName}
                  </Link>
                </span>
                <span className="font-mono tabular-nums text-[var(--muted-strong)]">{t.points}</span>
              </li>
            ))}
          </ol>
        )}
      </div>

      {category.groups.length > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <button
            aria-label="Previous group"
            onClick={() => jump((idx - 1 + category.groups.length) % category.groups.length)}
            className="rounded-md p-1 text-[var(--muted)] hover:bg-[var(--surface-alt)] hover:text-[var(--text)]"
          >
            ‹
          </button>
          <div className="flex items-center gap-1.5">
            {category.groups.map((g, i) => (
              <button
                key={g.id}
                aria-label={`Group ${g.code}`}
                aria-current={i === idx ? "true" : undefined}
                onClick={() => jump(i)}
                className={`h-2 rounded-full transition-all ${
                  i === idx
                    ? "w-5 bg-[var(--primary)]"
                    : "w-2 bg-[var(--border)] hover:bg-[var(--muted)]"
                }`}
              />
            ))}
          </div>
          <button
            aria-label="Next group"
            onClick={() => jump((idx + 1) % category.groups.length)}
            className="rounded-md p-1 text-[var(--muted)] hover:bg-[var(--surface-alt)] hover:text-[var(--text)]"
          >
            ›
          </button>
        </div>
      )}
    </div>
  )
}
