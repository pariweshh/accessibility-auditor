import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { resolveEffectiveTier } from "@/lib/quota"

export const runtime = "nodejs"

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

function renderBadgeSvg({
  leftLabel,
  rightLabel,
  rightColor,
  leftColor = "#0f172a",
  accentDotColor = "#6366f1",
}: {
  leftLabel: string
  rightLabel: string
  rightColor: string
  leftColor?: string
  accentDotColor?: string
}): string {
  const safeLeft = escapeXml(leftLabel)
  const safeRight = escapeXml(rightLabel)
  const ariaLabel = escapeXml(`${leftLabel}: ${rightLabel}`)

  // Approximate character width at 11px font-size (Verdana/Inter)
  const leftWidth = Math.max(96, Math.round(leftLabel.length * 6.6) + 30)
  const rightWidth = Math.max(115, Math.round(rightLabel.length * 6.5) + 22)
  const totalWidth = leftWidth + rightWidth

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="28" viewBox="0 0 ${totalWidth} 28" role="img" aria-label="${ariaLabel}">
  <title>${ariaLabel}</title>
  <defs>
    <linearGradient id="badge-grad" x2="0" y2="100%">
      <stop offset="0" stop-color="#ffffff" stop-opacity=".08"/>
      <stop offset="1" stop-color="#000000" stop-opacity=".12"/>
    </linearGradient>
    <clipPath id="badge-clip">
      <rect width="${totalWidth}" height="28" rx="6" fill="#fff"/>
    </clipPath>
  </defs>
  <g clip-path="url(#badge-clip)">
    <rect width="${leftWidth}" height="28" fill="${leftColor}"/>
    <rect x="${leftWidth}" width="${rightWidth}" height="28" fill="${rightColor}"/>
    <rect width="${totalWidth}" height="28" fill="url(#badge-grad)"/>
  </g>
  <rect x="0.5" y="0.5" width="${totalWidth - 1}" height="27" rx="5.5" fill="none" stroke="#ffffff" stroke-opacity="0.14"/>
  <circle cx="14" cy="14" r="4" fill="${escapeXml(accentDotColor)}"/>
  <g fill="#ffffff" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Inter,sans-serif" font-size="11" font-weight="600">
    <text x="24" y="18" fill="#f8fafc">${safeLeft}</text>
    <text x="${leftWidth + Math.round(rightWidth / 2)}" y="18" text-anchor="middle" fill="#ffffff" font-weight="700">${safeRight}</text>
  </g>
</svg>`
}

/**
 * GET /api/badge/[scanId]
 * Returns a dynamic, embeddable SVG WCAG 2.2 AA compliance badge for a completed scan.
 * - Pro tier: Displays "Equivance Audit | WCAG 2.2 AA · <score>% Pass"
 * - Agency tier: Displays custom white-label brand_name and brand_primary_color when configured.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ scanId: string }> }
) {
  const { scanId } = await params

  if (!scanId || !UUID_REGEX.test(scanId)) {
    const svg = renderBadgeSvg({
      leftLabel: "Equivance Audit",
      rightLabel: "Invalid Badge ID",
      rightColor: "#475569",
    })
    return new NextResponse(svg, {
      status: 400,
      headers: {
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Cache-Control": "no-store",
      },
    })
  }

  try {
    const db =
      process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
        ? createAdminClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
          )
        : await createClient()

    const { data: scan, error } = await db
      .from("scans")
      .select("*")
      .eq("id", scanId)
      .maybeSingle()

    if (error || !scan || scan.status !== "completed") {
      const svg = renderBadgeSvg({
        leftLabel: "Equivance Audit",
        rightLabel: "Scan Not Found",
        rightColor: "#475569",
      })
      return new NextResponse(svg, {
        status: 404,
        headers: {
          "Content-Type": "image/svg+xml; charset=utf-8",
          "Cache-Control": "public, max-age=60",
        },
      })
    }

    // Resolve owner's effective tier & optional Agency white-label branding
    let tier = "free"
    let activeTeamId: string | null = null
    if (scan.user_id) {
      const resolved = await resolveEffectiveTier(scan.user_id, db)
      tier = resolved.tier
      activeTeamId = resolved.teamId
    }

    if (tier !== "pro" && tier !== "agency") {
      const svg = renderBadgeSvg({
        leftLabel: "Equivance Audit",
        rightLabel: "Pro Badge Required",
        rightColor: "#6366f1",
      })
      return new NextResponse(svg, {
        status: 200,
        headers: {
          "Content-Type": "image/svg+xml; charset=utf-8",
          "Cache-Control": "public, max-age=120",
        },
      })
    }

    let leftLabel = "Equivance Audit"
    let accentDotColor = "#6366f1"

    if (tier === "agency" && scan.user_id) {
      const { data: team } = await db
        .from("teams")
        .select("brand_name, brand_primary_color")
        .or(
          `owner_id.eq.${scan.user_id},id.eq.${
            activeTeamId || scan.team_id || "00000000-0000-0000-0000-000000000000"
          }`
        )
        .maybeSingle()

      if (team?.brand_name?.trim()) {
        leftLabel = `${team.brand_name.trim().slice(0, 28)} Verified`
      }
      if (team?.brand_primary_color && /^#[0-9a-fA-F]{6}$/.test(team.brand_primary_color)) {
        accentDotColor = team.brand_primary_color
      }
    }

    const rawScore =
      typeof scan.score === "number"
        ? scan.score
        : typeof scan.result?.summary?.passRate === "number"
        ? scan.result.summary.passRate
        : 0
    const score = Math.max(0, Math.min(100, Math.round(rawScore)))

    const rightColor =
      score >= 90 ? "#059669" : score >= 70 ? "#d97706" : "#e11d48"

    const svg = renderBadgeSvg({
      leftLabel,
      rightLabel: `WCAG 2.2 AA · ${score}% Pass`,
      rightColor,
      accentDotColor,
    })

    return new NextResponse(svg, {
      status: 200,
      headers: {
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Cache-Control": "public, max-age=300, s-maxage=300, stale-while-revalidate=600",
      },
    })
  } catch (err) {
    console.error("Badge generation error:", err)
    const svg = renderBadgeSvg({
      leftLabel: "Equivance Audit",
      rightLabel: "Service Unavailable",
      rightColor: "#475569",
    })
    return new NextResponse(svg, {
      status: 500,
      headers: {
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Cache-Control": "no-store",
      },
    })
  }
}
