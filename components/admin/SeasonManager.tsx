"use client"
import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { createSeason, setActiveSeason } from "@/lib/actions/admin"

type Row = { id: string; year: number; name: string; status: string; is_active: boolean }

export function SeasonManager({ rows }: { rows: Row[] }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [year, setYear] = useState<string>("")
  const [name, setName] = useState<string>("")
  const [error, setError] = useState<string | null>(null)

  function act(fn: () => Promise<{ ok: true } | { ok: false; error: string }>) {
    setError(null)
    start(async () => {
      const res = await fn()
      if (!res.ok) setError(res.error)
      router.refresh()
    })
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--muted)]">Create season</h2>
        <p className="mt-1 text-xs text-[var(--muted)]">Creates a new empty season. You&apos;ll need a fixture seeder for it (re-run /scripts pattern with new data).</p>
        <div className="mt-2 flex flex-wrap items-end gap-2">
          <label className="block">
            <span className="text-xs text-[var(--muted)]">Year</span>
            <input
              type="number"
              value={year}
              onChange={e => setYear(e.target.value)}
              placeholder="2027"
              className="mt-1 block w-24 rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 py-1.5 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-xs text-[var(--muted)]">Name</span>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="SBL 2027"
              className="mt-1 block w-48 rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 py-1.5 text-sm"
            />
          </label>
          <button
            disabled={pending || !year || !name}
            onClick={() => {
              act(async () => {
                const res = await createSeason({ year: Number(year), name })
                if (res.ok) { setYear(""); setName("") }
                return res
              })
            }}
            className="rounded-md bg-[var(--primary)] px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
          >
            Create
          </button>
        </div>
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      </div>

      <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
        <table className="w-full text-sm">
          <thead className="bg-[var(--bg)] text-[var(--muted)]">
            <tr>
              <th className="px-3 py-2 text-left">Year</th>
              <th className="px-3 py-2 text-left">Name</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-left">Active?</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id} className="border-t border-[var(--border)]">
                <td className="px-3 py-2 font-mono">{r.year}</td>
                <td className="px-3 py-2">{r.name}</td>
                <td className="px-3 py-2 text-xs uppercase text-[var(--muted)]">{r.status}</td>
                <td className="px-3 py-2">
                  {r.is_active && <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">ACTIVE</span>}
                </td>
                <td className="px-3 py-2 text-right">
                  {!r.is_active && (
                    <button
                      disabled={pending}
                      onClick={() => act(() => setActiveSeason(r.id))}
                      className="rounded-md border border-[var(--border)] px-2 py-1 text-xs hover:border-[var(--primary)] disabled:opacity-50"
                    >
                      Set active
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
