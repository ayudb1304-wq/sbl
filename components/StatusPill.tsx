import { statusBadge } from "@/lib/format"

export function StatusPill({ status }: { status: string }) {
  const { label, tone } = statusBadge(status)
  const cls = {
    live: "bg-[var(--live)] text-white shadow-sm",
    done: "bg-[var(--success)]/15 text-[var(--success)] border border-[var(--success)]/30",
    soon: "bg-[var(--surface)] text-[var(--muted)] border border-[var(--border)]",
    wo:   "bg-[var(--warning)]/15 text-[var(--warning)] border border-[var(--warning)]/30",
  }[tone]
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wider ${cls} ${tone === "live" ? "animate-pulse" : ""}`}>
      {label}
    </span>
  )
}
