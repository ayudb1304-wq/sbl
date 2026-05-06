"use client"
import Link from "next/link"
import { useEffect, useState, useTransition } from "react"
import { getDeviceId } from "@/lib/device"
import { setPrediction } from "@/lib/actions/engagement"
import { stageLabel, statusCardClasses, timeIST } from "@/lib/format"
import { pointsForStage } from "@/lib/predictions"

export type PredictionMatch = {
  id: string
  stage: string
  round_label: string
  status: string
  scheduled_at: string | null
  category_code: string
  team_a: { id: string; name: string } | null
  team_b: { id: string; name: string } | null
  winner_team_id: string | null
  /** This device's existing pick, if any. Loaded server-side. */
  myPickTeamId: string | null
}

export function PredictionCard({ match }: { match: PredictionMatch }) {
  const [pickedTeamId, setPickedTeamId] = useState<string | null>(match.myPickTeamId)
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { setPickedTeamId(match.myPickTeamId) }, [match.myPickTeamId])

  const locked = match.status !== "scheduled" || !match.team_a || !match.team_b
  const points = pointsForStage(match.stage)

  function pick(teamId: string) {
    if (locked || pending) return
    setError(null)
    setPickedTeamId(teamId) // optimistic
    start(async () => {
      const res = await setPrediction({
        deviceId: getDeviceId(),
        matchId: match.id,
        predictedTeamId: teamId,
      })
      if (!res.ok) { setError(res.error); setPickedTeamId(match.myPickTeamId) }
    })
  }

  const status =
    match.status === "scheduled" ? "open" :
    match.status === "in_progress" ? "live" :
    "done"

  // Outer card colour reflects the match status. For finished matches we
  // amplify the wash if the user's pick resolved (green if right, red if wrong)
  // so the leaderboard outcome is immediately visible.
  const isFinished = match.status === "completed" || match.status === "walkover"
  const myPickResolved = isFinished && pickedTeamId
  const myPickRight = myPickResolved && match.winner_team_id === pickedTeamId
  let cardClass = statusCardClasses(match.status)
  if (myPickRight) {
    cardClass = "bg-[var(--success-soft)] border border-[var(--success)]/60 border-l-4 border-l-[var(--success)] ring-1 ring-[var(--success)]/30"
  } else if (myPickResolved && !myPickRight) {
    cardClass = "bg-[var(--live-soft)] border border-[var(--live)]/60 border-l-4 border-l-[var(--live)]"
  }

  return (
    <div className={`rounded-xl p-4 ${cardClass}`}>
      <div className="flex items-center justify-between text-xs">
        <span className="font-mono text-[var(--muted-strong)]">
          {match.category_code} · {stageLabel(match.stage, match.round_label)}
        </span>
        <span
          style={{ backgroundColor: "var(--surface)" }}
          className="rounded-full border border-[var(--border)] px-2 py-0.5 font-semibold text-[var(--primary)]"
        >
          {myPickRight ? `+${points} pt${points === 1 ? "" : "s"}` : `${points} pt${points === 1 ? "" : "s"}`}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <PickButton
          label={match.team_a?.name ?? "TBD"}
          picked={pickedTeamId === match.team_a?.id}
          isCorrect={match.winner_team_id === match.team_a?.id}
          isWrong={!!match.winner_team_id && match.winner_team_id !== match.team_a?.id && pickedTeamId === match.team_a?.id}
          disabled={locked || !match.team_a}
          onClick={() => match.team_a && pick(match.team_a.id)}
        />
        <PickButton
          label={match.team_b?.name ?? "TBD"}
          picked={pickedTeamId === match.team_b?.id}
          isCorrect={match.winner_team_id === match.team_b?.id}
          isWrong={!!match.winner_team_id && match.winner_team_id !== match.team_b?.id && pickedTeamId === match.team_b?.id}
          disabled={locked || !match.team_b}
          onClick={() => match.team_b && pick(match.team_b.id)}
        />
      </div>
      <div className="mt-2 flex items-center justify-between text-xs text-[var(--muted)]">
        <span>{match.scheduled_at ? `Starts ${timeIST(match.scheduled_at)}` : "TBD"}</span>
        <Link href={`/matches/${match.id}`} className="hover:underline">View match →</Link>
      </div>
      {locked && (
        <p className="mt-2 text-[10px] uppercase tracking-wider text-[var(--muted)]">
          {status === "live" ? "Locked — match in progress" : status === "done" ? "Match finished" : "Waiting on feeders"}
        </p>
      )}
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  )
}

function PickButton({
  label, picked, isCorrect, isWrong, disabled, onClick,
}: {
  label: string
  picked: boolean
  isCorrect: boolean
  isWrong: boolean
  disabled: boolean
  onClick: () => void
}) {
  let base = "rounded-md border px-3 py-2 text-sm transition"
  let style: React.CSSProperties = {}
  if (isCorrect && picked) {
    base += " font-bold"
    style = { backgroundColor: "var(--success-soft)", borderColor: "var(--success)", color: "var(--success)" }
  } else if (isWrong) {
    base += " line-through opacity-70"
    style = { backgroundColor: "var(--live-soft)", borderColor: "var(--live)" }
  } else if (picked) {
    base += " font-medium"
    style = { backgroundColor: "var(--primary-soft)", borderColor: "var(--primary)", color: "var(--primary)" }
  } else {
    base += " border-[var(--border)] hover:border-[var(--primary)]"
  }
  if (disabled && !picked) base += " opacity-50 cursor-not-allowed"
  return (
    <button onClick={onClick} disabled={disabled} className={base} style={style}>
      {label}
    </button>
  )
}
