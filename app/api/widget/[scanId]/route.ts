import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { resolveEffectiveTier } from "@/lib/quota"
import { SITE } from "@/lib/site"

export const runtime = "nodejs"

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  })
}

/**
 * GET /api/widget/[scanId]
 * Returns public conformance summary and branding for the embeddable accessibility widget.
 * Enables client websites to display live accessibility statements and conformance status.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ scanId: string }> }
) {
  const { scanId } = await params

  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Content-Type": "application/json; charset=utf-8",
  }

  if (!scanId || !UUID_REGEX.test(scanId)) {
    return NextResponse.json(
      { error: "Invalid scanId parameter" },
      { status: 400, headers: corsHeaders }
    )
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
      .select("id, user_id, team_id, url, status, score, result, created_at")
      .eq("id", scanId)
      .maybeSingle()

    if (error || !scan || scan.status !== "completed") {
      return NextResponse.json(
        { error: "Scan record not found or still processing" },
        {
          status: 404,
          headers: {
            ...corsHeaders,
            "Cache-Control": "public, max-age=60",
          },
        }
      )
    }

    // Resolve effective tier (Pro/Agency subscription required for widget embedding)
    let tier = "free"
    let activeTeamId: string | null = null
    if (scan.user_id) {
      const resolved = await resolveEffectiveTier(scan.user_id, db)
      tier = resolved.tier
      activeTeamId = resolved.teamId
    }

    if (tier !== "pro" && tier !== "agency") {
      return NextResponse.json(
        {
          error: "Widget embedding requires an active Pro or Agency subscription",
          tier: "free",
          upgradeUrl: `${SITE.url}/#pricing`,
        },
        {
          status: 403,
          headers: {
            ...corsHeaders,
            "Cache-Control": "public, max-age=120",
          },
        }
      )
    }

    // Check for Agency white-label branding
    const branding = {
      name: "A11ytica Pro",
      logo: null as string | null,
      color: "#4f46e5",
      tagline: "WCAG 2.2 Level AA Verified",
      footerText: null as string | null,
      whiteLabel: false,
    }

    if (tier === "agency" && scan.user_id) {
      const { data: team } = await db
        .from("teams")
        .select("brand_name, brand_logo_url, brand_primary_color, brand_tagline, brand_footer_text, brand_hide_watermark")
        .or(
          `owner_id.eq.${scan.user_id},id.eq.${
            activeTeamId || scan.team_id || "00000000-0000-0000-0000-000000000000"
          }`
        )
        .maybeSingle()

      if (team?.brand_name?.trim()) {
        branding.name = team.brand_name.trim()
        branding.whiteLabel = true
      }
      if (team?.brand_hide_watermark) {
        branding.whiteLabel = true
      }
      if (team?.brand_logo_url?.trim()) {
        branding.logo = team.brand_logo_url.trim()
      }
      if (team?.brand_primary_color && /^#[0-9a-fA-F]{3,6}$/.test(team.brand_primary_color)) {
        branding.color = team.brand_primary_color
      }
      if (team?.brand_tagline?.trim()) {
        branding.tagline = team.brand_tagline.trim()
      }
      if (team?.brand_footer_text?.trim()) {
        branding.footerText = team.brand_footer_text.trim()
      }
    }

    const rawScore =
      typeof scan.score === "number"
        ? scan.score
        : typeof scan.result?.summary?.passRate === "number"
        ? scan.result.summary.passRate
        : 0
    const score = Math.max(0, Math.min(100, Math.round(rawScore)))

    const summary = scan.result?.summary || {
      critical: 0,
      serious: 0,
      moderate: 0,
      minor: 0,
    }
    const passesCount = Array.isArray(scan.result?.passes) ? scan.result.passes.length : 0

    // Categorize violations by WCAG 2.2 POUR principles
    const violations: Array<{ id: string; impact: string; tags?: string[] }> = Array.isArray(
      scan.result?.violations
    )
      ? scan.result.violations
      : []

    const isPerceivable = (tags: string[] = []) =>
      tags.some(
        (t) =>
          /^wcag1\d{2,3}$/.test(t) ||
          [
            "cat.text-alternatives",
            "cat.color",
            "cat.time-and-media",
            "cat.sensory-and-visual-cues",
            "cat.tables",
          ].includes(t)
      )

    const isOperable = (tags: string[] = []) =>
      tags.some(
        (t) =>
          /^wcag2\d{2,3}$/.test(t) ||
          ["cat.keyboard", "cat.navigation", "cat.semantics"].includes(t)
      )

    const isUnderstandable = (tags: string[] = []) =>
      tags.some(
        (t) =>
          /^wcag3\d{2,3}$/.test(t) ||
          ["cat.forms", "cat.language"].includes(t)
      )

    const isRobust = (tags: string[] = []) =>
      tags.some(
        (t) =>
          /^wcag4\d{2,3}$/.test(t) ||
          ["cat.aria", "cat.parsing", "cat.name-role-value"].includes(t)
      )

    const pour = {
      perceivable: {
        name: "Perceivable",
        description: "Color contrast, text alternatives & audio/video captions",
        violations: violations.filter((v) => isPerceivable(v.tags)).length,
        status: violations.filter((v) => isPerceivable(v.tags)).length === 0 ? "Pass" : "Needs Review",
      },
      operable: {
        name: "Operable",
        description: "Keyboard accessibility, focus visible & target size",
        violations: violations.filter((v) => isOperable(v.tags)).length,
        status: violations.filter((v) => isOperable(v.tags)).length === 0 ? "Pass" : "Needs Review",
      },
      understandable: {
        name: "Understandable",
        description: "Clear language declarations, readable error alerts & form labels",
        violations: violations.filter((v) => isUnderstandable(v.tags)).length,
        status: violations.filter((v) => isUnderstandable(v.tags)).length === 0 ? "Pass" : "Needs Review",
      },
      robust: {
        name: "Robust",
        description: "Valid ARIA markup, semantic HTML & assistive device compatibility",
        violations: violations.filter((v) => isRobust(v.tags)).length,
        status: violations.filter((v) => isRobust(v.tags)).length === 0 ? "Pass" : "Needs Review",
      },
    }

    const isSubstantiallyConformant = summary.critical === 0 && summary.serious === 0
    const conformance = isSubstantiallyConformant ? "Substantially Conformant" : "Partially Conformant"

    return NextResponse.json(
      {
        scanId: scan.id,
        url: scan.url,
        score,
        auditDate: scan.created_at,
        conformance,
        summary: {
          critical: summary.critical || 0,
          serious: summary.serious || 0,
          moderate: summary.moderate || 0,
          minor: summary.minor || 0,
        },
        passesCount,
        standards: ["WCAG 2.2 Level AA", "European Accessibility Act (EAA 2025)", "ADA Title III"],
        pour,
        branding,
        verifyUrl: `${SITE.url}/report/${scan.id}?verify=1`,
      },
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Cache-Control": "public, max-age=300, s-maxage=600, stale-while-revalidate=86400",
        },
      }
    )
  } catch (err) {
    console.error("GET /api/widget/[scanId] unexpected error:", err)
    return NextResponse.json(
      { error: "Internal server error fetching widget metadata" },
      { status: 500, headers: corsHeaders }
    )
  }
}
