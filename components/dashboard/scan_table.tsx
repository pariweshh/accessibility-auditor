"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { ScanRecord } from "@/lib/types"

interface ScanTableProps {
  scans: ScanRecord[]
  tier: string
  onUrlSelect: (url: string | null) => void
  selectedUrl: string | null
}

type SortKey = "created_at" | "violations" | "url"
type SortDir = "asc" | "desc"

const IMPACT_BADGE: Record<string, string> = {
  critical: "bg-rose-500/15 text-rose-400 border-rose-500/25",
  serious:  "bg-orange-500/15 text-orange-400 border-orange-500/25",
  moderate: "bg-amber-500/15 text-amber-400 border-amber-500/25",
  minor:    "bg-blue-500/15 text-blue-400 border-blue-500/25",
}

function SeverityPill({ count, label, style }: { count: number; label: string; style: string }) {
  if (count === 0) return <span className="text-slate-700 text-xs tabular-nums">—</span>
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-2xs font-bold border tabular-nums ${style}`}>
      {count}
    </span>
  )
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return "just now"
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d ago`
  return new Date(dateStr).toLocaleDateString("en-AU", { day: "numeric", month: "short" })
}

export default function ScanTable({ scans, tier, onUrlSelect, selectedUrl }: ScanTableProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [sortKey, setSortKey] = useState<SortKey>("created_at")
  const [sortDir, setSortDir] = useState<SortDir>("desc")
  const [search, setSearch] = useState("")
  const [pdfLoading, setPdfLoading] = useState<string | null>(null)
  const [pdfError, setPdfError] = useState<string | null>(null)
  const [rerunning, setRerunning] = useState<string | null>(null)

  const isPaid = tier === "pro" || tier === "agency"

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc")
    else { setSortKey(key); setSortDir("desc") }
  }

  const sorted = [...scans]
    .filter(s => !search || s.url.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      let diff = 0
      if (sortKey === "created_at") diff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      else if (sortKey === "violations") diff = (a.violations ?? 0) - (b.violations ?? 0)
      else diff = a.url.localeCompare(b.url)
      return sortDir === "asc" ? diff : -diff
    })

  const SortIcon = ({ k }: { k: SortKey }) => (
    <span className={`ml-1 text-2xs ${sortKey === k ? "text-indigo-400" : "text-slate-600"}`}>
      {sortKey === k ? (sortDir === "asc" ? "↑" : "↓") : "↕"}
    </span>
  )

  const handleRerun = async (scan: ScanRecord) => {
    setRerunning(scan.id)
    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: scan.url }),
      })
      if (!res.ok) {
        const err = await res.json()
        alert(err.message ?? "Failed to start scan")
        return
      }
      router.push("/")
    } finally {
      setRerunning(null)
    }
  }

  const handleExportPdf = async (scan: ScanRecord) => {
    setPdfLoading(scan.id)
    setPdfError(null)
    try {
      const res = await fetch("/api/reports/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scanId: scan.id }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (data.error === "upgrade_required") {
          setPdfError("PDF export is available on Pro and Agency plans.")
        } else {
          setPdfError(data.error ?? "Failed to generate PDF")
        }
        return
      }
      // Open the signed URL in a new tab
      window.open(data.url, "_blank")
    } finally {
      setPdfLoading(null)
    }
  }

  if (scans.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-4xl mb-3">🔍</p>
        <h3 className="text-base font-semibold text-slate-300 mb-1">No scans yet</h3>
        <p className="text-sm text-slate-500 mb-4">Run your first scan from the home page to see results here.</p>
        <a href="/" className="text-sm font-semibold text-indigo-400 hover:text-indigo-300 underline underline-offset-2">
          Start scanning →
        </a>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <input
            type="text"
            placeholder="Filter by URL..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-slate-900/60 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-all"
          />
        </div>
        <span className="text-xs text-slate-500 whitespace-nowrap">{sorted.length} result{sorted.length !== 1 ? "s" : ""}</span>
      </div>

      {pdfError && (
        <div className="flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-xs text-rose-400">
          <span>⚠️</span> {pdfError}
          {!isPaid && <a href="/" className="underline font-semibold hover:text-rose-300 ml-1">Upgrade →</a>}
        </div>
      )}

      {/* Table — scrollable on mobile */}
      <div className="overflow-x-auto rounded-xl border border-slate-800/60">
        <table className="w-full text-xs min-w-[640px]">
          <thead>
            <tr className="bg-slate-900/60 border-b border-slate-800/60">
              <th className="text-left px-4 py-3 font-semibold text-slate-400 cursor-pointer select-none" onClick={() => handleSort("url")}>
                URL <SortIcon k="url" />
              </th>
              <th className="text-left px-3 py-3 font-semibold text-slate-400 cursor-pointer select-none" onClick={() => handleSort("created_at")}>
                Date <SortIcon k="created_at" />
              </th>
              <th className="text-center px-2 py-3 font-semibold text-rose-400">Crit</th>
              <th className="text-center px-2 py-3 font-semibold text-orange-400">Ser</th>
              <th className="text-center px-2 py-3 font-semibold text-amber-400">Mod</th>
              <th className="text-center px-2 py-3 font-semibold text-blue-400">Min</th>
              <th className="text-center px-3 py-3 font-semibold text-slate-400 cursor-pointer select-none" onClick={() => handleSort("violations")}>
                Total <SortIcon k="violations" />
              </th>
              <th className="text-right px-4 py-3 font-semibold text-slate-400">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/40">
            {sorted.map(scan => {
              const isSelected = selectedUrl === scan.url
              const hostname = (() => { try { return new URL(scan.url).hostname } catch { return scan.url } })()
              const isRerunning = rerunning === scan.id
              const isPdfLoading = pdfLoading === scan.id

              return (
                <tr
                  key={scan.id}
                  onClick={() => onUrlSelect(isSelected ? null : scan.url)}
                  className={`transition-colors cursor-pointer group ${isSelected ? "bg-indigo-500/5 border-l-2 border-l-indigo-500" : "hover:bg-slate-800/20"}`}
                >
                  {/* URL */}
                  <td className="px-4 py-3 max-w-[200px]">
                    <div className="flex items-center gap-2">
                      <div className={`shrink-0 w-1.5 h-1.5 rounded-full ${scan.status === "completed" ? (scan.violations === 0 ? "bg-emerald-400" : "bg-rose-400") : scan.status === "failed" ? "bg-red-500" : "bg-amber-400 animate-pulse"}`} />
                      <div className="min-w-0">
                        <p className="font-medium text-slate-200 truncate group-hover:text-white">{hostname}</p>
                        <p className="text-slate-600 truncate text-2xs">{scan.url.replace(/^https?:\/\//, "")}</p>
                      </div>
                    </div>
                  </td>
                  {/* Date */}
                  <td className="px-3 py-3 text-slate-500 whitespace-nowrap">{timeAgo(scan.created_at)}</td>
                  {/* Severity counts */}
                  <td className="px-2 py-3 text-center"><SeverityPill count={scan.summary?.critical ?? 0} label="critical" style={IMPACT_BADGE.critical} /></td>
                  <td className="px-2 py-3 text-center"><SeverityPill count={scan.summary?.serious  ?? 0} label="serious"  style={IMPACT_BADGE.serious}  /></td>
                  <td className="px-2 py-3 text-center"><SeverityPill count={scan.summary?.moderate ?? 0} label="moderate" style={IMPACT_BADGE.moderate} /></td>
                  <td className="px-2 py-3 text-center"><SeverityPill count={scan.summary?.minor    ?? 0} label="minor"    style={IMPACT_BADGE.minor}    /></td>
                  {/* Total */}
                  <td className="px-3 py-3 text-center">
                    {scan.status === "completed"
                      ? <span className={`font-bold ${scan.violations === 0 ? "text-emerald-400" : "text-slate-200"}`}>{scan.violations}</span>
                      : <span className="text-slate-600 capitalize">{scan.status}</span>
                    }
                  </td>
                  {/* Actions */}
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1.5">
                      {/* View report */}
                      {scan.result && (
                        <a
                          href={`/report/${scan.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2 py-1 text-2xs font-semibold text-slate-400 hover:text-white border border-slate-700 hover:border-slate-500 rounded-md transition-colors"
                          title="View full report"
                        >
                          View
                        </a>
                      )}
                      {/* Rerun */}
                      <button
                        onClick={() => handleRerun(scan)}
                        disabled={isRerunning}
                        className="px-2 py-1 text-2xs font-semibold text-indigo-400 hover:text-white border border-indigo-500/30 hover:border-indigo-500 hover:bg-indigo-500/10 rounded-md transition-colors disabled:opacity-50 cursor-pointer"
                        title="Rerun this scan"
                      >
                        {isRerunning ? "…" : "Rerun"}
                      </button>
                      {/* PDF export */}
                      {scan.status === "completed" && (
                        isPaid ? (
                          <button
                            onClick={() => handleExportPdf(scan)}
                            disabled={isPdfLoading}
                            className="px-2 py-1 text-2xs font-semibold text-emerald-400 hover:text-white border border-emerald-500/30 hover:border-emerald-500 hover:bg-emerald-500/10 rounded-md transition-colors disabled:opacity-50 cursor-pointer"
                            title="Export PDF"
                          >
                            {isPdfLoading ? "…" : "PDF"}
                          </button>
                        ) : (
                          <span className="px-2 py-1 text-2xs font-semibold text-slate-600 border border-slate-800 rounded-md cursor-not-allowed" title="Upgrade to export PDF">
                            PDF ✦
                          </span>
                        )
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
