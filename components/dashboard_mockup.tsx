"use client"

import { useState } from "react"

interface ChecklistItem {
  id: string
  label: string
  points: number
  wcag: string
  status: "broken" | "fixed"
}

export default function DashboardMockup() {
  const [activeTab, setActiveTab] = useState<"radar" | "pipeline" | "exporter">("radar")
  const [items, setItems] = useState<ChecklistItem[]>([
    { id: "alt", label: "Provide text alternative for icons & hero images", points: 15, wcag: "1.1.1 (A)", status: "broken" },
    { id: "contrast", label: "Fix low contrast elements in dark buttons", points: 20, wcag: "1.4.3 (AA)", status: "broken" },
    { id: "label", label: "Associate email input field with explicit label tag", points: 15, wcag: "4.1.2 (AA)", status: "broken" },
    { id: "focus", label: "Append focus rings for keyboard-only tab navigation", points: 12, wcag: "2.4.7 (AA)", status: "fixed" },
  ])

  const handleToggle = (id: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, status: item.status === "broken" ? "fixed" : "broken" }
          : item
      )
    )
  }

  // Calculate dynamic compliance score
  // Base score is 38% (if all are broken). Max is 100% (if all are fixed).
  const baseScore = 38
  const currentFixedPoints = items
    .filter((i) => i.status === "fixed")
    .reduce((sum, i) => sum + i.points, 0)
  const complianceScore = baseScore + currentFixedPoints

  // Dynamic SVG path for trend chart depending on checked items
  const chartPoints = [
    { x: 20, y: 80 },
    { x: 80, y: 72 },
    { x: 140, y: 78 },
    { x: 200, y: 65 },
    { x: 260, y: 60 - currentFixedPoints * 0.5 },
    { x: 320, y: 100 - complianceScore * 0.8 },
  ]
  const pathD = `M ${chartPoints.map((p) => `${p.x} ${p.y}`).join(" L ")}`

  return (
    <div className="w-full max-w-4xl mx-auto mt-12 relative group animate-slideUp">
      {/* Absolute back-glow elements */}
      <div className="absolute -inset-px bg-gradient-to-r from-blue-500/20 via-indigo-500/20 to-purple-500/20 rounded-2xl blur-xs group-hover:from-blue-500/30 group-hover:to-purple-500/30 transition-all duration-500" />
      
      {/* Main Glass Frame */}
      <div className="relative glass-panel rounded-2xl overflow-hidden shadow-2xl flex flex-col md:flex-row h-auto min-h-[460px] border border-slate-800">
        
        {/* Mock Sidebar */}
        <aside className="w-full md:w-48 shrink-0 bg-slate-950/60 md:border-r border-slate-800/85 p-4 flex flex-row md:flex-col justify-between md:justify-start gap-4">
          <div className="flex md:flex-col items-center md:items-start gap-5 w-full justify-between md:justify-start">
            {/* Header branding */}
            <div className="flex items-center gap-2 px-1 select-none">
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                A11y Engine
              </span>
            </div>
            
            {/* Navigation Tabs */}
            <nav className="flex flex-row md:flex-col gap-1 w-full overflow-x-auto md:overflow-x-visible">
              <button
                type="button"
                onClick={() => setActiveTab("radar")}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all select-none cursor-pointer w-full text-left whitespace-nowrap ${
                  activeTab === "radar"
                    ? "bg-indigo-600/15 text-indigo-400 border border-indigo-500/20 shadow-xs"
                    : "text-slate-500 hover:text-slate-300 border border-transparent"
                }`}
              >
                <span>📡</span> Radar Audit
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("pipeline")}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all select-none cursor-pointer w-full text-left whitespace-nowrap ${
                  activeTab === "pipeline"
                    ? "bg-indigo-600/15 text-indigo-400 border border-indigo-500/20 shadow-xs"
                    : "text-slate-500 hover:text-slate-300 border border-transparent"
                }`}
              >
                <span>⚡</span> AI Pipeline
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("exporter")}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all select-none cursor-pointer w-full text-left whitespace-nowrap ${
                  activeTab === "exporter"
                    ? "bg-indigo-600/15 text-indigo-400 border border-indigo-500/20 shadow-xs"
                    : "text-slate-500 hover:text-slate-300 border border-transparent"
                }`}
              >
                <span>📄</span> Export Portal
              </button>
            </nav>
          </div>

          {/* User Account Mockup Bottom */}
          <div className="hidden md:flex items-center gap-2 mt-auto pt-4 border-t border-slate-900 px-1">
            <div className="w-6 h-6 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-[10px] font-bold text-indigo-400">
              U
            </div>
            <div className="leading-none">
              <p className="text-[10px] font-bold text-slate-300">Demo Agency</p>
              <span className="text-[8px] text-indigo-400 uppercase tracking-widest font-extrabold">Active</span>
            </div>
          </div>
        </aside>

        {/* Mock Main Dashboard View */}
        <main className="flex-1 p-5 md:p-6 bg-slate-950/20 flex flex-col gap-6 justify-between">
          
          {/* Header Row */}
          <div className="flex items-center justify-between border-b border-slate-900 pb-4 flex-wrap gap-3">
            <div>
              <h4 className="text-sm font-bold text-white tracking-tight">Interactive Platform Sandbox</h4>
              <p className="text-[10px] text-slate-500 mt-0.5">Toggle issues to simulate AI repair workflows</p>
            </div>
            <div className="flex items-center gap-2 text-[10px] bg-slate-900/60 border border-slate-850 px-2.5 py-1 rounded-xl">
              <span className="text-slate-400 font-medium">Domain:</span>
              <code className="text-indigo-300 font-mono">staging-design.a11ytica.net</code>
            </div>
          </div>

          {/* Body Content depending on Tab */}
          {activeTab === "radar" && (
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-stretch flex-1">
              
              {/* Left Column: checklist of toggle rules */}
              <div className="lg:col-span-3 space-y-3.5 flex flex-col justify-center">
                <span className="text-[9px] font-extrabold text-slate-500 uppercase tracking-widest block mb-1">
                  Compliance Violations Log
                </span>
                
                {items.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleToggle(item.id)}
                    className={`p-3 rounded-xl border flex items-center justify-between gap-3 cursor-pointer select-none transition-all duration-300 ${
                      item.status === "fixed"
                        ? "bg-emerald-500/5 border-emerald-500/25 hover:border-emerald-500/40 shadow-xs"
                        : "bg-slate-900/40 border-slate-850 hover:bg-slate-900/60 hover:border-slate-800"
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <div className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                        item.status === "fixed"
                          ? "bg-emerald-500 border-emerald-400 text-slate-950"
                          : "border-slate-700 bg-slate-950"
                      }`}>
                        {item.status === "fixed" && (
                          <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <div className="leading-snug">
                        <p className={`text-[11px] font-bold transition-colors ${
                          item.status === "fixed" ? "text-slate-300 line-through decoration-slate-600" : "text-slate-200"
                        }`}>
                          {item.label}
                        </p>
                        <span className="text-[9px] font-medium text-slate-500">WCAG {item.wcag}</span>
                      </div>
                    </div>

                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md uppercase shrink-0 ${
                      item.status === "fixed"
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : "bg-rose-500/10 text-rose-400 border border-rose-500/20 animate-pulse"
                    }`}>
                      {item.status === "fixed" ? "Fixed" : "Fix with AI"}
                    </span>
                  </div>
                ))}
              </div>

              {/* Right Column: Score dial and mini chart */}
              <div className="lg:col-span-2 flex flex-col justify-between gap-5 bg-slate-950/40 border border-slate-850 p-4.5 rounded-xl">
                
                {/* Score Dial */}
                <div className="text-center space-y-2 py-2 flex flex-col items-center">
                  <div className="relative w-28 h-28 flex items-center justify-center">
                    {/* Circle SVG */}
                    <svg className="absolute inset-0 w-full h-full -rotate-90">
                      <circle
                        cx="56"
                        cy="56"
                        r="48"
                        className="stroke-slate-800 fill-none"
                        strokeWidth="8"
                      />
                      <circle
                        cx="56"
                        cy="56"
                        r="48"
                        className="stroke-indigo-500 transition-all duration-700 fill-none"
                        strokeWidth="8"
                        strokeDasharray={301.6}
                        strokeDashoffset={301.6 - (301.6 * complianceScore) / 100}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="text-center leading-none">
                      <span className="text-2xl font-black text-white tracking-tight tabular-nums">
                        {complianceScore}%
                      </span>
                      <p className="text-[8px] font-extrabold uppercase tracking-widest text-slate-500 mt-1">
                        Compliance
                      </p>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400 font-semibold leading-relaxed max-w-[160px]">
                    {complianceScore === 100
                      ? "🎉 Excellent! Perfect compliance status achieved."
                      : "Click red badges to apply automated AI patches."}
                  </p>
                </div>

                {/* Mini chart path */}
                <div className="border-t border-slate-900 pt-3.5 space-y-2">
                  <div className="flex justify-between items-center text-[9px] text-slate-500 font-semibold">
                    <span>Performance Trend</span>
                    <span className="text-indigo-400 tabular-nums">+{complianceScore - 38}% Increase</span>
                  </div>
                  <div className="h-14 w-full relative">
                    <svg className="w-full h-full overflow-visible" viewBox="0 0 340 100" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="chartGlow" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#6366f1" stopOpacity="0.25" />
                          <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      {/* Area Fill */}
                      <path
                        d={`${pathD} L 320 100 L 20 100 Z`}
                        fill="url(#chartGlow)"
                        className="transition-all duration-700"
                      />
                      {/* Line Path */}
                      <path
                        d={pathD}
                        fill="none"
                        stroke="#6366f1"
                        strokeWidth="2.5"
                        className="transition-all duration-700"
                        strokeLinecap="round"
                      />
                      {/* Interactive indicator dot */}
                      <circle
                        cx="320"
                        cy={100 - complianceScore * 0.8}
                        r="4.5"
                        fill="#ffffff"
                        stroke="#6366f1"
                        strokeWidth="2.5"
                        className="transition-all duration-700 shadow-md animate-ping"
                      />
                      <circle
                        cx="320"
                        cy={100 - complianceScore * 0.8}
                        r="3"
                        fill="#ffffff"
                        stroke="#6366f1"
                        strokeWidth="2.5"
                        className="transition-all duration-700 shadow-md"
                      />
                    </svg>
                  </div>
                </div>

              </div>

            </div>
          )}

          {activeTab === "pipeline" && (
            <div className="flex-1 flex flex-col justify-center items-center py-6 text-center space-y-4 animate-fadeIn">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600/10 border border-indigo-500/25 flex items-center justify-center text-lg shadow-sm">
                ⚙️
              </div>
              <div className="space-y-1">
                <h5 className="text-xs font-bold text-slate-200">AI Code Integration Active</h5>
                <p className="text-[10px] text-slate-500 max-w-sm leading-relaxed">
                  A11ytica Pro is integrated with your repository. Accessibility fixes are compiled automatically on every push and queued as code-suggest PRs.
                </p>
              </div>
              <div className="bg-slate-950/60 border border-slate-900 rounded-xl p-3 font-mono text-[10px] text-slate-400 w-full max-w-md text-left">
                <span className="text-slate-600 block mb-1">// System telemetry output</span>
                <span className="text-emerald-400">✓ git branch</span> integration-ready<br />
                <span className="text-emerald-400">✓ axe-core schema</span> parsed successfully<br />
                <span className="text-indigo-400">→ suggestions:</span> 3 critical contrast ratios resolved automatically
              </div>
            </div>
          )}

          {activeTab === "exporter" && (
            <div className="flex-1 flex flex-col justify-center items-center py-6 text-center space-y-4 animate-fadeIn">
              <div className="w-12 h-12 rounded-2xl bg-purple-600/10 border border-purple-500/25 flex items-center justify-center text-lg shadow-sm">
                📄
              </div>
              <div className="space-y-1">
                <h5 className="text-xs font-bold text-slate-200">Executive PDF Compliance Exports</h5>
                <p className="text-[10px] text-slate-500 max-w-sm leading-relaxed">
                  Compile comprehensive compliance reports listing your accessibility score history, solved violations, and standard checkpoints.
                </p>
              </div>
              <button
                type="button"
                className="px-4 py-2 bg-indigo-600 text-white font-bold text-[10px] rounded-xl shadow-md cursor-pointer hover:bg-indigo-500 select-none transition-colors"
              >
                Download PDF Audit Report
              </button>
            </div>
          )}

          {/* Footer Metrics Row */}
          <div className="flex justify-between items-center border-t border-slate-900 pt-4 flex-wrap gap-3 text-[10px] text-slate-500">
            <span>Scan Frequency: <strong className="text-slate-400">Continuous</strong></span>
            <span>API Response: <strong className="text-slate-400">82ms</strong></span>
            <span>Health Status: <strong className="text-emerald-400">● 100% Operational</strong></span>
          </div>

        </main>
      </div>
    </div>
  )
}
