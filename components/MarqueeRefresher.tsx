"use client"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

/**
 * Subscribes globally to games + matches changes so the marquee in the layout
 * re-renders whenever scores update — even on pages that don't otherwise have
 * a LiveScoreSubscriber. Cheap; one channel per session.
 */
export function MarqueeRefresher() {
  const router = useRouter()
  useEffect(() => {
    const sb = createClient()
    const ch = sb
      .channel("marquee:global")
      .on("postgres_changes", { event: "*", schema: "public", table: "games" }, () => router.refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "matches" }, () => router.refresh())
      .subscribe()
    return () => { sb.removeChannel(ch) }
  }, [router])
  return null
}
