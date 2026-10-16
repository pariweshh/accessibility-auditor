"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { ScanRecord, ScheduledMonitor, MonitorFrequency } from "@/lib/types"
import { useFocusTrap } from "@/hooks/use-focus-trap"
import StatsCards from "@/components/dashboard/stats_cards"
import ScanTable from "@/components/dashboard/scan_table"
import TrendChart from "@/components/dashboard/trend_chart"
import BillingButton from "@/components/billing_button"
import { BrandLogo } from "@/components/brand_logo"

interface DashboardClientProps {
  scans: ScanRecord[]
  totalScansCount?: number
  tier: string
  email: string
  user: any
  profile: any
}

export default function DashboardClient({
  scans,
  totalScansCount = 0,
  tier,
  email,
  user,
  profile,
}: DashboardClientProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "monitors" | "api" | "team" | "branding">("overview")
  const [selectedUrl, setSelectedUrl] = useState<string | null>(null)
  
  // Scheduled Monitors state
  const [monitors, setMonitors] = useState<ScheduledMonitor[]>([])
  const [isFetchingMonitors, setIsFetchingMonitors] = useState(false)
  const [monitorUsage, setMonitorUsage] = useState({ used: 0, max: 0 })
  const [showCreateMonitorModal, setShowCreateMonitorModal] = useState(false)
  const createMonitorModalRef = useRef<HTMLDivElement>(null)

  // Accessible Dialog Focus Trap for Create Monitor Modal (WCAG 2.1.2 & 2.4.3)
  useFocusTrap({
    isOpen: showCreateMonitorModal,
    onClose: () => setShowCreateMonitorModal(false),
    containerRef: createMonitorModalRef,
  })

  const handleMainTabKeyDown = (e: React.KeyboardEvent) => {
    const tabs: ("overview" | "monitors" | "api" | "team" | "branding")[] = [
      "overview",
      "monitors",
      "api",
      "team",
      "branding",
    ]
    const currentIndex = tabs.indexOf(activeTab)
    if (e.key === "ArrowRight") {
      e.preventDefault()
      const nextTab = tabs[(currentIndex + 1) % tabs.length]
      setActiveTab(nextTab)
      document.getElementById(`tab-dash-${nextTab}`)?.focus()
    } else if (e.key === "ArrowLeft") {
      e.preventDefault()
      const prevTab = tabs[(currentIndex - 1 + tabs.length) % tabs.length]
      setActiveTab(prevTab)
      document.getElementById(`tab-dash-${prevTab}`)?.focus()
    } else if (e.key === "Home") {
      e.preventDefault()
      setActiveTab("overview")
      document.getElementById("tab-dash-overview")?.focus()
    } else if (e.key === "End") {
      e.preventDefault()
      setActiveTab("branding")
      document.getElementById("tab-dash-branding")?.focus()
    }
  }

  const [newMonitorUrl, setNewMonitorUrl] = useState("")
  const [newMonitorFrequency, setNewMonitorFrequency] = useState<MonitorFrequency>("weekly")
  const [newMonitorEmail, setNewMonitorEmail] = useState(email || "")
  const [newMonitorThreshold, setNewMonitorThreshold] = useState(90)
  const [newMonitorAlertOnDegradation, setNewMonitorAlertOnDegradation] = useState(true)
  const [isCreatingMonitor, setIsCreatingMonitor] = useState(false)
  const [monitorError, setMonitorError] = useState<string | null>(null)
  const [monitorSuccess, setMonitorSuccess] = useState<string | null>(null)
  const [runningMonitorId, setRunningMonitorId] = useState<string | null>(null)

  // API Keys & CI/CD Builder state
  const [keys, setKeys] = useState<any[]>([])
  const [isFetchingKeys, setIsFetchingKeys] = useState(false)
  const [keyName, setKeyName] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedKey, setGeneratedKey] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [revokingId, setRevokingId] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [ciPlatform, setCiPlatform] = useState<"github" | "gitlab" | "curl">("github")
  const [ciThreshold, setCiThreshold] = useState<"critical" | "serious" | "strict">("serious")
  const [ciTargetUrl, setCiTargetUrl] = useState(scans[0]?.url || "https://staging.example.com")
  const [copiedCi, setCopiedCi] = useState(false)

  // Team Access state
  const [teamData, setTeamData] = useState<{
    hasTeam: boolean
    team: { id: string; name: string; maxSeats: number; seatsUsed: number; seatsRemaining: number }
    isOwner: boolean
    members: any[]
  } | null>(null)
  const [isFetchingTeam, setIsFetchingTeam] = useState(false)
  const [inviteEmail, setInviteEmail] = useState("")
  const [isInviting, setIsInviting] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null)
  const [latestInviteUrl, setLatestInviteUrl] = useState<string | null>(null)
  const [copiedInviteUrl, setCopiedInviteUrl] = useState(false)
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null)

  // White-Label Custom Branding state
  const [brandName, setBrandName] = useState("")
  const [brandLogoUrl, setBrandLogoUrl] = useState("")
  const [brandPrimaryColor, setBrandPrimaryColor] = useState("#4f46e5")
  const [brandTagline, setBrandTagline] = useState("Accessibility Audit Report")
  const [brandFooterText, setBrandFooterText] = useState("")
  const [brandHideWatermark, setBrandHideWatermark] = useState(false)
  const [isFetchingBranding, setIsFetchingBranding] = useState(false)
  const [isSavingBranding, setIsSavingBranding] = useState(false)
  const [brandingError, setBrandingError] = useState<string | null>(null)
  const [brandingSuccess, setBrandingSuccess] = useState<string | null>(null)

  const isPaid = tier === "pro" || tier === "agency"
  const [checkoutSuccess, setCheckoutSuccess] = useState(false)

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search)
      if (params.get("checkout_success") === "true") {
        setCheckoutSuccess(true)
        const tab = params.get("tab")
        const cleanUrl = window.location.pathname + (tab ? `?tab=${tab}` : "")
        window.history.replaceState(null, "", cleanUrl)
      }
      const tabParam = params.get("tab")
      if (tabParam === "branding") setActiveTab("branding")
      else if (tabParam === "team") setActiveTab("team")
      else if (tabParam === "api") setActiveTab("api")
      else if (tabParam === "monitors") setActiveTab("monitors")
    }
  }, [])

  const fetchMonitors = async () => {
    setIsFetchingMonitors(true)
    setMonitorError(null)
    try {
      const res = await fetch("/api/monitors")
      if (!res.ok) throw new Error("Failed to load monitors")
      const data = await res.json()
      setMonitors(data.monitors || [])
      setMonitorUsage({ used: data.usedCount || 0, max: data.maxMonitors || 0 })
    } catch (err: any) {
      console.error(err)
      setMonitorError(err.message || "Failed to load monitors")
    } finally {
      setIsFetchingMonitors(false)
    }
  }

  const handleCreateMonitor = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMonitorUrl.trim() || !newMonitorEmail.trim()) return
    setIsCreatingMonitor(true)
    setMonitorError(null)
    setMonitorSuccess(null)
    try {
      const res = await fetch("/api/monitors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: newMonitorUrl.trim(),
          frequency: newMonitorFrequency,
          alertEmail: newMonitorEmail.trim(),
          minScoreThreshold: newMonitorThreshold,
          alertOnDegradation: newMonitorAlertOnDegradation,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.message || data.error || "Failed to create monitor")
      }
      setMonitorSuccess("Scheduled monitor created! Baseline audit queued.")
      setShowCreateMonitorModal(false)
      setNewMonitorUrl("")
      fetchMonitors()
      setTimeout(() => setMonitorSuccess(null), 4000)
    } catch (err: any) {
      console.error(err)
      setMonitorError(err.message || "Failed to create monitor")
    } finally {
      setIsCreatingMonitor(false)
    }
  }

  const handleToggleMonitorStatus = async (monitorId: string, currentStatus: "active" | "paused") => {
    const nextStatus = currentStatus === "active" ? "paused" : "active"
    try {
      const res = await fetch(`/api/monitors/${monitorId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      })
      if (!res.ok) throw new Error("Failed to update status")
      fetchMonitors()
    } catch (err: any) {
      console.error(err)
      setMonitorError(err.message || "Failed to update monitor status")
    }
  }

  const handleDeleteMonitor = async (monitorId: string, monitorUrl: string) => {
    if (!confirm(`Are you sure you want to delete the scheduled monitor for ${monitorUrl}?`)) return
    try {
      const res = await fetch(`/api/monitors/${monitorId}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete monitor")
      fetchMonitors()
    } catch (err: any) {
      console.error(err)
      setMonitorError(err.message || "Failed to delete monitor")
    }
  }

  const handleRunMonitorNow = async (monitorId: string) => {
    setRunningMonitorId(monitorId)
    setMonitorError(null)
    setMonitorSuccess(null)
    try {
      const res = await fetch(`/api/monitors/${monitorId}/run`, { method: "POST" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || data.error || "Failed to run audit")
      setMonitorSuccess("Audit dispatched! Check back in a few seconds or view the scan report.")
      setTimeout(() => {
        fetchMonitors()
        setMonitorSuccess(null)
      }, 3000)
    } catch (err: any) {
      console.error(err)
      setMonitorError(err.message || "Failed to run monitor audit")
    } finally {
      setRunningMonitorId(null)
    }
  }


  const fetchKeys = async () => {
    setIsFetchingKeys(true)
    setErrorMsg(null)
    try {
      const res = await fetch("/api/keys")
      if (!res.ok) throw new Error("Failed to fetch API keys")
      const data = await res.json()
      setKeys(data.keys || [])
    } catch (err) {
      console.error(err)
      setErrorMsg("Failed to load API keys.")
    } finally {
      setIsFetchingKeys(false)
    }
  }

  const fetchTeam = async () => {
    setIsFetchingTeam(true)
    setInviteError(null)
    try {
      const res = await fetch("/api/team")
      if (!res.ok) throw new Error("Failed to load team data")
      const data = await res.json()
      if (data.hasTeam) {
        setTeamData(data)
      } else {
        setTeamData(null)
      }
    } catch (err) {
      console.error(err)
      setInviteError("Failed to load team data.")
    } finally {
      setIsFetchingTeam(false)
    }
  }

  const fetchBranding = async () => {
    setIsFetchingBranding(true)
    setBrandingError(null)
    try {
      const res = await fetch("/api/team/branding")
      if (!res.ok) throw new Error("Failed to load branding data")
      const data = await res.json()
      if (data.branding) {
        setBrandName(data.branding.brandName || "")
        setBrandLogoUrl(data.branding.brandLogoUrl || "")
        setBrandPrimaryColor(data.branding.brandPrimaryColor || "#4f46e5")
        setBrandTagline(data.branding.brandTagline || "Accessibility Audit Report")
        setBrandFooterText(data.branding.brandFooterText || "")
        setBrandHideWatermark(Boolean(data.branding.brandHideWatermark))
      }
    } catch (err) {
      console.error(err)
      setBrandingError("Failed to load branding settings.")
    } finally {
      setIsFetchingBranding(false)
    }
  }

  useEffect(() => {
    if (activeTab === "monitors" && isPaid) {
      fetchMonitors()
    } else if (activeTab === "api" && isPaid) {
      fetchKeys()
    } else if (activeTab === "team" && tier === "agency") {
      fetchTeam()
    } else if (activeTab === "branding" && tier === "agency") {
      fetchBranding()
    }
  }, [activeTab, tier, isPaid])

  const handleSaveBranding = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSavingBranding(true)
    setBrandingError(null)
    setBrandingSuccess(null)

    try {
      const res = await fetch("/api/team/branding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandName,
          brandLogoUrl,
          brandPrimaryColor,
          brandTagline,
          brandFooterText,
          brandHideWatermark,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Failed to save branding")
      }

      setBrandingSuccess("Branding configuration saved! Applied to all future reports and PDF exports.")
      setTimeout(() => setBrandingSuccess(null), 4000)
    } catch (err: any) {
      console.error(err)
      setBrandingError(err.message || "Failed to save branding configuration.")
    } finally {
      setIsSavingBranding(false)
    }
  }

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith("image/")) {
      setBrandingError("Please upload a valid image file (PNG, JPG, or SVG).")
      return
    }
    if (file.size > 1024 * 1024 * 2) {
      setBrandingError("Image size must be less than 2MB.")
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string
      setBrandLogoUrl(dataUrl)
      setBrandingError(null)
    }
    reader.readAsDataURL(file)
  }

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteEmail.trim()) return
    setIsInviting(true)
    setInviteError(null)
    setInviteSuccess(null)
    setLatestInviteUrl(null)

    try {
      const res = await fetch("/api/team/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Failed to invite member")
      }

      setInviteSuccess(`Invitation successfully created for ${inviteEmail.trim()}`)
      setLatestInviteUrl(data.inviteUrl || null)
      setInviteEmail("")
      fetchTeam()
    } catch (err: any) {
      console.error(err)
      setInviteError(err.message || "Failed to send invitation.")
    } finally {
      setIsInviting(false)
    }
  }

  const handleRemoveMember = async (memberId: string, memberEmail: string) => {
    if (!confirm(`Are you sure you want to remove ${memberEmail} from your team workspace?`)) return
    setRemovingMemberId(memberId)
    setInviteError(null)

    try {
      const res = await fetch(`/api/team/member?id=${memberId}`, {
        method: "DELETE",
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Failed to remove member")
      }
      fetchTeam()
    } catch (err: any) {
      console.error(err)
      setInviteError(err.message || "Failed to remove member.")
    } finally {
      setRemovingMemberId(null)
    }
  }

  const handleGenerateKey = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!keyName.trim()) return
    setIsGenerating(true)
    setErrorMsg(null)
    setGeneratedKey(null)

    try {
      const res = await fetch("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: keyName.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.message || data.error || "Failed to generate key")
      }
      setGeneratedKey(data.rawKey)
      setKeys((prev) => [data.key, ...prev])
      setKeyName("")
    } catch (err: any) {
      console.error(err)
      setErrorMsg(err.message || "An error occurred while generating the key.")
    } finally {
      setIsGenerating(false)
    }
  }

  const handleRevokeKey = async (keyId: string) => {
    setRevokingId(keyId)
    setErrorMsg(null)
    try {
      const res = await fetch(`/api/keys?id=${keyId}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error("Failed to revoke key")
      setKeys((prev) => prev.filter((k) => k.id !== keyId))
    } catch (err) {
      console.error(err)
      setErrorMsg("Failed to revoke key.")
    } finally {
      setRevokingId(null)
    }
  }

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const formatLastUsed = (dateStr: string | null) => {
    if (!dateStr) return "Never"
    return new Date(dateStr).toLocaleDateString("en-AU", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    })
  }

  return (
    <div className="container mx-auto max-w-7xl space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-2">
        <div>
          <h1 className="text-2xl font-black text-slate-50 tracking-tight">Dashboard</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {email} · <span className="capitalize font-medium text-indigo-400">{tier}</span> plan
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="w-2 h-2 rounded-full bg-emerald-400" /> <span>No issues</span>
          <span className="w-2 h-2 rounded-full bg-rose-400 ml-2" /> <span>Issues found</span>
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse ml-2" /> <span>In progress</span>
        </div>
      </div>

      {checkoutSuccess && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-between text-xs text-emerald-300 animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <div className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-400 shrink-0">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="font-bold text-emerald-200">Payment Successful & Plan Activated!</p>
              <p className="text-2xs text-emerald-400/90 mt-0.5">
                Your subscription has been updated. All premium features, increased monthly scan quotas, and executive exports are now active.
              </p>
            </div>
          </div>
          <button
            onClick={() => setCheckoutSuccess(false)}
            aria-label="Dismiss payment success notification"
            className="text-emerald-400 hover:text-emerald-200 p-1 cursor-pointer text-sm"
          >
            ✕
          </button>
        </div>
      )}

      {/* Tabs */}
      <div
        role="tablist"
        aria-label="Dashboard views"
        onKeyDown={handleMainTabKeyDown}
        className="flex border-b border-slate-900/60 gap-1 pb-px overflow-x-auto whitespace-nowrap"
      >
        <button
          role="tab"
          id="tab-dash-overview"
          aria-controls="panel-dash-overview"
          aria-selected={activeTab === "overview"}
          tabIndex={activeTab === "overview" ? 0 : -1}
          onClick={() => setActiveTab("overview")}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === "overview"
              ? "border-indigo-500 text-slate-50 font-bold"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          Overview
        </button>
        <button
          role="tab"
          id="tab-dash-monitors"
          aria-controls="panel-dash-monitors"
          aria-selected={activeTab === "monitors"}
          tabIndex={activeTab === "monitors" ? 0 : -1}
          onClick={() => setActiveTab("monitors")}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === "monitors"
              ? "border-indigo-500 text-slate-50 font-bold"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <span>Scheduled Monitors</span>
          {isPaid ? (
            <span className="text-3xs font-bold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              {monitors.length > 0 ? `${monitors.length}` : "New"}
            </span>
          ) : (
            <span className="text-3xs font-medium px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
              Pro
            </span>
          )}
        </button>
        <button
          role="tab"
          id="tab-dash-api"
          aria-controls="panel-dash-api"
          aria-selected={activeTab === "api"}
          tabIndex={activeTab === "api" ? 0 : -1}
          onClick={() => setActiveTab("api")}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === "api"
              ? "border-indigo-500 text-slate-50 font-bold"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          Developer API
        </button>
        <button
          role="tab"
          id="tab-dash-team"
          aria-controls="panel-dash-team"
          aria-selected={activeTab === "team"}
          tabIndex={activeTab === "team" ? 0 : -1}
          onClick={() => setActiveTab("team")}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === "team"
              ? "border-indigo-500 text-slate-50 font-bold"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <span>Team Access</span>
          {tier === "agency" ? (
            <span className="text-3xs font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              Agency
            </span>
          ) : (
            <span className="text-3xs font-medium px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
              3 Seats
            </span>
          )}
        </button>
        <button
          role="tab"
          id="tab-dash-branding"
          aria-controls="panel-dash-branding"
          aria-selected={activeTab === "branding"}
          tabIndex={activeTab === "branding" ? 0 : -1}
          onClick={() => setActiveTab("branding")}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === "branding"
              ? "border-indigo-500 text-slate-50 font-bold"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <span>White-Label</span>
          {tier === "agency" ? (
            <span className="text-3xs font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              Agency
            </span>
          ) : (
            <span className="text-3xs font-medium px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
              Custom PDF
            </span>
          )}
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === "overview" ? (
        <div className="space-y-6">
          {/* Free Tier History Limitation Banner */}
          {!isPaid && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-indigo-950/20 border border-indigo-500/20 rounded-2xl animate-fadeIn">
              <div className="flex items-start gap-3">
                <div className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 shrink-0 mt-0.5">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-200">
                    Free Tier: Displaying Latest Scan Only
                  </h3>
                  <p className="text-2xs text-slate-400 mt-0.5 leading-relaxed">
                    {totalScansCount > 1
                      ? `You have ${totalScansCount} total audits in your database. Historical logs, search filtering, and trends require a Pro or Agency subscription.`
                      : "Dedicated scan history logs, searchable archives, and trend analytics require a Pro or Agency subscription."}
                  </p>
                </div>
              </div>
              <div className="shrink-0">
                <BillingButton user={user} profile={profile} />
              </div>
            </div>
          )}

          {/* Stats */}
          <StatsCards scans={scans} />

          {/* Trend chart */}
          <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/60 rounded-2xl p-5 relative overflow-hidden">
            {!isPaid && (
              <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center z-10 space-y-2">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <h3 className="text-xs font-bold text-slate-200">Historical Violation Trends (Pro Feature)</h3>
                <p className="text-2xs text-slate-400 max-w-sm leading-relaxed">
                  Track violation decreases and monitor recurring compliance velocity across multiple scans.
                </p>
                <div className="pt-1">
                  <BillingButton user={user} profile={profile} />
                </div>
              </div>
            )}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-bold text-slate-200">Violation Trend</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {selectedUrl ? (
                    <>
                      Showing: <span className="text-indigo-400 font-medium">{selectedUrl.replace(/^https?:\/\//, "").slice(0, 50)}</span> ·{" "}
                      <button onClick={() => setSelectedUrl(null)} className="text-slate-500 hover:text-slate-300 underline cursor-pointer">
                        Clear
                      </button>
                    </>
                  ) : (
                    "All URLs · Click a row in the table to filter"
                  )}
                </p>
              </div>
            </div>
            <TrendChart scans={scans} selectedUrl={selectedUrl} />
          </div>

          {/* Scan table */}
          <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/60 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-bold text-slate-200">
                  {isPaid ? "All Scans" : "Latest Audit"}
                </h2>
                {!isPaid && (
                  <p className="text-2xs text-slate-500 mt-0.5">
                    Dedicated history archive unlocked on Pro & Agency plans.
                  </p>
                )}
              </div>
              <span className="text-xs text-slate-500 bg-slate-800/60 px-2 py-1 rounded-md tabular-nums">
                {isPaid ? `${scans.length} total` : `${scans.length} displayed (${totalScansCount} total)`}
              </span>
            </div>
            <ScanTable
              scans={scans}
              tier={tier}
              onUrlSelect={setSelectedUrl}
              selectedUrl={selectedUrl}
              totalScansCount={totalScansCount}
            />
          </div>
        </div>
      ) : activeTab === "monitors" ? (
        /* Scheduled Monitors Tab */
        <div className="space-y-6">
          {!isPaid ? (
            /* Upgrade CTA Card for Free Users */
            <div className="relative bg-slate-900/40 backdrop-blur-md border border-slate-850/60 rounded-2xl p-8 max-w-2xl mx-auto overflow-hidden shadow-2xl text-center">
              <div className="absolute -top-16 -right-16 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mb-4">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-slate-100 mb-2">Automated Continuous Monitoring & Outbound Alerts</h2>
              <p className="text-xs text-slate-400 max-w-md mx-auto mb-6 leading-relaxed">
                Never get blindsided by an accessibility lawsuit or broken release. Schedule automated recurring audits on critical production and marketing routes and receive immediate email alerts if your score degrades.
              </p>
              
              <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 text-left max-w-md mx-auto mb-6 space-y-2.5">
                <div className="flex items-center gap-2.5 text-xs text-slate-300">
                  <span className="text-emerald-400">✓</span>
                  <span>Daily or Weekly automated WCAG 2.2 AA audits</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs text-slate-300">
                  <span className="text-emerald-400">✓</span>
                  <span>Instant Resend email alerts when scores drop or critical issues arise</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs text-slate-300">
                  <span className="text-emerald-400">✓</span>
                  <span><strong>Pro Plan:</strong> Up to 3 active automated monitors</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs text-slate-300">
                  <span className="text-emerald-400">✓</span>
                  <span><strong>Agency Plan:</strong> Up to 10 automated monitors pooled for client sites</span>
                </div>
              </div>

              <div className="flex justify-center">
                <BillingButton user={user} profile={profile} />
              </div>
            </div>
          ) : (
            /* Authenticated Monitor Management View */
            <div className="space-y-6">
              {/* Top Controls & Quota Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-slate-900/40 backdrop-blur-md border border-slate-800/60 rounded-2xl">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-base font-bold text-slate-100">Automated Scheduled Monitors</h2>
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                      {monitorUsage.used} / {monitorUsage.max} Monitors Used
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 max-w-xl">
                    Continuously audit your critical URLs on a daily or weekly schedule. If an update introduces regressions or drops your score, we immediately notify your team by email.
                  </p>
                </div>

                <button
                  onClick={() => setShowCreateMonitorModal(true)}
                  disabled={monitorUsage.used >= monitorUsage.max}
                  className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-lg cursor-pointer shrink-0 ${
                    monitorUsage.used >= monitorUsage.max
                      ? "bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-60"
                      : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/20 active:scale-95"
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  <span>Add New Monitor</span>
                </button>
              </div>

              {/* Status Alerts */}
              {monitorSuccess && (
                <div role="status" aria-live="polite" className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-emerald-200 text-xs flex items-center justify-between animate-fadeIn">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>{monitorSuccess}</span>
                  </div>
                  <button
                    onClick={() => setMonitorSuccess(null)}
                    aria-label="Dismiss success message"
                    className="text-emerald-400 hover:text-emerald-200 p-1 rounded-lg hover:bg-emerald-900/40 transition-colors min-w-[24px] min-h-[24px] flex items-center justify-center cursor-pointer"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}
              {monitorError && (
                <div role="alert" aria-live="assertive" className="p-4 rounded-xl bg-rose-950/30 border border-rose-500/30 text-rose-200 text-xs flex items-center justify-between animate-fadeIn">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-rose-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span>{monitorError}</span>
                  </div>
                  <button
                    onClick={() => setMonitorError(null)}
                    aria-label="Dismiss error message"
                    className="text-rose-400 hover:text-rose-200 p-1 rounded-lg hover:bg-rose-900/40 transition-colors min-w-[24px] min-h-[24px] flex items-center justify-center cursor-pointer"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}

              {/* Create Monitor Modal */}
              {showCreateMonitorModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                  <div
                    onClick={() => setShowCreateMonitorModal(false)}
                    className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm cursor-pointer"
                    aria-hidden="true"
                  />
                  <div
                    ref={createMonitorModalRef}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="create-monitor-title"
                    className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative z-10 animate-fadeIn"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <h3 id="create-monitor-title" className="text-sm font-bold text-slate-100">
                          Configure Scheduled Monitor
                        </h3>
                      </div>
                      <button
                        onClick={() => setShowCreateMonitorModal(false)}
                        aria-label="Close monitor dialog"
                        className="text-slate-400 hover:text-slate-200 p-2 min-w-[32px] min-h-[32px] rounded-lg hover:bg-slate-800 transition-colors flex items-center justify-center cursor-pointer"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>

                    <form onSubmit={handleCreateMonitor} className="space-y-4">
                      <div>
                        <label className="block text-2xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                          Target URL to Audit
                        </label>
                        <input
                          type="url"
                          required
                          value={newMonitorUrl}
                          onChange={(e) => setNewMonitorUrl(e.target.value)}
                          placeholder="https://example.com/checkout"
                          className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                        />
                        <p className="text-3xs text-slate-500 mt-1">
                          Must be a publicly accessible HTTP or HTTPS web application.
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-2xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                            Audit Frequency
                          </label>
                          <div role="radiogroup" aria-label="Audit Frequency" className="grid grid-cols-2 gap-1.5 p-1 bg-slate-950/80 border border-slate-800 rounded-xl">
                            <button
                              type="button"
                              role="radio"
                              aria-checked={newMonitorFrequency === "weekly"}
                              onClick={() => setNewMonitorFrequency("weekly")}
                              className={`py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                                newMonitorFrequency === "weekly"
                                  ? "bg-indigo-600 text-white shadow-sm"
                                  : "text-slate-400 hover:text-slate-200"
                              }`}
                            >
                              Weekly
                            </button>
                            <button
                              type="button"
                              role="radio"
                              aria-checked={newMonitorFrequency === "daily"}
                              onClick={() => setNewMonitorFrequency("daily")}
                              className={`py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                                newMonitorFrequency === "daily"
                                  ? "bg-indigo-600 text-white shadow-sm"
                                  : "text-slate-400 hover:text-slate-200"
                              }`}
                            >
                              Daily
                            </button>
                          </div>
                        </div>

                        <div>
                          <label htmlFor="ck-alert-email" className="block text-2xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                            Alert Recipient Email
                          </label>
                          <input
                            id="ck-alert-email"
                            type="email"
                            required
                            value={newMonitorEmail}
                            onChange={(e) => setNewMonitorEmail(e.target.value)}
                            placeholder="alerts@company.com"
                            className="w-full px-3.5 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label htmlFor="ck-score-threshold" className="text-2xs font-semibold text-slate-300 uppercase tracking-wider">
                            Alert Score Threshold
                          </label>
                          <span className="text-xs font-bold text-indigo-400 tabular-nums">
                            &lt; {newMonitorThreshold}%
                          </span>
                        </div>
                        <input
                          id="ck-score-threshold"
                          type="range"
                          min="70"
                          max="98"
                          aria-label="Alert Score Threshold"
                          aria-valuemin={70}
                          aria-valuemax={98}
                          aria-valuenow={newMonitorThreshold}
                          aria-valuetext={`Alert below ${newMonitorThreshold}%`}
                          value={newMonitorThreshold}
                          onChange={(e) => setNewMonitorThreshold(Number(e.target.value))}
                          className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                        />
                        <p className="text-3xs text-slate-400 mt-1">
                          You will be alerted if an audit score falls below {newMonitorThreshold}% or drops by 5+ points.
                        </p>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <input
                          type="checkbox"
                          id="alertDegradation"
                          checked={newMonitorAlertOnDegradation}
                          onChange={(e) => setNewMonitorAlertOnDegradation(e.target.checked)}
                          className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                        <label htmlFor="alertDegradation" className="text-xs text-slate-300 cursor-pointer select-none">
                          Send outbound email alert when score drops
                        </label>
                      </div>

                      <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2.5">
                        <button
                          type="button"
                          onClick={() => setShowCreateMonitorModal(false)}
                          className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={isCreatingMonitor}
                          className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                        >
                          {isCreatingMonitor ? (
                            <>
                              <svg className="animate-spin h-3.5 w-3.5 text-white" viewBox="0 0 24 24" fill="none">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                              </svg>
                              <span>Saving...</span>
                            </>
                          ) : (
                            <span>Create Monitor</span>
                          )}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* Monitors List / Cards */}
              {isFetchingMonitors && monitors.length === 0 ? (
                <div className="p-8 text-center bg-slate-900/30 border border-slate-800/60 rounded-2xl animate-pulse">
                  <div className="w-8 h-8 rounded-full bg-slate-800 mx-auto mb-3"></div>
                  <p className="text-xs text-slate-400">Loading your scheduled monitors...</p>
                </div>
              ) : monitors.length === 0 ? (
                <div className="p-12 text-center bg-slate-900/20 border border-slate-800/60 rounded-2xl border-dashed">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mx-auto mb-3">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-bold text-slate-200 mb-1">No scheduled monitors configured</h3>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
                    Set up your first automated monitor to scan critical domain routes daily or weekly and catch regressions early.
                  </p>
                  <button
                    onClick={() => setShowCreateMonitorModal(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-lg shadow-indigo-500/20 cursor-pointer"
                  >
                    <span>+ Configure First Monitor</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {monitors.map((m) => {
                    const isRunning = runningMonitorId === m.id
                    return (
                      <div
                        key={m.id}
                        className={`p-5 rounded-2xl border transition-all ${
                          m.status === "active"
                            ? "bg-slate-900/40 backdrop-blur-md border-slate-800/60 hover:border-slate-700/80"
                            : "bg-slate-950/40 border-slate-900 opacity-75"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span
                                className={`w-2 h-2 rounded-full shrink-0 ${
                                  m.status === "active" ? "bg-emerald-400" : "bg-amber-400"
                                }`}
                              ></span>
                              <a
                                href={m.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs font-bold text-slate-200 hover:text-indigo-400 transition-colors truncate block"
                              >
                                {m.url}
                              </a>
                            </div>
                            <p className="text-3xs text-slate-500 mt-1">
                              Alerts: <span className="text-slate-400">{m.alert_email}</span> (threshold: &lt;{m.min_score_threshold}%)
                            </p>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-3xs font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 capitalize">
                              {m.frequency}
                            </span>
                            <span
                              className={`text-3xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                                m.status === "active"
                                  ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
                                  : "bg-amber-500/10 text-amber-300 border-amber-500/20"
                              }`}
                            >
                              {m.status}
                            </span>
                          </div>
                        </div>

                        {/* Middle Metric Row */}
                        <div className="p-3 bg-slate-950/60 border border-slate-850/60 rounded-xl mb-4 flex items-center justify-between text-xs">
                          <div>
                            <span className="text-3xs font-semibold text-slate-500 block uppercase">Latest Score</span>
                            {m.last_score !== null ? (
                              <span
                                className={`font-bold tabular-nums text-sm ${
                                  m.last_score >= 90
                                    ? "text-emerald-400"
                                    : m.last_score >= 75
                                    ? "text-amber-400"
                                    : "text-rose-400"
                                }`}
                              >
                                {m.last_score}% · {m.last_score >= 90 ? "Healthy" : m.last_score >= 75 ? "Review" : "Degraded"}
                              </span>
                            ) : (
                              <span className="text-3xs text-indigo-400 font-medium">Pending baseline audit</span>
                            )}
                          </div>

                          <div className="text-right">
                            <span className="text-3xs font-semibold text-slate-500 block uppercase">Next Scheduled Audit</span>
                            <span className="text-xs text-slate-300 font-medium tabular-nums">
                              {new Date(m.next_run_at).toLocaleDateString("en-AU", {
                                day: "numeric",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                        </div>

                        {/* Bottom Actions Bar */}
                        <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 text-2xs">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleRunMonitorNow(m.id)}
                              disabled={isRunning}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 font-semibold transition-colors cursor-pointer disabled:opacity-50"
                            >
                              {isRunning ? (
                                <>
                                  <svg className="animate-spin h-3 w-3 text-indigo-300" viewBox="0 0 24 24" fill="none">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                                  </svg>
                                  <span>Scanning...</span>
                                </>
                              ) : (
                                <>
                                  <span>⚡ Audit Now</span>
                                </>
                              )}
                            </button>

                            {m.last_scan_id && (
                              <Link
                                href={`/report/${m.last_scan_id}`}
                                target="_blank"
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 font-medium transition-colors"
                              >
                                <span>Report ↗</span>
                              </Link>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleToggleMonitorStatus(m.id, m.status)}
                              className="text-slate-400 hover:text-slate-200 font-medium transition-colors cursor-pointer px-2 py-1"
                            >
                              {m.status === "active" ? "Pause" : "Resume"}
                            </button>
                            <button
                              onClick={() => handleDeleteMonitor(m.id, m.url)}
                              className="text-rose-400 hover:text-rose-300 font-medium transition-colors cursor-pointer px-2 py-1"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      ) : activeTab === "api" ? (
        /* Developer API Tab */
        <div className="space-y-6">
          {!isPaid ? (
            /* Upgrade CTA Card for Free Users */
            <div className="relative bg-slate-900/40 backdrop-blur-md border border-slate-850/60 rounded-2xl p-8 max-w-2xl mx-auto overflow-hidden shadow-2xl text-center">
              <div className="absolute -top-16 -right-16 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mb-4">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
              </div>
              <h2 className="text-lg font-black text-slate-100 mb-2">Unlock Developer API Access</h2>
              <p className="text-sm text-slate-400 mb-6 leading-relaxed">
                Connect your codebase directly to Equivance. Automate accessibility testing by generating secure 
                programmatic API keys, triggering scans on deployment, and integrating audits directly into your CI/CD pipelines.
              </p>
              <div className="flex flex-col items-center gap-3">
                <BillingButton user={user} profile={profile} />
                <span className="text-2xs text-slate-500">Upgrade to Pro or Agency to generate API keys.</span>
              </div>
            </div>
          ) : (
            /* API Key Management for Pro/Agency Users */
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: Generate Key */}
              <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/60 rounded-2xl p-5 space-y-4 h-fit">
                <h2 className="text-sm font-bold text-slate-200">Create Developer Key</h2>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Generate a cryptographically secure token to authenticate programmatic scans. Give your key a descriptive name to identify where it is used. Refer to the{" "}
                  <Link href="/docs" className="text-indigo-400 hover:text-indigo-300 underline font-medium">
                    API Documentation
                  </Link>{" "}
                  for endpoints, authentication headers, and integration examples.
                </p>

                {errorMsg && (
                  <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-start gap-2">
                    <svg className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4c-.77-1.33-2.69-1.33-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3z" />
                    </svg>
                    <p className="text-2xs text-rose-400 font-medium leading-relaxed">{errorMsg}</p>
                  </div>
                )}

                <form onSubmit={handleGenerateKey} className="space-y-4">
                  <div className="space-y-1.5">
                    <label htmlFor="keyName" className="block text-2xs font-semibold text-slate-400 uppercase tracking-wider">
                      Key Name
                    </label>
                    <input
                      type="text"
                      id="keyName"
                      value={keyName}
                      onChange={(e) => setKeyName(e.target.value)}
                      placeholder="e.g. GitHub Actions Production"
                      required
                      disabled={isGenerating}
                      className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-50 placeholder-slate-600 focus:outline-hidden focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-50 transition-all"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isGenerating || !keyName.trim()}
                    className="w-full py-2.5 px-4 rounded-xl font-semibold text-xs bg-linear-to-r from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 text-white transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {isGenerating ? "Generating..." : "Generate API Key"}
                  </button>
                </form>

                {generatedKey && (
                  /* Secure Raw Key Display Banner */
                  <div className="p-4 bg-indigo-950/40 border border-indigo-500/30 rounded-xl space-y-3.5 animate-fadeIn">
                    <div className="flex items-center gap-1.5 text-indigo-400">
                      <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      <h3 className="text-xs font-bold">Key Generated Successfully!</h3>
                    </div>
                    <p className="text-2xs text-indigo-300/80 leading-relaxed">
                      Copy this secret key and store it securely. For security reasons, **you will not be able to see this key again**.
                    </p>
                    <div className="flex items-center gap-2 bg-slate-950 border border-slate-850 p-2.5 rounded-lg overflow-hidden">
                      <code className="text-2xs text-indigo-200 select-all font-mono truncate flex-1 leading-none">
                        {generatedKey}
                      </code>
                      <button
                        onClick={() => handleCopy(generatedKey)}
                        className="p-1.5 rounded-md hover:bg-slate-900 border border-transparent hover:border-slate-800 text-slate-400 hover:text-slate-50 transition-all shrink-0 cursor-pointer"
                        title="Copy to clipboard"
                      >
                        {copied ? (
                          <span className="text-2xs font-semibold text-emerald-400 leading-none">Copied!</span>
                        ) : (
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Key List Table */}
              <div className="lg:col-span-2 bg-slate-900/40 backdrop-blur-md border border-slate-800/60 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-slate-200">Active API Keys</h2>
                  <span className="text-xs text-slate-500 bg-slate-850/60 px-2 py-1 rounded-md tabular-nums">
                    {keys.length} key{keys.length !== 1 ? "s" : ""}
                  </span>
                </div>

                {isFetchingKeys ? (
                  <div className="py-20 text-center text-xs text-slate-500">Loading your developer keys...</div>
                ) : keys.length === 0 ? (
                  <div className="py-20 text-center border border-dashed border-slate-800/50 rounded-xl space-y-2">
                    <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 text-slate-400">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                      </svg>
                    </div>
                    <h3 className="text-xs font-semibold text-slate-400">No API keys created</h3>
                    <p className="text-2xs text-slate-500">Generate your first token using the form on the left.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-slate-800/50">
                    <table className="w-full text-xs min-w-[500px]">
                      <thead>
                        <tr className="bg-slate-900/60 border-b border-slate-800/60">
                          <th className="text-left px-4 py-2.5 font-semibold text-slate-400">Name</th>
                          <th className="text-left px-3 py-2.5 font-semibold text-slate-400">Token Preview</th>
                          <th className="text-left px-3 py-2.5 font-semibold text-slate-400">Last Used</th>
                          <th className="text-right px-4 py-2.5 font-semibold text-slate-400">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-850/40">
                        {keys.map((key) => {
                          const isRevoking = revokingId === key.id
                          return (
                            <tr key={key.id} className="hover:bg-slate-850/10 transition-colors">
                              <td className="px-4 py-3 font-medium text-slate-200">{key.name}</td>
                              <td className="px-3 py-3 text-slate-500 font-mono text-2xs">{key.key_preview}</td>
                              <td className="px-3 py-3 text-slate-400 whitespace-nowrap">{formatLastUsed(key.last_used_at)}</td>
                              <td className="px-4 py-3 text-right">
                                <button
                                  onClick={() => {
                                    if (confirm(`Are you sure you want to revoke key "${key.name}"? Programmatic systems using this key will immediately fail.`)) {
                                      handleRevokeKey(key.id)
                                    }
                                  }}
                                  disabled={isRevoking}
                                  className="px-2 py-1 text-2xs font-semibold text-rose-400 hover:text-slate-50 border border-rose-500/20 hover:border-rose-500 hover:bg-rose-500/10 rounded-md transition-colors disabled:opacity-50 cursor-pointer"
                                >
                                  {isRevoking ? "Revoking..." : "Revoke"}
                                </button>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Full-Width Interactive CI/CD Quality Gate Builder */}
              <div className="lg:col-span-3 bg-slate-900/40 backdrop-blur-md border border-slate-800/60 rounded-2xl p-6 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-bold text-slate-100">Turnkey CI/CD Quality Gate Builder</h2>
                      <span className="px-2 py-0.5 text-3xs font-extrabold uppercase tracking-wider bg-emerald-500/10 text-emerald-300 border border-emerald-500/25 rounded-md">
                        Automated PR Gate
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      Generate a ready-to-commit pipeline configuration that audits your staging or preview URL on every deployment and fails the build if accessibility thresholds are breached.
                    </p>
                  </div>
                </div>

                {/* Controls Row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-950/60 border border-slate-800/80 p-4 rounded-xl">
                  {/* Platform Selector */}
                  <div>
                    <label className="block text-2xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                      1. CI/CD Platform
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {([
                        { id: "github", label: "GitHub Actions" },
                        { id: "gitlab", label: "GitLab CI" },
                        { id: "curl", label: "Bash / cURL" },
                      ] as const).map((plat) => (
                        <button
                          key={plat.id}
                          type="button"
                          onClick={() => setCiPlatform(plat.id)}
                          className={`py-2 px-2 rounded-lg text-2xs font-bold border transition-all cursor-pointer ${
                            ciPlatform === plat.id
                              ? "bg-indigo-600/20 text-indigo-300 border-indigo-500/50"
                              : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
                          }`}
                        >
                          {plat.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Failure Threshold Selector */}
                  <div>
                    <label htmlFor="ci-threshold-select" className="block text-2xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                      2. Build Failure Threshold
                    </label>
                    <select
                      id="ci-threshold-select"
                      value={ciThreshold}
                      onChange={(e) => setCiThreshold(e.target.value as "critical" | "serious" | "strict")}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                    >
                      <option value="critical">Block on Critical Violations Only (critical &gt; 0)</option>
                      <option value="serious">Block on Critical + Serious (Recommended)</option>
                      <option value="strict">Zero-Violation Strict Mode (violations &gt; 0)</option>
                    </select>
                  </div>

                  {/* Target URL Input */}
                  <div>
                    <label htmlFor="ci-target-url" className="block text-2xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                      3. Target Staging / Preview URL
                    </label>
                    <input
                      id="ci-target-url"
                      type="url"
                      value={ciTargetUrl}
                      onChange={(e) => setCiTargetUrl(e.target.value)}
                      placeholder="https://staging.example.com"
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* Generated Pipeline Code */}
                {(() => {
                  const origin = typeof window !== "undefined" ? window.location.origin : "https://equivance.app"
                  const target = ciTargetUrl.trim() || "https://staging.example.com"
                  const jqCondition =
                    ciThreshold === "critical"
                      ? "(.summary.critical // 0) > 0"
                      : ciThreshold === "serious"
                      ? "((.summary.critical // 0) + (.summary.serious // 0)) > 0"
                      : "(.violations_count // 0) > 0"
                  const gateDescription =
                    ciThreshold === "critical"
                      ? "Critical violations > 0"
                      : ciThreshold === "serious"
                      ? "Critical + Serious violations > 0"
                      : "Total violations > 0 (Strict Zero-Violation Gate)"

                  const bashScript = `#!/usr/bin/env bash
set -euo pipefail

# Equivance WCAG 2.2 AA Quality Gate (${gateDescription})
API_BASE="${origin}"
TARGET_URL="${target}"

echo "Triggering WCAG 2.2 AA accessibility scan for \${TARGET_URL}..."
INIT_RES=$(curl -sS -X POST "\${API_BASE}/api/scan" \\
  -H "Authorization: Bearer \${EQUIVANCE_API_KEY}" \\
  -H "Content-Type: application/json" \\
  -d "{\\"url\\": \\"\${TARGET_URL}\\"}")

SCAN_ID=$(echo "\${INIT_RES}" | jq -r '.scanId // empty')
if [ -z "\${SCAN_ID}" ]; then
  echo "Failed to start scan: \${INIT_RES}"
  exit 1
fi

echo "Scan queued (ID: \${SCAN_ID}). Polling for completion..."
for i in {1..30}; do
  sleep 4
  STATUS_RES=$(curl -sS "\${API_BASE}/api/scan?scanId=\${SCAN_ID}" \\
    -H "Authorization: Bearer \${EQUIVANCE_API_KEY}")
  STATUS=$(echo "\${STATUS_RES}" | jq -r '.status')

  if [ "\${STATUS}" = "completed" ]; then
    SCORE=$(echo "\${STATUS_RES}" | jq -r '.score // 0')
    CRITICAL=$(echo "\${STATUS_RES}" | jq -r '.summary.critical // 0')
    SERIOUS=$(echo "\${STATUS_RES}" | jq -r '.summary.serious // 0')
    TOTAL=$(echo "\${STATUS_RES}" | jq -r '.violations_count // 0')
    echo "Audit Complete! Score: \${SCORE}/100 | Critical: \${CRITICAL} | Serious: \${SERIOUS} | Total: \${TOTAL}"
    echo "Verification Report: \${API_BASE}/report/\${SCAN_ID}?verify=1"

    if echo "\${STATUS_RES}" | jq -e '${jqCondition}' >/dev/null; then
      echo "Accessibility Quality Gate FAILED (${gateDescription})."
      exit 1
    fi
    echo "Accessibility Quality Gate PASSED!"
    exit 0
  elif [ "\${STATUS}" = "failed" ]; then
    echo "Scan failed: \$(echo "\${STATUS_RES}" | jq -r '.error_message')"
    exit 1
  fi
done

echo "Timed out waiting for accessibility scan."
exit 1`

                  const githubYaml = `# .github/workflows/equivance-audit.yml
name: WCAG 2.2 AA Accessibility Gate

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  accessibility-audit:
    runs-on: ubuntu-latest
    steps:
      - name: Run Equivance WCAG 2.2 AA Audit (${gateDescription})
        env:
          EQUIVANCE_API_KEY: \${{ secrets.EQUIVANCE_API_KEY }}
        run: |
${bashScript
  .split("\n")
  .slice(2)
  .map((line) => `          ${line}`)
  .join("\n")}`

                  const gitlabYaml = `# .gitlab-ci.yml
accessibility_audit:
  stage: test
  image: alpine:3.20
  before_script:
    - apk add --no-cache curl jq bash
  script:
    - |
${bashScript
  .split("\n")
  .slice(2)
  .map((line) => `      ${line}`)
  .join("\n")}
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH`

                  const activeSnippet =
                    ciPlatform === "github"
                      ? githubYaml
                      : ciPlatform === "gitlab"
                      ? gitlabYaml
                      : bashScript

                  const fileLabel =
                    ciPlatform === "github"
                      ? ".github/workflows/equivance-audit.yml"
                      : ciPlatform === "gitlab"
                      ? ".gitlab-ci.yml"
                      : "scripts/a11y-gate.sh"

                  return (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-2xs font-mono text-slate-400">
                          {fileLabel} · Store your key in <code className="text-indigo-300">EQUIVANCE_API_KEY</code>
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(activeSnippet)
                            setCopiedCi(true)
                            setTimeout(() => setCopiedCi(false), 2000)
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-2xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors cursor-pointer"
                        >
                          {copiedCi ? "Copied Workflow!" : `Copy ${fileLabel}`}
                        </button>
                      </div>
                      <pre className="text-2xs bg-slate-950 border border-slate-800 p-4 rounded-xl overflow-x-auto max-h-80 font-mono text-slate-300 leading-relaxed">
                        {activeSnippet}
                      </pre>
                    </div>
                  )
                })()}
              </div>
            </div>
          )}
        </div>
      ) : activeTab === "team" ? (
        /* Team Access Tab */
        <div className="space-y-6">
          {tier !== "agency" ? (
            /* Upgrade CTA Card for Non-Agency Users */
            <div className="relative bg-slate-900/40 backdrop-blur-md border border-slate-850/60 rounded-2xl p-8 max-w-2xl mx-auto overflow-hidden shadow-2xl text-center">
              <div className="absolute -top-16 -right-16 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mb-4">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h2 className="text-lg font-black text-slate-100 mb-2">Team Access (3 Multi-User Seats)</h2>
              <p className="text-sm text-slate-400 mb-6 leading-relaxed">
                Scale accessibility auditing across your agency and engineering team. Collaborate within a unified workspace with 3 dedicated seats (1 Agency Owner + 2 Team Members) and a shared high-volume monthly scan pool (600 scans).
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left mb-8 max-w-lg mx-auto">
                <div className="p-3 bg-slate-950/50 border border-slate-800/80 rounded-xl space-y-1">
                  <div className="text-xs font-semibold text-slate-200">3 Dedicated Seats</div>
                  <div className="text-2xs text-slate-400">Collaborate with designers, devs, and QA specialists under one roof.</div>
                </div>
                <div className="p-3 bg-slate-950/50 border border-slate-800/80 rounded-xl space-y-1">
                  <div className="text-xs font-semibold text-slate-200">Shared 600 Scans/Mo</div>
                  <div className="text-2xs text-slate-400">Centralized monthly pool shared seamlessly across all team members.</div>
                </div>
                <div className="p-3 bg-slate-950/50 border border-slate-800/80 rounded-xl space-y-1">
                  <div className="text-xs font-semibold text-slate-200">Shared Audit Archives</div>
                  <div className="text-2xs text-slate-400">Instant visibility into scans, trends, and remediation tickets team-wide.</div>
                </div>
                <div className="p-3 bg-slate-950/50 border border-slate-800/80 rounded-xl space-y-1">
                  <div className="text-xs font-semibold text-slate-200">White-Label Branding</div>
                  <div className="text-2xs text-slate-400">Custom agency logos, headers, and footer disclaimers on all PDF reports.</div>
                </div>
              </div>

              <div className="flex flex-col items-center gap-3">
                <BillingButton user={user} profile={profile} />
                <span className="text-2xs text-slate-500">Upgrade to Agency for $59/month to activate Team Access.</span>
              </div>
            </div>
          ) : (
            /* Agency Team Workspace Management */
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: Team Capacity & Invite Form */}
              <div className="space-y-6">
                {/* Workspace Capacity Card */}
                <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/60 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-bold text-slate-200">{teamData?.team.name || "Agency Workspace"}</h2>
                    <span className="text-2xs font-semibold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                      Agency Plan
                    </span>
                  </div>

                  {/* Seat Meter Visual */}
                  <div className="p-4 bg-slate-950/60 border border-slate-850 rounded-xl space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-medium">Team Seats</span>
                      <span className="text-slate-200 font-bold tabular-nums">
                        {teamData?.team.seatsUsed ?? 1} of {teamData?.team.maxSeats ?? 3} Claimed
                      </span>
                    </div>

                    {/* Seat indicators */}
                    <div className="flex items-center gap-2 pt-1">
                      {[0, 1, 2].map((idx) => {
                        const isOccupied = idx < (teamData?.team.seatsUsed ?? 1)
                        return (
                          <div
                            key={idx}
                            className={`flex-1 flex items-center justify-center py-2 rounded-lg border text-xs font-bold transition-all ${
                              isOccupied
                                ? "bg-indigo-600/20 border-indigo-500/40 text-indigo-300"
                                : "bg-slate-900/30 border-dashed border-slate-800 text-slate-600"
                            }`}
                          >
                            {isOccupied ? `Seat ${idx + 1} ✓` : `Seat ${idx + 1} Open`}
                          </div>
                        )
                      })}
                    </div>

                    <p className="text-2xs text-slate-500 leading-relaxed pt-1">
                      All team members share your monthly allowance of <strong className="text-slate-400">600 audits</strong> and have permission to run scans and export compliance reports.
                    </p>
                  </div>
                </div>

                {/* Invite Member Form (for Owner) */}
                {teamData?.isOwner ? (
                  <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/60 rounded-2xl p-5 space-y-4">
                    <h2 className="text-sm font-bold text-slate-200">Invite Team Member</h2>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Invite a designer, developer, or QA colleague to your agency workspace. They will receive an email invitation to collaborate.
                    </p>

                    {inviteError && (
                      <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs flex items-start gap-2">
                        <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4c-.77-1.33-2.69-1.33-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3z" />
                        </svg>
                        <span>{inviteError}</span>
                      </div>
                    )}

                    {inviteSuccess && (
                      <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs flex items-start gap-2">
                        <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        <span>{inviteSuccess}</span>
                      </div>
                    )}

                    {latestInviteUrl && (
                      <div className="p-3.5 bg-indigo-950/40 border border-indigo-500/30 rounded-xl space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-2xs font-semibold text-indigo-300">Direct Invite Link:</span>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(latestInviteUrl)
                              setCopiedInviteUrl(true)
                              setTimeout(() => setCopiedInviteUrl(false), 2000)
                            }}
                            className="text-2xs text-indigo-400 hover:text-indigo-200 underline cursor-pointer"
                          >
                            {copiedInviteUrl ? "Copied!" : "Copy Link"}
                          </button>
                        </div>
                        <p className="text-2xs text-slate-400 font-mono break-all select-all bg-slate-950 p-2 rounded border border-slate-800">
                          {latestInviteUrl}
                        </p>
                      </div>
                    )}

                    <form onSubmit={handleInviteMember} className="space-y-4">
                      <div className="space-y-1.5">
                        <label htmlFor="inviteEmail" className="block text-2xs font-semibold text-slate-400 uppercase tracking-wider">
                          Teammate Email
                        </label>
                        <input
                          type="email"
                          id="inviteEmail"
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                          placeholder="colleague@agency.com"
                          required
                          disabled={isInviting || (teamData?.team.seatsRemaining ?? 0) <= 0}
                          className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-50 placeholder-slate-600 focus:outline-hidden focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-50 transition-all"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={isInviting || !inviteEmail.trim() || (teamData?.team.seatsRemaining ?? 0) <= 0}
                        className="w-full py-2.5 px-4 rounded-xl font-semibold text-xs bg-linear-to-r from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 text-white transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                      >
                        {isInviting
                          ? "Sending Invite..."
                          : (teamData?.team.seatsRemaining ?? 0) <= 0
                          ? "All 3 Seats Occupied"
                          : "Send Team Invite"}
                      </button>
                    </form>
                  </div>
                ) : (
                  <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/60 rounded-2xl p-5 space-y-3">
                    <h2 className="text-sm font-bold text-slate-200">Team Member Access</h2>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      You are a team member of this agency workspace. Scans you run are shared with your team and draw from the 600 monthly scan allowance.
                    </p>
                  </div>
                )}
              </div>

              {/* Right Column: Member Roster Table */}
              <div className="lg:col-span-2 bg-slate-900/40 backdrop-blur-md border border-slate-800/60 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-slate-200">Active Roster</h2>
                  <span className="text-xs text-slate-500 bg-slate-850/60 px-2 py-1 rounded-md tabular-nums">
                    {teamData?.members?.length ?? 1} member{teamData?.members?.length !== 1 ? "s" : ""}
                  </span>
                </div>

                {isFetchingTeam ? (
                  <div className="py-20 text-center text-xs text-slate-500">Loading team members...</div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-slate-800/50">
                    <table className="w-full text-xs min-w-[500px]">
                      <thead>
                        <tr className="bg-slate-900/60 border-b border-slate-800/60">
                          <th className="text-left px-4 py-2.5 font-semibold text-slate-400">User / Email</th>
                          <th className="text-left px-3 py-2.5 font-semibold text-slate-400">Role</th>
                          <th className="text-left px-3 py-2.5 font-semibold text-slate-400">Status</th>
                          <th className="text-left px-3 py-2.5 font-semibold text-slate-400">Joined</th>
                          <th className="text-right px-4 py-2.5 font-semibold text-slate-400">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-850/40">
                        {teamData?.members?.map((member: any) => {
                          const isOwnerRow = member.role === "owner"
                          const isCurrentSelf = member.user_id === user.id
                          const isRemoving = removingMemberId === member.id

                          return (
                            <tr key={member.id} className="hover:bg-slate-850/10 transition-colors">
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-2xs font-bold text-slate-300">
                                    {member.email.slice(0, 2).toUpperCase()}
                                  </div>
                                  <div>
                                    <p className="font-medium text-slate-200">
                                      {member.email} {isCurrentSelf && <span className="text-indigo-400 text-2xs">(You)</span>}
                                    </p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-3 py-3">
                                <span
                                  className={`px-2 py-0.5 rounded text-2xs font-semibold uppercase tracking-wider ${
                                    isOwnerRow
                                      ? "bg-indigo-500/15 text-indigo-300 border border-indigo-500/25"
                                      : "bg-slate-800 text-slate-400 border border-slate-700"
                                  }`}
                                >
                                  {member.role}
                                </span>
                              </td>
                              <td className="px-3 py-3">
                                <span
                                  className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-2xs font-medium ${
                                    member.status === "active"
                                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                      : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                  }`}
                                >
                                  <span className={`w-1.5 h-1.5 rounded-full ${member.status === "active" ? "bg-emerald-400" : "bg-amber-400"}`} />
                                  {member.status === "active" ? "Active" : "Pending Invite"}
                                </span>
                              </td>
                              <td className="px-3 py-3 text-slate-400 whitespace-nowrap">
                                {new Date(member.created_at).toLocaleDateString("en-AU", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                })}
                              </td>
                              <td className="px-4 py-3 text-right">
                                {isOwnerRow ? (
                                  <span className="text-2xs text-slate-600 font-medium">Workspace Owner</span>
                                ) : teamData.isOwner ? (
                                  <div className="flex items-center justify-end gap-2">
                                    {member.status === "pending" && member.invite_token && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const url = `${window.location.origin}/auth/join?token=${member.invite_token}`
                                          navigator.clipboard.writeText(url)
                                          alert("Invite link copied to clipboard!")
                                        }}
                                        className="text-2xs text-indigo-400 hover:text-indigo-300 underline cursor-pointer"
                                      >
                                        Copy Link
                                      </button>
                                    )}
                                    <button
                                      onClick={() => handleRemoveMember(member.id, member.email)}
                                      disabled={isRemoving}
                                      className="px-2 py-1 text-2xs font-semibold text-rose-400 hover:text-slate-50 border border-rose-500/20 hover:border-rose-500 hover:bg-rose-500/10 rounded-md transition-colors disabled:opacity-50 cursor-pointer"
                                    >
                                      {isRemoving ? "Removing..." : member.status === "pending" ? "Cancel Invite" : "Remove"}
                                    </button>
                                  </div>
                                ) : isCurrentSelf ? (
                                  <button
                                    onClick={() => handleRemoveMember(member.id, member.email)}
                                    disabled={isRemoving}
                                    className="px-2 py-1 text-2xs font-semibold text-rose-400 hover:text-slate-50 border border-rose-500/20 hover:border-rose-500 hover:bg-rose-500/10 rounded-md transition-colors disabled:opacity-50 cursor-pointer"
                                  >
                                    {isRemoving ? "Leaving..." : "Leave Team"}
                                  </button>
                                ) : (
                                  <span className="text-2xs text-slate-600">—</span>
                                )}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* White-Label Custom Branding Tab */
        <div className="space-y-6">
          {tier !== "agency" ? (
            /* Upgrade CTA Card for Non-Agency Users */
            <div className="relative bg-slate-900/40 backdrop-blur-md border border-slate-850/60 rounded-2xl p-8 max-w-2xl mx-auto overflow-hidden shadow-2xl text-center">
              <div className="absolute -top-16 -right-16 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mb-4">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              </div>
              <h2 className="text-lg font-black text-slate-100 mb-2">White-Label Custom Branding</h2>
              <p className="text-sm text-slate-400 mb-6 leading-relaxed">
                Deliver executive-ready accessibility compliance audits to your clients with your own agency identity, logo, custom color palette, and bespoke legal disclaimers. 100% white-label with no third-party branding.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left mb-8 max-w-lg mx-auto">
                <div className="p-3 bg-slate-950/50 border border-slate-800/80 rounded-xl space-y-1">
                  <div className="text-xs font-semibold text-slate-200">Custom Agency Logo</div>
                  <div className="text-2xs text-slate-400">Embed your high-res SVG or PNG logo right on the cover of all PDF and web reports.</div>
                </div>
                <div className="p-3 bg-slate-950/50 border border-slate-800/80 rounded-xl space-y-1">
                  <div className="text-xs font-semibold text-slate-200">Brand Color Alignment</div>
                  <div className="text-2xs text-slate-400">Match report accent badges, headers, and score meters to your agency color palette.</div>
                </div>
                <div className="p-3 bg-slate-950/50 border border-slate-800/80 rounded-xl space-y-1">
                  <div className="text-xs font-semibold text-slate-200">Bespoke Disclaimers</div>
                  <div className="text-2xs text-slate-400">Add proprietary audit scopes, assessor contacts, and custom confidentiality notices.</div>
                </div>
                <div className="p-3 bg-slate-950/50 border border-slate-800/80 rounded-xl space-y-1">
                  <div className="text-xs font-semibold text-slate-200">100% Watermark Removal</div>
                  <div className="text-2xs text-slate-400">Completely strip &quot;Generated by Equivance&quot; for a seamless, white-label client deliverable.</div>
                </div>
              </div>

              <div className="flex flex-col items-center gap-3">
                <BillingButton user={user} profile={profile} />
                <span className="text-2xs text-slate-500">Upgrade to Agency for $59/month to unlock Custom Branding.</span>
              </div>
            </div>
          ) : (
            /* Agency White-Label Studio */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Branding Controls Form (5 cols) */}
              <div className="lg:col-span-5 bg-slate-900/40 backdrop-blur-md border border-slate-800/60 rounded-2xl p-5 space-y-5">
                <div>
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-bold text-slate-200">Agency Branding Studio</h2>
                    <span className="text-2xs font-semibold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                      Agency Plan
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Customize the branding applied to all client web reports and downloadable PDF exports.
                  </p>
                </div>

                {brandingError && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs flex items-start gap-2">
                    <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4c-.77-1.33-2.69-1.33-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3z" />
                    </svg>
                    <span>{brandingError}</span>
                  </div>
                )}

                {brandingSuccess && (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs flex items-start gap-2">
                    <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>{brandingSuccess}</span>
                  </div>
                )}

                {isFetchingBranding ? (
                  <div className="py-12 text-center text-xs text-slate-500">Loading branding settings...</div>
                ) : (
                  <form onSubmit={handleSaveBranding} className="space-y-4">
                    {/* Brand / Agency Name */}
                    <div className="space-y-1.5">
                      <label htmlFor="brandName" className="block text-2xs font-semibold text-slate-400 uppercase tracking-wider">
                        Company / Agency Name
                      </label>
                      <input
                        type="text"
                        id="brandName"
                        value={brandName}
                        onChange={(e) => setBrandName(e.target.value)}
                        placeholder="e.g. Acme Design & Accessibility Co."
                        maxLength={80}
                        className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-50 placeholder-slate-600 focus:outline-hidden focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                      />
                    </div>

                    {/* Brand Logo URL & Upload */}
                    <div className="space-y-1.5">
                      <label htmlFor="brandLogoUrl" className="block text-2xs font-semibold text-slate-400 uppercase tracking-wider">
                        Brand Logo (Image URL or Upload)
                      </label>
                      <input
                        type="text"
                        id="brandLogoUrl"
                        value={brandLogoUrl.startsWith("data:") ? "[Uploaded Image Encoded]" : brandLogoUrl}
                        onChange={(e) => setBrandLogoUrl(e.target.value)}
                        placeholder="https://youragency.com/logo.png"
                        className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-50 placeholder-slate-600 focus:outline-hidden focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all font-mono"
                      />

                      <div className="flex items-center gap-2 pt-1">
                        <label className="px-3 py-1.5 rounded-lg border border-slate-750 bg-slate-850 hover:bg-slate-800 text-slate-300 text-2xs font-semibold cursor-pointer transition-colors">
                          Upload Image File
                          <input
                            type="file"
                            accept="image/png, image/jpeg, image/svg+xml, image/webp"
                            onChange={handleLogoUpload}
                            className="hidden"
                          />
                        </label>
                        {brandLogoUrl && (
                          <button
                            type="button"
                            onClick={() => setBrandLogoUrl("")}
                            className="text-2xs text-rose-400 hover:text-rose-300 underline cursor-pointer"
                          >
                            Clear Logo
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Brand Primary Color */}
                    <div className="space-y-1.5">
                      <label className="block text-2xs font-semibold text-slate-400 uppercase tracking-wider">
                        Brand Accent Color
                      </label>
                      {/* Preset color swatches */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {[
                          { name: "Indigo", hex: "#4f46e5" },
                          { name: "Emerald", hex: "#059669" },
                          { name: "Sky", hex: "#0284c7" },
                          { name: "Violet", hex: "#7c3aed" },
                          { name: "Rose", hex: "#e11d48" },
                          { name: "Amber", hex: "#d97706" },
                        ].map((preset) => (
                          <button
                            key={preset.hex}
                            type="button"
                            onClick={() => setBrandPrimaryColor(preset.hex)}
                            className={`w-7 h-7 rounded-lg border-2 transition-transform cursor-pointer ${
                              brandPrimaryColor.toLowerCase() === preset.hex.toLowerCase()
                                ? "scale-110 border-white shadow-md ring-2 ring-indigo-500/40"
                                : "border-transparent opacity-80 hover:opacity-100"
                            }`}
                            style={{ backgroundColor: preset.hex }}
                            title={preset.name}
                          />
                        ))}
                        <div className="flex items-center gap-1.5 ml-1 bg-slate-950/60 border border-slate-800 rounded-lg px-2 py-1">
                          <input
                            type="color"
                            value={brandPrimaryColor}
                            onChange={(e) => setBrandPrimaryColor(e.target.value)}
                            className="w-5 h-5 rounded cursor-pointer border-0 bg-transparent"
                          />
                          <span className="text-2xs font-mono text-slate-300 select-all">{brandPrimaryColor}</span>
                        </div>
                      </div>
                    </div>

                    {/* Report Tagline / Document Subtitle */}
                    <div className="space-y-1.5">
                      <label htmlFor="brandTagline" className="block text-2xs font-semibold text-slate-400 uppercase tracking-wider">
                        Report Header Subtitle
                      </label>
                      <input
                        type="text"
                        id="brandTagline"
                        value={brandTagline}
                        onChange={(e) => setBrandTagline(e.target.value)}
                        placeholder="Accessibility Audit Report"
                        maxLength={120}
                        className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-50 placeholder-slate-600 focus:outline-hidden focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                      />
                    </div>

                    {/* Custom Footer Disclaimer */}
                    <div className="space-y-1.5">
                      <label htmlFor="brandFooterText" className="block text-2xs font-semibold text-slate-400 uppercase tracking-wider">
                        Custom Footer Disclaimer
                      </label>
                      <textarea
                        id="brandFooterText"
                        value={brandFooterText}
                        onChange={(e) => setBrandFooterText(e.target.value)}
                        placeholder="e.g. Confidential audit report prepared for Client Corp. Contact audit@agency.com for support."
                        rows={2}
                        maxLength={250}
                        className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-50 placeholder-slate-600 focus:outline-hidden focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all resize-none"
                      />
                    </div>

                    {/* Hide Watermark Toggle */}
                    <div className="flex items-center justify-between p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl">
                      <div className="space-y-0.5">
                        <label htmlFor="hideWatermark" className="text-xs font-semibold text-slate-200 cursor-pointer">
                          Hide &quot;Powered by Equivance&quot;
                        </label>
                        <p className="text-2xs text-slate-500">
                          Completely remove third-party logos and platform attribution from all client reports.
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        id="hideWatermark"
                        checked={brandHideWatermark}
                        onChange={(e) => setBrandHideWatermark(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-700 text-indigo-600 focus:ring-indigo-500/30 cursor-pointer shrink-0"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSavingBranding}
                      className="w-full py-3 px-4 rounded-xl font-semibold text-xs bg-linear-to-r from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 text-white transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {isSavingBranding ? "Saving Branding..." : "Save Branding Settings"}
                    </button>
                  </form>
                )}
              </div>

              {/* Right Column: Live Real-Time Interactive Mockup Preview (7 cols) */}
              <div className="lg:col-span-7 bg-slate-900/40 backdrop-blur-md border border-slate-800/60 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-bold text-slate-200">Interactive Client Preview</h2>
                    <p className="text-2xs text-slate-500 mt-0.5">
                      Real-time preview of your executive PDF export and web report layout.
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-2xs font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Live Canvas</span>
                  </div>
                </div>

                {/* Scaled Document Canvas (Simulated White Paper) */}
                <div className="bg-white rounded-xl p-6 sm:p-8 text-slate-900 shadow-2xl border border-slate-200 space-y-6 text-left select-none">
                  {/* Document Header */}
                  <div className="flex items-start justify-between pb-6 border-b-2 border-slate-200 gap-4 flex-wrap sm:flex-nowrap">
                    <div className="space-y-2 max-w-full sm:max-w-[70%]">
                      {brandLogoUrl ? (
                        <img
                          src={brandLogoUrl}
                          alt="Brand Logo"
                          className="max-h-[38px] max-w-[180px] object-contain"
                        />
                      ) : (
                        <div className="flex items-center gap-2">
                          {!brandHideWatermark && <BrandLogo size={22} />}
                          <span className="text-lg font-black tracking-tight" style={{ color: brandPrimaryColor }}>
                            {brandName.trim() || "Equivance"}
                          </span>
                        </div>
                      )}
                      <h1 className="text-xl font-bold text-slate-900 tracking-tight leading-tight">
                        {brandTagline.trim() || "Accessibility Audit Report"}
                      </h1>
                      <p className="text-xs text-slate-500 font-mono truncate">
                        https://client-production.com
                      </p>
                      <span
                        className="inline-block px-2.5 py-0.5 rounded-full text-2xs font-bold border"
                        style={{
                          borderColor: `${brandPrimaryColor}40`,
                          color: brandPrimaryColor,
                          backgroundColor: `${brandPrimaryColor}10`,
                        }}
                      >
                        WCAG 2.1 Level AA · Automated
                      </span>
                    </div>

                    <div className="text-left sm:text-right shrink-0">
                      <p className="text-2xs text-slate-400 font-medium">Generated</p>
                      <p className="text-xs font-bold text-slate-700">
                        {new Date().toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                      <p className="text-2xs text-slate-400 mt-1">{email}</p>
                    </div>
                  </div>

                  {/* Summary Score Boxes */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div className="p-2.5 bg-rose-50 border border-rose-100 rounded-lg text-center">
                      <p className="text-lg font-black text-rose-600">2</p>
                      <p className="text-3xs uppercase font-bold text-slate-500">Critical</p>
                    </div>
                    <div className="p-2.5 bg-orange-50 border border-orange-100 rounded-lg text-center">
                      <p className="text-lg font-black text-orange-600">4</p>
                      <p className="text-3xs uppercase font-bold text-slate-500">Serious</p>
                    </div>
                    <div className="p-2.5 bg-amber-50 border border-amber-100 rounded-lg text-center">
                      <p className="text-lg font-black text-amber-600">11</p>
                      <p className="text-3xs uppercase font-bold text-slate-500">Moderate</p>
                    </div>
                    <div className="p-2.5 bg-blue-50 border border-blue-100 rounded-lg text-center">
                      <p className="text-lg font-black text-blue-600">3</p>
                      <p className="text-3xs uppercase font-bold text-slate-500">Minor</p>
                    </div>
                  </div>

                  {/* Compliance Pass Rate Meter */}
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-600">Pass Rate</span>
                      <span className="text-slate-900">45 / 55 checks passed (82%)</span>
                    </div>
                    <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: "82%", backgroundColor: brandPrimaryColor }} />
                    </div>
                  </div>

                  {/* Sample Violation Card */}
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2 border-l-4 border-l-rose-500">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-900">1. Images must have alternate text</h4>
                      <span className="px-2 py-0.5 rounded-full text-3xs font-bold uppercase bg-rose-100 text-rose-700">
                        Critical
                      </span>
                    </div>
                    <p className="text-2xs text-slate-600 leading-relaxed">
                      Ensure &lt;img&gt; elements have alternative text or a role of none or presentation.
                    </p>
                    <p className="text-3xs text-slate-500">
                      Rule: <code className="bg-slate-200 px-1 py-0.5 rounded">image-alt</code> ·{" "}
                      <span className="font-semibold underline" style={{ color: brandPrimaryColor }}>
                        Learn more ↗
                      </span>
                    </p>
                  </div>

                  {/* Document Footer */}
                  <div className="pt-4 border-t border-slate-200 text-center space-y-1">
                    {brandFooterText && (
                      <p className="text-xs font-semibold text-slate-700">{brandFooterText}</p>
                    )}
                    <p className="text-2xs text-slate-400">
                      {brandHideWatermark
                        ? `Audit conducted on ${new Date().toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })} · Evaluated against WCAG 2.1 Level AA`
                        : `Generated by ${brandName.trim() || "Equivance"} · Powered by axe-core · ${new Date().toISOString()}`
                      }
                    </p>
                  </div>
                </div>

                {scans.length > 0 && (
                  <div className="pt-2 flex justify-end">
                    <a
                      href={`/report/${scans[0].id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-200 text-2xs font-semibold transition-colors"
                    >
                      <span>Open Real Scan in Web View</span>
                      <span>↗</span>
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
