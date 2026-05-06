"use client"
import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { resolveBracket } from "@/lib/actions/admin"

export function ResolveBracketButton({
  seasonId, categoryId, label = "Resolve bracket",
}: {
  seasonId: string
  categoryId?: string
  label?: string
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [msg, setMsg] = useState<string | null>(null)

  return (
    <span className="inline-flex items-center gap-2">
      <button
        disabled={pending}
        onClick={() => {
          setMsg(null)
          start(async () => {
            const res = await resolveBracket({ seasonId, categoryId })
            if (res.ok) setMsg(`Resolved ${res.data.resolved} match slot${res.data.resolved === 1 ? "" : "s"}.`)
            else setMsg(res.error)
            router.refresh()
          })
        }}
        className="rounded-md bg-[var(--primary)] px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending ? "Resolving..." : label}
      </button>
      {msg && <span className="text-xs text-[var(--muted)]">{msg}</span>}
    </span>
  )
}
