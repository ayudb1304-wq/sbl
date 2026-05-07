import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { Nav } from "@/components/Nav"
import { Marquee } from "@/components/Marquee"
import { AnnouncementBanner } from "@/components/AnnouncementBanner"
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
        <Marquee />
        <Nav seasonName={season?.name ?? null} />
        <AnnouncementBanner />
        <main className="flex-1 py-6 sm:py-10">{children}</main>
        <footer className="border-t border-[var(--border)] py-6 text-center text-xs text-[var(--muted)]">
          {branding.appTagline}
          {season && <> · <span className="text-[var(--muted-strong)]">{season.name}</span></>}
        </footer>
        <Analytics />
      </body>
    </html>
  )
}
