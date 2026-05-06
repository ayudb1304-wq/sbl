/**
 * Branding tokens. Defaults below; per-season override comes from seasons.branding JSONB
 * (resolved at request time once a logo + colors are wired in).
 */
export const branding = {
  appName: "SBL",
  appTagline: "Sysfore Badminton League",
  logoUrl: null as string | null, // set later when logo is provided
  colors: {
    primary: "#0f766e",   // teal-700, placeholder
    accent: "#f59e0b",    // amber-500, placeholder
    surface: "#ffffff",
    text: "#0a0a0a",
    muted: "#6b7280",
  },
} as const
