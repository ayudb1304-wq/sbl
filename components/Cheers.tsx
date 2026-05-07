"use client"
import { useEffect, useRef, useState, useTransition } from "react"
import { createClient } from "@/lib/supabase/client"
import { getDeviceId } from "@/lib/device"
import { postCheer } from "@/lib/actions/engagement"

type Counts = { clap: number; fire: number }
const POLL_MS = 3000

// Anti-spam: minimum interval between successful taps per type.
// 150ms ≈ 6.5 taps/sec/button — fast enough to feel celebratory, slow
// enough to block auto-clickers and accidental double-taps. Pair with the
// burst window below for sustained-spam protection.
const COOLDOWN_MS = 150
// Burst limit: max successful taps in BURST_WINDOW_MS per type, then a
// hard pause until the window slides forward. Discourages 30s sustained
// hammering without preventing celebratory bursts.
const BURST_LIMIT = 25
const BURST_WINDOW_MS = 5000

export function Cheers({
  matchId,
  initialCounts,
}: {
  matchId: string
  initialCounts: Counts
}) {
  const [counts, setCounts] = useState<Counts>(initialCounts)
  const [pending, start] = useTransition()
  const [floats, setFloats] = useState<{ id: number; type: "clap" | "fire"; x: number }[]>([])
  const [cooling, setCooling] = useState<{ clap: boolean; fire: boolean }>({ clap: false, fire: false })
  const [tooFast, setTooFast] = useState(false)
  const idRef = useRef(0)
  // Per-type sliding window of recent successful taps, for burst limiting.
  const burstRef = useRef<{ clap: number[]; fire: number[] }>({ clap: [], fire: [] })
  const cooldownTimers = useRef<{ clap: number | null; fire: number | null }>({ clap: null, fire: null })
  const tooFastTimer = useRef<number | null>(null)

  // Polling — aggregates instead of per-tap broadcast. Avoids the
  // N-subscribers-x-N-taps multiplication that would blow through the
  // Supabase Realtime message budget at scale. Pauses when tab is hidden.
  useEffect(() => {
    let cancelled = false
    const sb = createClient()

    async function fetchCounts() {
      if (typeof document !== "undefined" && document.hidden) return
      const [a, b] = await Promise.all([
        sb.from("cheers").select("id", { count: "exact", head: true }).eq("match_id", matchId).eq("cheer_type", "clap"),
        sb.from("cheers").select("id", { count: "exact", head: true }).eq("match_id", matchId).eq("cheer_type", "fire"),
      ])
      if (cancelled) return
      // Don't clobber an optimistic local bump that's still in flight: take the
      // larger of (server count, current local count) per type.
      setCounts(curr => ({
        clap: Math.max(curr.clap, a.count ?? 0),
        fire: Math.max(curr.fire, b.count ?? 0),
      }))
    }

    const t = setInterval(fetchCounts, POLL_MS)
    // Refresh immediately on tab regain focus so the user catches up faster.
    function onVisibility() { if (!document.hidden) fetchCounts() }
    document.addEventListener("visibilitychange", onVisibility)
    return () => {
      cancelled = true
      clearInterval(t)
      document.removeEventListener("visibilitychange", onVisibility)
    }
  }, [matchId])

  function fly(type: "clap" | "fire") {
    const id = idRef.current++
    const x = Math.random() * 60 - 30 // -30..30 px drift
    setFloats(f => [...f, { id, type, x }])
    setTimeout(() => setFloats(f => f.filter(p => p.id !== id)), 1200)
  }

  function flashTooFast() {
    setTooFast(true)
    if (tooFastTimer.current) window.clearTimeout(tooFastTimer.current)
    tooFastTimer.current = window.setTimeout(() => setTooFast(false), 1500)
  }

  function tap(type: "clap" | "fire") {
    // Cooldown check
    if (cooling[type]) {
      flashTooFast()
      return
    }
    // Burst-window check
    const now = Date.now()
    const recent = burstRef.current[type].filter(ts => now - ts < BURST_WINDOW_MS)
    if (recent.length >= BURST_LIMIT) {
      burstRef.current[type] = recent
      flashTooFast()
      return
    }
    burstRef.current[type] = [...recent, now]

    // Start cooldown
    setCooling(c => ({ ...c, [type]: true }))
    if (cooldownTimers.current[type]) window.clearTimeout(cooldownTimers.current[type]!)
    cooldownTimers.current[type] = window.setTimeout(() => {
      setCooling(c => ({ ...c, [type]: false }))
    }, COOLDOWN_MS)

    // Optimistic local bump
    setCounts(c => ({ ...c, [type]: c[type] + 1 }))
    fly(type)
    start(async () => {
      const deviceId = getDeviceId()
      const res = await postCheer({ deviceId, matchId, cheerType: type })
      if (!res.ok) {
        // Roll back optimistic bump on failure
        setCounts(c => ({ ...c, [type]: Math.max(0, c[type] - 1) }))
      }
    })
  }

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--muted)]">Cheer</h3>
        <span className={`text-xs transition-colors ${tooFast ? "text-[var(--warning)]" : "text-[var(--muted)]"}`}>
          {tooFast ? "Whoa, slow down a touch" : "Tap to send love"}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <CheerButton label="👏 Clap" count={counts.clap} onTap={() => tap("clap")} cooling={cooling.clap} />
        <CheerButton label="🔥 Fire" count={counts.fire} onTap={() => tap("fire")} cooling={cooling.fire} />
      </div>

      {/* Floating emoji animation layer */}
      <div className="pointer-events-none relative h-0">
        {floats.map(f => (
          <span
            key={f.id}
            style={{
              position: "absolute",
              left: `calc(${f.type === "clap" ? "25%" : "75%"} + ${f.x}px)`,
              transform: "translateX(-50%)",
              animation: "sblFloat 1.2s ease-out forwards",
            }}
            className="text-2xl"
          >
            {f.type === "clap" ? "👏" : "🔥"}
          </span>
        ))}
      </div>
      <style>{`
        @keyframes sblFloat {
          0%   { opacity: 1; transform: translate(-50%, 0) scale(1); }
          100% { opacity: 0; transform: translate(-50%, -80px) scale(1.4); }
        }
      `}</style>
    </div>
  )
}

function CheerButton({
  label, count, onTap, cooling,
}: {
  label: string
  count: number
  onTap: () => void
  cooling: boolean
}) {
  return (
    <button
      onClick={onTap}
      // Note: not actually disabled — we still receive clicks during cooldown
      // so the user gets the "too fast" hint. The function itself rejects.
      aria-busy={cooling}
      className={`relative flex flex-col items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--bg)] p-4 text-center hover:border-[var(--primary)] active:scale-95 transition ${
        cooling ? "opacity-60" : ""
      }`}
    >
      <span className="text-2xl">{label}</span>
      <span className="mt-1 font-mono text-sm tabular-nums text-[var(--muted)]">{count.toLocaleString()}</span>
      {/* Cooldown progress strip — drains right-to-left over the cooldown window */}
      <span
        className="pointer-events-none absolute bottom-0 left-0 h-0.5 rounded-b-lg bg-[var(--primary)]"
        style={{
          width: cooling ? "100%" : "0%",
          transition: cooling ? "width 0ms" : `width 150ms linear`,
          opacity: cooling ? 0.5 : 0,
        }}
      />
    </button>
  )
}
