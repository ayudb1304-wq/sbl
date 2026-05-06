import Link from "next/link"
import { redirect } from "next/navigation"
import { Container } from "@/components/Container"
import { getCurrentUser } from "@/lib/auth"

export default async function AdminHome() {
  const user = await getCurrentUser()
  if (!user) redirect("/login?next=/admin")
  if (user.role !== "admin") redirect("/scorer")

  return (
    <Container className="max-w-md">
      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6 space-y-3">
        <h1 className="text-xl font-semibold">Admin</h1>
        <p className="text-sm text-[var(--muted)]">
          Standings lock, bracket generation, score corrections, user management — coming in M4.
        </p>
        <p className="text-sm">
          For now, you can also access the{" "}
          <Link href="/scorer" className="text-[var(--primary)] hover:underline">scorer dashboard</Link>{" "}
          to enter scores like any scorer.
        </p>
      </div>
    </Container>
  )
}
