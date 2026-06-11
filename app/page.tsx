"use client"

import { useState, useEffect, useRef } from "react"
import { ScanResult } from "@/lib/types"
import { SCAN_LIMITS } from "@/lib/constants"
import ScanForm from "@/components/scan_form"
import ResultsDisplay from "@/components/results_display"
import BillingButton from "@/components/billing_button"
import ScanHistory from "@/components/scan_history"
import ScanProgress from "@/components/scan_progress"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"

type ScanStatus = "pending" | "processing" | "completed" | "failed"

interface ActiveScan {
  scanId: string
  url: string
  status: ScanStatus
  errorMessage?: string | null
}

export default function Home() {
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  const [activeScan, setActiveScan] = useState<ActiveScan | null>(null)
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [isLoadingUser, setIsLoadingUser] = useState(true)
  const [scansUsed, setScansUsed] = useState(0)
  const [recentScans, setRecentScans] = useState<any[]>([])

  const billingButtonRef = useRef<{ openModal: () => void } | null>(null)
  // Store Realtime channel so we can unsubscribe on unmount/new scan
  const realtimeChannelRef = useRef<any>(null)

  const supabase = createClient()

  const fetchUserData = async (userId: string) => {
    const { data: prof } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single()
    setProfile(prof)

    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const { count } = await supabase
      .from("scans")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", startOfMonth.toISOString())
    setScansUsed(count ?? 0)

    const { data: history } = await supabase
      .from("scans")
      .select("id, url, created_at, violations, passes, summary, result")
      .eq("user_id", userId)
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .limit(10)
    setRecentScans(history ?? [])
  }

  useEffect(() => {
    const getSession = async () => {
      setIsLoadingUser(true)
      try {
        const { data: { session } } = await supabase.auth.getSession()
        setUser(session?.user ?? null)
        if (session?.user) await fetchUserData(session.user.id)
      } catch (err) {
        console.error("Session error:", err)
      } finally {
        setIsLoadingUser(false)
      }
    }

    getSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setUser(session?.user ?? null)
        if (session?.user) {
          await fetchUserData(session.user.id)
        } else {
          setProfile(null)
          setScansUsed(0)
          setRecentScans([])
        }
      }
    )

    return () => {
      subscription.unsubscribe()
      // Clean up any active Realtime channel
      if (realtimeChannelRef.current) {
        supabase.removeChannel(realtimeChannelRef.current)
      }
    }
  }, [])

  // ── Subscribe to Realtime updates for an in-flight scan ──────────────────
  const subscribeToScan = (scanId: string, url: string) => {
    // Remove any existing channel first
    if (realtimeChannelRef.current) {
      supabase.removeChannel(realtimeChannelRef.current)
    }

    const channel = supabase
      .channel(`scan-${scanId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "scans",
          filter: `id=eq.${scanId}`,
        },
        (payload) => {
          const row = payload.new as any
          const status: ScanStatus = row.status

          setActiveScan((prev) =>
            prev ? { ...prev, status, errorMessage: row.error_message } : null
          )

          if (status === "completed" && row.result) {
            // Scan done — show results
            setScanResult(row.result as ScanResult)
            setActiveScan(null)
            // Refresh quota + history
            if (user) fetchUserData(user.id)
            supabase.removeChannel(channel)
            realtimeChannelRef.current = null
          }

          if (status === "failed") {
            // Keep activeScan visible in failed state so the user sees the error
            supabase.removeChannel(channel)
            realtimeChannelRef.current = null
          }
        }
      )
      .subscribe()

    realtimeChannelRef.current = channel
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.reload()
  }

  // Called by ScanForm when the API returns 202 with { scanId }
  const handleScanStarted = (scanId: string, url: string) => {
    setScanResult(null)
    setActiveScan({ scanId, url, status: "pending" })
    subscribeToScan(scanId, url)
  }

  const handleNewScan = () => {
    setScanResult(null)
    setActiveScan(null)
    if (realtimeChannelRef.current) {
      supabase.removeChannel(realtimeChannelRef.current)
      realtimeChannelRef.current = null
    }
  }

  const tier = profile?.subscription_tier ?? "free"
  const scansLimit = SCAN_LIMITS[tier] ?? SCAN_LIMITS.free

  // Decide what main content to render
  const renderMainContent = () => {
    if (scanResult) {
      return <ResultsDisplay result={scanResult} onNewScan={handleNewScan} />
    }

    if (activeScan) {
      return (
        <div className="space-y-4">
          <ScanProgress
            url={activeScan.url}
            status={activeScan.status}
            errorMessage={activeScan.errorMessage}
          />
          {(activeScan.status === "failed") && (
            <div className="flex justify-center">
              <button
                onClick={handleNewScan}
                className="text-xs text-slate-400 hover:text-white underline underline-offset-2 transition-colors cursor-pointer"
              >
                ← Try another URL
              </button>
            </div>
          )}
        </div>
      )
    }

    return (
      <>
        <ScanForm
          onScanStarted={handleScanStarted}
          user={user}
          profile={profile}
          scansUsed={scansUsed}
          scansLimit={scansLimit}
          onUpgradeClick={() => billingButtonRef.current?.openModal()}
        />
        {user && recentScans.length > 0 && (
          <ScanHistory
            scans={recentScans}
            onLoadResult={(result) => setScanResult(result)}
          />
        )}
      </>
    )
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 pt-28 pb-12 px-4 relative overflow-x-hidden bg-grid-pattern">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[500px] bg-radial from-indigo-500/10 via-transparent to-transparent pointer-events-none z-0" />

      {/* Navbar */}
      <nav className="w-full bg-slate-950/75 backdrop-blur-md border-b border-slate-900 py-3.5 px-6 flex justify-between items-center fixed top-0 left-0 z-40">
        <Link href="/" className="flex items-center gap-2 group">
          <span className="text-2xl">🎯</span>
          <span className="text-xl font-bold bg-linear-to-r from-blue-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent group-hover:from-blue-300 group-hover:to-purple-300 transition-all duration-300">
            Auditor Pro
          </span>
        </Link>
        <div className="flex items-center gap-2">
          {!isLoadingUser && (
            <>
              {user && (
                <Link
                  href="/dashboard"
                  className="text-xs font-semibold text-slate-400 hover:text-slate-200 px-3 py-2 rounded-md hover:bg-white/5 transition-all hidden sm:block"
                >
                  Dashboard
                </Link>
              )}
              <BillingButton ref={billingButtonRef} user={user} profile={profile} />
              {user && (
                <button
                  onClick={handleSignOut}
                  className="text-xs font-semibold text-slate-400 hover:text-slate-200 px-3 py-2 rounded-md hover:bg-white/5 transition-all cursor-pointer"
                >
                  Sign Out
                </button>
              )}
            </>
          )}
        </div>
      </nav>

      <div className="container mx-auto max-w-6xl relative z-10">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-black bg-linear-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent mb-4 tracking-tight">
            Accessibility Auditor
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            Scan any website for WCAG accessibility issues and get instant AI-powered fix suggestions.
          </p>
        </div>

        {renderMainContent()}

        <footer className="mt-16 text-center text-xs text-slate-500 border-t border-slate-900 pt-8">
          <p>
            Powered by{" "}
            <Link href="https://www.deque.com/axe/" target="_blank" className="text-indigo-400 hover:text-indigo-300 hover:underline font-medium">
              axe-core
            </Link>
            ,{" "}
            <Link href="https://pptr.dev/" target="_blank" className="text-indigo-400 hover:text-indigo-300 hover:underline font-medium">
              Puppeteer
            </Link>
            , and{" "}
            <Link href="https://openai.com/" target="_blank" className="text-indigo-400 hover:text-indigo-300 hover:underline font-medium">
              OpenAI
            </Link>
          </p>
        </footer>
      </div>
    </main>
  )
}
