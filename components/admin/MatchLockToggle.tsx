"use client"
import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { setMatchLocked } from "@/lib/actions/admin"

export function MatchLockToggle({ matchId, locked }: { matchId: string; locked: boolean }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  return (
    <button
      disabled={pending}
      onClick={() => start(async () => {
        await setMatchLocked(matchId, !locked)
        router.refresh()
      })}
      className={`rounded-md border px-3 py-1.5 text-sm font-medium ${
        locked
          ? "border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200"
          : "border-[var(--border)] hover:border-[var(--primary)]"
      } disabled:opacity-50`}
    >
      {pending ? "..." : locked ? "Unlock match" : "Lock match"}
    </button>
  )
}
