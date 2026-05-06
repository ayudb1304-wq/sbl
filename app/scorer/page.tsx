import Link from "next/link"
import { Container } from "@/components/Container"
import { LiveScoreSubscriber } from "@/components/LiveScoreSubscriber"
import { feederLabel, getActiveSeason, getSeasonMatches } from "@/lib/queries"
import { stageLabel, timeIST } from "@/lib/format"
import { StatusPill } from "@/components/StatusPill"
import type { FeederSource } from "@/lib/supabase/types"

export const dynamic = "force-dynamic"

const COURTS = ["1", "2", "3", "4", "5", "6"]

export default async function ScorerHome({
  searchParams,
}: {
  searchParams: Promise<{ court?: string; status?: string; cat?: string }>
}) {
  const sp = await searchParams
  const season = await getActiveSeason()
  if (!season) {
    return (
      <Container>
        <p className="text-sm text-[var(--muted)]">No active season.</p>
      </Container>
    )
  }
  const all = await getSeasonMatches(season.id)

  let matches = all
  const courtFilter = sp.court
  const catFilter = sp.cat?.toUpperCase()
  if (courtFilter) matches = matches.filter(m => m.court === `Court ${courtFilter}`)
  if (catFilter) matches = matches.filter(m => m.category.code === catFilter)
  if (sp.status === "open") {
    matches = matches.filter(m => m.status === "in_progress" || m.status === "scheduled")
  } else if (sp.status === "live") {
    matches = matches.filter(m => m.status === "in_progress")
  } else if (sp.status === "done") {
    matches = matches.filter(m => m.status === "completed" || m.status === "walkover")
  }

  return (
    <Container className="space-y-6">
      <LiveScoreSubscriber />
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Scorer dashboard</h1>
        <p className="text-sm text-[var(--muted)]">
          {matches.length} of {all.length} matches · tap a row to enter scores.
        </p>
      </header>

      <div className="space-y-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
        <FilterGroup label="Court" param="court" options={COURTS.map(c => ({ value: c, label: `C${c}` }))} active={sp.court} sp={sp} />
        <FilterGroup label="Category" param="cat" options={[{ value: "MB", label: "MB" }, { value: "MI", label: "MI" }, { value: "W", label: "W" }]} active={sp.cat?.toUpperCase()} sp={sp} />
        <FilterGroup label="Status" param="status" options={[{ value: "open", label: "Open" }, { value: "live", label: "Live" }, { value: "done", label: "Done" }]} active={sp.status} sp={sp} />
      </div>

      <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
        <table className="w-full text-sm">
          <thead className="bg-[var(--bg)] text-[var(--muted)]">
            <tr>
              <th className="px-3 py-2 text-left">Time</th>
              <th className="px-3 py-2 text-left">Court</th>
              <th className="px-3 py-2 text-left">Cat</th>
              <th className="px-3 py-2 text-left">Stage</th>
              <th className="px-3 py-2 text-left">Match</th>
              <th className="px-3 py-2 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {matches.map(m => {
              const a = m.team_a?.name ?? feederLabel(m.team_a_source as FeederSource | null)
              const b = m.team_b?.name ?? feederLabel(m.team_b_source as FeederSource | null)
              return (
                <tr key={m.id} className="border-t border-[var(--border)] hover:bg-[var(--bg)]">
                  <td className="px-3 py-2 font-mono">{timeIST(m.scheduled_at)}</td>
                  <td className="px-3 py-2">{m.court}</td>
                  <td className="px-3 py-2">{m.category.code}</td>
                  <td className="px-3 py-2 text-xs text-[var(--muted)]">{stageLabel(m.stage, m.round_label)}</td>
                  <td className="px-3 py-2">
                    <Link href={`/scorer/match/${m.id}`} className="hover:underline">
                      {a} <span className="text-[var(--muted)]">vs</span> {b}
                    </Link>
                  </td>
                  <td className="px-3 py-2"><StatusPill status={m.status} /></td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {matches.length === 0 && (
          <p className="p-6 text-center text-sm text-[var(--muted)]">No matches match these filters.</p>
        )}
      </div>
    </Container>
  )
}

function FilterGroup({
  label, param, options, active, sp,
}: {
  label: string
  param: string
  options: { value: string; label: string }[]
  active: string | undefined
  sp: Record<string, string | undefined>
}) {
  function build(value: string | null) {
    const next: Record<string, string> = {}
    for (const [k, v] of Object.entries(sp)) if (v && k !== param) next[k] = v
    if (value) next[param] = value
    const qs = new URLSearchParams(next).toString()
    return `/scorer${qs ? `?${qs}` : ""}`
  }
  return (
    <div className="flex flex-wrap items-center gap-1">
      <span className="mr-2 text-xs uppercase tracking-wider text-[var(--muted)]">{label}</span>
      <FilterChip href={build(null)} active={!active}>All</FilterChip>
      {options.map(o => (
        <FilterChip key={o.value} href={build(o.value)} active={active === o.value}>
          {o.label}
        </FilterChip>
      ))}
    </div>
  )
}

function FilterChip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`rounded-md px-2.5 py-1 text-xs ${
        active
          ? "bg-[var(--primary)] text-white"
          : "border border-[var(--border)] text-[var(--muted)] hover:bg-[var(--bg)]"
      }`}
    >
      {children}
    </Link>
  )
}
