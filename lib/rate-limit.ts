/**
 * In-memory sliding window rate limiter for public and sensitive API endpoints.
 * Thread-safe for single-instance Node runtime; handles IP and identity throttling.
 */

interface RateLimitEntry {
  count: number
  resetAt: number
}

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
 * Resolves client IP address from standard proxy headers.
 */
export function getClientIp(request: Request): string {
  const xForwardedFor = request.headers.get("x-forwarded-for")
  if (xForwardedFor) {
    const firstIp = xForwardedFor.split(",")[0].trim()
    if (firstIp) return firstIp
  }

  const cfConnectingIp = request.headers.get("cf-connecting-ip")
  if (cfConnectingIp) return cfConnectingIp.trim()

  const xRealIp = request.headers.get("x-real-ip")
  if (xRealIp) return xRealIp.trim()

  return "127.0.0.1"
}
