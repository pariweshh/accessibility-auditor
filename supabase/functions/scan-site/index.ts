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
    const { url, tier } = body

    if (!scanId || !url) {
      return new Response(JSON.stringify({ error: "scanId and url are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // Mark as processing
    await updateScan(supabase, scanId, { status: "processing" })

    // ─── Connect to Browserless ─────────────────────────────────────────────
    const browserlessToken = Deno.env.get("BROWSERLESS_TOKEN")
    if (!browserlessToken) throw new Error("BROWSERLESS_TOKEN is not configured")

    const browser = await puppeteer.connect({
      browserWSEndpoint: `wss://production-sfo.browserless.io?token=${browserlessToken}`,
    })

    let page: any
    try {
      page = await browser.newPage()
      await page.setViewport({ width: 1920, height: 1080 })

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
        url: "https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.8.3/axe.min.js",
      })

      // ─── Run axe-core audit ───────────────────────────────────────────────
      const axeResults = await page.evaluate(async () => {
        // @ts-ignore axe is injected globally
        return await axe.run()
      })

      // ─── Process violations ───────────────────────────────────────────────
      const violations = axeResults.violations.map((v: any) => ({
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
      }))

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

      console.log(`Scan ${scanId} completed: ${violations.length} violations found`)
    } finally {
      if (page) await page.close().catch(() => {})
      await browser.disconnect().catch(() => {})
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
