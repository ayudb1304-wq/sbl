"use client"
import { useEffect, useState, useTransition } from "react"
import { createClient } from "@/lib/supabase/client"
import { getDeviceId } from "@/lib/device"
import { PredictionCard, type PredictionMatch } from "./PredictionCard"
import { LiveScoreSubscriber } from "./LiveScoreSubscriber"
import { categoryShortName } from "@/lib/format"
import { clearKoPredictionsForCategory } from "@/lib/actions/engagement"

type RawMatch = {
  id: string
  stage: string
  round_label: string
  status: string
  scheduled_at: string | null
  category_id: string
  winner_team_id: string | null
  team_a: { id: string; name: string } | null
  team_b: { id: string; name: string } | null
}

export function PredictionsLoader({
  seasonId, matches, categories,
}: {
  seasonId: string
  matches: RawMatch[]
  categories: { id: string; code: string }[]
}) {
  const [picks, setPicks] = useState<Record<string, string>>({}) // matchId → teamId
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const sb = createClient()
    const deviceId = getDeviceId()
    if (!deviceId) return
    sb.from("predictions")
      .select("match_id, predicted_team_id")
      .eq("device_id", deviceId)
      .then(({ data }) => {
        if (!data) return
        const rows = data as { match_id: string; predicted_team_id: string }[]
        const next: Record<string, string> = {}
        for (const r of rows) next[r.match_id] = r.predicted_team_id
        setPicks(next)
      })
  }, [])

  function clearCategory(categoryId: string) {
    if (pending) return
    if (!confirm("Clear your match-by-match picks for this category?")) return
    setError(null)
    // Optimistic — remove all picks for matches in this category
    const matchesInCat = matches.filter(m => m.category_id === categoryId).map(m => m.id)
    const removedSnapshot: Record<string, string> = {}
    setPicks(p => {
      const copy = { ...p }
      for (const mid of matchesInCat) {
        if (mid in copy) { removedSnapshot[mid] = copy[mid]; delete copy[mid] }
      }
      return copy
    })
    start(async () => {
      const res = await clearKoPredictionsForCategory({
        deviceId: getDeviceId(),
        seasonId,
        categoryId,
      })
      if (!res.ok) {
        setError(res.error)
        setPicks(p => ({ ...p, ...removedSnapshot })) // revert
      }
    })
  }

  // Group matches by category id, then sort categories by their input order
  const groupsByCatId = new Map<string, RawMatch[]>()
  for (const m of matches) {
    const list = groupsByCatId.get(m.category_id) ?? []
    list.push(m)
    groupsByCatId.set(m.category_id, list)
  }

  return (
    <div className="space-y-8">
      <LiveScoreSubscriber />
      {error && <p className="text-xs text-red-600">{error}</p>}
      {categories.map(cat => {
        const list = groupsByCatId.get(cat.id) ?? []
        if (list.length === 0) return null
        const hasAnyPick = list.some(m => picks[m.id])
        const hasAnyClearable = list.some(m => picks[m.id] && m.status === "scheduled")
        return (
          <section key={cat.id} className="space-y-3">
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="text-lg font-semibold tracking-tight">{categoryShortName(cat.code)}</h2>
              {hasAnyPick && (
                <button
                  onClick={() => clearCategory(cat.id)}
                  disabled={pending || !hasAnyClearable}
                  className="rounded-md border border-[var(--border)] px-2.5 py-1 text-xs text-[var(--muted)] hover:border-[var(--primary)] hover:text-[var(--text)] disabled:opacity-40"
                  title={hasAnyClearable ? "Clear picks for this category" : "Locked — matches already started"}
                >
                  Clear picks
                </button>
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {list.map(m => {
                const card: PredictionMatch = {
                  ...m,
                  category_code: cat.code,
                  myPickTeamId: picks[m.id] ?? null,
                }
                return <PredictionCard key={m.id} match={card} />
              })}
            </div>
          </section>
        )
      })}
    </div>
  )
}
