import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Dashboard — Auditor Pro",
  description: "View your scan history, trends, and export PDF reports.",
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 bg-grid-pattern">
      {/* Ambient glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[400px] bg-radial from-indigo-500/8 via-transparent to-transparent pointer-events-none z-0" />

      {/* Navbar */}
      <nav className="w-full bg-slate-950/80 backdrop-blur-md border-b border-slate-900 py-3.5 px-6 flex justify-between items-center fixed top-0 left-0 z-40">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 group">
            <span className="text-xl">🎯</span>
            <span className="text-lg font-bold bg-linear-to-r from-blue-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">
              Auditor Pro
            </span>
          </Link>
          {/* Breadcrumb */}
          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500">
            <span>/</span>
            <span className="text-slate-300 font-medium">Dashboard</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="text-xs font-semibold text-slate-400 hover:text-slate-200 px-3 py-2 rounded-md hover:bg-white/5 transition-all"
          >
            ← New Scan
          </Link>
        </div>
      </nav>

      <main className="relative z-10 pt-20 pb-12 px-4">
        {children}
      </main>
    </div>
  )
}
