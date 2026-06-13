import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
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

  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 bg-grid-pattern">
      {/* Ambient glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[400px] bg-radial from-indigo-500/8 via-transparent to-transparent pointer-events-none z-0" />

      {/* Navbar */}
      <DashboardHeader user={user} profile={profile} />

      <main className="relative z-10 pt-20 pb-12 px-4">
        {children}
      </main>
    </div>
  )
}
