"use client"
import { useEffect, useOptimistic, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { completeGame, resetMatch, setMatchWinner, updateGameScore } from "@/lib/actions/scoring"

type GameRow = {
  id: string
  game_number: number
  team_a_score: number
  team_b_score: number
  status: "pending" | "in_progress" | "completed"
}

type Props = {
  matchId: string
  matchStatus: string
  teamA: { id: string | null; name: string }
  teamB: { id: string | null; name: string }
  format: "single" | "bo3"
  games: GameRow[]
  winnerTeamId: string | null
  /** Admin override — if true, inputs stay editable even after the match is completed/walkover. */
  forceEdit?: boolean
}

export function ScoreEntry(props: Props) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [games, setGamesOptimistic] = useOptimistic(
    props.games,
    (state: GameRow[], next: GameRow) =>
      state.map(g => (g.id === next.id ? next : g)),
  )

  const visibleGames = props.format === "single" ? games.slice(0, 1) : games
  const matchOver =
    !props.forceEdit &&
    (props.matchStatus === "completed" || props.matchStatus === "walkover")

  function action(fn: () => Promise<{ ok: true } | { ok: false; error: string }>) {
    setError(null)
    start(async () => {
      const res = await fn()
      if (!res.ok) setError(res.error)
      router.refresh()
    })
  }

  function saveScore(g: GameRow, dA: number, dB: number) {
    const next = { ...g, team_a_score: Math.max(0, g.team_a_score + dA), team_b_score: Math.max(0, g.team_b_score + dB), status: "in_progress" as const }
    setGamesOptimistic(next)
    action(() => updateGameScore({ gameId: g.id, teamAScore: next.team_a_score, teamBScore: next.team_b_score }))
  }

  function commitExact(g: GameRow, side: "a" | "b", value: number) {
    const safe = Math.max(0, Math.min(99, value))
    const current = side === "a" ? g.team_a_score : g.team_b_score
    if (safe === current) return // no-op — don't touch DB or audit log
    const next = { ...g, status: "in_progress" as const, [side === "a" ? "team_a_score" : "team_b_score"]: safe } as GameRow
    setGamesOptimistic(next)
    action(() => updateGameScore({ gameId: g.id, teamAScore: next.team_a_score, teamBScore: next.team_b_score }))
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-900 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </div>
      )}

      {visibleGames.map(g => (
        <GamePanel
          key={g.id}
          game={g}
          teamA={props.teamA}
          teamB={props.teamB}
          locked={matchOver}
          pending={pending}
          onAdjust={(dA, dB) => saveScore(g, dA, dB)}
          onCommit={(side, value) => commitExact(g, side, value)}
          onComplete={() => action(() => completeGame(g.id))}
        />
      ))}

      {!matchOver && (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--muted)]">Finish match</h3>
          <div className="flex flex-wrap gap-2">
            {props.teamA.id && (
              <button
                disabled={pending}
                onClick={() => action(() => setMatchWinner({ matchId: props.matchId, winnerTeamId: props.teamA.id! }))}
                className="rounded-md bg-[var(--primary)] px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                Winner: {props.teamA.name}
              </button>
            )}
            {props.teamB.id && (
              <button
                disabled={pending}
                onClick={() => action(() => setMatchWinner({ matchId: props.matchId, winnerTeamId: props.teamB.id! }))}
                className="rounded-md bg-[var(--primary)] px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                Winner: {props.teamB.name}
              </button>
            )}
            <WalkoverButton
              matchId={props.matchId}
              teamA={props.teamA}
              teamB={props.teamB}
              pending={pending}
              onSubmit={(args) => action(() => setMatchWinner(args))}
            />
          </div>
        </div>
      )}

      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--muted)]">Danger zone</h3>
        <button
          disabled={pending}
          onClick={() => {
            if (confirm("Reset all scores for this match?")) action(() => resetMatch(props.matchId))
          }}
          className="rounded-md border border-red-300 px-3 py-2 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/40"
        >
          Reset match
        </button>
      </div>
    </div>
  )
}

