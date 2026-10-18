/**
 * In-memory rate limiter for public and sensitive API endpoints.
 * Thread-safe for single-instance Node runtime; handles IP and identity throttling
 * with bounded memory protection.
 */

interface RateLimitEntry {
  count: number
  resetAt: number
}

const MAX_STORE_SIZE = 10_000

// Global in-memory storage for active rate limit windows
const rateLimitStore = new Map<string, RateLimitEntry>()

// Periodic sweep every 60 seconds to purge expired windows and prevent memory leakage.
// We call unref() so this background interval does not block Node processes from exiting.
if (typeof setInterval !== "undefined") {
  const cleanupInterval = setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of rateLimitStore.entries()) {
      if (now > entry.resetAt) {
        rateLimitStore.delete(key)
      }
    }
  }, 60 * 1000)

  if (cleanupInterval.unref) {
    cleanupInterval.unref()
  }
}

export interface RateLimitOptions {
  key: string
  limit: number
  windowMs: number
}

export interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  resetMs: number
  resetSeconds: number
}

/**
 * Checks and increments the rate limit count for a given key.
 */
export function checkRateLimit({ key, limit, windowMs }: RateLimitOptions): RateLimitResult {
  const now = Date.now()
  const entry = rateLimitStore.get(key)

  if (!entry || now > entry.resetAt) {
    // Evict expired or oldest entry if map reaches capacity to prevent OOM
    if (!entry && rateLimitStore.size >= MAX_STORE_SIZE) {
      for (const [k, v] of rateLimitStore.entries()) {
        if (now > v.resetAt) {
          rateLimitStore.delete(k)
        }
      }
      if (rateLimitStore.size >= MAX_STORE_SIZE) {
        const oldestKey = rateLimitStore.keys().next().value
        if (oldestKey !== undefined) {
          rateLimitStore.delete(oldestKey)
        }
      }
    }

    const resetAt = now + windowMs
    rateLimitStore.set(key, { count: 1, resetAt })
    return {
      success: true,
      limit,
      remaining: Math.max(0, limit - 1),
      resetMs: windowMs,
      resetSeconds: Math.ceil(windowMs / 1000),
    }
  }

  if (entry.count >= limit) {
    const resetMs = Math.max(0, entry.resetAt - now)
    return {
      success: false,
      limit,
      remaining: 0,
      resetMs,
      resetSeconds: Math.ceil(resetMs / 1000),
    }
  }

  entry.count += 1
  const resetMs = Math.max(0, entry.resetAt - now)
  return {
    success: true,
    limit,
    remaining: Math.max(0, limit - entry.count),
    resetMs,
    resetSeconds: Math.ceil(resetMs / 1000),
  }
}

/**
 * Resets a specific key (primarily used for test teardown).
 */
export function resetRateLimitKey(key: string): void {
  rateLimitStore.delete(key)
}

/**
 * Clears all rate limit state (primarily used for test suites).
 */
export function clearRateLimitStore(): void {
  rateLimitStore.clear()
}

/**
 * Resolves client IP address from trusted platform proxy headers first
 * to prevent trivial leftmost X-Forwarded-For spoofing.
 */
export function getClientIp(request: Request): string {
  // 1. Prefer Vercel / Cloudflare / trusted edge platform headers
  const vercelIp = request.headers.get("x-vercel-forwarded-for")
  if (vercelIp) {
    const ip = vercelIp.split(",")[0].trim()
    if (ip) return ip.slice(0, 64)
  }

  const cfConnectingIp = request.headers.get("cf-connecting-ip")
  if (cfConnectingIp && cfConnectingIp.trim()) {
    return cfConnectingIp.trim().slice(0, 64)
  }

  const xRealIp = request.headers.get("x-real-ip")
  if (xRealIp && xRealIp.trim()) {
    return xRealIp.trim().slice(0, 64)
  }

  // 2. Fallback to rightmost hop of X-Forwarded-For (appended by reverse proxy)
  const xForwardedFor = request.headers.get("x-forwarded-for")
  if (xForwardedFor) {
    const hops = xForwardedFor
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
    const trustedHop = hops[hops.length - 1]
    if (trustedHop) return trustedHop.slice(0, 64)
  }

  return "127.0.0.1"
}
