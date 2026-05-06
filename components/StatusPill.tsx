import { statusBadge } from "@/lib/format"

export function StatusPill({ status }: { status: string }) {
  const { label, tone } = statusBadge(status)
  const cls = {
    live: "bg-[var(--live)] text-white animate-pulse",
    done: "bg-[var(--border)] text-[var(--muted)]",
    soon: "bg-[var(--surface)] text-[var(--muted)] border border-[var(--border)]",
    wo:   "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200",
  }[tone]
  return (
    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wider ${cls}`}>
      {label}
    </span>
  )
}
