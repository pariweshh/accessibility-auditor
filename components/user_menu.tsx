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
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window !== "undefined") {
      return document.documentElement.classList.contains("light") ? "light" : "dark"
    }
    return "dark"
  })
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Toggle Dark/Light theme
  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark"
    if (nextTheme === "light") {
      document.documentElement.classList.add("light")
      localStorage.setItem("theme", "light")
    } else {
      document.documentElement.classList.remove("light")
      localStorage.setItem("theme", "dark")
    }
    setTheme(nextTheme)
  }

  // Handle click outside & escape key to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
      document.addEventListener("keydown", handleKeyDown)
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [isOpen])

  const userInitial = user?.email ? user.email.charAt(0).toUpperCase() : "U"

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Avatar Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label="User account menu"
        className="flex items-center justify-center w-8 h-8 rounded-full bg-linear-to-r from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 text-white text-xs font-black shadow-md border border-white/10 transition-all hover:scale-105 cursor-pointer outline-hidden"
      >
        {userInitial}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          role="menu"
          aria-label="User account options"
          className="absolute right-0 mt-2.5 w-56 rounded-2xl bg-slate-900 border border-slate-800/80 shadow-2xl p-2 z-50 text-slate-200 animate-fadeIn origin-top-right"
        >
          {/* Header User Info */}
          <div className="px-3.5 py-2.5 border-b border-slate-800/60 flex flex-col gap-0.5 select-none">
            <span className="text-3xs font-bold text-slate-500 uppercase tracking-wider">Signed In As</span>
            <span className="text-xs font-semibold text-slate-100 truncate max-w-full">
              {user?.email}
            </span>
            <div className="mt-1 flex">
              <span className={`px-1.5 py-0.5 rounded-md text-3xs font-extrabold uppercase tracking-wide border ${
                tier === "agency"
                  ? "bg-indigo-500/10 text-indigo-300 border-indigo-500/25"
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
                role="menuitem"
                onClick={() => setIsOpen(false)}
                className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-300 hover:text-slate-100 hover:bg-white/5 rounded-lg transition-all"
              >
                <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
                Dashboard
              </Link>
            ) : (
              <Link
                href="/"
                role="menuitem"
                onClick={() => setIsOpen(false)}
                className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-300 hover:text-slate-100 hover:bg-white/5 rounded-lg transition-all"
              >
                <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                New Scan
              </Link>
            )}

            {/* Theme Toggle option */}
            <button
              role="menuitem"
              onClick={() => {
                toggleTheme()
              }}
              className="flex w-full items-center justify-between px-3 py-2 text-xs font-semibold text-slate-300 hover:text-slate-100 hover:bg-white/5 rounded-lg transition-all cursor-pointer text-left"
            >
              <span className="flex items-center gap-2">
                {theme === "dark" ? (
                  <>
                    <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                    </svg>
                    Dark Mode
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                    Light Mode
                  </>
                )}
              </span>
              <span className="text-2xs text-slate-500">Switch</span>
            </button>

            {/* Settings trigger */}
            <button
              role="menuitem"
              onClick={() => {
                setIsOpen(false)
                onOpenSettings()
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-300 hover:text-slate-100 hover:bg-white/5 rounded-lg transition-all cursor-pointer text-left"
            >
              <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Settings
            </button>
          </div>

          {/* Footer Sign Out */}
          <div className="border-t border-slate-800/60 pt-1">
            <button
              role="menuitem"
              onClick={() => {
                setIsOpen(false)
                onSignOut()
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-500/5 rounded-lg transition-all cursor-pointer text-left"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
