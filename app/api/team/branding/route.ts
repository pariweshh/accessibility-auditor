import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { resolveEffectiveTier } from "@/lib/quota"
import { validateScanTargetUrl } from "@/lib/ssrf"
import { AgencyBranding } from "@/lib/types"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const SAFE_DATA_IMAGE_REGEX = /^data:image\/(png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=\s]+$/i

function isSubscriptionActive(status: string | null | undefined): boolean {
  if (!status) return true
  return status === "active" || status === "trialing"
}

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const adminSupabase = getAdminClient()
    const { tier, teamId, isTeamOwner } = await resolveEffectiveTier(user.id, adminSupabase)

    if (tier !== "agency") {
      return NextResponse.json({
        hasAccess: false,
        isOwner: false,
        branding: null,
      })
    }

    let team = null
    if (teamId) {
      const { data } = await adminSupabase
        .from("teams")
        .select("id, name, owner_id, brand_name, brand_logo_url, brand_primary_color, brand_tagline, brand_footer_text, brand_hide_watermark")
        .eq("id", teamId)
        .maybeSingle()
      team = data
    }

    if (!team) {
      return NextResponse.json({
        hasAccess: true,
        isOwner: isTeamOwner,
        branding: null,
      })
    }

    const branding: AgencyBranding = {
      brandName: team.brand_name || team.name || "Agency Workspace",
      brandLogoUrl: team.brand_logo_url || null,
      brandPrimaryColor: team.brand_primary_color || "#4f46e5",
      brandTagline: team.brand_tagline || "Accessibility Audit Report",
      brandFooterText: team.brand_footer_text || null,
      brandHideWatermark: team.brand_hide_watermark ?? false,
    }

    return NextResponse.json({
      hasAccess: true,
      isOwner: isTeamOwner,
      branding,
    })
  } catch (error) {
    console.error("GET /api/team/branding error:", error)
    return NextResponse.json(
      { error: "Failed to load branding" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Verify Agency tier and active subscription
    const { data: profile } = await supabase
      .from("profiles")
      .select("subscription_tier, subscription_status")
      .eq("id", user.id)
      .single()

    if (
      profile?.subscription_tier !== "agency" ||
      !isSubscriptionActive(profile?.subscription_status)
    ) {
      return NextResponse.json(
        { error: "White-Label custom branding is exclusively available on the Agency plan ($99 AUD/mo)." },
        { status: 403 }
      )
    }

    const body = await request.json()
    const {
      brandName,
      brandLogoUrl,
      brandPrimaryColor,
      brandTagline,
      brandFooterText,
      brandHideWatermark,
      hideWatermark,
    } = body

    // Validation
    const hexRegex = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/
    const sanitizedColor =
      brandPrimaryColor && typeof brandPrimaryColor === "string" && hexRegex.test(brandPrimaryColor.trim())
        ? brandPrimaryColor.trim()
        : "#4f46e5"

    const sanitizedName = brandName ? String(brandName).trim().slice(0, 80) : "Agency Workspace"
    const sanitizedTagline = brandTagline ? String(brandTagline).trim().slice(0, 120) : "Accessibility Audit Report"
    const sanitizedFooter = brandFooterText ? String(brandFooterText).trim().slice(0, 250) : null
    const sanitizedHideWatermark = Boolean(brandHideWatermark ?? hideWatermark)

    // Strict URL / Data URI validation for logo (blocks data:image/svg+xml and SSRF targets)
    let sanitizedLogoUrl: string | null = null
    if (brandLogoUrl && typeof brandLogoUrl === "string") {
      const trimmedLogo = brandLogoUrl.trim()
      if (trimmedLogo.startsWith("data:")) {
        if (trimmedLogo.length <= 500_000 && SAFE_DATA_IMAGE_REGEX.test(trimmedLogo)) {
          sanitizedLogoUrl = trimmedLogo
        } else {
          return NextResponse.json(
            { error: "Invalid logo image format. Only PNG, JPEG, WebP, or GIF base64 images under 350KB are allowed." },
            { status: 400 }
          )
        }
      } else if (trimmedLogo.startsWith("http://") || trimmedLogo.startsWith("https://")) {
        const ssrfCheck = await validateScanTargetUrl(trimmedLogo)
        if (!ssrfCheck.valid) {
          return NextResponse.json(
            { error: ssrfCheck.error || "Invalid or restricted logo URL" },
            { status: 400 }
          )
        }
        sanitizedLogoUrl = ssrfCheck.normalizedUrl || trimmedLogo
      }
    }

    const adminSupabase = getAdminClient()

    // 1. Locate team owned by user
    let { data: team } = await adminSupabase
      .from("teams")
      .select("id")
      .eq("owner_id", user.id)
      .maybeSingle()

    if (!team) {
      // Auto-provision team for Agency owner if not present
      const { data: newTeam, error: createTeamErr } = await adminSupabase
        .from("teams")
        .insert({
          owner_id: user.id,
          name: sanitizedName,
          max_seats: 3,
        })
        .select("id")
        .single()

      if (createTeamErr || !newTeam) {
        return NextResponse.json({ error: "Failed to initialize agency team" }, { status: 500 })
      }
      team = newTeam

      await adminSupabase.from("team_members").insert({
        team_id: newTeam.id,
        user_id: user.id,
        email: user.email || "",
        role: "owner",
        status: "active",
      })
    }

    // 2. Update branding columns
    const { data: updatedTeam, error: updateErr } = await adminSupabase
      .from("teams")
      .update({
        brand_name: sanitizedName,
        brand_logo_url: sanitizedLogoUrl,
        brand_primary_color: sanitizedColor,
        brand_tagline: sanitizedTagline,
        brand_footer_text: sanitizedFooter,
        brand_hide_watermark: sanitizedHideWatermark,
      })
      .eq("id", team.id)
      .select("id, brand_name, brand_logo_url, brand_primary_color, brand_tagline, brand_footer_text, brand_hide_watermark")
      .single()

    if (updateErr || !updatedTeam) {
      console.error("Failed to update branding:", updateErr)
      return NextResponse.json({ error: "Failed to save branding preferences" }, { status: 500 })
    }

    const savedBranding: AgencyBranding = {
      brandName: updatedTeam.brand_name,
      brandLogoUrl: updatedTeam.brand_logo_url,
      brandPrimaryColor: updatedTeam.brand_primary_color,
      brandTagline: updatedTeam.brand_tagline,
      brandFooterText: updatedTeam.brand_footer_text,
      brandHideWatermark: updatedTeam.brand_hide_watermark,
    }

    return NextResponse.json({
      success: true,
      message: "Branding configuration saved successfully",
      branding: savedBranding,
    })
  } catch (error) {
    console.error("POST /api/team/branding error:", error)
    return NextResponse.json(
      { error: "Failed to save branding" },
      { status: 500 }
    )
  }
}
