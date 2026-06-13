"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { ScanRecord } from "@/lib/types"
import StatsCards from "@/components/dashboard/stats_cards"
import ScanTable from "@/components/dashboard/scan_table"
import TrendChart from "@/components/dashboard/trend_chart"
import BillingButton from "@/components/billing_button"

interface DashboardClientProps {
  scans: ScanRecord[]
  tier: string
  email: string
  user: any
  profile: any
}

export default function DashboardClient({ scans, tier, email, user, profile }: DashboardClientProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "api">("overview")
  const [selectedUrl, setSelectedUrl] = useState<string | null>(null)
  
  // API Keys state
  const [keys, setKeys] = useState<any[]>([])
  const [isFetchingKeys, setIsFetchingKeys] = useState(false)
  const [keyName, setKeyName] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedKey, setGeneratedKey] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [revokingId, setRevokingId] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const isPaid = tier === "pro" || tier === "agency"

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

  useEffect(() => {
    if (activeTab === "api" && isPaid) {
      fetchKeys()
    }
  }, [activeTab, tier])

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
          <h1 className="text-2xl font-black text-white tracking-tight">Dashboard</h1>
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

      {/* Tabs */}
      <div className="flex border-b border-slate-900/60 gap-1 pb-px">
        <button
          onClick={() => setActiveTab("overview")}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === "overview"
              ? "border-indigo-500 text-white font-bold"
              : "border-transparent text-slate-500 hover:text-slate-300"
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab("api")}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === "api"
              ? "border-indigo-500 text-white font-bold"
              : "border-transparent text-slate-500 hover:text-slate-300"
          }`}
        >
          Developer API
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === "overview" ? (
        <div className="space-y-6">
          {/* Stats */}
          <StatsCards scans={scans} />

          {/* Trend chart */}
          <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/60 rounded-2xl p-5">
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
              <h2 className="text-sm font-bold text-slate-200">All Scans</h2>
              <span className="text-xs text-slate-500 bg-slate-800/60 px-2 py-1 rounded-md tabular-nums">
                {scans.length} total
              </span>
            </div>
            <ScanTable scans={scans} tier={tier} onUrlSelect={setSelectedUrl} selectedUrl={selectedUrl} />
          </div>
        </div>
      ) : (
        /* Developer API Tab */
        <div className="space-y-6">
          {!isPaid ? (
            /* Upgrade CTA Card for Free Users */
            <div className="relative bg-slate-900/40 backdrop-blur-md border border-slate-850/60 rounded-2xl p-8 max-w-2xl mx-auto overflow-hidden shadow-2xl text-center">
              <div className="absolute -top-16 -right-16 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
              <p className="text-4xl mb-4">🔑</p>
              <h2 className="text-lg font-black text-slate-100 mb-2">Unlock Developer API Access</h2>
              <p className="text-sm text-slate-400 mb-6 leading-relaxed">
                Connect your codebase directly to A11ytica Pro. Automate accessibility testing by generating secure 
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
                    <span className="text-xs">⚠️</span>
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
                      className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-hidden focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-50 transition-all"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isGenerating || !keyName.trim()}
                    className="w-full py-2.5 px-4 rounded-xl font-semibold text-xs bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {isGenerating ? "Generating..." : "Generate API Key"}
                  </button>
                </form>

                {generatedKey && (
                  /* Secure Raw Key Display Banner */
                  <div className="p-4 bg-indigo-950/40 border border-indigo-500/30 rounded-xl space-y-3.5 animate-fadeIn">
                    <div className="flex items-center gap-1.5 text-indigo-400">
                      <span className="text-xs">🎉</span>
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
                        className="p-1.5 rounded-md hover:bg-slate-900 border border-transparent hover:border-slate-800 text-slate-400 hover:text-white transition-all shrink-0 cursor-pointer"
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
                    <p className="text-2xl">🗝️</p>
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
                                  className="px-2 py-1 text-2xs font-semibold text-rose-400 hover:text-white border border-rose-500/20 hover:border-rose-500 hover:bg-rose-500/10 rounded-md transition-colors disabled:opacity-50 cursor-pointer"
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
            </div>
          )}
        </div>
      )}
    </div>
  )
}
