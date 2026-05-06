import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"

/**
 * Magic-link callback. Supabase redirects here with ?code=... after the user
 * clicks their email link. Exchange the code for a session, then route them
 * to the right home based on their role.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const code = url.searchParams.get("code")
  const next = url.searchParams.get("next") || null

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=missing_code", url.origin))
  }

  const sb = await createClient()
  const { error } = await sb.auth.exchangeCodeForSession(code)
  if (error) {
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error.message)}`, url.origin))
  }

  // Route based on role
  const { data: { user } } = await sb.auth.getUser()
  let dest = next || "/scorer"
  if (user) {
    const { data: profile } = await sb
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle<{ role: "admin" | "scorer" | "none" }>()
    if (profile?.role === "admin") dest = next || "/admin"
    else if (profile?.role === "scorer") dest = next || "/scorer"
    else dest = "/login?error=not_authorized"
  }
  return NextResponse.redirect(new URL(dest, url.origin))
}
