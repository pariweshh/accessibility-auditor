"use client"

import { ScanRecord } from "@/lib/types"
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from "recharts"

interface TrendChartProps {
  scans: ScanRecord[]
  selectedUrl: string | null
}

export default function TrendChart({ scans, selectedUrl }: TrendChartProps) {
  // Filter to selected URL or use all scans
  const filtered = scans
    .filter(s => s.status === "completed" && s.summary)
    .filter(s => !selectedUrl || s.url === selectedUrl)
    .slice()
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    .slice(-20) // last 20 data points

  const data = filtered.map(s => ({
    date: new Date(s.created_at).toLocaleDateString("en-AU", { day: "numeric", month: "short" }),
    Critical: s.summary?.critical ?? 0,
    Serious:  s.summary?.serious  ?? 0,
    Moderate: s.summary?.moderate ?? 0,
    Minor:    s.summary?.minor    ?? 0,
  }))

  if (data.length < 2) {
    return (
      <div className="h-48 flex flex-col items-center justify-center text-center p-4">
        <p className="text-3xl mb-2">📈</p>
        <p className="text-sm font-medium text-slate-400">
          {selectedUrl ? "Not enough scans for this URL yet." : "Run at least 2 scans to see a trend."}
        </p>
        <p className="text-xs text-slate-600 mt-1">
          {selectedUrl ? "Select a different URL or run more scans." : "Trends will appear here after multiple scans."}
        </p>
      </div>
    )
  }

  const customTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null
    return (
      <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 shadow-xl text-xs">
        <p className="font-semibold text-slate-300 mb-2">{label}</p>
        {payload.map((p: any) => (
          <div key={p.name} className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
            <span className="text-slate-400">{p.name}:</span>
            <span className="font-bold text-white">{p.value}</span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
        <XAxis
          dataKey="date"
          tick={{ fill: "#64748b", fontSize: 11 }}
          axisLine={{ stroke: "#1e293b" }}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: "#64748b", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          allowDecimals={false}
        />
        <Tooltip content={customTooltip} />
        <Legend
          wrapperStyle={{ fontSize: 11, color: "#64748b", paddingTop: 8 }}
        />
        <Line type="monotone" dataKey="Critical" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
        <Line type="monotone" dataKey="Serious"  stroke="#f97316" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
        <Line type="monotone" dataKey="Moderate" stroke="#eab308" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
        <Line type="monotone" dataKey="Minor"    stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
      </LineChart>
    </ResponsiveContainer>
  )
}
