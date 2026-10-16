/**
 * Canonical site metadata shared across SEO surfaces
 * (root metadata, sitemap, robots, Open Graph, JSON-LD).
 *
 * Set NEXT_PUBLIC_SITE_URL in production (e.g. https://auditorpro.app).
 * Falls back to localhost for local development.
 */

const FALLBACK_URL = "http://localhost:3000"

function resolveSiteUrl(): string {
  const fromEnv = (process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL)?.trim()
  if (fromEnv) return fromEnv.replace(/\/$/, "")

  // Vercel provides the deployment host without protocol
  const vercelUrl = process.env.NEXT_PUBLIC_VERCEL_URL?.trim()
  if (vercelUrl) return `https://${vercelUrl}`

  return FALLBACK_URL
}

export const SITE = {
  name: "Equivance",
  url: resolveSiteUrl(),
  title: "Equivance — Continuous Web Accessibility & WCAG Governance",
  description:
    "Enterprise web accessibility auditing, continuous WCAG 2.2 monitoring, and framework-aware AI code remediation. Fast-track ADA & EAA 2025 compliance.",
  twitterHandle: "@equivance",
} as const
