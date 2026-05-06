import Link from "next/link"
import { redirect } from "next/navigation"
import { Container } from "@/components/Container"
import { getCurrentUser } from "@/lib/auth"

export default async function ScorerLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()
  if (!user) redirect("/login?next=/scorer")
  if (user.role === "none") {
    return (
      <Container className="max-w-md">
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6 text-center">
          <h1 className="text-lg font-semibold">Not authorized</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Your account isn&apos;t in the tournament whitelist. Ask an admin to grant you scorer access.
          </p>
          <Link href="/" className="mt-4 inline-block text-sm text-[var(--primary)] hover:underline">
            Back to tournament
          </Link>
        </div>
      </Container>
    )
  }
  return <>{children}</>
}
