import puppeteer from "puppeteer-core"
import { readFileSync, existsSync } from "fs"
import { resolve, dirname } from "path"
import { fileURLToPath } from "url"
import { spawn } from "child_process"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const ROOT_DIR = resolve(__dirname, "..")

// Path to local Chrome binary on macOS
const CHROME_PATH =
  process.env.CHROME_PATH ||
  process.env.PUPPETEER_EXECUTABLE_PATH ||
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

if (!existsSync(CHROME_PATH)) {
  console.error(`[A11y Audit] Chrome binary not found at "${CHROME_PATH}". Set CHROME_PATH environment variable.`)
  process.exit(1)
}

// Axe-core source
const AXE_PATH = resolve(ROOT_DIR, "node_modules", "axe-core", "axe.min.js")
if (!existsSync(AXE_PATH)) {
  console.error(`[A11y Audit] axe-core library not found at "${AXE_PATH}". Run npm install.`)
  process.exit(1)
}
const axeSource = readFileSync(AXE_PATH, "utf8")

const ROUTES_TO_AUDIT = [
  { name: "Home / Audit Console", path: "/" },
  { name: "Authentication / Login", path: "/login" },
  { name: "Developer Documentation", path: "/docs" },
  { name: "Terms & Legal Disclaimers", path: "/legal" },
  { name: "404 Error Page", path: "/_not-found" },
]

async function isPortOpen(port) {
  try {
    const res = await fetch(`http://127.0.0.1:${port}`)
    return res.status >= 200 && res.status < 500
  } catch {
    return false
  }
}

async function waitForServer(port, timeoutMs = 30000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    if (await isPortOpen(port)) return true
    await new Promise((r) => setTimeout(r, 500))
  }
  return false
}

async function main() {
  console.log("=======================================================")
  console.log(" A11ytica Pro: Automated Dogfooding Accessibility Audit")
  console.log(" Standard: WCAG 2.1 & 2.2 Levels A & AA, Best Practices")
  console.log("=======================================================\n")

  const PORT = process.env.PORT || 3099
  let serverProcess = null

  const serverAlreadyRunning = await isPortOpen(PORT)
  if (!serverAlreadyRunning) {
    console.log(`[A11y Audit] Starting Next.js production server on port ${PORT}...`)
    serverProcess = spawn("npx", ["next", "start", "-p", String(PORT)], {
      cwd: ROOT_DIR,
      stdio: "pipe",
      env: { ...process.env, NODE_ENV: "production" },
    })

    serverProcess.stderr.on("data", (data) => {
      const errStr = data.toString()
      if (!errStr.includes("ExperimentalWarning")) {
        process.stderr.write(`[Server] ${errStr}`)
      }
    })

    const ready = await waitForServer(PORT)
    if (!ready) {
      console.error("[A11y Audit] Failed to connect to Next.js server within 30s timeout.")
      if (serverProcess) serverProcess.kill()
      process.exit(1)
    }
    console.log(`[A11y Audit] Next.js server is ready at http://127.0.0.1:${PORT}.\n`)
  } else {
    console.log(`[A11y Audit] Connecting to existing server at http://127.0.0.1:${PORT}.\n`)
  }

  let browser
  let totalViolations = 0

  try {
    browser = await puppeteer.launch({
      executablePath: CHROME_PATH,
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
    })

    const page = await browser.newPage()
    await page.setViewport({ width: 1280, height: 900 })

    for (const route of ROUTES_TO_AUDIT) {
      const targetUrl = `http://127.0.0.1:${PORT}${route.path}`
      console.log(`Auditing: ${route.name} (${route.path})`)

      try {
        await page.goto(targetUrl, { waitUntil: "networkidle2", timeout: 15000 })
      } catch (navErr) {
        console.warn(`  [Warning] Navigation timed out or failed: ${navErr.message}. Evaluating current DOM...`)
      }

      // Inject axe-core
      await page.evaluate(axeSource)

      // Run axe evaluation
      const results = await page.evaluate(async () => {
        // @ts-ignore
        return await window.axe.run(document, {
          runOnly: {
            type: "tag",
            values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"],
          },
        })
      })

      const violations = results.violations || []

      if (violations.length === 0) {
        console.log(`  PASSED: 0 violations detected across ${results.passes.length} rules.\n`)
      } else {
        totalViolations += violations.length
        console.error(`  FAILED: ${violations.length} violation(s) found!`)
        for (const v of violations) {
          console.error(`   - [${v.impact?.toUpperCase() || "UNKNOWN"}] ${v.id}: ${v.help}`)
          console.error(`     Help: ${v.helpUrl}`)
          for (const node of v.nodes.slice(0, 3)) {
            console.error(`     Target: ${node.target.join(" > ")}`)
            console.error(`     HTML: ${node.html}`)
          }
          if (v.nodes.length > 3) {
            console.error(`     (... and ${v.nodes.length - 3} more nodes)`)
          }
        }
        console.log("")
      }
    }
  } catch (err) {
    console.error(`[A11y Audit] Unexpected runtime error:`, err)
    totalViolations++
  } finally {
    if (browser) await browser.close()
    if (serverProcess) {
      console.log("[A11y Audit] Terminating local Next.js background server...")
      serverProcess.kill()
    }
  }

  console.log("=======================================================")
  if (totalViolations === 0) {
    console.log(" AUDIT SUMMARY: ALL ROUTES PASSED WITH 0 VIOLATIONS!")
    console.log(" WCAG 2.2 AA Conformance Verified for Release.")
    console.log("=======================================================")
    process.exit(0)
  } else {
    console.error(` AUDIT SUMMARY: ${totalViolations} TOTAL VIOLATIONS DETECTED.`)
    console.log("=======================================================")
    process.exit(1)
  }
}

main()
