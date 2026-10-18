import { createClient } from "@/lib/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { resolveEffectiveTier } from "@/lib/quota"
import { redirect } from "next/navigation"
import type { Metadata } from "next"
import DashboardHeader from "@/components/dashboard_header"

export const metadata: Metadata = {
  title: "Dashboard",
  description: "View your scan history, trends, and export PDF reports.",
  robots: { index: false, follow: false },
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/login?returnTo=/dashboard")

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, subscription_tier, subscription_status, scans_used, scans_reset_at")
    .eq("id", user.id)
    .single()

  const adminDb =
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
      ? createAdminClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL,
          process.env.SUPABASE_SERVICE_ROLE_KEY
        )
      : supabase

  const { tier } = await resolveEffectiveTier(user.id, adminDb)
  const effectiveProfile = profile
    ? { ...profile, subscription_tier: tier }
    : { id: user.id, subscription_tier: tier }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 bg-grid-pattern">
      {/* Ambient glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[400px] bg-radial from-indigo-500/8 via-transparent to-transparent pointer-events-none z-0" />

      {/* Navbar */}
      <DashboardHeader user={user} profile={effectiveProfile} />

      <main id="main-content" tabIndex={-1} className="relative z-10 pt-20 pb-12 px-4 focus:outline-hidden">
        {children}
      </main>
    </div>
  )
}
