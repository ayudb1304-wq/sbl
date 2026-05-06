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
    return <div className="rounded-lg border border-dashed border-[var(--border)] bg-[var(--surface)] p-6 text-center text-sm text-[var(--muted)]">No matches completed yet.</div>
  }
  return (
    <div className="overflow-x-auto rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-card)]">
      <table className="w-full text-sm">
        <thead className="bg-[var(--surface-alt)] text-[var(--muted-strong)]">
          <tr>
            <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider">#</th>
            <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider">Team</th>
            <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wider">P</th>
            <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wider">W</th>
            <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wider">L</th>
            <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wider">SD</th>
            <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wider">PD</th>
            <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wider">Pts</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr
              key={r.team.id}
              className={`border-t border-[var(--border)] ${qualifyTopN > 0 && r.position <= qualifyTopN ? "bg-[var(--success-soft)]" : ""}`}
            >
              <td className="px-3 py-2.5 font-mono">{r.position}</td>
              <td className="px-3 py-2.5">
                <Link href={`/teams/${r.team.id}`} className="hover:underline">
                  {r.team.name}
                </Link>
                {r.needsToss && <span className="ml-1.5 inline-flex items-center rounded-full bg-[var(--warning)]/15 px-1.5 py-0.5 text-[10px] font-bold text-[var(--warning)]">TOSS</span>}
              </td>
              <td className="px-3 py-2.5 text-right tabular-nums">{r.matches_played ?? 0}</td>
              <td className="px-3 py-2.5 text-right tabular-nums">{r.wins ?? 0}</td>
              <td className="px-3 py-2.5 text-right tabular-nums">{r.losses ?? 0}</td>
              <td className="px-3 py-2.5 text-right tabular-nums">{(r.set_diff ?? 0) > 0 ? `+${r.set_diff}` : r.set_diff ?? 0}</td>
              <td className="px-3 py-2.5 text-right tabular-nums">{(r.point_diff ?? 0) > 0 ? `+${r.point_diff}` : r.point_diff ?? 0}</td>
              <td className="px-3 py-2.5 text-right font-semibold tabular-nums">{r.points ?? 0}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
