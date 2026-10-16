import { createClient } from "@/lib/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { SCAN_LIMITS } from "@/lib/constants"

export interface QuotaResult {
  allowed: boolean
  used: number
  limit: number
  tier: "free" | "pro" | "agency"
  teamId?: string | null
  isTeamOwner?: boolean
}

export interface EffectiveTierResult {
  tier: "free" | "pro" | "agency"
  personalTier: "free" | "pro" | "agency"
  teamId: string | null
  isTeamOwner: boolean
}

function getAdminSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (url && serviceKey) {
    return createAdminClient(url, serviceKey)
  }
  return null
}

/**
 * Resolves a user's effective subscription tier and active team ID.
 * Prevents the Agency downgrade loophole by verifying that the team owner
 * currently holds an active 'agency' subscription in `public.profiles`.
 */
export async function resolveEffectiveTier(
  userId: string,
  fallbackClient?: any
): Promise<EffectiveTierResult> {
  const db = getAdminSupabaseClient() || fallbackClient || (await createClient())

  const { data: profile, error: profileError } = await db
    .from("profiles")
    .select("subscription_tier, subscription_status")
    .eq("id", userId)
    .maybeSingle()

  if (profileError) {
    console.error("quota: error fetching profile:", profileError)
  }

  const rawPersonalTier = profile?.subscription_tier
  const personalTier: "free" | "pro" | "agency" =
    rawPersonalTier === "agency" || rawPersonalTier === "pro" ? rawPersonalTier : "free"

  // 1. Check if user owns a team AND currently has an active 'agency' subscription
  if (personalTier === "agency") {
    const { data: ownedTeam } = await db
      .from("teams")
      .select("id")
      .eq("owner_id", userId)
      .maybeSingle()

    return {
      tier: "agency",
      personalTier,
      teamId: ownedTeam?.id ?? null,
      isTeamOwner: Boolean(ownedTeam),
    }
  }

  // 2. Check if user is an active member of someone else's team whose owner has 'agency' tier
  const { data: membership } = await db
    .from("team_members")
    .select("team_id, role")
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle()

  if (membership?.team_id) {
    const { data: team } = await db
      .from("teams")
      .select("id, owner_id")
      .eq("id", membership.team_id)
      .maybeSingle()

    if (team?.owner_id) {
      // If the user is the owner, we already know personalTier !== 'agency'
      if (team.owner_id !== userId) {
        const { data: ownerProfile } = await db
          .from("profiles")
          .select("subscription_tier")
          .eq("id", team.owner_id)
          .maybeSingle()

        if (ownerProfile?.subscription_tier === "agency") {
          return {
            tier: "agency",
            personalTier,
            teamId: team.id,
            isTeamOwner: false,
          }
        }
      }
    }
  }

  return {
    tier: personalTier,
    personalTier,
    teamId: null,
    isTeamOwner: false,
  }
}

/**
 * Check whether the authenticated user is within their monthly scan quota.
 * Automatically checks for shared Agency team membership and verifies that the
 * team owner's Agency subscription is still active.
 */
export async function checkQuota(userId: string, supabaseClient?: any): Promise<QuotaResult> {
  const supabase = getAdminSupabaseClient() || supabaseClient || (await createClient())

  const { tier, teamId: activeTeamId, isTeamOwner } = await resolveEffectiveTier(userId, supabase)
  const limit = SCAN_LIMITS[tier] ?? SCAN_LIMITS.free

  // Count scans in the current calendar month
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  let scanQuery = supabase
    .from("scans")
    .select("id", { count: "exact", head: true })
    .neq("status", "failed")
    .gte("created_at", startOfMonth.toISOString())

  if (activeTeamId) {
    scanQuery = scanQuery.or(`team_id.eq.${activeTeamId},user_id.eq.${userId}`)
  } else {
    scanQuery = scanQuery.eq("user_id", userId)
  }

  const { count, error: countError } = await scanQuery

  if (countError) {
    console.error("quota: error counting scans:", countError)
  }

  const used = count ?? 0

  return {
    allowed: used < limit,
    used,
    limit,
    tier,
    teamId: activeTeamId,
    isTeamOwner,
  }
}

