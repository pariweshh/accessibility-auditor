"use client"

import { useState, useEffect, useRef, type ReactNode } from "react"
import { ScanResult } from "@/lib/types"
import { SCAN_LIMITS } from "@/lib/constants"
import ScanForm from "@/components/scan_form"
import ResultsDisplay from "@/components/results_display"
import BillingButton from "@/components/billing_button"
import ScanHistory from "@/components/scan_history"
import ScanProgress from "@/components/scan_progress"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"
import UserMenu from "@/components/user_menu"
import SettingsModal from "@/components/settings_modal"
import InteractiveSandbox from "@/components/interactive_sandbox"
import PricingSection from "@/components/pricing_section"
import DashboardMockup from "@/components/dashboard_mockup"
import HowItWorks from "@/components/how_it_works"
import FAQsSection from "@/components/faqs_section"
import { motion } from "motion/react"
import { AnimatedText } from "@/components/motion/animated-text"
import { useScrollReveal } from "@/hooks/use-scroll-reveal"

type ScanStatus = "pending" | "processing" | "completed" | "failed"

interface ActiveScan {
  scanId: string
  url: string
  status: ScanStatus
  errorMessage?: string | null
}

interface HomeClientProps {
  /** Server-rendered static marketing section (kept out of the client bundle). */
  features: ReactNode
}

