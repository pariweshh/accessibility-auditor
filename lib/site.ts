/**
 * Canonical site metadata shared across SEO surfaces
 * (root metadata, sitemap, robots, Open Graph, JSON-LD).
 *
 * Set NEXT_PUBLIC_SITE_URL in production (e.g. https://auditorpro.app).
 * Falls back to localhost for local development.
 */

const FALLBACK_URL = "http://localhost:3000"

function resolveSiteUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim()
  if (fromEnv) return fromEnv.replace(/\/$/, "")

  // Vercel provides the deployment host without protocol
  const vercelUrl = process.env.NEXT_PUBLIC_VERCEL_URL?.trim()
  if (vercelUrl) return `https://${vercelUrl}`

  return FALLBACK_URL
}

export const SITE = {
  name: "A11ytica Pro",
  url: resolveSiteUrl(),
  title: "A11ytica Pro — AI Web Accessibility Scanner & WCAG Audits",
  description:
    "Scan any website for WCAG accessibility violations and get AI-powered, drop-in HTML fixes. Export professional compliance reports in one click.",
  twitterHandle: "@a11yticapro",
} as const
