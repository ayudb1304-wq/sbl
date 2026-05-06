import Link from "next/link"
import { Container } from "@/components/Container"
import { createAdminClient } from "@/lib/supabase/admin"
import { getActiveSeason } from "@/lib/queries"
import { ResolveBracketButton } from "@/components/admin/ResolveBracketButton"

export const dynamic = "force-dynamic"

export default async function AdminHome() {
  const season = await getActiveSeason()
  if (!season) {
    return (
      <Container className="max-w-md">
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6">
          <h1 className="text-lg font-semibold">No active season</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Create or activate a season under <Link href="/admin/seasons" className="text-[var(--primary)] hover:underline">Seasons</Link>.
          </p>
        </div>
      </Container>
    )
  }

  const admin = createAdminClient()
  const [matchesRes, groupsRes] = await Promise.all([
    admin.from("matches").select("status, stage, locked").eq("season_id", season.id),
    admin.from("groups").select("id, qualifiers_locked, category_id, categories!inner(season_id)").eq("categories.season_id", season.id),
  ])
  const matches = matchesRes.data ?? []
  const groups = groupsRes.data ?? []

  const counts = {
    total: matches.length,
    scheduled: matches.filter(m => m.status === "scheduled").length,
    inProgress: matches.filter(m => m.status === "in_progress").length,
    completed: matches.filter(m => m.status === "completed").length,
    walkover: matches.filter(m => m.status === "walkover").length,
    locked: matches.filter(m => m.locked).length,
  }
  const groupsConfirmed = groups.filter(g => g.qualifiers_locked).length

  return (
    <Container className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Admin overview</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          {season.name} · status: {season.status}
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Stat label="Matches" value={counts.total} sub={`${counts.scheduled} scheduled · ${counts.inProgress} live · ${counts.completed + counts.walkover} done`} />
        <Stat label="Groups confirmed" value={`${groupsConfirmed}/${groups.length}`} sub="Qualifiers locked = bracket can resolve" />
        <Stat label="Locked matches" value={counts.locked} sub="Scorers cannot edit; admins can override" />
      </div>

      <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--muted)]">Quick actions</h2>
        <div className="flex flex-wrap gap-2 text-sm">
          <Link href="/admin/categories/MB" className="rounded-md border border-[var(--border)] px-3 py-1.5 hover:border-[var(--primary)]">Review MB groups</Link>
          <Link href="/admin/categories/MI" className="rounded-md border border-[var(--border)] px-3 py-1.5 hover:border-[var(--primary)]">Review MI groups</Link>
          <Link href="/admin/categories/W" className="rounded-md border border-[var(--border)] px-3 py-1.5 hover:border-[var(--primary)]">Review W groups</Link>
          <ResolveBracketButton seasonId={season.id} label="Re-resolve all brackets" />
        </div>
      </section>
    </Container>
  )
}

function Stat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="text-xs uppercase tracking-wider text-[var(--muted)]">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
      {sub && <div className="mt-1 text-xs text-[var(--muted)]">{sub}</div>}
    </div>
  )
}
