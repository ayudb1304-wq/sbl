import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { Nav } from "@/components/Nav"
import { getActiveSeason } from "@/lib/queries"
import { branding } from "@/lib/branding"
import "./globals.css"

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] })
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] })

export const metadata: Metadata = {
  title: `${branding.appName} — ${branding.appTagline}`,
  description: "Live tournament tracking for the Sysfore Badminton League.",
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const season = await getActiveSeason()
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <Nav seasonName={season?.name ?? null} />
        <main className="flex-1 py-6">{children}</main>
        <footer className="border-t border-[var(--border)] py-6 text-center text-xs text-[var(--muted)]">
          {branding.appTagline}
        </footer>
        <Analytics />
      </body>
    </html>
  )
}
