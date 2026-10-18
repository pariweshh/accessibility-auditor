import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { resolveEffectiveTier } from "@/lib/quota"
import { validateScanTargetUrl } from "@/lib/ssrf"
import { MonitorFrequency } from "@/lib/types"

const PRO_MONITOR_LIMIT = 3
const AGENCY_MONITOR_LIMIT = 10
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

/**
 * Helper to authenticate user via session cookie or x-api-key
 */
async function authenticate(request: NextRequest) {
  const apiKey = request.headers.get("x-api-key")
  const adminSupabase = getAdminClient()

  if (apiKey) {
    if (!apiKey.startsWith("aud_live_")) {
      return { error: "Invalid API key", status: 401 as const }
    }
    const crypto = await import("crypto")
    const keyHash = crypto.createHash("sha256").update(apiKey).digest("hex")
    const { data: keyRecord } = await adminSupabase
      .from("api_keys")
      .select("id, user_id")
      .eq("key_hash", keyHash)
      .maybeSingle()

    if (!keyRecord) {
      return { error: "Invalid API key", status: 401 as const }
    }

    adminSupabase
      .from("api_keys")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", keyRecord.id)
      .then()

    return { userId: keyRecord.user_id, adminSupabase, isApiKey: true }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Authentication required", status: 401 as const }
  }

  return { userId: user.id, adminSupabase, isApiKey: false }
}

/**
 * GET /api/monitors
 * Returns list of scheduled monitors for the authenticated user or team workspace.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticate(request)
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { userId, adminSupabase, isApiKey } = auth
    const { tier, teamId } = await resolveEffectiveTier(userId, adminSupabase)

    if (isApiKey && tier === "free") {
      return NextResponse.json(
        { error: "API key access requires an active Pro or Agency plan" },
        { status: 403 }
      )
    }

    // Build query: User's own monitors OR monitors belonging to their active team
    let query = adminSupabase
      .from("monitors")
      .select(`
        *,
        scans:last_scan_id (
          id,
          url,
          status,
          violations,
          passes,
          summary,
          created_at
        )
      `)
      .order("created_at", { ascending: false })

    if (teamId && UUID_REGEX.test(teamId) && UUID_REGEX.test(userId)) {
      query = query.or(`user_id.eq.${userId},team_id.eq.${teamId}`)
    } else {
      query = query.eq("user_id", userId)
    }

    const { data: monitors, error } = await query

    if (error) {
      console.error("Error fetching monitors:", error)
      return NextResponse.json({ error: "Failed to fetch monitors" }, { status: 500 })
    }

    const maxMonitors =
      tier === "agency"
        ? AGENCY_MONITOR_LIMIT
        : tier === "pro"
        ? PRO_MONITOR_LIMIT
        : 0

    return NextResponse.json({
      monitors: monitors || [],
      tier,
      usedCount: monitors?.length || 0,
      maxMonitors,
      hasAccess: tier === "pro" || tier === "agency",
    })
  } catch (err: unknown) {
    console.error("Monitors GET error:", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/monitors
 * Provisions a new scheduled accessibility monitor.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticate(request)
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { userId, adminSupabase } = auth
    const { tier, teamId } = await resolveEffectiveTier(userId, adminSupabase)

    if (tier === "free") {
      return NextResponse.json(
        {
          error: "tier_restricted",
          message:
            "Automated scheduled monitoring is a premium feature available on Pro (up to 3 monitors) and Agency (up to 10 monitors) plans.",
        },
        { status: 403 }
      )
    }

    const body = await request.json()
    const {
      url,
      frequency = "weekly",
      alertEmail,
      alertOnDegradation = true,
      minScoreThreshold = 90,
    } = body

    if (!url || typeof url !== "string" || url.length > 2048) {
      return NextResponse.json(
        { error: "A valid target URL is required" },
        { status: 400 }
      )
    }

    // SSRF & DNS-rebinding security check
    const ssrfCheck = await validateScanTargetUrl(url)
    if (!ssrfCheck.valid) {
      return NextResponse.json(
        { error: ssrfCheck.error || "Invalid or restricted target URL" },
        { status: 400 }
      )
    }

    const validFrequency: MonitorFrequency =
      frequency === "daily" ? "daily" : "weekly"

    const trimmedEmail = typeof alertEmail === "string" ? alertEmail.trim() : ""
    const cleanEmail =
      trimmedEmail.length > 0 &&
      trimmedEmail.length <= 254 &&
      EMAIL_REGEX.test(trimmedEmail) &&
      !/[\r\n]/.test(trimmedEmail)
        ? trimmedEmail
        : null

    if (!cleanEmail) {
      return NextResponse.json(
        { error: "A valid alert email address is required" },
        { status: 400 }
      )
    }

    const maxMonitors =
      tier === "agency" ? AGENCY_MONITOR_LIMIT : PRO_MONITOR_LIMIT

    // Check current count
    let countQuery = adminSupabase
      .from("monitors")
      .select("id", { count: "exact", head: true })

    if (teamId && UUID_REGEX.test(teamId) && UUID_REGEX.test(userId)) {
      countQuery = countQuery.or(`user_id.eq.${userId},team_id.eq.${teamId}`)
    } else {
      countQuery = countQuery.eq("user_id", userId)
    }

    const { count, error: countError } = await countQuery
    if (countError) {
      return NextResponse.json({ error: "Failed to evaluate monitor quota" }, { status: 500 })
    }

    if ((count || 0) >= maxMonitors) {
      return NextResponse.json(
        {
          error: "monitor_limit_reached",
          message: `Your ${tier} plan allows a maximum of ${maxMonitors} scheduled monitors. Please upgrade or remove an existing monitor.`,
        },
        { status: 400 }
      )
    }

    const threshold = Math.max(1, Math.min(100, Number(minScoreThreshold) || 90))

    // Insert new monitor with next_run_at = now()
    const { data: newMonitor, error: insertError } = await adminSupabase
      .from("monitors")
      .insert({
        user_id: userId,
        team_id: teamId || null,
        url: ssrfCheck.normalizedUrl || url.trim(),
        frequency: validFrequency,
        status: "active",
        alert_email: cleanEmail,
        alert_on_degradation: Boolean(alertOnDegradation),
        min_score_threshold: threshold,
        next_run_at: new Date().toISOString(),
      })
      .select("*")
      .single()

    if (insertError || !newMonitor) {
      console.error("Failed to insert monitor:", insertError)
      return NextResponse.json(
        { error: "Failed to save scheduled monitor" },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        success: true,
        message: "Scheduled monitor created successfully",
        monitor: newMonitor,
      },
      { status: 201 }
    )
  } catch (err: unknown) {
    console.error("Monitors POST error:", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
