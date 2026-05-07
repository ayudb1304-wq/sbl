"use client"
import { useEffect, useState, useTransition } from "react"
import { createClient } from "@/lib/supabase/client"
import { getDeviceId } from "@/lib/device"
import { clearChampionPick, setChampionPick } from "@/lib/actions/engagement"
import { categoryShortName } from "@/lib/format"

export type ChampionCategory = {
  id: string
  code: string
  finalStatus: string
  finalWinnerId: string | null
  teams: { id: string; name: string; seed: number | null }[]
}

export function ChampionPicks({
  seasonId,
  categories,
}: {
  seasonId: string
  categories: ChampionCategory[]
}) {
  const [picks, setPicks] = useState<Record<string, string>>({}) // categoryId → teamId
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const sb = createClient()
    const deviceId = getDeviceId()
    if (!deviceId) return
    sb.from("champion_picks")
      .select("category_id, predicted_team_id")
      .eq("device_id", deviceId)
      .eq("season_id", seasonId)
      .then(({ data }) => {
        if (!data) return
        const rows = data as { category_id: string; predicted_team_id: string }[]
        const next: Record<string, string> = {}
        for (const r of rows) next[r.category_id] = r.predicted_team_id
        setPicks(next)
      })
  }, [seasonId])

  function pick(categoryId: string, teamId: string) {
    if (pending) return
    const prev = picks[categoryId]
    setError(null)
    setPicks(p => ({ ...p, [categoryId]: teamId })) // optimistic
    start(async () => {
      const res = await setChampionPick({
        deviceId: getDeviceId(),
        seasonId,
        categoryId,
        predictedTeamId: teamId,
      })
      if (!res.ok) {
        setError(res.error)
        // Revert
        setPicks(p => {
          const copy = { ...p }
          if (prev) copy[categoryId] = prev
          else delete copy[categoryId]
          return copy
        })
      }
    })
  }

  function clear(categoryId: string) {
    if (pending) return
    const prev = picks[categoryId]
    setError(null)
    setPicks(p => { const copy = { ...p }; delete copy[categoryId]; return copy }) // optimistic
    start(async () => {
      const res = await clearChampionPick({ deviceId: getDeviceId(), seasonId, categoryId })
      if (!res.ok) {
        setError(res.error)
        if (prev) setPicks(p => ({ ...p, [categoryId]: prev }))
      }
    })
  }

  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-semibold tracking-tight">Pick the champions</h2>
        <span className="text-xs text-[var(--muted)]">4 pts each · locks when the Final starts</span>
      </div>
      <p className="text-sm text-[var(--muted-strong)]">
        Pick now — even before the tournament starts. Match-by-match KO picks below open up as the bracket resolves on the day.
      </p>
      <div className="grid gap-4 md:grid-cols-3">
        {categories.map(cat => (
          <CategoryColumn
            key={cat.id}
            cat={cat}
            picked={picks[cat.id] ?? null}
            onPick={(teamId) => pick(cat.id, teamId)}
            onClear={() => clear(cat.id)}
            disabled={pending}
          />
        ))}
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </section>
  )
}

function CategoryColumn({
  cat, picked, onPick, onClear, disabled,
}: {
  cat: ChampionCategory
  picked: string | null
  onPick: (teamId: string) => void
  onClear: () => void
  disabled: boolean
}) {
  const finalDone = cat.finalStatus === "completed" || cat.finalStatus === "walkover"
  const locked = cat.finalStatus !== "scheduled"
  const isCorrect = finalDone && picked && cat.finalWinnerId === picked
  const isWrong = finalDone && picked && cat.finalWinnerId !== picked

  let cardClass = "rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4"
  if (isCorrect) {
    cardClass = "rounded-xl border border-[var(--success)]/60 bg-[var(--success-soft)] p-4 ring-1 ring-[var(--success)]/30"
  } else if (isWrong) {
    cardClass = "rounded-xl border border-[var(--live)]/60 bg-[var(--live-soft)] p-4"
  } else if (locked && picked) {
    cardClass = "rounded-xl border border-[var(--primary)]/40 bg-[var(--primary-soft)] p-4"
  }

  const sorted = [...cat.teams].sort((a, b) => (a.seed ?? 99) - (b.seed ?? 99))
  const pickedTeam = picked ? sorted.find(t => t.id === picked) : null

  return (
    <div className={cardClass}>
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{categoryShortName(cat.code)}</h3>
        <span className="rounded-full bg-[var(--surface)] border border-[var(--border)] px-2 py-0.5 text-[10px] font-bold tracking-wider text-[var(--primary)]">
          {isCorrect ? "+4 PTS" : "4 PTS"}
        </span>
      </div>

      {pickedTeam && (
        <div className="mt-3 rounded-md border border-[var(--border)] bg-[var(--surface)] p-2 text-sm">
          <div className="flex items-center justify-between gap-2">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
              {finalDone ? (isCorrect ? "Your pick · correct ✓" : "Your pick · ✗") : locked ? "Your pick · locked" : "Your pick"}
            </div>
            {!locked && (
              <button
                onClick={onClear}
                disabled={disabled}
                className="rounded px-1.5 py-0.5 text-[10px] font-semibold text-[var(--muted)] hover:bg-[var(--surface-alt)] hover:text-[var(--text)] disabled:opacity-40"
                title="Clear pick"
              >
                Clear
              </button>
            )}
          </div>
          <div className="mt-0.5 font-medium">{pickedTeam.name}</div>
        </div>
      )}

      <div className="mt-3 max-h-72 overflow-y-auto">
        <ul className="space-y-1">
          {sorted.map(t => {
            const isPicked = picked === t.id
            const winning = finalDone && cat.finalWinnerId === t.id
            return (
              <li key={t.id}>
                <button
                  disabled={disabled || locked}
                  onClick={() => onPick(t.id)}
                  className={`flex w-full items-center justify-between gap-2 rounded-md border px-2.5 py-1.5 text-left text-sm transition ${
                    isPicked
                      ? "border-[var(--primary)] bg-[var(--primary-soft)] font-medium text-[var(--primary)]"
                      : winning
                        ? "border-[var(--success)] bg-[var(--success-soft)] font-medium text-[var(--success)]"
                        : "border-[var(--border)] hover:border-[var(--primary)]"
                  } ${(disabled || locked) && !isPicked ? "opacity-60 cursor-not-allowed" : ""}`}
                >
                  <span className="truncate">{t.name}</span>
                  {t.seed && (
                    <span className="text-[10px] text-[var(--muted)]">#{t.seed}</span>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      </div>

      {locked && !finalDone && (
        <p className="mt-3 text-[10px] uppercase tracking-wider text-[var(--muted)]">
          Locked — Final {cat.finalStatus.replace("_", " ")}
        </p>
      )}
    </div>
  )
}
