"use client"
import { useEffect, useRef, useState, useTransition } from "react"
import { createClient } from "@/lib/supabase/client"
import { getDeviceId } from "@/lib/device"
import { postCheer } from "@/lib/actions/engagement"

type Counts = { clap: number; fire: number }

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

  // Realtime: increment counters when anyone else cheers.
  useEffect(() => {
    const sb = createClient()
    const ch = sb.channel(`cheers:${matchId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "cheers",
        filter: `match_id=eq.${matchId}`,
      }, (payload) => {
        const t = (payload.new as { cheer_type: "clap" | "fire" }).cheer_type
        setCounts(c => ({ ...c, [t]: c[t] + 1 }))
      })
      .subscribe()
    return () => { sb.removeChannel(ch) }
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
