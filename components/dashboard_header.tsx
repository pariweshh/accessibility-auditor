"use client"

import { useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import UserMenu from "./user_menu"
import SettingsModal from "./settings_modal"

interface DashboardHeaderProps {
  user: any
  profile: any
}

export default function DashboardHeader({ user, profile }: DashboardHeaderProps) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.reload()
  }

  const tier = profile?.subscription_tier ?? "free"

  return (
    <>
      <nav className="w-full bg-slate-950/80 backdrop-blur-md border-b border-slate-900 py-3.5 px-6 flex justify-between items-center fixed top-0 left-0 z-40">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5 group">
            <img src="/logo.png" alt="A11ytica Pro Logo" className="w-7 h-7 object-contain rounded-lg border border-white/10" />
            <span className="text-lg font-bold bg-linear-to-r from-blue-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">
              A11ytica Pro
            </span>
          </Link>
          {/* Breadcrumb */}
          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500">
            <span>/</span>
            <span className="text-slate-300 font-medium font-sans">Dashboard</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/docs"
            className="text-xs font-semibold text-slate-400 hover:text-slate-200 px-3 py-2 rounded-md hover:bg-white/5 transition-all"
          >
            Docs
          </Link>
          <Link
            href="/"
            className="text-xs font-semibold text-slate-400 hover:text-slate-200 px-3 py-2 rounded-md hover:bg-white/5 transition-all"
          >
            ← New Scan
          </Link>

          {/* Profile Dropdown */}
          <UserMenu
            user={user}
            profile={profile}
            tier={tier}
            onSignOut={handleSignOut}
            onOpenSettings={() => setIsSettingsOpen(true)}
            showDashboardLink={false} // Links to home page
          />
        </div>
      </nav>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        user={user}
        profile={profile}
        tier={tier}
      />
    </>
  )
}
