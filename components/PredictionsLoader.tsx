"use client"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { getDeviceId } from "@/lib/device"
import { PredictionCard, type PredictionMatch } from "./PredictionCard"
import { categoryShortName } from "@/lib/format"
import { LiveScoreSubscriber } from "./LiveScoreSubscriber"

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
  matches, catCodeById,
}: {
  matches: RawMatch[]
  catCodeById: Record<string, string>
}) {
  const [picks, setPicks] = useState<Record<string, string>>({}) // matchId → teamId

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

  // Group by category code, ordered as in the array
  const groups = new Map<string, RawMatch[]>()
  for (const m of matches) {
    const code = catCodeById[m.category_id]
    if (!code) continue
    const list = groups.get(code) ?? []
    list.push(m)
    groups.set(code, list)
  }

  return (
    <div className="space-y-8">
      <LiveScoreSubscriber />
      {[...groups.entries()].map(([code, list]) => (
        <section key={code} className="space-y-3">
          <h2 className="text-lg font-semibold tracking-tight">{categoryShortName(code)}</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {list.map(m => {
              const card: PredictionMatch = {
                ...m,
                category_code: code,
                myPickTeamId: picks[m.id] ?? null,
              }
              return <PredictionCard key={m.id} match={card} />
            })}
          </div>
        </section>
      ))}
    </div>
  )
}
