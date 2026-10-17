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

// ─── SSRF Guard & Canonical IP Normalizer ────────────────────────────────────
function parseCanonicalIpv4(host: string): string | null {
  const clean = host.trim().toLowerCase().replace(/^\[|\]$/g, "")
  if (!clean || clean.includes(":") || clean.includes("/") || clean.includes(" ")) {
    return null
  }

  const parts = clean.split(".")
  if (parts.length < 1 || parts.length > 4) {
    return null
  }

  const parsedParts: number[] = []
  for (const p of parts) {
    if (!p) return null
    let val: number
    if (/^0x[0-9a-f]+$/i.test(p)) {
      val = parseInt(p, 16)
    } else if (/^0[0-7]+$/.test(p)) {
      val = parseInt(p, 8)
    } else if (/^\d+$/.test(p)) {
      val = parseInt(p, 10)
    } else {
      return null
    }

    if (!Number.isSafeInteger(val) || val < 0) {
      return null
    }
    parsedParts.push(val)
  }

  let num = 0
  if (parsedParts.length === 1) {
    if (parsedParts[0] > 0xffffffff) return null
    num = parsedParts[0]
  } else if (parsedParts.length === 2) {
    if (parsedParts[0] > 0xff || parsedParts[1] > 0xffffff) return null
    num = parsedParts[0] * 0x1000000 + parsedParts[1]
  } else if (parsedParts.length === 3) {
    if (parsedParts[0] > 0xff || parsedParts[1] > 0xff || parsedParts[2] > 0xffff) return null
    num = parsedParts[0] * 0x1000000 + parsedParts[1] * 0x10000 + parsedParts[2]
  } else if (parsedParts.length === 4) {
    if (parsedParts.some((p) => p > 0xff)) return null
    num =
      parsedParts[0] * 0x1000000 +
      parsedParts[1] * 0x10000 +
      parsedParts[2] * 0x100 +
      parsedParts[3]
  }

  const b1 = Math.floor(num / 0x1000000) & 0xff
  const b2 = Math.floor(num / 0x10000) & 0xff
  const b3 = Math.floor(num / 0x100) & 0xff
  const b4 = num & 0xff

  return `${b1}.${b2}.${b3}.${b4}`
}

function isRestrictedIpAddress(ip: string): boolean {
  const cleanIp = ip.replace(/^\[|\]$/g, "").toLowerCase()

  // Handle IPv4-mapped IPv6 addresses (e.g. ::ffff:127.0.0.1, ::ffff:2130706433, ::ffff:a9fe:a9fe)
  if (cleanIp.startsWith("::ffff:")) {
    const mappedPart = cleanIp.slice(7)
    const canonical = parseCanonicalIpv4(mappedPart)
    if (canonical) {
      return isRestrictedIpAddress(canonical)
    }
    const hexMatch = mappedPart.match(/^([0-9a-f]{1,4}):([0-9a-f]{1,4})$/)
    if (hexMatch) {
      const high = parseInt(hexMatch[1], 16)
      const low = parseInt(hexMatch[2], 16)
      const ipv4 = `${(high >> 8) & 0xff}.${high & 0xff}.${(low >> 8) & 0xff}.${low & 0xff}`
      return isRestrictedIpAddress(ipv4)
    }
  }

  const canonicalIpv4 = parseCanonicalIpv4(cleanIp)
  if (canonicalIpv4) {
    const parts = canonicalIpv4.split(".").map((n) => parseInt(n, 10))
    const [a, b] = parts

    // Loopback (127.0.0.0/8), unspecified (0.0.0.0/8), link-local/IMDS (169.254.0.0/16)
    if (a === 127 || a === 0 || (a === 169 && b === 254)) {
      return true
    }

    // Multicast, reserved, broadcast (>= 224)
    if (a >= 224) {
      return true
    }

    // RFC 1918 private IPs & CGNAT (100.64.0.0/10)
    if (
      a === 10 ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127)
    ) {
      return true
    }

    return false
  }

  // IPv6 checks
  if (
    cleanIp === "::1" ||
    cleanIp === "::" ||
    cleanIp === "0:0:0:0:0:0:0:1" ||
    cleanIp === "0:0:0:0:0:0:0:0" ||
    cleanIp.startsWith("fe8") ||
    cleanIp.startsWith("fe9") ||
    cleanIp.startsWith("fea") ||
    cleanIp.startsWith("feb") ||
    cleanIp.startsWith("fc") ||
    cleanIp.startsWith("fd") ||
    cleanIp.startsWith("ff")
  ) {
    return true
  }

  return false
}

function isBlockedTargetUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl)
    // Allow data:, blob:, about:blank only for sub-resources
    if (parsed.protocol === "data:" || parsed.protocol === "blob:" || rawUrl === "about:blank") {
      return false
    }
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return true
    }
    // Reject embedded credentials
    if (parsed.username || parsed.password) {
      return true
    }

    const host = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, "")

    // Exact names & cloud metadata
    if (
      host === "localhost" ||
      host === "0.0.0.0" ||
      host === "::1" ||
      host === "::" ||
      host === "169.254.169.254" ||
      host === "metadata.google.internal" ||
      host === "metadata.google" ||
      host === "instance-data" ||
      host.endsWith(".local") ||
      host.endsWith(".internal") ||
      host.endsWith(".localhost") ||
      host.endsWith(".nip.io") ||
      host.endsWith(".sslip.io") ||
      host.endsWith(".xip.io")
    ) {
      return true
    }

    // Canonical IPv4 check (handles decimal integers, octal, hex, DWORD, shorthand)
    const canonicalIpv4 = parseCanonicalIpv4(host)
    if (canonicalIpv4 && isRestrictedIpAddress(canonicalIpv4)) {
      return true
    }

    // IPv6 or IPv4-mapped IPv6 check
    if (isRestrictedIpAddress(host)) {
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

    // ─── Cleanup stale scans (> 3 minutes old) to prevent slot deadlocks ───
    const staleCutoff = new Date(Date.now() - 3 * 60 * 1000).toISOString()
    await supabase
      .from("scans")
      .update({
        status: "failed",
        error_message: "Scan timed out while processing.",
      })
      .in("status", ["pending", "processing"])
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
          console.warn(`Blocked restricted sub-resource or redirect target: ${reqUrl}`)
          interceptedReq.abort("accessdenied").catch(() => {})
        } else {
          interceptedReq.continue().catch(() => {})
        }
      })

      // Inspect response redirect headers to defend against redirect-based SSRF
      page.on("response", (res: any) => {
        const status = res.status()
        if (status >= 300 && status < 400) {
          const location = res.headers()["location"]
          if (location && isBlockedTargetUrl(location)) {
            console.warn(`Redirect target blocked by SSRF policy: ${location}`)
          }
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

