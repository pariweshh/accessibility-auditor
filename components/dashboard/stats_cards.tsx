"use client"

import { ScanRecord } from "@/lib/types"

interface StatsCardsProps {
  scans: ScanRecord[]
}

function StatCard({
  label, value, sub, color = "indigo"
}: {
  label: string
  value: string | number
  sub?: string
  color?: "indigo" | "rose" | "emerald" | "amber"
}) {
  const colors = {
    indigo: "from-indigo-500/10 to-indigo-500/5 border-indigo-500/20 text-indigo-400",
    rose:   "from-rose-500/10 to-rose-500/5 border-rose-500/20 text-rose-400",
    emerald:"from-emerald-500/10 to-emerald-500/5 border-emerald-500/20 text-emerald-400",
    amber:  "from-amber-500/10 to-amber-500/5 border-amber-500/20 text-amber-400",
  }

  return (
    <div className={`relative bg-linear-to-br ${colors[color]} border rounded-xl p-5 overflow-hidden`}>
      <div className="absolute -top-4 -right-4 w-20 h-20 rounded-full bg-current opacity-5" />
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-3xl font-black ${colors[color].split(" ").find(c => c.startsWith("text-"))}`}>
        {value}
      </p>
      {sub && <p className="text-xs text-slate-500 mt-1 truncate">{sub}</p>}
    </div>
  )
}

export default function StatsCards({ scans }: StatsCardsProps) {
  const completed = scans.filter(s => s.status === "completed")

  const totalViolations = completed.reduce((sum, s) => sum + (s.violations ?? 0), 0)
  const avgViolations = completed.length
    ? Math.round(totalViolations / completed.length)
    : 0

  // Most scanned domain
  const domainCounts: Record<string, number> = {}
  for (const s of completed) {
    try {
      const domain = new URL(s.url).hostname
      domainCounts[domain] = (domainCounts[domain] ?? 0) + 1
    } catch {}
  }
  const topDomain = Object.entries(domainCounts).sort((a, b) => b[1] - a[1])[0]

  // Best scan (fewest violations among completed)
  const bestScan = completed.length
    ? completed.reduce((best, s) => (s.violations ?? 0) < (best.violations ?? 0) ? s : best, completed[0])
    : null

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <StatCard
        label="Total Scans"
        value={scans.length}
        sub={`${completed.length} completed`}
        color="indigo"
      />
      <StatCard
        label="Avg Violations"
        value={avgViolations}
        sub="per completed scan"
        color="rose"
      />
      <StatCard
        label="Top Domain"
        value={topDomain ? topDomain[1] : "—"}
        sub={topDomain ? topDomain[0] : "No scans yet"}
        color="amber"
      />
      <StatCard
        label="Best Score"
        value={bestScan ? bestScan.violations : "—"}
        sub={bestScan ? new URL(bestScan.url).hostname : "No scans yet"}
        color="emerald"
      />
    </div>
  )
}
