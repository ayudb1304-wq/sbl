import Link from "next/link"
import { notFound } from "next/navigation"
import { Container } from "@/components/Container"
import { Breadcrumbs } from "@/components/Breadcrumbs"
import { BracketView } from "@/components/BracketView"
import { LiveScoreSubscriber } from "@/components/LiveScoreSubscriber"
import { getActiveSeason, getCategoryByCode, getSeasonMatches } from "@/lib/queries"
import { categoryShortName } from "@/lib/format"

export const dynamic = "force-dynamic"

const CATS = ["MB", "MI", "W"]

export default async function BracketPage({ params }: { params: Promise<{ categoryCode: string }> }) {
  const { categoryCode } = await params
  const code = categoryCode.toUpperCase()
  if (!CATS.includes(code)) notFound()

  const season = await getActiveSeason()
  if (!season) return notFound()
  const category = await getCategoryByCode(season.id, code)
  if (!category) return notFound()

  const all = await getSeasonMatches(season.id)
  const koMatches = all.filter(m => m.category_id === category.id && m.stage !== "group")

  return (
    <Container className="space-y-6">
      <LiveScoreSubscriber />
      <header className="space-y-2">
        <Breadcrumbs items={[
          { label: "Home", href: "/" },
          { label: categoryShortName(code), href: `/categories/${code}` },
          { label: "Bracket" },
        ]} />
        <h1 className="text-2xl font-semibold tracking-tight">{categoryShortName(code)} — Knockouts</h1>
        <nav className="mt-3 flex gap-1 text-sm">
          {CATS.map(c => (
            <Link
              key={c}
              href={`/bracket/${c}`}
              className={`rounded-md px-3 py-1.5 ${c === code ? "bg-[var(--primary)] text-white" : "border border-[var(--border)] text-[var(--muted)] hover:bg-[var(--bg)]"}`}
            >
              {c}
            </Link>
          ))}
        </nav>
      </header>

      <BracketView matches={koMatches} hasQF={category.has_qf} />
    </Container>
  )
}
