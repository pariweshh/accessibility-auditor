"use client"

import { useState, useTransition, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ScanRecord } from "@/lib/types"
import ComplianceKitModal from "@/components/compliance_kit_modal"

interface ScanTableProps {
  scans: ScanRecord[]
  tier: string
  onUrlSelect: (url: string | null) => void
  selectedUrl: string | null
  totalScansCount?: number
}

type SortKey = "created_at" | "violations" | "url"
type SortDir = "asc" | "desc"

const IMPACT_BADGE: Record<string, string> = {
  critical: "bg-rose-500/15 text-rose-400 border-rose-500/25",
  serious:  "bg-orange-500/15 text-orange-400 border-orange-500/25",
  moderate: "bg-amber-500/15 text-amber-400 border-amber-500/25",
  minor:    "bg-indigo-500/15 text-indigo-400 border-indigo-500/25",
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

export default function ScanTable({ scans, tier, onUrlSelect, selectedUrl, totalScansCount }: ScanTableProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [sortKey, setSortKey] = useState<SortKey>("created_at")
  const [sortDir, setSortDir] = useState<SortDir>("desc")
  const [search, setSearch] = useState("")
  const [pdfLoading, setPdfLoading] = useState<string | null>(null)
  const [pdfError, setPdfError] = useState<string | null>(null)
  const [rerunning, setRerunning] = useState<string | null>(null)
  const [complianceKitScan, setComplianceKitScan] = useState<ScanRecord | null>(null)

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const ITEMS_PER_PAGE = 10

  const isPaid = tier === "pro" || tier === "agency"

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc")
    else { setSortKey(key); setSortDir("desc") }
  }

  // Reset page when sorting or searching
  useEffect(() => {
    setCurrentPage(1)
  }, [search, sortKey, sortDir])

  const sorted = [...scans]
    .filter(s => !search || s.url.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      let diff = 0
      if (sortKey === "created_at") diff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      else if (sortKey === "violations") diff = (a.violations ?? 0) - (b.violations ?? 0)
      else diff = a.url.localeCompare(b.url)
      return sortDir === "asc" ? diff : -diff
    })

  const totalPages = Math.ceil(sorted.length / ITEMS_PER_PAGE)
  const paginated = sorted.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k) {
      return (
        <svg className="w-3 h-3 text-slate-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4m6 4v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      )
    }
    return sortDir === "asc" ? (
      <svg className="w-3 h-3 text-indigo-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg className="w-3 h-3 text-indigo-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
    )
  }

  const handleRerun = async (scan: ScanRecord) => {
    setRerunning(scan.id)
    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: scan.url }),
      })
      const data = await res.json()
      if (!res.ok) {
        alert(data.message ?? "Failed to start scan")
        return
      }
      router.push(`/?scanId=${data.scanId}&url=${encodeURIComponent(scan.url)}`)
    } catch (err) {
      console.error("Rerun error:", err)
      alert("Failed to rerun scan due to a network error.")
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
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 mb-3">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
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
            placeholder={isPaid ? "Filter by URL..." : "Search & filter history (Pro feature)..."}
            value={search}
            disabled={!isPaid}
            aria-label="Filter scan history by URL"
            onChange={e => setSearch(e.target.value)}
            className={`w-full bg-slate-900/60 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-sm text-slate-50 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-all ${!isPaid ? "opacity-60 cursor-not-allowed" : ""}`}
          />
        </div>
        {!isPaid ? (
          <span className="px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 whitespace-nowrap">
            Pro Feature
          </span>
        ) : (
          <span className="text-xs text-slate-500 whitespace-nowrap">{sorted.length} result{sorted.length !== 1 ? "s" : ""}</span>
        )}
      </div>

      {pdfError && (
        <div role="alert" className="flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-xs text-rose-400">
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4c-.77-1.33-2.69-1.33-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3z" />
          </svg>
          <span>{pdfError}</span>
          {!isPaid && <a href="/" className="underline font-semibold hover:text-rose-300 ml-1">Upgrade →</a>}
        </div>
      )}

      {/* Table — scrollable on mobile */}
      <div className="overflow-x-auto rounded-xl border border-slate-800/60">
        <table className="w-full text-xs min-w-[640px]">
          <thead>
            <tr className="bg-slate-900/60 border-b border-slate-800/60">
              <th
                scope="col"
                aria-sort={sortKey === "url" ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
                className="text-left px-4 py-3 font-semibold text-slate-400"
              >
                <button
                  type="button"
                  onClick={() => handleSort("url")}
                  className="flex items-center gap-1.5 hover:text-slate-200 transition-colors cursor-pointer select-none"
                >
                  <span>URL</span>
                  <SortIcon k="url" />
                </button>
              </th>
              <th
                scope="col"
                aria-sort={sortKey === "created_at" ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
                className="text-left px-3 py-3 font-semibold text-slate-400"
              >
                <button
                  type="button"
                  onClick={() => handleSort("created_at")}
                  className="flex items-center gap-1.5 hover:text-slate-200 transition-colors cursor-pointer select-none"
                >
                  <span>Date</span>
                  <SortIcon k="created_at" />
                </button>
              </th>
              <th scope="col" className="text-center px-2 py-3 font-semibold text-rose-400">Crit</th>
              <th scope="col" className="text-center px-2 py-3 font-semibold text-orange-400">Ser</th>
              <th scope="col" className="text-center px-2 py-3 font-semibold text-amber-400">Mod</th>
              <th scope="col" className="text-center px-2 py-3 font-semibold text-sky-400">Min</th>
              <th
                scope="col"
                aria-sort={sortKey === "violations" ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
                className="text-center px-3 py-3 font-semibold text-slate-400"
              >
                <button
                  type="button"
                  onClick={() => handleSort("violations")}
                  className="inline-flex items-center gap-1.5 hover:text-slate-200 transition-colors cursor-pointer select-none"
                >
                  <span>Total</span>
                  <SortIcon k="violations" />
                </button>
              </th>
              <th scope="col" className="text-right px-4 py-3 font-semibold text-slate-400">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/40">
            {paginated.map(scan => {
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
                        <div className="flex items-center gap-1.5">
                          <p className="font-medium text-slate-200 truncate group-hover:text-slate-50">{hostname}</p>
                          {scan.team_id && (
                            <span className="shrink-0 px-1.5 py-0.5 text-2xs font-semibold bg-indigo-500/15 text-indigo-300 border border-indigo-500/25 rounded-md">
                              Team
                            </span>
                          )}
                        </div>
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
                          className="px-2 py-1 text-2xs font-semibold text-slate-400 hover:text-slate-50 border border-slate-700 hover:border-slate-500 rounded-md transition-colors"
                          title="View full report"
                        >
                          View
                        </a>
                      )}
                      {/* Rerun */}
                      <button
                        onClick={() => handleRerun(scan)}
                        disabled={isRerunning}
                        className="inline-flex items-center gap-1.5 px-2 py-1 text-2xs font-semibold text-indigo-400 hover:text-slate-50 border border-indigo-500/30 hover:border-indigo-500 hover:bg-indigo-500/10 rounded-md transition-colors disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                        title="Rerun this scan"
                      >
                        {isRerunning ? (
                          <>
                            <svg className="animate-spin h-3 w-3 text-indigo-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span>Rerun</span>
                          </>
                        ) : (
                          "Rerun"
                        )}
                      </button>
                      {/* PDF export */}
                      {scan.status === "completed" && (
                        isPaid ? (
                          <button
                            onClick={() => handleExportPdf(scan)}
                            disabled={pdfLoading !== null}
                            className="inline-flex items-center gap-1.5 px-2 py-1 text-2xs font-semibold text-emerald-400 hover:text-slate-50 border border-emerald-500/30 hover:border-emerald-500 hover:bg-emerald-500/10 rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                            title={pdfLoading !== null ? (isPdfLoading ? "Exporting PDF..." : "Another PDF export is in progress") : "Export PDF"}
                          >
                            {isPdfLoading ? (
                              <>
                                <svg className="animate-spin h-3 w-3 text-emerald-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <span>PDF</span>
                              </>
                            ) : (
                              "PDF"
                            )}
                          </button>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 text-2xs font-semibold text-slate-500 border border-slate-800 rounded-md cursor-not-allowed select-none" title="Upgrade to Pro or Agency to export PDF">
                            <span>PDF</span>
                            <span className="text-3xs font-extrabold uppercase px-1 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">Pro</span>
                          </span>
                        )
                      )}
                      {/* Compliance Kit (Badge + Statement) */}
                      {scan.status === "completed" && (
                        <button
                          type="button"
                          onClick={() => setComplianceKitScan(scan)}
                          className="inline-flex items-center gap-1 px-2 py-1 text-2xs font-semibold text-indigo-300 hover:text-slate-50 border border-indigo-500/30 hover:border-indigo-500 hover:bg-indigo-500/10 rounded-md transition-colors cursor-pointer"
                          title="Open Compliance Kit (EAA/ADA Statement & Live SVG Badge)"
                        >
                          <svg className="w-3 h-3 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                          </svg>
                          <span>Kit</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between border-t border-slate-900/60 pt-4 px-1 gap-4">
          <span className="text-2xs text-slate-500">
            Showing <span className="text-slate-300 font-medium">{Math.min(sorted.length, (currentPage - 1) * ITEMS_PER_PAGE + 1)}</span> to{" "}
            <span className="text-slate-300 font-medium">{Math.min(sorted.length, currentPage * ITEMS_PER_PAGE)}</span> of{" "}
            <span className="text-slate-300 font-medium">{sorted.length}</span> scans
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-2.5 py-1.5 rounded-lg border border-slate-800 bg-slate-900/20 text-slate-400 hover:text-slate-50 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-800/20 transition-all cursor-pointer text-2xs font-semibold"
            >
              Previous
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
              .map((p, idx, arr) => {
                const prev = arr[idx - 1]
                const showEllipsis = prev && p - prev > 1
                return (
                  <span key={p} className="flex items-center gap-1.5">
                    {showEllipsis && <span className="text-slate-600 text-2xs px-0.5">...</span>}
                    <button
                      onClick={() => setCurrentPage(p)}
                      className={`w-7 h-7 rounded-lg text-2xs font-bold transition-all cursor-pointer ${
                        currentPage === p
                          ? "bg-indigo-600 text-slate-50 shadow-md shadow-indigo-600/10"
                          : "border border-slate-850 hover:border-slate-700 text-slate-400 hover:text-slate-50 hover:bg-slate-800/10"
                      }`}
                    >
                      {p}
                    </button>
                  </span>
                )
              })}
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-2.5 py-1.5 rounded-lg border border-slate-800 bg-slate-900/20 text-slate-400 hover:text-slate-50 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-800/20 transition-all cursor-pointer text-2xs font-semibold"
            >
              Next
            </button>
          </div>
        </div>
      )}
      {!isPaid && (totalScansCount ?? 0) > 1 && (
        <div className="mt-3 p-3.5 bg-slate-900/60 border border-slate-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-indigo-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Free Tier displays only your latest scan. <strong>{(totalScansCount ?? 0) - 1} earlier scan(s)</strong> are archived.</span>
          </div>
          <a href="/#pricing" className="text-indigo-400 hover:text-indigo-300 font-bold underline underline-offset-2 shrink-0">
            Unlock Dedicated History →
          </a>
        </div>
      )}

      {complianceKitScan && (
        <ComplianceKitModal
          isOpen={Boolean(complianceKitScan)}
          onClose={() => setComplianceKitScan(null)}
          scanId={complianceKitScan.id}
          url={complianceKitScan.url}
          scanDate={complianceKitScan.created_at}
          summary={
            complianceKitScan.result?.summary ||
            complianceKitScan.summary || {
              critical: 0,
              serious: 0,
              moderate: 0,
              minor: 0,
            }
          }
          passesCount={complianceKitScan.result?.passes ?? complianceKitScan.passes ?? 0}
          violationsCount={complianceKitScan.violations ?? 0}
          tier={tier}
        />
      )}
    </div>
  )
}
