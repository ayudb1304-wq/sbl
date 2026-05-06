import Link from "next/link"

export type Crumb = { label: string; href?: string }

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-[var(--muted)]">
      {items.map((c, i) => {
        const isLast = i === items.length - 1
        return (
          <span key={i} className="flex items-center gap-1.5">
            {c.href && !isLast ? (
              <Link href={c.href} className="hover:text-[var(--text)] hover:underline">
                {c.label}
              </Link>
            ) : (
              <span className={isLast ? "font-medium text-[var(--text)]" : ""}>{c.label}</span>
            )}
            {!isLast && <span className="text-[var(--border-strong)]">/</span>}
          </span>
        )
      })}
    </nav>
  )
}
