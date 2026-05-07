"use client"
import Link from "next/link"
import { useEffect, useState } from "react"
import type { MarqueeItem } from "@/lib/marquee"

const POLL_MS = 15000

export function MarqueeContent({ initialItems }: { initialItems: MarqueeItem[] }) {
  const [items, setItems] = useState<MarqueeItem[]>(initialItems)

  // Poll the marquee endpoint on an interval. Pause when tab is hidden.
  // Avoids global Postgres-changes subscriptions per-spectator.
  useEffect(() => {
    let cancelled = false
    async function fetchItems() {
      if (typeof document !== "undefined" && document.hidden) return
      try {
        const res = await fetch("/api/marquee", { cache: "no-store" })
        if (!res.ok) return
        const data = (await res.json()) as { items: MarqueeItem[] }
        if (!cancelled) setItems(data.items)
      } catch {
        // Silent — marquee will retry on next interval
      }
    }
    const t = setInterval(fetchItems, POLL_MS)
    function onVisibility() { if (!document.hidden) fetchItems() }
    document.addEventListener("visibilitychange", onVisibility)
    return () => {
      cancelled = true
      clearInterval(t)
      document.removeEventListener("visibilitychange", onVisibility)
    }
  }, [])

  if (items.length === 0) return null

  const loop = [...items, ...items]
  const liveCount = items.filter(i => i.state === "live").length
  const duration = Math.min(120, Math.max(30, items.length * 5))

  return (
    <div
      style={{ backgroundColor: "var(--primary)", color: "#FFFFFF" }}
      className="relative overflow-hidden"
      aria-label="Live score ticker"
    >
      <div
        className="pointer-events-none absolute left-0 top-0 z-10 flex h-full items-center gap-2 bg-[var(--primary)] pl-3 pr-4 text-[10px] font-bold uppercase tracking-widest"
        style={{ boxShadow: "8px 0 12px var(--primary)" }}
      >
        {liveCount > 0 ? (
          <>
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--live)]" />
            <span>Live · {liveCount}</span>
          </>
        ) : (
          <span>Recent</span>
        )}
      </div>
      <div
        className="flex whitespace-nowrap py-1.5 will-change-transform"
        style={{
          animation: `sblMarquee ${duration}s linear infinite`,
          paddingLeft: "9rem",
        }}
      >
        {loop.map((it, i) => (
          <Link
            key={`${it.id}-${i}`}
            href={`/matches/${it.id}`}
            className="mx-3 inline-flex items-center gap-2 text-sm hover:underline"
          >
            <Pill state={it.state} />
            <span className="font-mono text-[11px] opacity-80">
              {it.category_code} · {it.round_label}{it.court ? ` · ${it.court}` : ""}
            </span>
            <span className="font-medium">{it.team_a}</span>
            <span className="font-mono tabular-nums opacity-90">
              {it.score_a.length > 0 ? `${it.score_a.join("-")}–${it.score_b.join("-")}` : "—"}
            </span>
            <span className="font-medium">{it.team_b}</span>
            <span className="opacity-30">•</span>
          </Link>
        ))}
      </div>
      <style>{`
        @keyframes sblMarquee {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        [aria-label="Live score ticker"]:hover [class*="will-change-transform"] {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  )
}

function Pill({ state }: { state: "live" | "done" | "wo" }) {
  const label = state === "live" ? "LIVE" : state === "wo" ? "W/O" : "FT"
  const cls =
    state === "live"
      ? "bg-[var(--live)] text-white"
      : state === "wo"
        ? "bg-[var(--warning)] text-white"
        : "bg-white/15 text-white"
  return (
    <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold tracking-wider ${cls} ${state === "live" ? "animate-pulse" : ""}`}>
      {label}
    </span>
  )
}
