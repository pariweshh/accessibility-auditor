import puppeteer from "npm:puppeteer-core@22"
import { createClient } from "npm:@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

// ─── Supabase admin client (uses service role key injected by Supabase) ───────
function getSupabaseAdmin() {
  const url = Deno.env.get("SUPABASE_URL")!
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  return createClient(url, key)
}

// ─── Update scan record status helper ─────────────────────────────────────────
async function updateScan(supabase: any, scanId: string, data: Record<string, any>) {
  const { error } = await supabase.from("scans").update(data).eq("id", scanId)
  if (error) console.error(`Failed to update scan ${scanId}:`, error)
}

// ─── SSRF Guard for Browser Navigation & Redirects ───────────────────────────
function isBlockedTargetUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl)
    // Allow data:, blob:, about:blank for legitimate sub-resources (fonts, inline SVGs)
    if (parsed.protocol === "data:" || parsed.protocol === "blob:" || rawUrl === "about:blank") {
      return false
    }
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return true
    }
    const host = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, "")
    if (
      host === "localhost" ||
      host === "0.0.0.0" ||
      host === "::1" ||
      host === "::" ||
      host === "169.254.169.254" ||
      host === "metadata.google.internal" ||
      host.endsWith(".local") ||
      host.endsWith(".internal") ||
      host.endsWith(".nip.io") ||
      host.endsWith(".sslip.io") ||
      host.startsWith("127.") ||
      host.startsWith("169.254.") ||
      host.startsWith("10.") ||
      host.startsWith("192.168.") ||
      host.startsWith("fe80:") ||
      host.startsWith("::ffff:127.") ||
      host.startsWith("::ffff:169.254.") ||
      /^172\.(1[6-9]|2[0-9]|3[01])\./.test(host)
    ) {
      return true
    }
    return false
  } catch {
    return true
  }
}

