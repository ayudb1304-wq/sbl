"use client"
import Link from "next/link"
import { useEffect, useState } from "react"
import { getDeviceId } from "@/lib/device"

type Row = {
  deviceId: string
  name: string
  points: number
  correct: number
  picks: number
  pending: number
  resolved: number
}

export function LeaderboardClient({
  rows, pointsActive,
}: {
  rows: Row[]
  pointsActive: boolean
}) {
  const [me, setMe] = useState<string>("")
  useEffect(() => { setMe(getDeviceId()) }, [])

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-6 text-center text-sm text-[var(--muted)]">
        <p>No picks yet — be the first.</p>
        <Link
          href="/predictions"
          style={{ backgroundColor: "var(--primary)" }}
          className="mt-3 inline-block rounded-md px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          Make your picks
        </Link>
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
            <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wider">Picks</th>
            {pointsActive && (
              <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wider">Correct</th>
            )}
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
                <td className="px-3 py-2 font-mono text-[var(--muted)]">{i + 1}</td>
                <td className="px-3 py-2">
                  {r.name}
                  {isMe && (
                    <span
                      style={{ backgroundColor: "var(--primary)" }}
                      className="ml-2 rounded-full px-1.5 py-0.5 text-[10px] font-bold text-white"
                    >
                      YOU
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">{r.picks}</td>
                {pointsActive && (
                  <td className="px-3 py-2 text-right tabular-nums">
                    {r.resolved > 0 ? `${r.correct} / ${r.resolved}` : "—"}
                  </td>
                )}
                <td className="px-3 py-2 text-right tabular-nums text-[var(--muted)]">{r.pending}</td>
                <td className="px-3 py-2 text-right font-semibold tabular-nums">
                  {pointsActive ? r.points : "—"}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
