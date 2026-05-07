import { NextResponse } from "next/server"
import { getActiveAnnouncement } from "@/lib/announcements"

export const dynamic = "force-dynamic"

export async function GET() {
  const announcement = await getActiveAnnouncement()
  return NextResponse.json({ announcement })
}
