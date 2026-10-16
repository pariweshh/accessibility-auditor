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
  "metadata.google.internal", // GCP internal metadata hostname
  "metadata.google",
  "instance-data",
])

const BLOCKED_HOST_SUFFIXES = [
  ".localhost",
  ".local",
  ".internal",
  ".NIP.IO",
  ".nip.io",
  ".sslip.io",
  ".xip.io",
]

/**
 * Checks whether a numeric IPv4 or IPv6 address string belongs to a loopback,
 * link-local, cloud metadata, unspecified, or private network range.
 */
export function isRestrictedIpAddress(ip: string, allowPrivateLanInDev: boolean = false): boolean {
  const cleanIp = ip.replace(/^\[|\]$/g, "").toLowerCase()

  // Handle IPv4-mapped IPv6 addresses (e.g. ::ffff:127.0.0.1 or ::ffff:169.254.169.254)
  if (cleanIp.startsWith("::ffff:")) {
    const mappedPart = cleanIp.slice(7)
    if (net.isIPv4(mappedPart)) {
      return isRestrictedIpAddress(mappedPart, allowPrivateLanInDev)
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

  if (net.isIPv4(cleanIp)) {
    const parts = cleanIp.split(".").map((n) => parseInt(n, 10))
    const [a, b] = parts

    // Always block loopback (127.0.0.0/8), unspecified (0.0.0.0/8), and link-local/IMDS (169.254.0.0/16)
    if (a === 127 || a === 0 || (a === 169 && b === 254)) {
      return true
    }

    // Block multicast/reserved (224.0.0.0/4 and 240.0.0.0/4)
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
    // Loopback (::1) or unspecified (::)
    if (cleanIp === "::1" || cleanIp === "::" || cleanIp === "0:0:0:0:0:0:0:1" || cleanIp === "0:0:0:0:0:0:0:0") {
      return true
    }
    // IPv6 Link-local (fe80::/10)
    if (cleanIp.startsWith("fe8") || cleanIp.startsWith("fe9") || cleanIp.startsWith("fea") || cleanIp.startsWith("feb")) {
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
  const cleanHost = hostname.replace(/^\[|\]$/g, "")
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

  // 4. Reject integer/decimal/hex/octal encoded IP hostnames (e.g. http://2130706433 or http://0x7f000001)
  if (/^(0x[0-9a-f]+|\d+)$/i.test(cleanHost)) {
    return {
      valid: false,
      error: "Cannot scan internal, local, or cloud infrastructure URLs.",
    }
  }

  // 5. Check direct IPv4 / IPv6 literals
  if (net.isIP(cleanHost)) {
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
    // If DNS lookup fails transiently in restricted sandbox environments, allow only if hostname is a valid public domain format
    if (!cleanHost.includes(".")) {
      return {
        valid: false,
        error: "Invalid or unresolvable hostname.",
      }
    }
  }

  return { valid: true, normalizedUrl: urlObj.toString() }
}
