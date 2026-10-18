import dns from "dns"
import net from "net"

export interface SsrfValidationResult {
  valid: boolean
  error?: string
  normalizedUrl?: string
}

const BLOCKED_EXACT_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
  "[::1]",
  "::",
  "[::]",
  "169.254.169.254", // AWS/GCP/Azure instance metadata (IMDS)
  "100.100.100.200", // Alibaba Cloud IMDS
  "192.0.0.192",     // Oracle Cloud IMDS
  "fd00:ec2::254",   // AWS IPv6 IMDS
  "[fd00:ec2::254]",
  "metadata.google.internal", // GCP internal metadata hostname
  "metadata.google",
  "metadata",
  "instance-data",
  "kubernetes.default",
  "kubernetes.default.svc",
])

const BLOCKED_HOST_SUFFIXES = [
  ".localhost",
  ".local",
  ".internal",
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

/**
 * Parses numeric IPv4 representations in standard dotted decimal, octal, hex,
 * or 32-bit DWORD integer format (RFC 791 / inet_aton style).
 * Returns canonical dotted decimal "a.b.c.d" or null if not a numeric IPv4.
 */
export function parseCanonicalIpv4(host: string): string | null {
  const clean = host.trim().toLowerCase().replace(/^\[|\]$/g, "").replace(/\.+$/, "")
  if (!clean || clean.includes(":") || clean.includes("/") || clean.includes(" ")) {
    return null
  }

  const parts = clean.split(".")
  if (parts.length < 1 || parts.length > 4) {
    return null
  }

  // Parse each part according to hex (0x...), octal (0...), or decimal
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
    // Single DWORD (32-bit integer: 0 to 4294967295)
    if (parsedParts[0] > 0xffffffff) return null
    num = parsedParts[0]
  } else if (parsedParts.length === 2) {
    // A.B (A: 8 bits, B: 24 bits)
    if (parsedParts[0] > 0xff || parsedParts[1] > 0xffffff) return null
    num = parsedParts[0] * 0x1000000 + parsedParts[1]
  } else if (parsedParts.length === 3) {
    // A.B.C (A: 8 bits, B: 8 bits, C: 16 bits)
    if (parsedParts[0] > 0xff || parsedParts[1] > 0xff || parsedParts[2] > 0xffff) return null
    num = parsedParts[0] * 0x1000000 + parsedParts[1] * 0x10000 + parsedParts[2]
  } else if (parsedParts.length === 4) {
    // A.B.C.D (each 8 bits: 0 to 255)
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

/**
 * Checks whether a numeric IPv4 or IPv6 address string belongs to a loopback,
 * link-local, cloud metadata, unspecified, or private network range.
 */
export function isRestrictedIpAddress(ip: string, allowPrivateLanInDev: boolean = false): boolean {
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

  // Handle IPv4-mapped IPv6 addresses (e.g. ::ffff:127.0.0.1, ::ffff:2130706433, ::ffff:a9fe:a9fe, 0:0:0:0:0:ffff:...)
  const mappedPrefixMatch = cleanIp.match(/^(?:::ffff:|(?:0+:){5}ffff:)(.+)$/)
  if (mappedPrefixMatch) {
    const mappedPart = mappedPrefixMatch[1]
    const canonical = parseCanonicalIpv4(mappedPart)
    if (canonical) {
      return isRestrictedIpAddress(canonical, allowPrivateLanInDev)
    }
    // Hex-encoded IPv4-mapped IPv6 (e.g. ::ffff:a9fe:a9fe)
    const hexMatch = mappedPart.match(/^([0-9a-f]{1,4}):([0-9a-f]{1,4})$/)
    if (hexMatch) {
      const high = parseInt(hexMatch[1], 16)
      const low = parseInt(hexMatch[2], 16)
      const ipv4 = `${(high >> 8) & 0xff}.${high & 0xff}.${(low >> 8) & 0xff}.${low & 0xff}`
      return isRestrictedIpAddress(ipv4, allowPrivateLanInDev)
    }
  }

  // Canonicalize any numeric IPv4 format (decimal dotted quad, integer, octal, hex)
  const canonicalIpv4 = parseCanonicalIpv4(cleanIp)
  if (canonicalIpv4) {
    const parts = canonicalIpv4.split(".").map((n) => parseInt(n, 10))
    const [a, b, c, d] = parts

    // Always block loopback (127.0.0.0/8), unspecified (0.0.0.0/8), and link-local/IMDS (169.254.0.0/16)
    if (a === 127 || a === 0 || (a === 169 && b === 254)) {
      return true
    }

    // Always block Alibaba IMDS (100.100.100.200) and Oracle IMDS / IETF Protocol Assignments (192.0.0.0/24)
    if (
      (a === 100 && b === 100 && c === 100 && d === 200) ||
      (a === 192 && b === 0 && (c === 0 || c === 2)) ||
      (a === 198 && (b === 18 || b === 19)) ||
      (a === 198 && b === 51 && c === 100) ||
      (a === 203 && b === 0 && c === 113)
    ) {
      return true
    }

    // Block multicast/reserved (224.0.0.0/4 and 240.0.0.0/4) and broadcast (255.255.255.255)
    if (a >= 224) {
      return true
    }

    // Block RFC 1918 private IPs and CGNAT (100.64.0.0/10) unless explicitly allowed in local dev
    if (!allowPrivateLanInDev) {
      if (
        a === 10 ||
        (a === 172 && b >= 16 && b <= 31) ||
        (a === 192 && b === 168) ||
        (a === 100 && b >= 64 && b <= 127)
      ) {
        return true
      }
    }

    return false
  }

  if (net.isIPv6(cleanIp)) {
    // Loopback (::1), unspecified (::), or AWS IPv6 IMDS (fd00:ec2::254)
    if (
      cleanIp === "::1" ||
      cleanIp === "::" ||
      cleanIp === "0:0:0:0:0:0:0:1" ||
      cleanIp === "0:0:0:0:0:0:0:0" ||
      cleanIp === "fd00:ec2::254" ||
      cleanIp === "fd00:ec2:0:0:0:0:0:254"
    ) {
      return true
    }
    // IPv6 Link-local (fe80::/10), NAT64 (64:ff9b::/96), 6to4 (2002::/16), Teredo (2001:0::/32),
    // Documentation (2001:db8::/32), Benchmarking (2001:2::/48), Discard-Only (100::/64)
    if (
      cleanIp.startsWith("fe8") ||
      cleanIp.startsWith("fe9") ||
      cleanIp.startsWith("fea") ||
      cleanIp.startsWith("feb") ||
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
    // IPv6 Unique Local Addresses (fc00::/7) and Multicast (ff00::/8)
    if (!allowPrivateLanInDev && (cleanIp.startsWith("fc") || cleanIp.startsWith("fd"))) {
      return true
    }
    if (cleanIp.startsWith("ff")) {
      return true
    }
    return false
  }

  return false
}

/**
 * Validates a target URL against SSRF, non-web schemes, cloud metadata endpoints,
 * integer/octal IP encodings, and DNS rebinding attacks.
 */
export async function validateScanTargetUrl(rawUrl: string): Promise<SsrfValidationResult> {
  if (!rawUrl || typeof rawUrl !== "string") {
    return { valid: false, error: "URL is required" }
  }

  let urlObj: URL
  try {
    urlObj = new URL(rawUrl.trim())
  } catch {
    return { valid: false, error: "Invalid URL format" }
  }

  // 1. Enforce HTTP / HTTPS protocol only
  if (urlObj.protocol !== "http:" && urlObj.protocol !== "https:") {
    return {
      valid: false,
      error: "Only http:// and https:// URLs are permitted for scanning.",
    }
  }

  // 2. Reject embedded credentials in URL (e.g. http://admin:pass@internal/)
  if (urlObj.username || urlObj.password) {
    return {
      valid: false,
      error: "URLs containing embedded credentials are not permitted.",
    }
  }

  const hostname = urlObj.hostname.toLowerCase()
  const cleanHost = hostname.replace(/^\[|\]$/g, "").replace(/\.+$/, "")
  if (!cleanHost) {
    return { valid: false, error: "Invalid URL hostname" }
  }
  const allowPrivateLanInDev = process.env.NODE_ENV !== "production"

  // 3. Block exact hostnames and internal domain suffixes
  if (
    BLOCKED_EXACT_HOSTS.has(hostname) ||
    BLOCKED_EXACT_HOSTS.has(cleanHost) ||
    BLOCKED_HOST_SUFFIXES.some((suffix) => cleanHost.endsWith(suffix))
  ) {
    return {
      valid: false,
      error: "Cannot scan internal, local, or cloud infrastructure URLs.",
    }
  }

  // 4. Check canonical IPv4 representations (decimal, octal, hex, DWORD, shorthand)
  const canonicalIpv4 = parseCanonicalIpv4(cleanHost)
  if (canonicalIpv4) {
    if (isRestrictedIpAddress(canonicalIpv4, allowPrivateLanInDev)) {
      return {
        valid: false,
        error: "Cannot scan internal, local, or cloud infrastructure URLs.",
      }
    }
    return { valid: true, normalizedUrl: urlObj.toString() }
  }

  // 5. Check IPv6 or IPv4-mapped IPv6 literals
  if (net.isIPv6(cleanHost) || cleanHost.startsWith("::ffff:") || cleanHost.includes(":")) {
    if (isRestrictedIpAddress(cleanHost, allowPrivateLanInDev)) {
      return {
        valid: false,
        error: "Cannot scan internal, local, or cloud infrastructure URLs.",
      }
    }
    return { valid: true, normalizedUrl: urlObj.toString() }
  }

  // 6. Check legacy string prefixes for private IPs even before DNS resolution
  const isLinkLocalPrefix = cleanHost.startsWith("169.254.") || cleanHost.startsWith("fe80:")
  const isPrivatePrefix =
    cleanHost.startsWith("192.168.") ||
    cleanHost.startsWith("10.") ||
    /^172\.(1[6-9]|2[0-9]|3[01])\./.test(cleanHost)

  if (isLinkLocalPrefix || (!allowPrivateLanInDev && isPrivatePrefix)) {
    return {
      valid: false,
      error: "Cannot scan internal, local, or cloud infrastructure URLs.",
    }
  }

  // 7. Resolve DNS records to defend against wildcard DNS / DNS rebinding (e.g. 127.0.0.1.nip.io)
  try {
    const records = await dns.promises.lookup(cleanHost, { all: true })
    if (!records || records.length === 0) {
      return {
        valid: false,
        error: "Target domain could not be resolved.",
      }
    }
    for (const record of records) {
      // Always block loopback and link-local/IMDS even in dev when resolved via external hostname
      if (isRestrictedIpAddress(record.address, false)) {
        return {
          valid: false,
          error: "Target domain resolves to a restricted internal or cloud metadata IP address.",
        }
      }
    }
  } catch {
    // Fail closed if hostname cannot be resolved in DNS
    return {
      valid: false,
      error: "Invalid or unresolvable target hostname.",
    }
  }

  return { valid: true, normalizedUrl: urlObj.toString() }
}
