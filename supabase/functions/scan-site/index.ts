import puppeteer from "npm:puppeteer-core@22"
import { createClient } from "npm:@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const VALID_IMPACTS = new Set(["minor", "moderate", "serious", "critical"])

// ─── Constant-time string comparison ──────────────────────────────────────────
function timingSafeEqualStr(a: string, b: string): boolean {
  const enc = new TextEncoder()
  const aBytes = enc.encode(a)
  const bBytes = enc.encode(b)
  if (aBytes.length !== bBytes.length) return false
  let diff = 0
  for (let i = 0; i < aBytes.length; i++) {
    diff |= aBytes[i] ^ bBytes[i]
  }
  return diff === 0
}

// ─── Verify caller is authenticated with service_role ─────────────────────────
function isAuthorizedServiceCall(req: Request): boolean {
  const authHeader = req.headers.get("authorization") || ""
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  if (serviceKey && timingSafeEqualStr(authHeader, `Bearer ${serviceKey}`)) {
    return true
  }
  // Fallback: inspect JWT payload role claim if Supabase Edge runtime swapped key
  const token = authHeader.replace(/^Bearer\s+/i, "").trim()
  if (token.split(".").length === 3) {
    try {
      const payloadJson = atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))
      const payload = JSON.parse(payloadJson)
      if (payload?.role === "service_role") return true
    } catch {
      // ignore malformed JWT
    }
  }
  return false
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
  const clean = host.trim().toLowerCase().replace(/^\[|\]$/g, "").replace(/\.+$/, "")
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
  let cleanIp = ip.trim().replace(/^\[|\]$/g, "").replace(/\.+$/, "").toLowerCase()

  // Normalize IPv6 via WHATWG URL parser if it contains colons
  if (cleanIp.includes(":")) {
    try {
      const normalized = new URL(`http://[${cleanIp}]/`).hostname
      cleanIp = normalized.replace(/^\[|\]$/g, "").toLowerCase()
    } catch {
      // keep cleanIp as-is
    }
  }

  // Handle IPv4-mapped IPv6 addresses (e.g. ::ffff:127.0.0.1, ::ffff:a9fe:a9fe, 0:0:0:0:0:ffff:...)
  const mappedPrefixMatch = cleanIp.match(/^(?:::ffff:|(?:0+:){5}ffff:)(.+)$/)
  if (mappedPrefixMatch) {
    const mappedPart = mappedPrefixMatch[1]
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
    const [a, b, c] = parts

    // Loopback (127.0.0.0/8), unspecified (0.0.0.0/8), link-local/IMDS (169.254.0.0/16)
    if (a === 127 || a === 0 || (a === 169 && b === 254)) {
      return true
    }

    // Multicast, reserved, broadcast (>= 224)
    if (a >= 224) {
      return true
    }

    // IETF Protocol Assignments (192.0.0.0/24 - Oracle IMDS), TEST-NETs, Benchmarking (198.18.0.0/15)
    if (
      (a === 192 && b === 0 && (c === 0 || c === 2)) ||
      (a === 198 && (b === 18 || b === 19)) ||
      (a === 198 && b === 51 && c === 100) ||
      (a === 203 && b === 0 && c === 113)
    ) {
      return true
    }

    // RFC 1918 private IPs & CGNAT / Alibaba IMDS (100.64.0.0/10)
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

  // IPv6 checks (loopback, unspecified, link-local fe80::/10, ULA fc00::/7, multicast ff00::/8,
  // NAT64 64:ff9b::/96, 6to4 2002::/16, Teredo 2001:0::/32, Doc 2001:db8::/32, Discard 100::/64)
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
    cleanIp.startsWith("ff") ||
    cleanIp.startsWith("64:ff9b:") ||
    cleanIp.startsWith("2002:") ||
    cleanIp.startsWith("2001:0:") ||
    cleanIp.startsWith("2001:0000:") ||
    cleanIp.startsWith("2001:db8:") ||
    cleanIp.startsWith("2001:2:") ||
    cleanIp.startsWith("100::") ||
    cleanIp.startsWith("100:0:")
  ) {
    return true
  }

  return false
}

