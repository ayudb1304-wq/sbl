import { Container } from "@/components/Container"
import { SeasonManager } from "@/components/admin/SeasonManager"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

export default async function AdminSeasonsPage() {
  const admin = createAdminClient()
  const { data } = await admin
    .from("seasons")
    .select("id, year, name, status, is_active")
    .order("year", { ascending: false })

  return (
    <Container className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Seasons</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          One season is active at a time — the active season drives every public page.
        </p>
      </header>
      <SeasonManager rows={data ?? []} />
    </Container>
  )
}
