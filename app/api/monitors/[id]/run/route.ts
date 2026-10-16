import { NextRequest, NextResponse, after } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { checkQuota, resolveEffectiveTier } from "@/lib/quota"

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
 * POST /api/monitors/[id]/run
 * Manually dispatches an on-demand audit for a scheduled monitor.
 */
export async function POST(
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
    const { tier, teamId } = await resolveEffectiveTier(userId, adminSupabase)

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

    // Check monthly quota
    const quota = await checkQuota(userId, adminSupabase)
    if (!quota.allowed) {
      return NextResponse.json(
        {
          error: "quota_exceeded",
          message: `Monthly scan quota exhausted (${quota.used}/${quota.limit}).`,
        },
        { status: 429 }
      )
    }

    // Insert pending scan
    const { data: scan, error: insertError } = await adminSupabase
      .from("scans")
      .insert({
        user_id: userId,
        team_id: quota.teamId ?? null,
        url: monitor.url,
        status: "pending",
      })
      .select("id")
      .single()

    if (insertError || !scan) {
      console.error("Failed to insert scan for monitor run:", insertError)
      return NextResponse.json({ error: "Failed to dispatch scan" }, { status: 500 })
    }

    const scanId = scan.id

    // Update monitor last_run_at and last_scan_id
    await adminSupabase
      .from("monitors")
      .update({
        last_run_at: new Date().toISOString(),
        last_scan_id: scanId,
      })
      .eq("id", monitorId)

    // Fire Edge Function in background with Next.js after()
    const edgeFnUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/scan-site`
    after(async () => {
      try {
        await fetch(edgeFnUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({
            scanId,
            url: monitor.url,
            userId,
            tier: quota.tier,
          }),
        })
      } catch (err) {
        console.error("Failed to invoke scan-site edge function for monitor:", err)
      }
    })

    return NextResponse.json({
      success: true,
      message: "Monitor audit dispatched successfully",
      scanId,
    })
  } catch (err: any) {
    console.error("Monitor run POST error:", err)
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 })
  }
}
