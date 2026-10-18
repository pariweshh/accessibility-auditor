import { createClient } from "@/lib/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { SCAN_LIMITS } from "@/lib/constants"

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const ACTIVE_SUBSCRIPTION_STATUSES = new Set(["active", "trialing"])

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

function isSubscriptionActive(status: unknown): boolean {
  if (typeof status !== "string") return false
  return ACTIVE_SUBSCRIPTION_STATUSES.has(status.toLowerCase())
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
  if (!userId || !UUID_REGEX.test(userId)) {
    return {
      tier: "free",
      personalTier: "free",
      teamId: null,
      isTeamOwner: false,
    }
  }

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
  const hasActivePaidSub = isSubscriptionActive(profile?.subscription_status)
  const personalTier: "free" | "pro" | "agency" =
    hasActivePaidSub && (rawPersonalTier === "agency" || rawPersonalTier === "pro")
      ? rawPersonalTier
      : "free"

  // 1. Check if user owns a team AND currently has an active 'agency' subscription
  if (personalTier === "agency") {
    const { data: ownedTeams } = await db
      .from("teams")
      .select("id")
      .eq("owner_id", userId)
      .limit(1)

    const ownedTeam = ownedTeams?.[0] ?? null

    return {
      tier: "agency",
      personalTier,
      teamId: ownedTeam?.id ?? null,
      isTeamOwner: Boolean(ownedTeam),
    }
  }

  // 2. Check if user is an active member of someone else's team whose owner has an active 'agency' tier
  const { data: memberships } = await db
    .from("team_members")
    .select("team_id, role")
    .eq("user_id", userId)
    .eq("status", "active")

  if (Array.isArray(memberships) && memberships.length > 0) {
    for (const membership of memberships) {
      if (!membership?.team_id || !UUID_REGEX.test(membership.team_id)) continue

      const { data: team } = await db
        .from("teams")
        .select("id, owner_id")
        .eq("id", membership.team_id)
        .maybeSingle()

      if (team?.owner_id && team.owner_id !== userId) {
        const { data: ownerProfile } = await db
          .from("profiles")
          .select("subscription_tier, subscription_status")
          .eq("id", team.owner_id)
          .maybeSingle()

        if (
          ownerProfile?.subscription_tier === "agency" &&
          isSubscriptionActive(ownerProfile?.subscription_status)
        ) {
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
  if (!userId || !UUID_REGEX.test(userId)) {
    return {
      allowed: false,
      used: 0,
      limit: SCAN_LIMITS.free,
      tier: "free",
      teamId: null,
      isTeamOwner: false,
    }
  }

  const supabase = getAdminSupabaseClient() || supabaseClient || (await createClient())

  const { tier, teamId: activeTeamId, isTeamOwner } = await resolveEffectiveTier(userId, supabase)
  const limit = SCAN_LIMITS[tier] ?? SCAN_LIMITS.free

  // Count scans in the current UTC calendar month
  const now = new Date()
  const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0))

  let scanQuery = supabase
    .from("scans")
    .select("id", { count: "exact", head: true })
    .neq("status", "failed")
    .gte("created_at", startOfMonth.toISOString())

  if (activeTeamId && UUID_REGEX.test(activeTeamId)) {
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
