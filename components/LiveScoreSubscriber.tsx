"use client"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

/**
 * Subscribes to realtime changes on `matches` and `games` for the given match (or all matches when no id).
 * On any change, refreshes the current RSC route — Next streams the updated server tree.
 */
export function LiveScoreSubscriber({ matchId }: { matchId?: string }) {
  const router = useRouter()
  useEffect(() => {
    const sb = createClient()
    const matchFilter = matchId ? `id=eq.${matchId}` : undefined
    const gameFilter = matchId ? `match_id=eq.${matchId}` : undefined

    const channel = sb
      .channel(`live:${matchId ?? "all"}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "matches", filter: matchFilter }, () => router.refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "games",   filter: gameFilter  }, () => router.refresh())
      .subscribe()

    return () => { sb.removeChannel(channel) }
  }, [matchId, router])

  return null
}
