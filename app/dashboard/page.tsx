import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { ScanRecord } from "@/lib/types"
import { resolveEffectiveTier } from "@/lib/quota"
import DashboardClient from "./dashboard_client"

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/login?returnTo=/dashboard")

  // Fetch profile details for tier and billing management
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()

  const { tier, teamId: activeTeamId } = await resolveEffectiveTier(user.id, supabase)

  const isPaid = tier === "pro" || tier === "agency"
  const email = user.email ?? ""

  // Count total scans ever run by this user or their team
  let countQuery = supabase
    .from("scans")
    .select("id", { count: "exact", head: true })

  if (activeTeamId) {
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

  if (activeTeamId) {
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

  return (
    <DashboardClient
      scans={(scans ?? []) as ScanRecord[]}
      totalScansCount={totalScansCount ?? 0}
      tier={tier}
      email={email}
      user={user}
      profile={profile}
    />
  )
}
