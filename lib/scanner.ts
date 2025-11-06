import { AccessibilityIssue, ScanResult } from "./types"
import puppeteer, { Browser, Page } from "puppeteer"

let browser: Browser | null = null

// Reuse browser instance for performance
async function getBrowser(): Promise<Browser> {
  if (!browser) {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
      ],
    })
  }
  return browser
}

export async function scanURL(url: string): Promise<ScanResult> {
  let page: Page | null = null

  try {
    new URL(url)

    const browser = await getBrowser()
    page = await browser.newPage()

    // set viewport for consistent results
    await page.setViewport({ width: 1920, height: 1080 })

    // set a reasonable timeout
    await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 })

    // inject axe-core into the page
    await page.addScriptTag({
      path: require.resolve("axe-core"),
    })

    // run axe-core in the browser context
    const results = await page.evaluate(async () => {
      // @ts-ignore - axe is injected globally
      return await axe.run()
    })

    // Process violations
    const violations: AccessibilityIssue[] = results.violations.map(
      (violation: any) => ({
        id: violation.id,
        impact: violation.impact as
          | "minor"
          | "moderate"
          | "serious"
          | "critical",
        description: violation.description,
        help: violation.help,
        helpUrl: violation.helpUrl,
        tags: violation.tags,
        nodes: violation.nodes.map((node: any) => ({
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
  }
}

// Clean up browser on shutdown
export async function closeBrowser(): Promise<void> {
  if (browser) {
    await browser.close()
    browser = null
  }
}
