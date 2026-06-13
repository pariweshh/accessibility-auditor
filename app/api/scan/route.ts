import { checkQuota } from "@/lib/quota"
import { createClient } from "@/lib/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { NextRequest, NextResponse, after } from "next/server"
import crypto from "crypto"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json()

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 })
    }

    // Validate URL format
    let urlObj: URL
    try {
      urlObj = new URL(url)
    } catch {
      return NextResponse.json({ error: "Invalid URL format" }, { status: 400 })
    }

    // Block internal IPs in production
    const hostname = urlObj.hostname.toLowerCase()
    if (process.env.NODE_ENV === "production") {
      const blockedHosts = ["localhost", "127.0.0.1", "0.0.0.0", "::1"]
      if (
        blockedHosts.includes(hostname) ||
        hostname.startsWith("192.168.") ||
        hostname.startsWith("10.") ||
        hostname.match(/^172\.(1[6-9]|2[0-9]|3[01])\./)
      ) {
        return NextResponse.json(
          { error: "Cannot scan internal/local URLs in production" },
          { status: 400 }
        )
      }
    }

    // ── Auth & Quota ────────────────────────────────────────────────────────
    let userId: string | null = null
    let authMethod: "session" | "api_key" | null = null

    const supabase = await createClient()
    const adminSupabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

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
          return NextResponse.json({ error: "Invalid API key format" }, { status: 401 })
        }

        const keyHash = crypto.createHash("sha256").update(apiKey).digest("hex")

        // Query api_keys via adminSupabase to bypass RLS for unauthenticated requests
        const { data: keyRecord, error: keyError } = await adminSupabase
          .from("api_keys")
          .select("user_id, id")
          .eq("key_hash", keyHash)
          .single()

        if (!keyError && keyRecord) {
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
      return NextResponse.json(
        { error: "Unauthorized: You must be signed in or provide a valid x-api-key header." },
        { status: 401 }
      )
    }

    // Check quota (pass activeDbClient to bypass RLS when authed via API key)
    const activeDbClient = authMethod === "api_key" ? adminSupabase : supabase
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
    const { data: scan, error: insertError } = await activeDbClient
      .from("scans")
      .insert({
        user_id: userId,
        url,
        status: "pending",
      })
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
    return NextResponse.json({ scanId }, { status: 202 })
  } catch (error) {
    console.error("Scan API error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to start scan" },
      { status: 500 }
    )
  }
}
