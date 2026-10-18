import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { resolveEffectiveTier } from "@/lib/quota"

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

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
 * PATCH /api/monitors/[id]
 * Updates monitor status (active/paused), frequency, alert email, or threshold.
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: monitorId } = await context.params
    if (!monitorId || !UUID_REGEX.test(monitorId)) {
      return NextResponse.json({ error: "Valid monitor ID is required" }, { status: 400 })
    }

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
          message: "Updating scheduled monitors requires an active Pro or Agency plan.",
        },
        { status: 403 }
      )
    }

    // Verify ownership
    const { data: monitor, error: fetchError } = await adminSupabase
      .from("monitors")
      .select("*")
      .eq("id", monitorId)
      .maybeSingle()

    if (fetchError || !monitor) {
      return NextResponse.json({ error: "Monitor not found" }, { status: 404 })
    }

    const isOwner = monitor.user_id === userId
    const isTeammate = teamId && monitor.team_id === teamId
    if (!isOwner && !isTeammate) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const body = await request.json()
    const updates: Record<string, unknown> = {}

    if (body.status !== undefined) {
      if (body.status === "active" || body.status === "paused") {
        updates.status = body.status
      }
    }

    if (body.frequency !== undefined) {
      if (body.frequency === "daily" || body.frequency === "weekly") {
        updates.frequency = body.frequency
      }
    }

    if (body.alertEmail !== undefined) {
      const trimmedEmail = typeof body.alertEmail === "string" ? body.alertEmail.trim() : ""
      if (
        trimmedEmail.length > 0 &&
        trimmedEmail.length <= 254 &&
        EMAIL_REGEX.test(trimmedEmail) &&
        !/[\r\n]/.test(trimmedEmail)
      ) {
        updates.alert_email = trimmedEmail
      } else {
        return NextResponse.json({ error: "Invalid alert email address" }, { status: 400 })
      }
    }

    if (body.minScoreThreshold !== undefined) {
      updates.min_score_threshold = Math.max(1, Math.min(100, Number(body.minScoreThreshold) || 90))
    }

    if (body.alertOnDegradation !== undefined) {
      updates.alert_on_degradation = Boolean(body.alertOnDegradation)
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 })
    }

    const { data: updated, error: updateError } = await adminSupabase
      .from("monitors")
      .update(updates)
      .eq("id", monitorId)
      .select("*")
      .single()

    if (updateError || !updated) {
      console.error("Failed to update monitor:", updateError)
      return NextResponse.json({ error: "Failed to update monitor" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: "Monitor updated successfully",
      monitor: updated,
    })
  } catch (err: unknown) {
    console.error("Monitor PATCH error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

/**
 * DELETE /api/monitors/[id]
 * Removes a scheduled monitor.
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: monitorId } = await context.params
    if (!monitorId || !UUID_REGEX.test(monitorId)) {
      return NextResponse.json({ error: "Valid monitor ID is required" }, { status: 400 })
    }

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

    // Verify ownership
    const { data: monitor, error: fetchError } = await adminSupabase
      .from("monitors")
      .select("*")
      .eq("id", monitorId)
      .maybeSingle()

    if (fetchError || !monitor) {
      return NextResponse.json({ error: "Monitor not found" }, { status: 404 })
    }

    const isOwner = monitor.user_id === userId
    const isTeammate = teamId && monitor.team_id === teamId
    if (!isOwner && !isTeammate) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const { error: deleteError } = await adminSupabase
      .from("monitors")
      .delete()
      .eq("id", monitorId)

    if (deleteError) {
      console.error("Failed to delete monitor:", deleteError)
      return NextResponse.json({ error: "Failed to delete monitor" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: "Monitor deleted successfully",
    })
  } catch (err: unknown) {
    console.error("Monitor DELETE error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