export default function HomeClient({ features }: HomeClientProps) {
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  const [activeScan, setActiveScan] = useState<ActiveScan | null>(null)
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [isLoadingUser, setIsLoadingUser] = useState(true)
  const [scansUsed, setScansUsed] = useState(0)
  const [recentScans, setRecentScans] = useState<any[]>([])
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  const billingButtonRef = useRef<{ openModal: () => void } | null>(null)
  // Store Realtime channel so we can unsubscribe on unmount/new scan
  const realtimeChannelRef = useRef<any>(null)

  const supabase = createClient()

  // Scroll-linked reveal for the "How It Works" section.
  const howItWorks = useScrollReveal()

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
      .neq("status", "failed")
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
            supabase.auth.getUser().then(({ data: { user: currentUser } }) => {
              if (currentUser) fetchUserData(currentUser.id)
            })
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

    // Fetch initial state immediately to avoid race conditions (e.g. if scan has already started processing or completed)
    supabase
      .from("scans")
      .select("*")
      .eq("id", scanId)
      .single()
      .then(({ data: scan, error }) => {
        if (error) {
          console.error("Initial scan query failed:", error)
        }
        if (scan) {
          setActiveScan((currentActive) => {
            // If the scan has already completed/failed or user started another scan, do not overwrite the current state.
            if (!currentActive || currentActive.scanId !== scanId) {
              return currentActive
            }

            const status = scan.status as ScanStatus
            if (status === "completed" && scan.result) {
              setScanResult(scan.result as ScanResult)
              supabase.auth.getUser().then(({ data: { user: currentUser } }) => {
                if (currentUser) fetchUserData(currentUser.id)
              })
              supabase.removeChannel(channel)
              if (realtimeChannelRef.current === channel) {
                realtimeChannelRef.current = null
              }
              return null
            } else if (status === "failed") {
              supabase.removeChannel(channel)
              if (realtimeChannelRef.current === channel) {
                realtimeChannelRef.current = null
              }
              return { ...currentActive, status, errorMessage: scan.error_message }
            } else {
              return { ...currentActive, status, errorMessage: scan.error_message }
            }
          })
        }
      })
  }

  // Check for in-flight scan parameters on redirect (e.g. from dashboard rerun)
  useEffect(() => {
    if (isLoadingUser) return

    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search)
      const scanId = params.get("scanId")
      const url = params.get("url")
      if (scanId && url) {
        setScanResult(null)
        setActiveScan({ scanId, url, status: "pending" })
        subscribeToScan(scanId, url)

        // Clean up URL query parameters silently
        const newUrl = window.location.pathname
        window.history.replaceState(null, "", newUrl)
      }
    }
  }, [isLoadingUser])

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
      return <ResultsDisplay result={scanResult} onNewScan={handleNewScan} tier={tier} />
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
      {/* Decorative Orbs */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[600px] bg-radial from-indigo-500/10 via-transparent to-transparent pointer-events-none z-0" />
      <div className="absolute top-[200px] left-1/4 w-96 h-96 bg-blue-600/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none animate-pulse-slow"></div>
      <div className="absolute top-[400px] right-1/4 w-96 h-96 bg-purple-600/5 rounded-full blur-3xl translate-x-1/2 translate-y-1/2 pointer-events-none animate-pulse-slow"></div>

      {/* Navbar */}
      <nav className="w-full bg-slate-950/75 backdrop-blur-md border-b border-slate-900 py-3.5 px-6 flex justify-between items-center fixed top-0 left-0 z-40">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2.5 group">
            <img src="/logo.png" alt="A11ytica Pro Logo" className="w-8 h-8 object-contain rounded-lg border border-white/10" />
            <span className="text-xl font-bold bg-linear-to-r from-blue-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent group-hover:from-blue-300 group-hover:to-purple-300 transition-all duration-300">
              A11ytica Pro
            </span>
          </Link>
          <div className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-400">
            <a href="#scanner" className="hover:text-slate-200 transition-colors">Scanner</a>
            <a href="#sandbox" className="hover:text-slate-200 transition-colors">AI Sandbox</a>
            <a href="#features" className="hover:text-slate-200 transition-colors">Features</a>
            <a href="#pricing" className="hover:text-slate-200 transition-colors">Pricing</a>
            <Link href="/docs" className="hover:text-slate-200 transition-colors">Docs</Link>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {!isLoadingUser && (
            <>
              {user ? (
                <UserMenu
                  user={user}
                  profile={profile}
                  tier={tier}
                  onSignOut={handleSignOut}
                  onOpenSettings={() => setIsSettingsOpen(true)}
                  showDashboardLink={true}
                />
              ) : (
                <Link
                  href="/login"
                  className="text-xs font-bold text-slate-100 bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded-xl transition-all shadow-md hover:shadow-lg cursor-pointer"
                >
                  Sign In
                </Link>
              )}
            </>
          )}
        </div>
      </nav>

      <div className="container mx-auto max-w-5xl relative z-10">
        {/* Hero Section */}
        <div className="text-center pt-8 pb-6 animate-slideUp">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-3xs font-extrabold rounded-full uppercase tracking-wider mb-6 animate-pulse select-none">
            <span>🚀</span> Introducing A11ytica Pro 1.0
          </div>
          <h1 className="text-4.5xl md:text-6xl font-black bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent mb-5 tracking-tight leading-[1.1] max-w-3xl mx-auto font-display">
            <AnimatedText text="Continuous Web Accessibility." />
            <br />
            <AnimatedText text="Remediated by AI." />
          </h1>
          <p className="text-xs md:text-sm text-slate-400 max-w-2xl mx-auto mb-8 leading-relaxed font-medium">
            Audit web pages for WCAG compliance violations instantly. Retrieve precise, drop-in HTML code fixes and export professional compliance reports with a single click.
          </p>
          
          <div className="flex justify-center gap-4 flex-wrap">
            {user ? (
              <>
                <Link
                  href="/dashboard"
                  className="px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs rounded-xl shadow-lg hover:shadow-indigo-500/20 transition-all select-none hover:scale-[1.02] cursor-pointer"
                >
                  📊 Go to Dashboard
                </Link>
                <a
                  href="#scanner"
                  className="px-5 py-3 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:text-white font-extrabold text-xs rounded-xl transition-all select-none hover:scale-[1.02] cursor-pointer"
                >
                  🎯 Start Scanning
                </a>
              </>
            ) : (
              <>
                <a
                  href="#scanner"
                  className="px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs rounded-xl shadow-lg hover:shadow-indigo-500/20 transition-all select-none hover:scale-[1.02] cursor-pointer"
                >
                  ✨ Try Free Scanner
                </a>
                <a
                  href="#pricing"
                  className="px-5 py-3 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:text-white font-extrabold text-xs rounded-xl transition-all select-none hover:scale-[1.02] cursor-pointer"
                >
                  💳 View Pricing
                </a>
              </>
            )}
          </div>
        </div>

        {/* Interactive Dashboard Mockup Card */}
        <DashboardMockup />

        {/* Social Proof Brand Marquee */}
        <div className="w-full py-8 mt-16 border-y border-slate-900/60 overflow-hidden relative select-none">
          <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-slate-950 to-transparent z-10 pointer-events-none" />
          <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-slate-950 to-transparent z-10 pointer-events-none" />
          
          <div className="flex w-max animate-marquee gap-20 items-center">
            {/* Brand Set 1 */}
            {["Vercel", "Supabase", "Stripe", "GitHub", "Tailwind CSS", "axe-core", "Deque Systems", "OpenAI"].map((brand, i) => (
              <span key={`b1-${i}`} className="text-3xs font-black uppercase tracking-widest text-slate-500 hover:text-slate-300 transition-colors font-display">
                {brand}
              </span>
            ))}
            {/* Brand Set 2 */}
            {["Vercel", "Supabase", "Stripe", "GitHub", "Tailwind CSS", "axe-core", "Deque Systems", "OpenAI"].map((brand, i) => (
              <span key={`b2-${i}`} className="text-3xs font-black uppercase tracking-widest text-slate-500 hover:text-slate-300 transition-colors font-display">
                {brand}
              </span>
            ))}
          </div>
        </div>

        {/* How It Works Section */}
        <motion.section ref={howItWorks.ref} style={howItWorks.style}>
          <HowItWorks />
        </motion.section>

        {/* Live Scan Component Section */}
        <div id="scanner" className="pt-24 scroll-mt-24">
          <div className="text-center mb-10 max-w-sm mx-auto">
            <span className="text-2xs font-extrabold uppercase tracking-widest text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 rounded-full">
              Free Scanner
            </span>
            <h3 className="text-xl md:text-2xl font-black text-white mt-3 font-display tracking-tight">Run a quick audit</h3>
          </div>
          {renderMainContent()}
        </div>

        {/* Interactive AI Sandbox Section */}
        <div id="sandbox" className="scroll-mt-24">
          <InteractiveSandbox />
        </div>

        {/* Product Features Grid Section */}
        <div id="features" className="scroll-mt-24">
          {features}
        </div>

        {/* Pricing Plan Section */}
        <div id="pricing" className="scroll-mt-24">
          <PricingSection user={user} profile={profile} tier={tier} />
        </div>

        {/* FAQ Section */}
        <FAQsSection />

        {/* Newsletter conversion card */}
        <div className="mt-28 relative animate-slideUp">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 via-purple-500/5 to-blue-500/5 rounded-3xl blur-md -z-10" />
          <div className="glass-panel p-8 md:p-12 rounded-3xl border border-slate-800 text-center space-y-6 max-w-3xl mx-auto relative overflow-hidden">
            <div className="absolute -top-20 -right-20 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
            
            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 rounded-full">
              Stay Compliant
            </span>
            
            <h3 className="text-xl md:text-2xl font-black text-white font-display tracking-tight">
              Get weekly accessibility engineering guides
            </h3>
            
            <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed font-medium">
              Join 4,000+ developers receiving our newsletter on WCAG compliance, ARIA updates, and AI accessibility fixes.
            </p>
            
            <form onSubmit={(e) => e.preventDefault()} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto relative z-10">
              <input
                type="email"
                placeholder="you@domain.com"
                required
                className="flex-1 bg-slate-950/60 border border-slate-850 rounded-xl px-4 py-3 text-xs text-white placeholder-slate-600 focus:outline-hidden focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium"
              />
              <button
                type="submit"
                className="py-3 px-6 rounded-xl font-extrabold text-xs bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white transition-all shadow-md select-none hover:scale-[1.01] cursor-pointer"
              >
                Subscribe
              </button>
            </form>
          </div>
        </div>

        {/* Page Footer */}
        <footer className="mt-28 text-center text-xs text-slate-500 border-t border-slate-900/80 pt-10 pb-6">
          <p className="mb-2.5 font-medium">
            Powered by{" "}
            <Link href="https://www.deque.com/axe/" target="_blank" className="text-indigo-400 hover:text-indigo-300 hover:underline font-bold">
              axe-core
            </Link>
            ,{" "}
            <Link href="https://pptr.dev/" target="_blank" className="text-indigo-400 hover:text-indigo-300 hover:underline font-bold">
              Puppeteer
            </Link>
            , and{" "}
            <Link href="https://openai.com/" target="_blank" className="text-indigo-400 hover:text-indigo-300 hover:underline font-bold">
              OpenAI
            </Link>
          </p>
          <p className="text-3xs text-slate-600 font-semibold tracking-wide">
            &copy; {new Date().getFullYear()} A11ytica Pro. All rights reserved.
          </p>
        </footer>
      </div>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        user={user}
        profile={profile}
        tier={tier}
      />
    </main>
  )
}
