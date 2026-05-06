"use client"
import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { addAllowedUser, removeAllowedUser, updateAllowedUserRoles } from "@/lib/actions/admin"

type Role = "admin" | "scorer"
type Row = { email: string; roles: ("admin" | "scorer" | "none")[]; loggedIn: boolean }

export function UserManager({ rows }: { rows: Row[] }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [email, setEmail] = useState("")
  const [newRoles, setNewRoles] = useState<{ admin: boolean; scorer: boolean }>({ admin: false, scorer: true })
  const [error, setError] = useState<string | null>(null)

  function act(fn: () => Promise<{ ok: true } | { ok: false; error: string }>) {
    setError(null)
    start(async () => {
      const res = await fn()
      if (!res.ok) setError(res.error)
      router.refresh()
    })
  }

  function buildRoles(picked: { admin: boolean; scorer: boolean }): Role[] {
    const arr: Role[] = []
    if (picked.admin) arr.push("admin")
    if (picked.scorer) arr.push("scorer")
    return arr
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--muted)]">Add user</h2>
        <div className="mt-2 flex flex-wrap items-end gap-3">
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
          <fieldset className="block">
            <legend className="text-xs text-[var(--muted)]">Roles</legend>
            <div className="mt-1 flex gap-3">
              <RoleCheckbox label="Admin" checked={newRoles.admin} onChange={v => setNewRoles(r => ({ ...r, admin: v }))} />
              <RoleCheckbox label="Scorer" checked={newRoles.scorer} onChange={v => setNewRoles(r => ({ ...r, scorer: v }))} />
            </div>
          </fieldset>
          <button
            disabled={pending || !email || (!newRoles.admin && !newRoles.scorer)}
            onClick={() => {
              act(async () => {
                const res = await addAllowedUser({ email, roles: buildRoles(newRoles) })
                if (res.ok) { setEmail(""); setNewRoles({ admin: false, scorer: true }) }
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
          <thead className="bg-[var(--surface-alt)] text-[var(--muted-strong)]">
            <tr>
              <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider">Email</th>
              <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider">Roles</th>
              <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider">Status</th>
              <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <UserRow
                key={r.email}
                row={r}
                pending={pending}
                onUpdate={(roles) => act(() => updateAllowedUserRoles({ email: r.email, roles }))}
                onRemove={() => {
                  if (confirm(`Remove ${r.email} from the whitelist?`)) act(() => removeAllowedUser(r.email))
                }}
              />
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

function UserRow({
  row, pending, onUpdate, onRemove,
}: {
  row: Row
  pending: boolean
  onUpdate: (roles: Role[]) => void
  onRemove: () => void
}) {
  const isAdmin = row.roles.includes("admin")
  const isScorer = row.roles.includes("scorer")

  function toggle(role: Role, on: boolean) {
    const next = new Set<Role>(row.roles.filter(r => r !== "none") as Role[])
    if (on) next.add(role)
    else next.delete(role)
    if (next.size === 0) {
      // Don't allow clearing all roles via toggle — use Remove instead.
      return
    }
    onUpdate(Array.from(next))
  }

  return (
    <tr className="border-t border-[var(--border)]">
      <td className="px-3 py-2 font-mono text-xs">{row.email}</td>
      <td className="px-3 py-2">
        <div className="flex gap-3">
          <RoleCheckbox label="Admin" checked={isAdmin} onChange={v => toggle("admin", v)} disabled={pending} />
          <RoleCheckbox label="Scorer" checked={isScorer} onChange={v => toggle("scorer", v)} disabled={pending} />
        </div>
      </td>
      <td className="px-3 py-2 text-xs text-[var(--muted)]">{row.loggedIn ? "Logged in" : "Not yet"}</td>
      <td className="px-3 py-2 text-right">
        <button
          disabled={pending}
          onClick={onRemove}
          className="rounded-md border border-red-200 px-2 py-1 text-xs text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/30"
        >
          Remove
        </button>
      </td>
    </tr>
  )
}

function RoleCheckbox({
  label, checked, onChange, disabled = false,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
}) {
  return (
    <label className={`inline-flex items-center gap-1.5 text-xs ${disabled ? "opacity-60" : ""}`}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={e => onChange(e.target.checked)}
        className="h-4 w-4 accent-[var(--primary)]"
      />
      {label}
    </label>
  )
}
