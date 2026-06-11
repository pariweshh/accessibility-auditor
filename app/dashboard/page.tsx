import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { ScanRecord } from "@/lib/types"
import DashboardClient from "./dashboard_client"

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Layout already redirects, but double-check here
  if (!user) redirect("/login")

  // Fetch profile for tier info
  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_tier")
    .eq("id", user.id)
    .single()

  // Fetch all scans for this user (newest first, up to 200)
  const { data: scans, error } = await supabase
    .from("scans")
    .select("id, url, status, violations, passes, summary, result, error_message, created_at, pdf_url")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(200)

  if (error) {
    console.error("Dashboard fetch error:", error)
  }

  const tier = profile?.subscription_tier ?? "free"
  const email = user.email ?? ""

  return (
    <DashboardClient
      scans={(scans ?? []) as ScanRecord[]}
      tier={tier}
      email={email}
    />
  )
}
