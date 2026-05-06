const TZ = "Asia/Kolkata"

export function timeIST(iso: string | null | undefined): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: TZ,
  })
}

export function dateIST(iso: string | null | undefined): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: TZ,
  })
}

export function categoryShortName(code: string): string {
  switch (code) {
    case "MB": return "Men's Beginner"
    case "MI": return "Men's Intermediate"
    case "W":  return "Women's"
    default:   return code
  }
}

export function stageLabel(stage: string, roundLabel: string): string {
  switch (stage) {
    case "group": return `Group · ${roundLabel}`
    case "qf":    return `Quarter-final ${roundLabel.replace("QF", "")}`
    case "sf":    return `Semi-final ${roundLabel.replace("SF", "")}`
    case "final": return "Final"
    default:      return roundLabel
  }
}

export function statusBadge(status: string): { label: string; tone: "live" | "done" | "soon" | "wo" } {
  switch (status) {
    case "in_progress": return { label: "LIVE", tone: "live" }
    case "completed":   return { label: "FT",   tone: "done" }
    case "walkover":    return { label: "W/O",  tone: "wo" }
    case "scheduled":   return { label: "TBP",  tone: "soon" }
    default:            return { label: status.toUpperCase(), tone: "soon" }
  }
}

/**
 * Subtle background + border tints for cards/rows, keyed off match.status.
 * Used by MatchCard and BracketMatch so a glance at the dashboard tells you
 * what's live, what's finished, and what's still scheduled.
 */
export function statusCardClasses(status: string): string {
  switch (status) {
    case "in_progress":
      return "bg-red-50/60 border-red-200 dark:bg-red-950/20 dark:border-red-900/50"
    case "completed":
      return "bg-emerald-50/60 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900/50"
    case "walkover":
      return "bg-amber-50/70 border-amber-200 dark:bg-amber-950/25 dark:border-amber-900/50"
    case "cancelled":
      return "bg-zinc-100/60 border-zinc-200 opacity-70 dark:bg-zinc-900/40 dark:border-zinc-800"
    case "scheduled":
    default:
      return "bg-[var(--surface)] border-[var(--border)]"
  }
}
