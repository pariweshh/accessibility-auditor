/**
 * Safely sanitizes and validates an internal redirect path.
 * Strictly prevents Open Redirect vulnerabilities (CWE-601) by ensuring
 * the destination is exclusively an internal path on the same origin.
 *
 * Prevents protocol-relative URLs (//evil.com), backslash evasion (/\\evil.com),
 * external schemes (https://, javascript:, data:), and control character bypasses.
 *
 * @param path The untrusted target path or URL string.
 * @param defaultPath The safe fallback if the path is invalid (default: "/dashboard").
 * @returns A guaranteed safe relative path string beginning with a single '/'.
 */
export function getSafeRedirectUrl(
  path: string | null | undefined,
  defaultPath = "/dashboard"
): string {
  if (!path || typeof path !== "string") {
    return defaultPath
  }

  // Remove leading/trailing whitespace, tabs, and ASCII control characters
  const trimmed = path.trim().replace(/[\u0000-\u001F\u007F-\u009F]/g, "")

  // Must begin with a single '/' and not with '//', '/\', or '\'
  if (!trimmed.startsWith("/") || trimmed.startsWith("//") || trimmed.startsWith("/\\")) {
    return defaultPath
  }

  try {
    // Attempt parsing against a fixed internal origin
    const parsed = new URL(trimmed, "http://localhost")

    // If parsing altered the origin, reject
    if (parsed.origin !== "http://localhost") {
      return defaultPath
    }

    // Ensure pathname still starts with a single '/' and not multiple slashes
    if (!parsed.pathname.startsWith("/") || parsed.pathname.startsWith("//")) {
      return defaultPath
    }

    // Reconstruct the path strictly from pathname + search + hash
    // This strips any userinfo (@), hostname, or external protocol injection
    return `${parsed.pathname}${parsed.search}${parsed.hash}`
  } catch {
    return defaultPath
  }
}
