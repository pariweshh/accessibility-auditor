import { checkQuota } from "@/lib/quota"
import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

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
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: "You must be signed in to scan." },
        { status: 401 }
      )
    }

    const quota = await checkQuota(user.id)
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
    const { data: scan, error: insertError } = await supabase
      .from("scans")
      .insert({
        user_id: user.id,
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
    const edgeFnUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/scan-site`
    fetch(edgeFnUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Authenticate the Edge Function call with the service role key
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({
        scanId,
        url,
        userId: user.id,
        tier: quota.tier,
      }),
    }).catch((err) =>
      console.error("Failed to invoke scan-site edge function:", err)
    )

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