function GamePanel({
  game, teamA, teamB, locked, pending, onAdjust, onCommit, onComplete,
}: {
  game: GameRow
  teamA: { name: string }
  teamB: { name: string }
  locked: boolean
  pending: boolean
  onAdjust: (dA: number, dB: number) => void
  onCommit: (side: "a" | "b", value: number) => void
  onComplete: () => void
}) {
  const isDone = game.status === "completed"
  return (
    <div className={`rounded-lg border bg-[var(--surface)] p-4 ${isDone ? "border-emerald-300 dark:border-emerald-900" : "border-[var(--border)]"}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Game {game.game_number}</h3>
        <span className="text-xs uppercase text-[var(--muted)]">{game.status.replace("_", " ")}</span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <ScoreColumn name={teamA.name} value={game.team_a_score} disabled={locked || pending}
          onMinus={() => onAdjust(-1, 0)} onPlus={() => onAdjust(1, 0)}
          onCommit={(v) => onCommit("a", v)} />
        <ScoreColumn name={teamB.name} value={game.team_b_score} disabled={locked || pending}
          onMinus={() => onAdjust(0, -1)} onPlus={() => onAdjust(0, 1)}
          onCommit={(v) => onCommit("b", v)} />
      </div>
      {!isDone && !locked && (
        <button
          disabled={pending}
          onClick={onComplete}
          className="mt-3 w-full rounded-md border border-[var(--primary)] px-3 py-2 text-sm font-medium text-[var(--primary)] hover:bg-[var(--primary)] hover:text-white disabled:opacity-50"
        >
          End game {game.game_number}
        </button>
      )}
    </div>
  )
}

/**
 * Score input. The value the user types is held in local state until they
 * blur the field (or press Enter) — only then do we commit to the server.
 * Escape reverts to the canonical value. +/- buttons still commit instantly.
 */
function ScoreColumn({
  name, value, disabled, onMinus, onPlus, onCommit,
}: {
  name: string
  value: number
  disabled: boolean
  onMinus: () => void
  onPlus: () => void
  onCommit: (v: number) => void
}) {
  const [draft, setDraft] = useState(String(value))
  const [focused, setFocused] = useState(false)

  // Sync draft to canonical value when not actively editing — handles
  // realtime updates from other scorers/admins, and +/- button commits.
  useEffect(() => {
    if (!focused) setDraft(String(value))
  }, [value, focused])

  function commit() {
    const parsed = Number(draft)
    if (Number.isNaN(parsed)) {
      setDraft(String(value))
      return
    }
    const safe = Math.max(0, Math.min(99, Math.floor(parsed)))
    setDraft(String(safe))
    onCommit(safe)
  }

  return (
    <div className="text-center">
      <div className="truncate text-xs text-[var(--muted)]">{name}</div>
      <div className="mt-1 flex items-center justify-center gap-2">
        <button disabled={disabled} onClick={onMinus} className="h-10 w-10 rounded-md border border-[var(--border)] text-xl disabled:opacity-50">−</button>
        <input
          type="number"
          inputMode="numeric"
          value={draft}
          disabled={disabled}
          min={0}
          max={99}
          onChange={(e) => setDraft(e.target.value)}
          onFocus={(e) => { setFocused(true); e.target.select() }}
          onBlur={() => { setFocused(false); commit() }}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.currentTarget as HTMLInputElement).blur()
            else if (e.key === "Escape") {
              setDraft(String(value))
              ;(e.currentTarget as HTMLInputElement).blur()
            }
          }}
          className="h-12 w-16 rounded-md border border-[var(--border)] bg-[var(--bg)] text-center text-2xl font-mono tabular-nums disabled:opacity-50"
        />
        <button disabled={disabled} onClick={onPlus} className="h-10 w-10 rounded-md border border-[var(--border)] text-xl disabled:opacity-50">+</button>
      </div>
    </div>
  )
}

function WalkoverButton({
  matchId, teamA, teamB, pending, onSubmit,
}: {
  matchId: string
  teamA: { id: string | null; name: string }
  teamB: { id: string | null; name: string }
  pending: boolean
  onSubmit: (args: { matchId: string; winnerTeamId: string; walkoverReason: string }) => void
}) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState("Opponent no-show")
  const [winner, setWinner] = useState<string>("")
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-md border border-amber-400 px-3 py-2 text-sm font-medium text-amber-700 hover:bg-amber-50 dark:text-amber-300 dark:hover:bg-amber-950/40"
      >
        Walkover…
      </button>
    )
  }
  return (
    <div className="w-full space-y-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-900 dark:bg-amber-950/30">
      <div className="font-semibold">Declare walkover</div>
      <div className="flex flex-wrap gap-2">
        {teamA.id && (
          <button onClick={() => setWinner(teamA.id!)} className={`rounded-md border px-2 py-1 ${winner === teamA.id ? "bg-[var(--primary)] text-white border-[var(--primary)]" : "border-[var(--border)]"}`}>
            {teamA.name} wins
          </button>
        )}
        {teamB.id && (
          <button onClick={() => setWinner(teamB.id!)} className={`rounded-md border px-2 py-1 ${winner === teamB.id ? "bg-[var(--primary)] text-white border-[var(--primary)]" : "border-[var(--border)]"}`}>
            {teamB.name} wins
          </button>
        )}
      </div>
      <input
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Reason"
        className="w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 py-1"
      />
      <div className="flex gap-2">
        <button
          disabled={!winner || !reason || pending}
          onClick={() => { onSubmit({ matchId, winnerTeamId: winner, walkoverReason: reason }); setOpen(false) }}
          className="rounded-md bg-amber-600 px-3 py-1 text-white disabled:opacity-50"
        >
          Confirm walkover
        </button>
        <button onClick={() => setOpen(false)} className="rounded-md border border-[var(--border)] px-3 py-1">
          Cancel
        </button>
      </div>
    </div>
  )
}
