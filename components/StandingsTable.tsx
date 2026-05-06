import Link from "next/link"
import type { RankedRow } from "@/lib/standings"

export function StandingsTable({
  rows,
  qualifyTopN = 0,
}: {
  rows: RankedRow[]
  qualifyTopN?: number
}) {
  if (rows.length === 0) {
    return <div className="rounded-md border border-dashed border-[var(--border)] p-4 text-center text-sm text-[var(--muted)]">No matches completed yet.</div>
  }
  return (
    <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
      <table className="w-full text-sm">
        <thead className="bg-[var(--bg)] text-[var(--muted)]">
          <tr>
            <th className="px-2 py-2 text-left">#</th>
            <th className="px-2 py-2 text-left">Team</th>
            <th className="px-2 py-2 text-right">P</th>
            <th className="px-2 py-2 text-right">W</th>
            <th className="px-2 py-2 text-right">L</th>
            <th className="px-2 py-2 text-right">SD</th>
            <th className="px-2 py-2 text-right">PD</th>
            <th className="px-2 py-2 text-right font-semibold">Pts</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr
              key={r.team.id}
              className={`border-t border-[var(--border)] ${qualifyTopN > 0 && r.position <= qualifyTopN ? "bg-emerald-50 dark:bg-emerald-950/30" : ""}`}
            >
              <td className="px-2 py-2 font-mono">{r.position}</td>
              <td className="px-2 py-2">
                <Link href={`/teams/${r.team.id}`} className="hover:underline">
                  {r.team.name}
                </Link>
                {r.needsToss && <span className="ml-1 text-[10px] font-semibold text-amber-600">⚠ TOSS</span>}
              </td>
              <td className="px-2 py-2 text-right tabular-nums">{r.matches_played ?? 0}</td>
              <td className="px-2 py-2 text-right tabular-nums">{r.wins ?? 0}</td>
              <td className="px-2 py-2 text-right tabular-nums">{r.losses ?? 0}</td>
              <td className="px-2 py-2 text-right tabular-nums">{(r.set_diff ?? 0) > 0 ? `+${r.set_diff}` : r.set_diff ?? 0}</td>
              <td className="px-2 py-2 text-right tabular-nums">{(r.point_diff ?? 0) > 0 ? `+${r.point_diff}` : r.point_diff ?? 0}</td>
              <td className="px-2 py-2 text-right font-semibold tabular-nums">{r.points ?? 0}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
