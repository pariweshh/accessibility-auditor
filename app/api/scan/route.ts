import { checkQuota, resolveEffectiveTier } from "@/lib/quota"
import { validateScanTargetUrl } from "@/lib/ssrf"
import { createClient } from "@/lib/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { NextRequest, NextResponse, after } from "next/server"
import crypto from "crypto"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function getAdminSupabase() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function authenticateRequest(request: NextRequest) {
  let userId: string | null = null
  let authMethod: "session" | "api_key" | null = null

  const supabase = await createClient()
  const adminSupabase = getAdminSupabase()

  // 1. Try standard cookie/session auth
  const {
    data: { user: sessionUser },
  } = await supabase.auth.getUser()

  if (sessionUser) {
    userId = sessionUser.id
    authMethod = "session"
  }

  // 2. Try API key auth if no session found
  if (!userId) {
    const apiKey = request.headers.get("x-api-key")
    if (apiKey) {
      if (!apiKey.startsWith("aud_live_")) {
        return { error: "Invalid API key format", status: 401 as const }
      }

      const keyHash = crypto.createHash("sha256").update(apiKey).digest("hex")

      // Query api_keys via adminSupabase to bypass RLS for unauthenticated requests
      const { data: keyRecord, error: keyError } = await adminSupabase
        .from("api_keys")
        .select("user_id, id")
        .eq("key_hash", keyHash)
        .single()

      if (!keyError && keyRecord) {
        // Verify that the key owner still has an active Pro or Agency subscription
        const { tier } = await resolveEffectiveTier(keyRecord.user_id, adminSupabase)
        if (tier !== "pro" && tier !== "agency") {
          return {
            error: "API key access requires an active Pro or Agency subscription.",
            status: 403 as const,
          }
        }

        userId = keyRecord.user_id
        authMethod = "api_key"

        // Update last_used_at asynchronously
        adminSupabase
          .from("api_keys")
          .update({ last_used_at: new Date().toISOString() })
          .eq("id", keyRecord.id)
          .then(({ error }) => {
            if (error) console.error("Failed to update api key last_used_at:", error)
          })
      }
    }
  }

  if (!userId) {
    return {
      error: "Unauthorized: You must be signed in or provide a valid x-api-key header.",
      status: 401 as const,
    }
  }

  return {
    userId,
    authMethod,
    supabase,
    adminSupabase,
    activeDbClient: authMethod === "api_key" ? adminSupabase : supabase,
  }
}

/**
 * GET /api/scan?scanId=<uuid>
 * Polls scan status and retrieves completed WCAG 2.2 audit results for CI/CD and API integrations.
 */
export async function GET(request: NextRequest) {
  try {
    const scanId =
      request.nextUrl.searchParams.get("scanId") ||
      request.nextUrl.searchParams.get("id")

    if (!scanId) {
      return NextResponse.json(
        { error: "Query parameter 'scanId' is required" },
        { status: 400 }
      )
    }

    const auth = await authenticateRequest(request)
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { userId, adminSupabase } = auth
    const { teamId: activeTeamId } = await resolveEffectiveTier(userId, adminSupabase)

    const { data: scan, error: scanError } = await adminSupabase
      .from("scans")
      .select("*")
      .eq("id", scanId)
      .maybeSingle()

    if (scanError || !scan) {
      return NextResponse.json({ error: "Scan not found" }, { status: 404 })
    }

    // Verify ownership or active team access
    const isOwner = scan.user_id === userId
    const isTeamScan = Boolean(activeTeamId && scan.team_id === activeTeamId)
    if (!isOwner && !isTeamScan) {
      return NextResponse.json({ error: "Scan not found" }, { status: 404 })
    }

    // ── Auto-fail stale scans (> 3 minutes old) to prevent slot deadlocks ──────
    const isStale =
      (scan.status === "pending" || scan.status === "processing") &&
      Date.now() - new Date(scan.created_at).getTime() > 3 * 60 * 1000

    if (isStale) {
      const timeoutMsg = "Scan timed out while processing."
      await adminSupabase
        .from("scans")
        .update({
          status: "failed",
          error_message: timeoutMsg,
        })
        .eq("id", scan.id)

      scan.status = "failed"
      scan.error_message = timeoutMsg
    }

    const passesCount = scan.passes ?? scan.result?.passes ?? 0
    const violationsCount = scan.violations ?? scan.result?.violations?.length ?? 0
    const totalChecks = passesCount + violationsCount
    const score =
      scan.status === "completed"
        ? totalChecks > 0
          ? Math.round((passesCount / totalChecks) * 100)
          : 100
        : null

    return NextResponse.json({
      id: scan.id,
      scanId: scan.id,
      url: scan.url,
      status: scan.status,
      score,
      violations: scan.result?.violations ?? [],
      incomplete: scan.result?.incompleteItems ?? [],
      incompleteCount: scan.result?.incomplete ?? 0,
      passes: passesCount,
      summary: scan.summary ?? scan.result?.summary ?? {
        critical: 0,
        serious: 0,
        moderate: 0,
        minor: 0,
      },
      error_message: scan.error_message ?? null,
      created_at: scan.created_at,
    })
  } catch (error) {
    console.error("GET /api/scan error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch scan status" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json()

    // Validate URL format, protocol, SSRF, cloud metadata, and DNS resolution
    const validation = await validateScanTargetUrl(url)
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    // ── Auth & Quota ────────────────────────────────────────────────────────
    const auth = await authenticateRequest(request)
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { userId, activeDbClient } = auth

    // Check quota (pass activeDbClient to bypass RLS when authed via API key)
    const quota = await checkQuota(userId, activeDbClient)
    if (!quota.allowed) {
      return NextResponse.json(
        {
          error: "quota_exceeded",
          message: `You've used all ${quota.limit} scans for this month on the ${quota.tier} plan.`,
          quota,
        },
        { status: 429 }
      )
    }

    // ── Insert pending scan record ──────────────────────────────────────────
    // Use activeDbClient so that if auth is via API Key, we use adminSupabase to bypass RLS
    const scanInsertPayload: Record<string, any> = {
      user_id: userId,
      url,
      status: "pending",
    }
    if (quota.teamId) {
      scanInsertPayload.team_id = quota.teamId
    }

    const { data: scan, error: insertError } = await activeDbClient
      .from("scans")
      .insert(scanInsertPayload)
      .select("id")
      .single()

    if (insertError || !scan) {
      console.error("Failed to create scan record:", insertError)
      return NextResponse.json(
        { error: "Failed to create scan record" },
        { status: 500 }
      )
    }

    const scanId = scan.id

    // ── Fire-and-forget: invoke Edge Function ───────────────────────────────
    // We do NOT await this — the Edge Function runs asynchronously on Supabase.
    // The frontend subscribes to Realtime to learn when it finishes.
    // We wrap it in Next.js `after` to prevent Vercel from freezing the container before the request leaves.
    const edgeFnUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/scan-site`
    after(async () => {
      try {
        await fetch(edgeFnUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            // Authenticate the Edge Function call with the service role key
            Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({
            scanId,
            url,
            userId,
            tier: quota.tier,
          }),
        })
      } catch (err) {
        console.error("Failed to invoke scan-site edge function:", err)
      }
    })

    // ── Return 202 immediately ──────────────────────────────────────────────
    return NextResponse.json(
      {
        scanId,
        status: "pending",
        message: "Scan queued successfully",
      },
      { status: 202 }
    )
  } catch (error) {
    console.error("Scan API error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to start scan" },
      { status: 500 }
    )
  }
}

