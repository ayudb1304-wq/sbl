import { getMarqueeItems } from "@/lib/marquee"
import { MarqueeContent } from "./MarqueeContent"

/**
 * Server wrapper: fetches initial data for SSR, hands off to MarqueeContent
 * (client) which handles polling + animation. Avoids the per-spectator
 * Postgres-changes subscription that the original implementation had.
 */
export async function Marquee() {
  const items = await getMarqueeItems()
  if (items.length === 0) return null
  return <MarqueeContent initialItems={items} />
}
