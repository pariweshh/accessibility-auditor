import { createClient } from "@/lib/supabase/server"
import { SCAN_LIMITS } from "@/lib/constants"

export interface QuotaResult {
  allowed: boolean
  used: number
  limit: number
  tier: string
}

/**
 * Check whether the authenticated user is within their monthly scan quota.
 * Returns quota details so the caller can surface them in the UI or API response.
 */
export async function checkQuota(userId: string): Promise<QuotaResult> {
  const supabase = await createClient()

  // Fetch the user's subscription tier
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("subscription_tier")
    .eq("id", userId)
    .single()

  const tier = profile?.subscription_tier ?? "free"
  const limit = SCAN_LIMITS[tier] ?? SCAN_LIMITS.free

  // Count scans in the current calendar month
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const { count, error: countError } = await supabase
    .from("scans")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", startOfMonth.toISOString())

  if (profileError) {
    console.error("quota: error fetching profile:", profileError)
  }
  if (countError) {
    console.error("quota: error counting scans:", countError)
  }

  const used = count ?? 0

  return {
    allowed: used < limit,
    used,
    limit,
    tier,
  }
}
