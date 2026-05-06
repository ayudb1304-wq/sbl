"use client"
import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { addAllowedUser, removeAllowedUser, updateAllowedUserRole } from "@/lib/actions/admin"

type Row = { email: string; role: "admin" | "scorer" | "none"; loggedIn: boolean }

export function UserManager({ rows }: { rows: Row[] }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<"admin" | "scorer">("scorer")
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
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--muted)]">Add user</h2>
        <div className="mt-2 flex flex-wrap items-end gap-2">
          <label className="block">
            <span className="text-xs text-[var(--muted)]">Email</span>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="user@example.com"
              className="mt-1 block w-64 rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 py-1.5 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-xs text-[var(--muted)]">Role</span>
            <select
              value={role}
              onChange={e => setRole(e.target.value as "admin" | "scorer")}
              className="mt-1 block rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 py-1.5 text-sm"
            >
              <option value="scorer">Scorer</option>
              <option value="admin">Admin</option>
            </select>
          </label>
          <button
            disabled={pending || !email}
            onClick={() => {
              act(async () => {
                const res = await addAllowedUser({ email, role })
                if (res.ok) setEmail("")
                return res
              })
            }}
            className="rounded-md bg-[var(--primary)] px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
          >
            Add
          </button>
        </div>
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      </div>

      <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
        <table className="w-full text-sm">
          <thead className="bg-[var(--bg)] text-[var(--muted)]">
            <tr>
              <th className="px-3 py-2 text-left">Email</th>
              <th className="px-3 py-2 text-left">Role</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.email} className="border-t border-[var(--border)]">
                <td className="px-3 py-2 font-mono text-xs">{r.email}</td>
                <td className="px-3 py-2">
                  <select
                    value={r.role === "none" ? "scorer" : r.role}
                    disabled={r.role === "none"}
                    onChange={e => act(() => updateAllowedUserRole({ email: r.email, role: e.target.value as "admin" | "scorer" }))}
                    className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-xs"
                  >
                    <option value="scorer">Scorer</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
                <td className="px-3 py-2 text-xs text-[var(--muted)]">{r.loggedIn ? "Logged in once" : "Not logged in yet"}</td>
                <td className="px-3 py-2 text-right">
                  <button
                    disabled={pending}
                    onClick={() => {
                      if (confirm(`Remove ${r.email} from the whitelist?`)) {
                        act(() => removeAllowedUser(r.email))
                      }
                    }}
                    className="rounded-md border border-red-200 px-2 py-1 text-xs text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/30"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={4} className="p-6 text-center text-sm text-[var(--muted)]">No users in the whitelist.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
