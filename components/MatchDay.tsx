"use client"
import Link from "next/link"
import { useEffect, useState } from "react"

/**
 * Pre-event countdown + the SBL standee. Shows under the hero on the home
 * page until match day starts, then auto-hides. Pure client-side ticker —
 * setInterval(1s) doing Date.now() math, zero backend cost.
 */
export function MatchDay({
  startsAt, endsAt,
}: {
  startsAt: string
  endsAt: string
}) {
  const [now, setNow] = useState<number>(() => Date.now())
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  const start = new Date(startsAt).getTime()
  const end = new Date(endsAt).getTime()
  const isLive = now >= start && now <= end
  const isOver = now > end
  const remaining = Math.max(0, start - now)

  // Hide entirely once the event is over
  if (isOver) return null

  // SSR-safe placeholder until mounted (avoids hydration drift on the ticker)
  if (!mounted) {
    return (
      <section className="grid gap-6 sm:grid-cols-[auto_1fr] sm:items-center">
        <div className="mx-auto w-full max-w-[260px] sm:mx-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/standee.png"
            alt="Sysfore Badminton League — Match Day"
            className="rounded-2xl shadow-[var(--shadow-pop)]"
          />
        </div>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6" />
      </section>
    )
  }

  const days = Math.floor(remaining / 86_400_000)
  const hours = Math.floor((remaining / 3_600_000) % 24)
  const minutes = Math.floor((remaining / 60_000) % 60)
  const seconds = Math.floor((remaining / 1000) % 60)

  return (
    <section className="grid gap-6 sm:grid-cols-[auto_1fr] sm:items-center">
      <div className="mx-auto w-full max-w-[260px] sm:mx-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/standee.png"
          alt="Sysfore Badminton League — Match Day"
          className="rounded-2xl shadow-[var(--shadow-pop)]"
        />
      </div>

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-8 shadow-[var(--shadow-card)]">
        {isLive ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-[var(--live)]" />
              <span className="text-xs font-bold uppercase tracking-widest text-[var(--live)]">Match day · live</span>
            </div>
            <h2 className="display text-3xl text-[var(--text-strong)]">The tournament is on.</h2>
            <p className="text-sm text-[var(--muted-strong)]">
              Live scores, standings, and the bracket are updating in real time. Browse below.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <Link
                href="#live"
                style={{ backgroundColor: "var(--primary)" }}
                className="rounded-md px-4 py-2 text-sm font-medium text-white hover:opacity-90"
              >
                Jump to live matches
              </Link>
              <Link
                href="/predictions"
                className="rounded-md border border-[var(--border)] px-4 py-2 text-sm font-medium hover:border-[var(--primary)]"
              >
                Bracket challenge
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-xs font-bold uppercase tracking-widest text-[var(--primary)]">
              Match day countdown
            </div>
            <div className="grid grid-cols-4 gap-2 sm:gap-4">
              <CountBox value={days} label={days === 1 ? "Day" : "Days"} />
              <CountBox value={hours} label={hours === 1 ? "Hour" : "Hours"} />
              <CountBox value={minutes} label={minutes === 1 ? "Min" : "Mins"} />
              <CountBox value={seconds} label={seconds === 1 ? "Sec" : "Secs"} />
            </div>
            <p className="text-sm text-[var(--muted-strong)]">
              Saturday, 23 May 2026 · 9:00 AM – 5:00 PM IST · 6 courts · 45 teams
            </p>
            <div className="space-y-2 pt-1">
              <div className="flex flex-wrap gap-2">
                <Link
                  href="/predictions"
                  style={{ backgroundColor: "var(--primary)" }}
                  className="rounded-md px-4 py-2 text-sm font-medium text-white hover:opacity-90"
                >
                  Pick the champions
                </Link>
              </div>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-xs text-[var(--muted)]">Preview the draws:</span>
                <Link
                  href="/categories/MB"
                  className="rounded-md border border-[var(--border)] px-3 py-1.5 text-xs font-medium hover:border-[var(--primary)]"
                >
                  Men&apos;s Beginner
                </Link>
                <Link
                  href="/categories/MI"
                  className="rounded-md border border-[var(--border)] px-3 py-1.5 text-xs font-medium hover:border-[var(--primary)]"
                >
                  Men&apos;s Intermediate
                </Link>
                <Link
                  href="/categories/W"
                  className="rounded-md border border-[var(--border)] px-3 py-1.5 text-xs font-medium hover:border-[var(--primary)]"
                >
                  Women&apos;s
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

function CountBox({ value, label }: { value: number; label: string }) {
  return (
    <div
      style={{ backgroundColor: "var(--primary-soft)", borderColor: "var(--primary)" }}
      className="rounded-xl border p-3 text-center"
    >
      <div
        className="font-mono text-3xl font-bold tabular-nums sm:text-4xl"
        style={{ color: "var(--primary)" }}
      >
        {String(value).padStart(2, "0")}
      </div>
      <div className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-[var(--muted-strong)]">
        {label}
      </div>
    </div>
  )
}
