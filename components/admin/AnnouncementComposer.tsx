"use client"
import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { clearAnnouncement, postAnnouncement } from "@/lib/actions/admin"

type Tone = "info" | "success" | "warning" | "urgent"
type Active = { id: string; message: string; tone: Tone; created_at: string } | null

const TONES: { value: Tone; label: string; emoji: string }[] = [
  { value: "info",    label: "Info",    emoji: "📣" },
  { value: "success", label: "Success", emoji: "✅" },
  { value: "warning", label: "Warning", emoji: "⚠️" },
  { value: "urgent",  label: "Urgent",  emoji: "🚨" },
]

export function AnnouncementComposer({ active }: { active: Active }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [message, setMessage] = useState("")
  const [tone, setTone] = useState<Tone>("info")
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  function reset() {
    setMessage("")
    setTone("info")
  }

  function act(fn: () => Promise<{ ok: true } | { ok: false; error: string }>, successMsg: string) {
    setError(null); setInfo(null)
    start(async () => {
      const res = await fn()
      if (!res.ok) setError(res.error)
      else { setInfo(successMsg); router.refresh() }
    })
  }

  return (
    <div className="space-y-4">
      {active && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--muted)]">Currently posted</h3>
            <span className="text-xs text-[var(--muted)]">posted {new Date(active.created_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", hour12: false })}</span>
          </div>
          <p className="rounded-md bg-[var(--surface-alt)] px-3 py-2 text-sm">{active.message}</p>
          <div className="flex items-center justify-between text-xs text-[var(--muted)]">
            <span>Tone: <span className="font-medium capitalize text-[var(--text)]">{active.tone}</span></span>
            <button
              disabled={pending}
              onClick={() => {
                if (confirm("Clear the current announcement for everyone?")) {
                  act(() => clearAnnouncement(), "Cleared.")
                }
              }}
              className="rounded-md border border-red-200 px-2 py-1 text-xs text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/30"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--muted)]">
          {active ? "Replace announcement" : "Post announcement"}
        </h3>
        <textarea
          value={message}
          onChange={e => setMessage(e.target.value.slice(0, 280))}
          placeholder="e.g. Lunch is being served in the cafeteria!"
          rows={3}
          className="block w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm focus:border-[var(--primary)] focus:outline-none"
        />
        <div className="flex items-center justify-between text-xs text-[var(--muted)]">
          <div className="flex flex-wrap gap-1.5">
            {TONES.map(t => (
              <button
                key={t.value}
                onClick={() => setTone(t.value)}
                className={`rounded-full border px-2.5 py-1 text-xs ${
                  tone === t.value
                    ? "border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)] font-medium"
                    : "border-[var(--border)] hover:border-[var(--primary)]"
                }`}
              >
                {t.emoji} {t.label}
              </button>
            ))}
          </div>
          <span className={message.length > 240 ? "text-[var(--warning)]" : ""}>{message.length}/280</span>
        </div>
        <div className="flex items-center justify-end gap-2">
          {message && (
            <button
              disabled={pending}
              onClick={reset}
              className="rounded-md border border-[var(--border)] px-3 py-1.5 text-sm hover:border-[var(--primary)] disabled:opacity-50"
            >
              Reset
            </button>
          )}
          <button
            disabled={pending || !message.trim()}
            onClick={() => {
              act(async () => {
                const res = await postAnnouncement({ message, tone })
                if (res.ok) reset()
                return res
              }, "Posted — visible to everyone now.")
            }}
            style={{ backgroundColor: "var(--primary)" }}
            className="rounded-md px-4 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {pending ? "Posting..." : active ? "Replace" : "Post"}
          </button>
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
        {info && <p className="text-xs text-[var(--success)]">{info}</p>}
      </div>
    </div>
  )
}