const BLOCKED_SUFFIXES = [
  ".local",
  ".internal",
  ".localhost",
  ".lan",
  ".home",
  ".corp",
  ".intranet",
  ".nip.io",
  ".sslip.io",
  ".xip.io",
  ".traefik.me",
  ".localtest.me",
  ".lvh.me",
  ".vcap.me",
]

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

    const host = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, "").replace(/\.+$/, "")
    if (!host) return true

    // Exact names & cloud metadata
    if (
      host === "localhost" ||
      host === "0.0.0.0" ||
      host === "::1" ||
      host === "::" ||
      host === "169.254.169.254" ||
      host === "100.100.100.200" ||
      host === "192.0.0.192" ||
      host === "metadata.google.internal" ||
      host === "metadata.google" ||
      host === "metadata" ||
      host === "instance-data" ||
      host === "kubernetes.default" ||
      host === "kubernetes.default.svc" ||
      BLOCKED_SUFFIXES.some((s) => host.endsWith(s))
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

async function resolveAndVerifyHostDns(rawUrl: string): Promise<boolean> {
  if (isBlockedTargetUrl(rawUrl)) return true
  try {
    const parsed = new URL(rawUrl)
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false
    const host = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, "").replace(/\.+$/, "")
    // If already an IP literal, isBlockedTargetUrl already verified it
    if (parseCanonicalIpv4(host) || host.includes(":")) return false

    const resolvedIps: string[] = []
    try {
      const aRecords = await Deno.resolveDns(host, "A")
      resolvedIps.push(...aRecords)
    } catch {
      // ignore if no A record
    }
    try {
      const aaaaRecords = await Deno.resolveDns(host, "AAAA")
      resolvedIps.push(...aaaaRecords)
    } catch {
      // ignore if no AAAA record
    }

    if (resolvedIps.length === 0) {
      return true // Fail closed if domain does not resolve to any A/AAAA record
    }

    for (const ip of resolvedIps) {
      if (isRestrictedIpAddress(ip)) {
        return true
      }
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

  // Enforce service_role authentication on Edge Function invocations
  if (!isAuthorizedServiceCall(req)) {
    return new Response(JSON.stringify({ error: "Unauthorized edge function invocation" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  const supabase = getSupabaseAdmin()
  let scanId: string | undefined

  try {
    const body = await req.json()
    scanId = typeof body?.scanId === "string" ? body.scanId.trim() : undefined

    if (!scanId || !UUID_REGEX.test(scanId)) {
      return new Response(JSON.stringify({ error: "A valid UUID scanId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // Fetch authoritative scan record from database and verify it is pending
    const { data: scanRow, error: scanFetchError } = await supabase
      .from("scans")
      .select("id, url, status")
      .eq("id", scanId)
      .single()

    if (scanFetchError || !scanRow) {
      return new Response(JSON.stringify({ error: "Scan record not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    if (scanRow.status !== "pending") {
      return new Response(
        JSON.stringify({ error: `Scan ${scanId} is already ${scanRow.status}` }),
        {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      )
    }

    const url: string = scanRow.url

    if (await resolveAndVerifyHostDns(url)) {
      await updateScan(supabase, scanId, {
        status: "failed",
        error_message: "Blocked internal, local, or cloud infrastructure URL.",
      })
      return new Response(
        JSON.stringify({ error: "Cannot scan internal, local, or cloud infrastructure URLs." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // ─── Cleanup stale scans (> 5 minutes old) to prevent slot deadlocks ───
    const staleCutoff = new Date(Date.now() - 5 * 60 * 1000).toISOString()
    await supabase
      .from("scans")
      .update({
        status: "failed",
        error_message: "Scan timed out while processing.",
      })
      .in("status", ["pending", "processing"])
      .lt("created_at", staleCutoff)
      .neq("id", scanId)

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
        break
      }

      if (count === null || count < maxConcurrent) {
        break
      }

      console.log(`Scan ${scanId} waiting: ${count} scans currently processing (max: ${maxConcurrent})`)
      await new Promise((r) => setTimeout(r, checkInterval))
      waited += checkInterval
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
      await page.setBypassCSP(true)
      await page.setViewport({ width: 1920, height: 1080 })

      // Intercept requests (including redirects and sub-resources) to block SSRF
      await page.setRequestInterception(true)
      page.on("request", async (interceptedReq: any) => {
        const reqUrl = interceptedReq.url()
        if (await resolveAndVerifyHostDns(reqUrl)) {
          console.warn(`Blocked restricted sub-resource or redirect target: ${reqUrl}`)
          interceptedReq.abort("accessdenied").catch(() => {})
        } else {
          interceptedReq.continue().catch(() => {})
        }
      })

      // Inspect response redirect headers (resolving relative URLs properly)
      page.on("response", (res: any) => {
        const status = res.status()
        if (status >= 300 && status < 400) {
          const location = res.headers()["location"]
          if (location) {
            try {
              const resolvedRedirect = new URL(location, res.url()).toString()
              if (isBlockedTargetUrl(resolvedRedirect)) {
                console.warn(`Redirect target blocked by SSRF policy: ${resolvedRedirect}`)
              }
            } catch {
              console.warn(`Malformed redirect location blocked: ${location}`)
            }
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

      // ─── Sanitize & map violations + incomplete results ───────────────────
      const sanitizeHelpUrl = (rawHelpUrl: unknown): string => {
        if (typeof rawHelpUrl !== "string") return "https://dequeuniversity.com/rules/axe/"
        try {
          const parsed = new URL(rawHelpUrl)
          if (parsed.protocol === "https:" || parsed.protocol === "http:") {
            return parsed.toString()
          }
        } catch {
          // ignore
        }
        return "https://dequeuniversity.com/rules/axe/"
      }

      const mapIssue = (v: any) => {
        const rawImpact = typeof v?.impact === "string" ? v.impact.toLowerCase() : "minor"
        const impact = VALID_IMPACTS.has(rawImpact) ? rawImpact : "minor"
        const nodes = Array.isArray(v?.nodes) ? v.nodes.slice(0, 50) : []
        return {
          id: String(v?.id || "unknown-rule").slice(0, 120),
          impact,
          description: String(v?.description || "").slice(0, 1000),
          help: String(v?.help || "").slice(0, 500),
          helpUrl: sanitizeHelpUrl(v?.helpUrl),
          tags: Array.isArray(v?.tags)
            ? v.tags.slice(0, 30).map((t: unknown) => String(t).slice(0, 64))
            : [],
          nodes: nodes.map((n: any) => ({
            html: String(n?.html || "").slice(0, 4000),
            target: Array.isArray(n?.target)
              ? n.target.slice(0, 10).map((t: unknown) => String(t).slice(0, 250))
              : [],
            failureSummary: String(n?.failureSummary || "").slice(0, 1500),
          })),
        }
      }

      const rawViolations = Array.isArray(axeResults?.violations)
        ? axeResults.violations.slice(0, 200)
        : []
      const rawIncomplete = Array.isArray(axeResults?.incomplete)
        ? axeResults.incomplete.slice(0, 200)
        : []
      const passesCount = Array.isArray(axeResults?.passes) ? axeResults.passes.length : 0

      const violations = rawViolations.map(mapIssue)
      const incompleteItems = rawIncomplete.map(mapIssue)

      const totalChecks = passesCount + violations.length
      const passRate = totalChecks > 0 ? Math.round((passesCount / totalChecks) * 100) : 100

      const summary = {
        critical: violations.filter((v: any) => v.impact === "critical").length,
        serious: violations.filter((v: any) => v.impact === "serious").length,
        moderate: violations.filter((v: any) => v.impact === "moderate").length,
        minor: violations.filter((v: any) => v.impact === "minor").length,
        passRate,
      }

      const scanResult = {
        url,
        timestamp: new Date().toISOString(),
        violations,
        passes: passesCount,
        incomplete: incompleteItems.length,
        incompleteItems,
        summary,
      }

      // ─── Save results & mark completed ───────────────────────────────────
      await updateScan(supabase, scanId, {
        status: "completed",
        score: passRate,
        violations: violations.length,
        passes: passesCount,
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

    if (scanId) {
      await updateScan(supabase, scanId, {
        status: "failed",
        error_message: "Scan execution failed or timed out.",
      })
    }

    return new Response(JSON.stringify({ error: "Scan execution failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})
