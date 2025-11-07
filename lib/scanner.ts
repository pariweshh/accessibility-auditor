import { AccessibilityIssue, ScanResult } from "./types"
import puppeteer, { Browser, Page } from "puppeteer-core"
import chromium from "@sparticuz/chromium"

let browser: Browser | null = null

// Reuse browser instance for performance
async function getBrowser(): Promise<Browser> {
  // Different setup for local development vs production
  const isProduction = process.env.NODE_ENV === "production"

  if (isProduction) {
    // Don't reuse browser in serverless - create new instance each time
    // Configure chromium for serverless environment
    const browser = await puppeteer.launch({
      args: [
        ...chromium.args,
        "--disable-gpu",
        "--disable-dev-shm-usage",
        "--disable-setuid-sandbox",
        "--no-first-run",
        "--no-sandbox",
        "--no-zygote",
        "--single-process",
      ],
      defaultViewport: {
        width: 1920,
        height: 1080,
      },
      executablePath: await chromium.executablePath(
        "/tmp"
      ),
      headless: true,
    })
    return browser
  } else {
    // Reuse browser in local development
    if (browser) {
      return browser
    }

    const chromiumPath =
      process.env.CHROME_EXECUTABLE_PATH ||
      (process.platform === "win32"
        ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
        : process.platform === "darwin"
        ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
        : "/usr/bin/google-chrome")

    browser = await puppeteer.launch({
      executablePath: chromiumPath,
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
      ],
    })
    return browser
  }
}

export async function scanURL(url: string): Promise<ScanResult> {
  let page: Page | null = null
  let browser: Browser | null = null

  try {
    new URL(url)

    browser = await getBrowser()
    page = await browser.newPage()

    // set viewport for consistent results
    await page.setViewport({ width: 1920, height: 1080 })

    // Set user agent to avoid bot detection
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, "userAgent", {
        get: () =>
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      })
    })

    // set a reasonable timeout
    await page.goto(url, {
      waitUntil: "domcontentloaded", // Faster than 'networkidle2'
      timeout: 15000, // 15 seconds to stay within free tier limits
    })

    // Wait a bit for dynamic content
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // Inject axe-core from CDN (MORE RELIABLE)
    await page.addScriptTag({
      url: "https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.8.3/axe.min.js",
    })

    // run axe-core in the browser context
    const results = await page.evaluate(async () => {
      // @ts-expect-error - axe is injected globally
      return await axe.run()
    })

    // Type definitions for axe-core results
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

    // Process violations
    const violations: AccessibilityIssue[] = results.violations.map(
      (violation: AxeViolation) => ({
        id: violation.id,
        impact: (violation.impact || "minor") as
          | "minor"
          | "moderate"
          | "serious"
          | "critical",
        description: violation.description,
        help: violation.help,
        helpUrl: violation.helpUrl,
        tags: violation.tags,
        nodes: violation.nodes.map((node: AxeNode) => ({
          html: node.html,
          target: node.target,
          failureSummary: node.failureSummary || "",
        })),
      })
    )

    // Calculate summary
    const summary = {
      critical: violations.filter((v) => v.impact === "critical").length,
      serious: violations.filter((v) => v.impact === "serious").length,
      moderate: violations.filter((v) => v.impact === "moderate").length,
      minor: violations.filter((v) => v.impact === "minor").length,
    }

    return {
      url,
      timestamp: new Date().toISOString(),
      violations,
      passes: results.passes.length,
      incomplete: results.incomplete.length,
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
      await page.close()
    }
    // Close browser in production (serverless) to free resources
    if (browser && process.env.NODE_ENV === "production") {
      await browser.close()
    }
  }
}

// Clean up browser on shutdown
export async function closeBrowser(): Promise<void> {
  if (browser) {
    await browser.close()
    browser = null
  }
}
