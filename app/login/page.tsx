"use client"
import { useState, useTransition } from "react"
import Link from "next/link"
import { Container } from "@/components/Container"
import { requestMagicLink } from "@/lib/actions/auth"

export default function LoginPage() {
  const [pending, start] = useTransition()
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null)

  function onSubmit(formData: FormData) {
    setResult(null)
    start(async () => {
      const res = await requestMagicLink(formData)
      setResult(
        res.ok
          ? { ok: true, message: "Check your email for a sign-in link." }
          : { ok: false, message: res.error },
      )
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
              placeholder="you@example.com"
              className="mt-1 block w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm focus:border-[var(--primary)] focus:outline-none"
            />
          </label>
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-md bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {pending ? "Sending..." : "Send magic link"}
          </button>
        </form>

        {result && (
          <p
            className={`mt-4 rounded-md p-3 text-sm ${
              result.ok
                ? "bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200"
                : "bg-red-50 text-red-900 dark:bg-red-950/40 dark:text-red-200"
            }`}
          >
            {result.message}
          </p>
        )}
      </div>
    </Container>
  )
}
