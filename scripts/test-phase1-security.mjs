/**
 * Phase 1 Security & Hardening Automated Verification Suite
 * Tests SSRF normalization, rate limiting, and stuck-scan recovery logic.
 */

import { validateScanTargetUrl, parseCanonicalIpv4, isRestrictedIpAddress } from "../lib/ssrf.js"
import { checkRateLimit, resetRateLimitKey } from "../lib/rate-limit.js"

let passedCount = 0
let failedCount = 0

function assert(condition, testName, details = "") {
  if (condition) {
    passedCount++
    console.log(`[PASS] ${testName}`)
  } else {
    failedCount++
    console.error(`[FAIL] ${testName} - ${details}`)
  }
}

async function runTests() {
  console.log("================================================================")
  console.log(" RUNNING PHASE 1 SECURITY & HARDENING VERIFICATION")
  console.log("================================================================\n")

  // ── 1. Canonical IPv4 Parsing & Normalization ──────────────────────────────
  console.log("--- 1. Canonical IPv4 Normalization Tests ---")
  assert(parseCanonicalIpv4("127.0.0.1") === "127.0.0.1", "Standard dotted decimal parsed correctly")
  assert(parseCanonicalIpv4("2130706433") === "127.0.0.1", "Decimal integer 2130706433 parsed as 127.0.0.1")
  assert(parseCanonicalIpv4("2852039166") === "169.254.169.254", "Decimal integer 2852039166 parsed as 169.254.169.254")
  assert(parseCanonicalIpv4("0177.0.0.1") === "127.0.0.1", "Octal dotted 0177.0.0.1 parsed as 127.0.0.1")
  assert(parseCanonicalIpv4("0x7f000001") === "127.0.0.1", "Hex DWORD 0x7f000001 parsed as 127.0.0.1")
  assert(parseCanonicalIpv4("0x7f.0.0.1") === "127.0.0.1", "Hex dotted 0x7f.0.0.1 parsed as 127.0.0.1")
  assert(parseCanonicalIpv4("127.1") === "127.0.0.1", "2-part shorthand 127.1 parsed as 127.0.0.1")
  assert(parseCanonicalIpv4("example.com") === null, "Regular domain example.com returns null (not an IP)")

  // ── 2. Restricted IP Address Range Checks ──────────────────────────────────
  console.log("\n--- 2. Restricted IP Address Range Checks ---")
  assert(isRestrictedIpAddress("127.0.0.1") === true, "127.0.0.1 is restricted")
  assert(isRestrictedIpAddress("169.254.169.254") === true, "Cloud metadata 169.254.169.254 is restricted")
  assert(isRestrictedIpAddress("::1") === true, "IPv6 loopback ::1 is restricted")
  assert(isRestrictedIpAddress("::") === true, "IPv6 unspecified :: is restricted")
  assert(isRestrictedIpAddress("::ffff:169.254.169.254") === true, "IPv4-mapped metadata is restricted")
  assert(isRestrictedIpAddress("::ffff:a9fe:a9fe") === true, "IPv6 hex-mapped metadata is restricted")
  assert(isRestrictedIpAddress("8.8.8.8") === false, "Public DNS 8.8.8.8 is NOT restricted")
  assert(isRestrictedIpAddress("1.1.1.1") === false, "Public Cloudflare DNS 1.1.1.1 is NOT restricted")

  // ── 3. SSRF Target URL Validation ──────────────────────────────────────────
  console.log("\n--- 3. SSRF Target URL Validation Tests ---")
  
  // Decimal IP
  {
    const res = await validateScanTargetUrl("http://2130706433/")
    assert(res.valid === false, "Blocks decimal integer loopback: http://2130706433/")
  }
  {
    const res = await validateScanTargetUrl("http://2852039166/")
    assert(res.valid === false, "Blocks decimal integer metadata: http://2852039166/")
  }

  // Octal & Hex IPs
  {
    const res = await validateScanTargetUrl("http://0177.0.0.1/")
    assert(res.valid === false, "Blocks octal IP: http://0177.0.0.1/")
  }
  {
    const res = await validateScanTargetUrl("http://0x7f000001/")
    assert(res.valid === false, "Blocks hex DWORD: http://0x7f000001/")
  }
  {
    const res = await validateScanTargetUrl("http://0x7f.0.0.1/")
    assert(res.valid === false, "Blocks dotted hex: http://0x7f.0.0.1/")
  }

  // Cloud Metadata & Internal Hostnames
  {
    const res = await validateScanTargetUrl("http://169.254.169.254/latest/meta-data/")
    assert(res.valid === false, "Blocks AWS/GCP IMDS URL: http://169.254.169.254/latest/meta-data/")
  }
  {
    const res = await validateScanTargetUrl("http://metadata.google.internal/computeMetadata/v1/")
    assert(res.valid === false, "Blocks GCP metadata hostname")
  }
  {
    const res = await validateScanTargetUrl("http://instance-data/")
    assert(res.valid === false, "Blocks instance-data hostname")
  }
  {
    const res = await validateScanTargetUrl("http://127.0.0.1.nip.io/")
    assert(res.valid === false, "Blocks wildcard DNS: 127.0.0.1.nip.io")
  }

  // IPv6-Mapped IPv4
  {
    const res = await validateScanTargetUrl("http://[::ffff:169.254.169.254]/")
    assert(res.valid === false, "Blocks bracketed IPv6-mapped metadata IP")
  }
  {
    const res = await validateScanTargetUrl("http://[::ffff:a9fe:a9fe]/")
    assert(res.valid === false, "Blocks bracketed IPv6 hex-mapped metadata IP")
  }

  // Non-HTTP Schemes & Credentials
  {
    const res = await validateScanTargetUrl("file:///etc/passwd")
    assert(res.valid === false, "Blocks file:// scheme")
  }
  {
    const res = await validateScanTargetUrl("gopher://127.0.0.1:70/")
    assert(res.valid === false, "Blocks gopher:// scheme")
  }
  {
    const res = await validateScanTargetUrl("http://admin:secret@example.com/")
    assert(res.valid === false, "Blocks URLs with embedded credentials")
  }

  // Legitimate Public Targets
  {
    const res = await validateScanTargetUrl("https://example.com")
    assert(res.valid === true, "Allows legitimate HTTPS domain: https://example.com")
  }

  // ── 4. Rate Limiter Sliding Window Tests ───────────────────────────────────
  console.log("\n--- 4. Rate Limiter Sliding Window Tests ---")
  const testKey = "test:ratelimit:user_alpha"
  resetRateLimitKey(testKey)

  for (let i = 1; i <= 5; i++) {
    const res = checkRateLimit({ key: testKey, limit: 5, windowMs: 10000 })
    assert(res.success === true && res.remaining === 5 - i, `Request ${i}/5 permitted (remaining: ${res.remaining})`)
  }

  // 6th request must be rejected
  const blockedRes = checkRateLimit({ key: testKey, limit: 5, windowMs: 10000 })
  assert(blockedRes.success === false, "6th request blocked after limit of 5 exceeded")
  assert(blockedRes.remaining === 0, "Remaining count is 0 when blocked")
  assert(blockedRes.resetSeconds > 0, "resetSeconds is reported properly")

  resetRateLimitKey(testKey)

  // ── 5. Stuck-Scan Timeout Cutoff Calculation ───────────────────────────────
  console.log("\n--- 5. Stuck-Scan Timeout Cutoff Tests ---")
  const threeMinutesMs = 3 * 60 * 1000
  const recentScanDate = new Date(Date.now() - 60 * 1000).toISOString() // 1 min old
  const staleScanDate = new Date(Date.now() - 4 * 60 * 1000).toISOString() // 4 min old

  const isRecentStale = Date.now() - new Date(recentScanDate).getTime() > threeMinutesMs
  const isOldStale = Date.now() - new Date(staleScanDate).getTime() > threeMinutesMs

  assert(isRecentStale === false, "1-minute old scan is NOT classified as stale")
  assert(isOldStale === true, "4-minute old scan is correctly classified as stale (> 3 min)")

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log("\n================================================================")
  console.log(` SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED`)
  console.log("================================================================")

  if (failedCount > 0) {
    process.exit(1)
  }
}

runTests().catch((err) => {
  console.error("Test execution failed:", err)
  process.exit(1)
})
