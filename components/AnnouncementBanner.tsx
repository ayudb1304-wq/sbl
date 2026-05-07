import { getActiveAnnouncement } from "@/lib/announcements"
import { AnnouncementBannerClient } from "./AnnouncementBannerClient"

/**
 * Server wrapper: fetches active announcement for SSR, hands to client
 * component which polls /api/announcement on a 30s interval and remembers
 * dismissals in localStorage by announcement ID.
 */
export async function AnnouncementBanner() {
  const initial = await getActiveAnnouncement()
  return <AnnouncementBannerClient initial={initial} />
}
