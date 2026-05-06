"use client"
import { useEffect, useState, useTransition } from "react"
import { getDeviceId, getDisplayName, setDisplayName, useDevice } from "@/lib/device"
import { setParticipantName } from "@/lib/actions/engagement"

/**
 * Inline "set your name" prompt. Shown above prediction UIs when the device
 * has no display name yet. Once submitted, the name is stored both locally
 * and in participant_profiles for the leaderboard.
 */
export function NameGate({ children }: { children: React.ReactNode }) {
  const { displayName } = useDevice()
  const [mounted, setMounted] = useState(false)
  const [name, setName] = useState("")
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { setMounted(true) }, [])

  if (!mounted) return null
  if (displayName) return <>{children}</>

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    setError(null)
    start(async () => {
      const res = await setParticipantName({ deviceId: getDeviceId(), displayName: trimmed })
      if (!res.ok) { setError(res.error); return }
      setDisplayName(trimmed)
    })
  }

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-card)]">
      <h2 className="text-lg font-semibold">First — what should we call you?</h2>
      <p className="mt-1 text-sm text-[var(--muted)]">
        Your name shows on the bracket-challenge leaderboard if you make picks. No login required.
      </p>
      <form onSubmit={submit} className="mt-4 flex flex-wrap gap-2">
        <input
          autoFocus
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Your name"
          maxLength={40}
          className="flex-1 min-w-[180px] rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={pending || !name.trim()}
          style={{ backgroundColor: "var(--primary)" }}
          className="rounded-md px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "Saving..." : "Save"}
        </button>
      </form>
      {(error || (mounted && getDisplayName())) && (
        <p className={`mt-2 text-xs ${error ? "text-red-600" : "text-[var(--muted)]"}`}>
          {error ?? "Saved."}
        </p>
      )}
    </div>
  )
}
