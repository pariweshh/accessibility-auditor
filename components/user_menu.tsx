"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"

interface UserMenuProps {
  user: any
  profile: any
  tier: string
  onSignOut: () => Promise<void>
  onOpenSettings: () => void
  showDashboardLink?: boolean
}

export default function UserMenu({
  user,
  profile,
  tier,
  onSignOut,
  onOpenSettings,
  showDashboardLink = true,
}: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [theme, setTheme] = useState<"light" | "dark">("dark")
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Sync theme state with DOM
  useEffect(() => {
    if (typeof window !== "undefined") {
      const isLight = document.documentElement.classList.contains("light")
      setTheme(isLight ? "light" : "dark")
    }
  }, [])

  // Toggle Dark/Light theme
  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark"
    console.log(`[Theme Toggle] Current theme: ${theme}, switching to: ${nextTheme}`)
    if (nextTheme === "light") {
      document.documentElement.classList.add("light")
      localStorage.setItem("theme", "light")
      console.log("[Theme Toggle] Added '.light' class to root HTML element")
    } else {
      document.documentElement.classList.remove("light")
      localStorage.setItem("theme", "dark")
      console.log("[Theme Toggle] Removed '.light' class from root HTML element")
    }
    setTheme(nextTheme)
  }

  // Handle click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const userInitial = user?.email ? user.email.charAt(0).toUpperCase() : "U"

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Avatar Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center w-8 h-8 rounded-full bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-black shadow-md border border-white/10 transition-all hover:scale-105 cursor-pointer outline-hidden"
      >
        {userInitial}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2.5 w-56 rounded-2xl bg-slate-900 border border-slate-800/80 shadow-2xl p-2 z-50 text-slate-200 animate-fadeIn origin-top-right">
          {/* Header User Info */}
          <div className="px-3.5 py-2.5 border-b border-slate-800/60 flex flex-col gap-0.5 select-none">
            <span className="text-3xs font-bold text-slate-500 uppercase tracking-wider">Signed In As</span>
            <span className="text-xs font-semibold text-slate-100 truncate max-w-full">
              {user?.email}
            </span>
            <div className="mt-1 flex">
              <span className={`px-1.5 py-0.5 rounded-md text-3xs font-extrabold uppercase tracking-wide border ${
                tier === "agency"
                  ? "bg-purple-500/10 text-purple-300 border-purple-500/25"
                  : tier === "pro"
                  ? "bg-indigo-500/10 text-indigo-300 border-indigo-500/25"
                  : "bg-slate-500/10 text-slate-400 border-slate-500/25"
              }`}>
                {tier} plan
              </span>
            </div>
          </div>

          {/* Body Options */}
          <div className="py-1">
            {showDashboardLink ? (
              <Link
                href="/dashboard"
                onClick={() => setIsOpen(false)}
                className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-300 hover:text-slate-100 hover:bg-white/5 rounded-lg transition-all"
              >
                📊 Dashboard
              </Link>
            ) : (
              <Link
                href="/"
                onClick={() => setIsOpen(false)}
                className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-300 hover:text-slate-100 hover:bg-white/5 rounded-lg transition-all"
              >
                🎯 New Scan
              </Link>
            )}

            {/* Theme Toggle option */}
            <button
              onClick={() => {
                toggleTheme()
              }}
              className="flex w-full items-center justify-between px-3 py-2 text-xs font-semibold text-slate-300 hover:text-slate-100 hover:bg-white/5 rounded-lg transition-all cursor-pointer text-left"
            >
              <span>{theme === "dark" ? "🌙 Dark Mode" : "☀️ Light Mode"}</span>
              <span className="text-2xs text-slate-500">Switch</span>
            </button>

            {/* Settings trigger */}
            <button
              onClick={() => {
                setIsOpen(false)
                onOpenSettings()
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-300 hover:text-slate-100 hover:bg-white/5 rounded-lg transition-all cursor-pointer text-left"
            >
              ⚙️ Settings
            </button>
          </div>

          {/* Footer Sign Out */}
          <div className="border-t border-slate-800/60 pt-1">
            <button
              onClick={() => {
                setIsOpen(false)
                onSignOut()
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-500/5 rounded-lg transition-all cursor-pointer text-left"
            >
              🚪 Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