// ─── Main handler ──────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  const supabase = getSupabaseAdmin()
  let scanId: string | undefined

  try {
    const body = await req.json()
    scanId = body.scanId
    const { url } = body

    if (!scanId || !url) {
      return new Response(JSON.stringify({ error: "scanId and url are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    if (isBlockedTargetUrl(url)) {
      await updateScan(supabase, scanId, {
        status: "failed",
        error_message: "Blocked internal, local, or cloud infrastructure URL.",
      })
      return new Response(
        JSON.stringify({ error: "Cannot scan internal, local, or cloud infrastructure URLs." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // ─── Cleanup stale processing scans (> 3 minutes old) to prevent slot deadlocks
    const staleCutoff = new Date(Date.now() - 3 * 60 * 1000).toISOString()
    await supabase
      .from("scans")
      .update({
        status: "failed",
        error_message: "Scan timed out while processing.",
      })
      .eq("status", "processing")
      .lt("created_at", staleCutoff)

    // ─── Concurrency Control: Wait for slot if concurrency limit is reached ───
    const maxConcurrent = parseInt(Deno.env.get("MAX_CONCURRENT_SCANS") || "3", 10)
    const checkInterval = 2000
    const maxWaitTime = 60000
    let waited = 0

    while (waited < maxWaitTime) {
      const { count, error: countError } = await supabase
        .from("scans")
        .select("id", { count: "exact", head: true })
        .eq("status", "processing")

      if (countError) {
        console.error("Error checking active scans:", countError)
        break // Fail open to not block scans if database is transiently failing
      }

      if (count === null || count < maxConcurrent) {
        break
      }

      console.log(`Scan ${scanId} waiting: ${count} scans currently processing (max: ${maxConcurrent})`)
      await new Promise((r) => setTimeout(r, checkInterval))
      waited += checkInterval
    }

    if (waited >= maxWaitTime) {
      console.warn(`Scan ${scanId} waited too long (${maxWaitTime}ms) for a slot. Proceeding to prevent timeout.`)
    }

    // Mark as processing
    await updateScan(supabase, scanId, { status: "processing" })

    // ─── Connect to Browserless ─────────────────────────────────────────────
    const browserlessToken = Deno.env.get("BROWSERLESS_TOKEN")
    if (!browserlessToken) throw new Error("BROWSERLESS_TOKEN is not configured")

    const browser = await puppeteer.connect({
      browserWSEndpoint: `wss://production-sfo.browserless.io?token=${browserlessToken}&timeout=60000`,
    })

    let page: any
    try {
      page = await browser.newPage()
      await page.setViewport({ width: 1920, height: 1080 })

      // Intercept requests to block HTTP 302 redirects or sub-resources targeting private/metadata IPs
      await page.setRequestInterception(true)
      page.on("request", (interceptedReq: any) => {
        const reqUrl = interceptedReq.url()
        if (isBlockedTargetUrl(reqUrl)) {
          interceptedReq.abort("accessdenied").catch(() => {})
        } else {
          interceptedReq.continue().catch(() => {})
        }
      })

      // Spoof user agent to avoid bot detection
      await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, "userAgent", {
          get: () =>
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        })
      })

      await page.goto(url, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      })

      // Let dynamic content settle
      await new Promise((r) => setTimeout(r, 1500))

      // Inject axe-core from CDN
      await page.addScriptTag({
        url: "https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.12.0/axe.min.js",
      })

      // ─── Run axe-core audit ───────────────────────────────────────────────
      const axeResults = await page.evaluate(async () => {
        // @ts-ignore axe is injected globally
        return await axe.run()
      })

      // ─── Process violations & incomplete results ──────────────────────────
      // Both axe result sets share the same node shape, so map them the same way.
      const mapIssue = (v: any) => ({
        id: v.id,
        impact: v.impact ?? "minor",
        description: v.description,
        help: v.help,
        helpUrl: v.helpUrl,
        tags: v.tags,
        nodes: v.nodes.map((n: any) => ({
          html: n.html,
          target: n.target,
          failureSummary: n.failureSummary ?? "",
        })),
      })

      const violations = axeResults.violations.map(mapIssue)
      // "incomplete" = checks axe could not decide automatically; surfaced to
      // the user as items needing manual review rather than discarded.
      const incompleteItems = axeResults.incomplete.map(mapIssue)

      const summary = {
        critical: violations.filter((v: any) => v.impact === "critical").length,
        serious:  violations.filter((v: any) => v.impact === "serious").length,
        moderate: violations.filter((v: any) => v.impact === "moderate").length,
        minor:    violations.filter((v: any) => v.impact === "minor").length,
      }

      const scanResult = {
        url,
        timestamp: new Date().toISOString(),
        violations,
        passes: axeResults.passes.length,
        incomplete: axeResults.incomplete.length,
        incompleteItems,
        summary,
      }

      // ─── Save results & mark completed ───────────────────────────────────
      await updateScan(supabase, scanId, {
        status: "completed",
        violations: violations.length,
        passes: axeResults.passes.length,
        summary,
        result: scanResult,
      })

      // ─── Persist normalized records into public.violations ────────────────
      if (violations.length > 0) {
        const violationRows = violations.map((v: any) => ({
          scan_id: scanId,
          issue_id: v.id,
          impact: v.impact,
          description: v.description,
          help: v.help,
          help_url: v.helpUrl,
          tags: v.tags,
          nodes: v.nodes,
        }))

        const { error: violationsErr } = await supabase
          .from("violations")
          .insert(violationRows)

        if (violationsErr) {
          console.error(`Failed to insert relational violations for scan ${scanId}:`, violationsErr)
        }
      }

      console.log(`Scan ${scanId} completed: ${violations.length} violations found`)
    } finally {
      if (page) await page.close().catch(() => {})
      await browser.close().catch(() => {})
    }

    return new Response(JSON.stringify({ success: true, scanId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    console.error(`Scan ${scanId} failed:`, message)

    // Mark scan as failed in DB so the frontend can surface the error
    if (scanId) {
      await updateScan(supabase, scanId, {
        status: "failed",
        error_message: message,
      })
    }

    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})

