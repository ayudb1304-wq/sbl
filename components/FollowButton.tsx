"use client"
import { useEffect, useState } from "react"
import { isFollowing, toggleFollow } from "@/lib/device"

export function FollowButton({ teamId, teamName }: { teamId: string; teamName: string }) {
  const [mounted, setMounted] = useState(false)
  const [following, setFollowing] = useState(false)
  const [justChanged, setJustChanged] = useState<"on" | "off" | null>(null)

  useEffect(() => { setMounted(true); setFollowing(isFollowing(teamId)) }, [teamId])

  function onClick() {
    const now = toggleFollow(teamId)
    setFollowing(now)
    setJustChanged(now ? "on" : "off")
    setTimeout(() => setJustChanged(null), 1400)
  }

  // Render a stable placeholder during SSR so hydration doesn't flicker.
  if (!mounted) {
    return (
      <button disabled className="rounded-md border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--muted)]">
        ☆ Follow
      </button>
    )
  }

  return (
    <button
      onClick={onClick}
      aria-pressed={following}
      className={`rounded-md border px-3 py-1.5 text-sm font-medium transition ${
        following
          ? "border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]"
          : "border-[var(--border)] hover:border-[var(--primary)]"
      }`}
      title={following ? `Unfollow ${teamName}` : `Follow ${teamName}`}
    >
      {following ? "★ Following" : "☆ Follow"}
      {justChanged && (
        <span className="ml-2 text-xs font-normal text-[var(--muted)]">
          {justChanged === "on" ? "added to your teams" : "removed"}
        </span>
      )}
    </button>
  )
}
