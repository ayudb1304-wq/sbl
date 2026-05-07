import { Container } from "@/components/Container"
import { AnnouncementComposer } from "@/components/admin/AnnouncementComposer"
import { getActiveAnnouncement, getAnnouncementHistory } from "@/lib/announcements"
import { dateIST, timeIST } from "@/lib/format"

export const dynamic = "force-dynamic"

export default async function AdminAnnouncementsPage() {
  const [active, history] = await Promise.all([
    getActiveAnnouncement(),
    getAnnouncementHistory(20),
  ])

  return (
    <Container className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Notice board</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Post a single message that appears as a banner at the top of every page for every visitor.
          Only one message is active at a time — posting a new one replaces the previous.
          Visitors can dismiss the banner per-message; a new post re-shows for everyone.
        </p>
      </header>

      <AnnouncementComposer active={active} />

      {history.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--muted)]">History</h2>
          <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
            <table className="w-full text-sm">
              <thead className="bg-[var(--surface-alt)] text-[var(--muted-strong)]">
                <tr>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider">When</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider">Tone</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider">Message</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody>
                {history.map(h => (
                  <tr key={h.id} className="border-t border-[var(--border)]">
                    <td className="px-3 py-2 text-xs text-[var(--muted)]">
                      {dateIST(h.created_at)} {timeIST(h.created_at)}
                    </td>
                    <td className="px-3 py-2 text-xs capitalize">{h.tone}</td>
                    <td className="px-3 py-2">{h.message}</td>
                    <td className="px-3 py-2 text-xs">
                      {h.is_active ? (
                        <span className="rounded-full bg-[var(--success)]/15 px-2 py-0.5 font-semibold text-[var(--success)]">ACTIVE</span>
                      ) : (
                        <span className="text-[var(--muted)]">archived</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </Container>
  )
}
