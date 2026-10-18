import { AccessibilityIssue, ScanResult } from "./types"
import puppeteer, { Browser, Page } from "puppeteer-core"
import { validateScanTargetUrl } from "./ssrf"

let sharedBrowser: Browser | null = null
const VALID_IMPACTS = new Set(["minor", "moderate", "serious", "critical"])

// Reuse browser instance for local performance
async function getBrowser(): Promise<{ browser: Browser; isRemote: boolean }> {
  const browserlessToken = process.env.BROWSERLESS_TOKEN

  // Use Browserless.io for production/Vercel
  if (browserlessToken) {
    const remoteBrowser = await puppeteer.connect({
      browserWSEndpoint: `wss://production-sfo.browserless.io?token=${browserlessToken}`,
    })
    return { browser: remoteBrowser, isRemote: true }
  }

  // Local development - reuse browser instance if still connected
  if (sharedBrowser && sharedBrowser.connected) {
    return { browser: sharedBrowser, isRemote: false }
  }

  const chromiumPath =
    process.env.CHROME_EXECUTABLE_PATH ||
    (process.platform === "win32"
      ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
      : process.platform === "darwin"
      ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
      : "/usr/bin/google-chrome")

  sharedBrowser = await puppeteer.launch({
    executablePath: chromiumPath,
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
    ],
  })

  sharedBrowser.on("disconnected", () => {
    sharedBrowser = null
  })

  return { browser: sharedBrowser, isRemote: false }
}

export async function scanURL(url: string): Promise<ScanResult> {
  // Enforce SSRF validation before launching or navigating browser
  const ssrfCheck = await validateScanTargetUrl(url)
  if (!ssrfCheck.valid) {
    throw new Error(ssrfCheck.error || "Blocked restricted URL")
  }
  const targetUrl = ssrfCheck.normalizedUrl || url

  let page: Page | null = null
  let activeBrowser: Browser | null = null
  let isRemoteBrowser = false

  try {
    const conn = await getBrowser()
    activeBrowser = conn.browser
    isRemoteBrowser = conn.isRemote

    page = await activeBrowser.newPage()
    await page.setBypassCSP(true)
    await page.setViewport({ width: 1920, height: 1080 })

    // Intercept requests (including HTTP 301/302 redirects and sub-resources) to prevent SSRF
    await page.setRequestInterception(true)
    page.on("request", async (interceptedReq) => {
      const reqUrl = interceptedReq.url()
      if (reqUrl.startsWith("data:") || reqUrl.startsWith("blob:") || reqUrl === "about:blank") {
        interceptedReq.continue().catch(() => {})
        return
      }
      const check = await validateScanTargetUrl(reqUrl)
      if (!check.valid) {
        interceptedReq.abort("accessdenied").catch(() => {})
      } else {
        interceptedReq.continue().catch(() => {})
      }
    })

    // Set user agent to avoid bot detection
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, "userAgent", {
        get: () =>
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      })
    })

    await page.goto(targetUrl, {
      waitUntil: "domcontentloaded",
      timeout: 15000,
    })

    // Wait briefly for dynamic content
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // Inject axe-core from CDN
    await page.addScriptTag({
      url: "https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.12.0/axe.min.js",
    })

    // Run axe-core in the browser context
    const results = await page.evaluate(async () => {
      // @ts-expect-error - axe is injected globally
      return await axe.run()
    })

    interface AxeViolation {
      id: string
      impact: "minor" | "moderate" | "serious" | "critical" | null
      description: string
      help: string
      helpUrl: string
      tags: string[]
      nodes: AxeNode[]
    }

    interface AxeNode {
      html: string
      target: string[]
      failureSummary?: string
    }

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

    const mapIssue = (violation: AxeViolation): AccessibilityIssue => {
      const rawImpact = typeof violation?.impact === "string" ? violation.impact.toLowerCase() : "minor"
      const impact = (VALID_IMPACTS.has(rawImpact) ? rawImpact : "minor") as
        | "minor"
        | "moderate"
        | "serious"
        | "critical"
      const nodes = Array.isArray(violation?.nodes) ? violation.nodes.slice(0, 50) : []
      return {
        id: String(violation?.id || "unknown-rule").slice(0, 120),
        impact,
        description: String(violation?.description || "").slice(0, 1000),
        help: String(violation?.help || "").slice(0, 500),
        helpUrl: sanitizeHelpUrl(violation?.helpUrl),
        tags: Array.isArray(violation?.tags)
          ? violation.tags.slice(0, 30).map((t) => String(t).slice(0, 64))
          : [],
        nodes: nodes.map((node: AxeNode) => ({
          html: String(node?.html || "").slice(0, 4000),
          target: Array.isArray(node?.target)
            ? node.target.slice(0, 10).map((t) => String(t).slice(0, 250))
            : [],
          failureSummary: String(node?.failureSummary || "").slice(0, 1500),
        })),
      }
    }

    const rawViolations = Array.isArray(results?.violations) ? results.violations.slice(0, 200) : []
    const rawIncomplete = Array.isArray(results?.incomplete) ? results.incomplete.slice(0, 200) : []
    const passesCount = Array.isArray(results?.passes) ? results.passes.length : 0

    const violations: AccessibilityIssue[] = rawViolations.map(mapIssue)
    const incompleteItems: AccessibilityIssue[] = rawIncomplete.map(mapIssue)

    const summary = {
      critical: violations.filter((v) => v.impact === "critical").length,
      serious: violations.filter((v) => v.impact === "serious").length,
      moderate: violations.filter((v) => v.impact === "moderate").length,
      minor: violations.filter((v) => v.impact === "minor").length,
    }

    return {
      url: targetUrl,
      timestamp: new Date().toISOString(),
      violations,
      passes: passesCount,
      incomplete: incompleteItems.length,
      incompleteItems,
      summary,
    }
  } catch (error) {
    console.error("Puppeteer scan error:", error)
    throw new Error(
      `Failed to scan URL: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    )
  } finally {
    if (page) {
      await page.close().catch(() => {})
    }
    if (activeBrowser && isRemoteBrowser) {
      await activeBrowser.close().catch(() => {})
    }
  }
}

export async function closeBrowser(): Promise<void> {
  if (sharedBrowser) {
    await sharedBrowser.close().catch(() => {})
    sharedBrowser = null
  }
}
