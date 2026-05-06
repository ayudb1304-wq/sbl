"use client"
import { useEffect, useState } from "react"
import { getDeviceId } from "@/lib/device"

type Row = { deviceId: string; name: string; points: number; correct: number; total: number; pending: number }

export function LeaderboardClient({ rows }: { rows: Row[] }) {
  const [me, setMe] = useState<string>("")
  useEffect(() => { setMe(getDeviceId()) }, [])

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--border)] p-6 text-center text-sm text-[var(--muted)]">
        No picks yet. Be the first to play!
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-card)]">
      <table className="w-full text-sm">
        <thead className="bg-[var(--surface-alt)] text-[var(--muted-strong)]">
          <tr>
            <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider">#</th>
            <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider">Player</th>
            <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wider">Correct</th>
            <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wider">Pending</th>
            <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wider">Pts</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const isMe = r.deviceId === me
            return (
              <tr
                key={r.deviceId}
                style={isMe ? { backgroundColor: "var(--primary-soft)" } : undefined}
                className="border-t border-[var(--border)]"
              >
                <td className="px-3 py-2 font-mono">{i + 1}</td>
                <td className="px-3 py-2">
                  {r.name}
                  {isMe && <span className="ml-2 rounded-full bg-[var(--primary)] px-1.5 py-0.5 text-[10px] font-bold text-white">YOU</span>}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">{r.correct} / {r.total - r.pending}</td>
                <td className="px-3 py-2 text-right tabular-nums text-[var(--muted)]">{r.pending}</td>
                <td className="px-3 py-2 text-right font-semibold tabular-nums">{r.points}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
