import { NextResponse } from "next/server"
import { getMarqueeItems } from "@/lib/marquee"

export const dynamic = "force-dynamic"

export async function GET() {
  const items = await getMarqueeItems()
  return NextResponse.json({ items })
}
