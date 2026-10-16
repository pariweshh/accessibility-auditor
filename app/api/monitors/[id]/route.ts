import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { resolveEffectiveTier } from "@/lib/quota"

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
    const crypto = await import("crypto")
    const keyHash = crypto.createHash("sha256").update(apiKey).digest("hex")
    const { data: keyRecord } = await adminSupabase
      .from("api_keys")
      .select("user_id")
      .eq("key_hash", keyHash)
      .maybeSingle()

    if (!keyRecord) {
      return { error: "Invalid API key", status: 401 as const }
    }
    return { userId: keyRecord.user_id, adminSupabase }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Authentication required", status: 401 as const }
  }

  return { userId: user.id, adminSupabase }
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
    if (!monitorId) {
      return NextResponse.json({ error: "Monitor ID is required" }, { status: 400 })
    }

    const auth = await authenticate(request)
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { userId, adminSupabase } = auth
    const { teamId } = await resolveEffectiveTier(userId, adminSupabase)

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
    const updates: Record<string, any> = {}

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

    if (body.alertEmail && typeof body.alertEmail === "string" && body.alertEmail.includes("@")) {
      updates.alert_email = body.alertEmail.trim()
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
  } catch (err: any) {
    console.error("Monitor PATCH error:", err)
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 })
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
    if (!monitorId) {
      return NextResponse.json({ error: "Monitor ID is required" }, { status: 400 })
    }

    const auth = await authenticate(request)
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { userId, adminSupabase } = auth
    const { teamId } = await resolveEffectiveTier(userId, adminSupabase)

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
  } catch (err: any) {
    console.error("Monitor DELETE error:", err)
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 })
  }
}
