/**
 * Monthly scan limits per subscription tier.
 * Kept in a separate file so both client and server code can import it
 * without pulling in server-only modules (next/headers, etc.)
 */
export const SCAN_LIMITS: Record<string, number> = {
  free: 5,
  pro: 200,
  agency: 1000,
}
