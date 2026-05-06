/**
 * Branding tokens. Per-season overrides come from seasons.branding JSONB
 * (resolved at request time once we want SBL 2027 to look different).
 */
export const branding = {
  appName: "SBL",
  appTagline: "Sysfore Badminton League",
  logoUrl: "/sbl-logo.png" as string | null,
  colors: {
    primary: "#1E2A6E",   // navy from the logo
    accent: "#C0623F",    // warm coral, complements navy
    surface: "#FFFFFF",
    text: "#0F0D0A",
    muted: "#76706A",
  },
} as const
