import { createAdminClient } from "@/lib/supabase/admin"

export type Announcement = {
  id: string
  message: string
  tone: "info" | "success" | "warning" | "urgent"
  created_at: string
}

export async function getActiveAnnouncement(): Promise<Announcement | null> {
  const admin = createAdminClient()
  const { data } = await admin
    .from("announcements")
    .select("id, message, tone, created_at")
    .eq("is_active", true)
    .maybeSingle<Announcement>()
  return data
}

export async function getAnnouncementHistory(limit = 20): Promise<(Announcement & { is_active: boolean })[]> {
  const admin = createAdminClient()
  const { data } = await admin
    .from("announcements")
    .select("id, message, tone, is_active, created_at")
    .order("created_at", { ascending: false })
    .limit(limit)
  return (data ?? []) as (Announcement & { is_active: boolean })[]
}
