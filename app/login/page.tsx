"use client"
import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Container } from "@/components/Container"
import { directLogin } from "@/lib/actions/auth"

export default function LoginPage() {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function onSubmit(formData: FormData) {
    setError(null)
    start(async () => {
      const res = await directLogin(formData)
      if (res.ok) {
        router.push(res.dest)
        router.refresh()
      } else {
        setError(res.error)
      }
    })
  }

  return (
    <Container className="max-w-md">
      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6">
        <h1 className="text-xl font-semibold tracking-tight">Sign in</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Admins and scorers only. Participants don&apos;t need an account —{" "}
          <Link href="/" className="text-[var(--primary)] hover:underline">view the tournament</Link>.
        </p>

        <form action={onSubmit} className="mt-6 space-y-3">
          <label className="block">
            <span className="text-sm font-medium">Email</span>
            <input
              type="email"
              name="email"
              required
              autoComplete="email"
              autoFocus
              placeholder="you@example.com"
              className="mt-1 block w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm focus:border-[var(--primary)] focus:outline-none"
            />
          </label>
          <button
            type="submit"
            disabled={pending}
            style={{ backgroundColor: "var(--primary)" }}
            className="w-full rounded-md px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {pending ? "Signing in..." : "Sign in"}
          </button>
        </form>

        {error && (
          <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-900 dark:bg-red-950/40 dark:text-red-200">
            {error}
          </p>
        )}

        <p className="mt-4 text-xs text-[var(--muted)]">
          No password — your email is your sign-in. Only emails added to the whitelist by an admin can log in.
        </p>
      </div>
    </Container>
  )
}
