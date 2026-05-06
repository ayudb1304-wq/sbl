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
  // Each tinted state gets a 4px colored left accent on top of a saturated
  // background tint, so live/done/walkover are obvious at a glance.
  switch (status) {
    case "in_progress":
      return "bg-[var(--live-soft)] border border-[var(--live)]/40 border-l-4 border-l-[var(--live)]"
    case "completed":
      return "bg-[var(--success-soft)] border border-[var(--success)]/40 border-l-4 border-l-[var(--success)]"
    case "walkover":
      return "bg-[var(--warning-soft)] border border-[var(--warning)]/40 border-l-4 border-l-[var(--warning)]"
    case "cancelled":
      return "bg-[var(--surface-alt)] border border-[var(--border)] opacity-60"
    case "scheduled":
    default:
      return "bg-[var(--surface)] border border-[var(--border)]"
  }
}
