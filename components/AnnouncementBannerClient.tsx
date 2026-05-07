"use client"
import { useEffect, useState } from "react"
import { Container } from "./Container"

type Tone = "info" | "success" | "warning" | "urgent"
type Announcement = { id: string; message: string; tone: Tone; created_at: string }

const POLL_MS = 30_000
const DISMISS_KEY = "sbl:dismissed-announcement"

const TONE_STYLES: Record<Tone, { bg: string; border: string; fg: string; icon: string }> = {
  info:    { bg: "var(--primary-soft)", border: "var(--primary)", fg: "var(--primary)", icon: "📣" },
  success: { bg: "var(--success-soft)", border: "var(--success)", fg: "var(--success)", icon: "✅" },
  warning: { bg: "var(--warning-soft)", border: "var(--warning)", fg: "var(--warning)", icon: "⚠️" },
  urgent:  { bg: "var(--live-soft)",    border: "var(--live)",    fg: "var(--live)",    icon: "🚨" },
}

export function AnnouncementBannerClient({ initial }: { initial: Announcement | null }) {
  const [a, setA] = useState<Announcement | null>(initial)
  const [dismissedId, setDismissedId] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    if (typeof window !== "undefined") {
      setDismissedId(localStorage.getItem(DISMISS_KEY))
    }
  }, [])

  // Poll for fresh announcement
  useEffect(() => {
    let cancelled = false
    async function fetchNow() {
      if (typeof document !== "undefined" && document.hidden) return
      try {
        const res = await fetch("/api/announcement", { cache: "no-store" })
        if (!res.ok) return
        const data = (await res.json()) as { announcement: Announcement | null }
        if (!cancelled) setA(data.announcement)
      } catch { /* silent retry on next interval */ }
    }
    const t = setInterval(fetchNow, POLL_MS)
    function onVisibility() { if (!document.hidden) fetchNow() }
    document.addEventListener("visibilitychange", onVisibility)
    return () => {
      cancelled = true
      clearInterval(t)
      document.removeEventListener("visibilitychange", onVisibility)
    }
  }, [])

  function dismiss() {
    if (!a) return
    localStorage.setItem(DISMISS_KEY, a.id)
    setDismissedId(a.id)
  }

  // Don't flicker on initial server-rendered page if user has already dismissed
  if (!mounted) return null
  if (!a) return null
  if (dismissedId === a.id) return null

  const t = TONE_STYLES[a.tone]
  return (
    <div
      style={{
        backgroundColor: t.bg,
        borderTop: `1px solid ${t.border}`,
        borderBottom: `1px solid ${t.border}`,
        color: "var(--text)",
      }}
      role="status"
      aria-live="polite"
    >
      <Container className="flex items-start gap-3 py-2">
        <span aria-hidden className="mt-0.5 text-base">{t.icon}</span>
        <p className="flex-1 text-sm leading-relaxed">{a.message}</p>
        <button
          onClick={dismiss}
          aria-label="Dismiss announcement"
          style={{ color: t.fg }}
          className="rounded p-1 text-xs font-semibold hover:bg-black/5 dark:hover:bg-white/10"
          title="Dismiss"
        >
          ✕
        </button>
      </Container>
    </div>
  )
}
