"use client"

import { useState } from "react"
import { ScanRecord } from "@/lib/types"
import StatsCards from "@/components/dashboard/stats_cards"
import ScanTable from "@/components/dashboard/scan_table"
import TrendChart from "@/components/dashboard/trend_chart"

interface DashboardClientProps {
  scans: ScanRecord[]
  tier: string
  email: string
}

export default function DashboardClient({ scans, tier, email }: DashboardClientProps) {
  const [selectedUrl, setSelectedUrl] = useState<string | null>(null)

  return (
    <div className="container mx-auto max-w-7xl space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-2">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Scan History</h1>
          <p className="text-sm text-slate-400 mt-0.5">{email} · <span className="capitalize font-medium text-indigo-400">{tier}</span> plan</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="w-2 h-2 rounded-full bg-emerald-400" /> <span>No issues</span>
          <span className="w-2 h-2 rounded-full bg-rose-400 ml-2" /> <span>Issues found</span>
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse ml-2" /> <span>In progress</span>
        </div>
      </div>

      {/* Stats */}
      <StatsCards scans={scans} />

      {/* Trend chart */}
      <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/60 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-bold text-slate-200">Violation Trend</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {selectedUrl
                ? <>Showing: <span className="text-indigo-400 font-medium">{selectedUrl.replace(/^https?:\/\//, "").slice(0, 50)}</span> · <button onClick={() => setSelectedUrl(null)} className="text-slate-500 hover:text-slate-300 underline cursor-pointer">Clear</button></>
                : "All URLs · Click a row in the table to filter"
              }
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
        <ScanTable
          scans={scans}
          tier={tier}
          onUrlSelect={setSelectedUrl}
          selectedUrl={selectedUrl}
        />
      </div>
    </div>
  )
}
