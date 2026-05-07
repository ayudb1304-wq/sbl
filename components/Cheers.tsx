"use client"
import { useEffect, useRef, useState, useTransition } from "react"
import { createClient } from "@/lib/supabase/client"
import { getDeviceId } from "@/lib/device"
import { postCheer } from "@/lib/actions/engagement"

type Counts = { clap: number; fire: number }
const POLL_MS = 3000

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
  const idRef = useRef(0)

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

  function tap(type: "clap" | "fire") {
    // Optimistic local bump (server insert will trigger another via realtime —
    // we ignore that for our own cheers by tracking last-self-id, but cheap
    // option: just bump and let realtime double if it does. The animation
    // cost is fine, count drift over time is negligible).
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
        <span className="text-xs text-[var(--muted)]">Tap to send love</span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <CheerButton label="👏 Clap" count={counts.clap} onTap={() => tap("clap")} pending={pending} />
        <CheerButton label="🔥 Fire" count={counts.fire} onTap={() => tap("fire")} pending={pending} />
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
  label, count, onTap, pending,
}: {
  label: string
  count: number
  onTap: () => void
  pending: boolean
}) {
  return (
    <button
      onClick={onTap}
      disabled={pending && false /* allow rapid fire */}
      className="flex flex-col items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--bg)] p-4 text-center hover:border-[var(--primary)] active:scale-95 transition"
    >
      <span className="text-2xl">{label}</span>
      <span className="mt-1 font-mono text-sm tabular-nums text-[var(--muted)]">{count.toLocaleString()}</span>
    </button>
  )
}
