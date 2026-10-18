import { createClient } from "@/lib/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { redirect } from "next/navigation"
import { ScanRecord } from "@/lib/types"
import { resolveEffectiveTier } from "@/lib/quota"
import DashboardClient from "./dashboard_client"

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/login?returnTo=/dashboard")

  // Fetch profile details for tier and billing management
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, subscription_tier, subscription_status, scans_used, scans_reset_at, stripe_customer_id, stripe_subscription_id")
    .eq("id", user.id)
    .single()

  const adminDb =
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
      ? createAdminClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL,
          process.env.SUPABASE_SERVICE_ROLE_KEY
        )
      : supabase

  const { tier, teamId: activeTeamId } = await resolveEffectiveTier(user.id, adminDb)

  const isPaid = tier === "pro" || tier === "agency"
  const email = user.email ?? ""

  const validTeamFilter =
    activeTeamId && UUID_REGEX.test(activeTeamId) && UUID_REGEX.test(user.id)

  // Count total scans ever run by this user or their team
  let countQuery = supabase
    .from("scans")
    .select("id", { count: "exact", head: true })

  if (validTeamFilter) {
    countQuery = countQuery.or(`user_id.eq.${user.id},team_id.eq.${activeTeamId}`)
  } else {
    countQuery = countQuery.eq("user_id", user.id)
  }

  const { count: totalScansCount } = await countQuery

  // Fetch scans: Free users get only their single latest scan (per pricing tier specification)
  // Pro and Agency get full dedicated scan history (up to 200)
  const scanLimit = isPaid ? 200 : 1
  let scansQuery = supabase
    .from("scans")
    .select("*")

  if (validTeamFilter) {
    scansQuery = scansQuery.or(`user_id.eq.${user.id},team_id.eq.${activeTeamId}`)
  } else {
    scansQuery = scansQuery.eq("user_id", user.id)
  }

  const { data: scans, error } = await scansQuery
    .order("created_at", { ascending: false })
    .limit(scanLimit)

  if (error) {
    console.error("Dashboard fetch error:", error)
  }

  const effectiveProfile = profile ? { ...profile, subscription_tier: tier } : null

  return (
    <DashboardClient
      scans={(scans ?? []) as ScanRecord[]}
      totalScansCount={totalScansCount ?? 0}
      tier={tier}
      email={email}
      user={user}
      profile={effectiveProfile}
    />
  )
}
