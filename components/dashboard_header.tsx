"use client"

import { useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import UserMenu from "./user_menu"
import SettingsModal from "./settings_modal"
import { BrandLogo } from "./brand_logo"

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
      <nav className="w-full bg-slate-950/80 backdrop-blur-md border-b border-slate-900 py-3.5 px-4 sm:px-6 flex justify-between items-center fixed top-0 left-0 z-40">
        <div className="flex items-center gap-3 sm:gap-6">
          <Link href="/" className="flex items-center gap-2 group">
            <BrandLogo size={26} />
            <span className="text-base sm:text-lg font-bold bg-linear-to-r from-indigo-400 via-indigo-300 to-indigo-400 bg-clip-text text-transparent">
              A11ytica Pro
            </span>
          </Link>
          {/* Breadcrumb */}
          <div className="hidden md:flex items-center gap-2 text-xs text-slate-500">
            <span>/</span>
            <span className="text-slate-300 font-medium font-sans">Dashboard</span>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          <Link
            href="/docs"
            className="hidden sm:inline-block text-xs font-semibold text-slate-400 hover:text-slate-200 px-2.5 py-1.5 rounded-md hover:bg-white/5 transition-all"
          >
            Docs
          </Link>
          <Link
            href="/"
            className="text-xs font-semibold text-slate-400 hover:text-slate-200 px-2.5 py-1.5 rounded-md hover:bg-white/5 transition-all whitespace-nowrap"
          >
            <span className="hidden sm:inline">← New Scan</span>
            <span className="sm:hidden">+ Scan</span>
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
