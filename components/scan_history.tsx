"use client"

import { useState } from "react"
import { ScanResult } from "@/lib/types"
import { SwipeCard } from "./motion/swipe-card"

interface ScanRecord {
  id: string
  url: string
  created_at: string
  violations: number
  passes: number
  summary: {
    critical: number
    serious: number
    moderate: number
    minor: number
  } | null
  result: ScanResult | null
}

interface ScanHistoryProps {
  scans: ScanRecord[]
  onLoadResult: (result: ScanResult, scanId?: string) => void
  tier?: string
  onUpgradeClick?: () => void
}

function timeAgo(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return "just now"
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function severityDot(count: number, color: string) {
  if (count === 0) return null
  return (
    <span className={`inline-flex items-center gap-1 text-2xs font-medium ${color}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
      {count}
    </span>
  )
}

export default function ScanHistory({ scans, onLoadResult, tier, onUpgradeClick }: ScanHistoryProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  // Rows the user has swiped away this session (immutable Set updates).
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  const visible = scans.filter((s) => !dismissed.has(s.id))
  const handleDismiss = (id: string) =>
    setDismissed((prev) => new Set(prev).add(id))

  if (scans.length === 0) return null

  const handleLoad = (scan: ScanRecord) => {
    if (!scan.result) return
    setLoadingId(scan.id)
    // Small delay for visual feedback
    setTimeout(() => {
      onLoadResult(scan.result!, scan.id)
      setLoadingId(null)
    }, 150)
  }

  return (
    <div className="w-full max-w-2xl mx-auto mt-4">
      <button
        onClick={() => setIsOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-900/30 hover:bg-slate-900/50 border border-slate-800/60 rounded-xl text-sm text-slate-400 hover:text-slate-200 transition-all duration-200 cursor-pointer group"
      >
        <span className="flex items-center gap-2 font-medium">
          <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {tier === "free" ? "Latest Scan" : "Recent Scans"}
          <span className="px-1.5 py-0.5 text-2xs font-bold bg-slate-800 text-slate-400 rounded-md tabular-nums">
            {scans.length}
          </span>
        </span>
        <svg
          className={`w-4 h-4 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="mt-1 bg-slate-900/40 backdrop-blur-md border border-slate-800/60 rounded-xl overflow-hidden divide-y divide-slate-800/50">
          {visible.map((scan) => (
            <SwipeCard key={scan.id} onDismiss={() => handleDismiss(scan.id)}>
            <button
              onClick={() => handleLoad(scan)}
              disabled={!scan.result || loadingId === scan.id}
              className="w-full flex items-center gap-4 px-4 py-3.5 hover:bg-slate-800/30 transition-colors text-left group disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              {/* Status dot */}
              <div className={`shrink-0 w-2 h-2 rounded-full ${
                scan.violations === 0 ? "bg-emerald-400" : scan.violations <= 5 ? "bg-amber-400" : "bg-rose-400"
              }`} />

              {/* URL */}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-slate-300 group-hover:text-slate-50 truncate transition-colors">
                  {scan.url.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                </p>
                <div className="flex items-center gap-2.5 mt-0.5">
                  <span className="text-2xs text-slate-500">{timeAgo(scan.created_at)}</span>
                  {scan.summary && (
                    <span className="flex items-center gap-1.5">
                      {severityDot(scan.summary.critical, "text-rose-400")}
                      {severityDot(scan.summary.serious, "text-orange-400")}
                      {severityDot(scan.summary.moderate, "text-amber-400")}
                      {severityDot(scan.summary.minor, "text-sky-400")}
                    </span>
                  )}
                </div>
              </div>

              {/* Violation count badge */}
              <div className="shrink-0 text-right">
                {scan.violations > 0 ? (
                  <span className="text-2xs font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-full">
                    {scan.violations} issue{scan.violations !== 1 ? "s" : ""}
                  </span>
                ) : (
                  <span className="text-2xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                    Passed ✓
                  </span>
                )}
              </div>

              {/* Load indicator */}
              {loadingId === scan.id ? (
                <svg className="animate-spin h-3.5 w-3.5 text-indigo-400 shrink-0" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                <svg className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400 shrink-0 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              )}
            </button>
            </SwipeCard>
          ))}
          {tier === "free" && (
            <div className="p-3 bg-slate-950/70 border-t border-slate-850 flex items-center justify-between text-2xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-slate-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span>Displaying latest scan only. Unlock dedicated history with Pro.</span>
              </span>
              <a
                href="#pricing"
                onClick={(e) => {
                  if (onUpgradeClick) {
                    e.preventDefault()
                    onUpgradeClick()
                  }
                }}
                className="text-indigo-400 hover:text-indigo-300 font-bold underline underline-offset-2 shrink-0 cursor-pointer"
              >
                Upgrade →
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
