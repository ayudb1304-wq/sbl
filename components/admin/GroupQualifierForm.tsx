"use client"
import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { confirmGroupQualifiers, lockGroupMatches, unlockGroupQualifiers } from "@/lib/actions/admin"

type Team = { id: string; name: string; seed: number | null }

export function GroupQualifierForm({
  groupId, teams, defaultQ1, defaultQ2, locked,
}: {
  groupId: string
  teams: Team[]
  defaultQ1: string | null
  defaultQ2: string | null
  locked: boolean
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [q1, setQ1] = useState<string>(defaultQ1 ?? teams[0]?.id ?? "")
  const [q2, setQ2] = useState<string>(defaultQ2 ?? teams[1]?.id ?? "")
  const [error, setError] = useState<string | null>(null)

  function act(fn: () => Promise<{ ok: true } | { ok: false; error: string }>) {
    setError(null)
    start(async () => {
      const res = await fn()
      if (!res.ok) setError(res.error)
      router.refresh()
    })
  }

  if (locked) {
    const q1Team = teams.find(t => t.id === defaultQ1)
    const q2Team = teams.find(t => t.id === defaultQ2)
    return (
      <div className="rounded-md border border-emerald-200 bg-emerald-50/60 p-3 text-sm dark:border-emerald-900/50 dark:bg-emerald-950/20">
        <div className="font-semibold">Qualifiers locked</div>
        <ul className="mt-1 text-xs">
          <li>1st → {q1Team?.name ?? "—"}</li>
          <li>2nd → {q2Team?.name ?? "—"}</li>
        </ul>
        <button
          disabled={pending}
          onClick={() => act(() => unlockGroupQualifiers(groupId))}
          className="mt-2 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-xs hover:border-[var(--primary)]"
        >
          Unlock to edit
        </button>
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="grid gap-2 sm:grid-cols-2">
        <Picker label="1st (winner)" value={q1} onChange={setQ1} options={teams} />
        <Picker label="2nd (runner-up)" value={q2} onChange={setQ2} options={teams} />
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          disabled={pending || q1 === q2 || !q1 || !q2}
          onClick={() => act(() => confirmGroupQualifiers({ groupId, qualifier1TeamId: q1, qualifier2TeamId: q2 }))}
          className="rounded-md bg-[var(--primary)] px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {pending ? "Saving..." : "Confirm qualifiers"}
        </button>
        <button
          disabled={pending}
          onClick={() => act(() => lockGroupMatches(groupId))}
          className="rounded-md border border-[var(--border)] px-3 py-1.5 text-sm hover:border-[var(--primary)] disabled:opacity-50"
        >
          Lock all group matches
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      {q1 === q2 && q1 && <p className="text-xs text-amber-600">Qualifier 1 and 2 must be different teams.</p>}
    </div>
  )
}

function Picker({
  label, value, onChange, options,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: Team[]
}) {
  return (
    <label className="block">
      <span className="text-xs text-[var(--muted)]">{label}</span>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="mt-1 block w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-sm"
      >
        <option value="">—</option>
        {options.map(t => (
          <option key={t.id} value={t.id}>
            {t.name}{t.seed ? ` (seed #${t.seed})` : ""}
          </option>
        ))}
      </select>
    </label>
  )
}
