"use client"

import { useEffect, useState } from "react"
import { PulseDot } from "./motion/pulse-dot"
import { ShimmerSkeleton } from "./motion/shimmer-skeleton"

interface ScanProgressProps {
  url: string
  status: "pending" | "processing" | "completed" | "failed"
  errorMessage?: string | null
}

const STATUS_STEPS = [
  { key: "pending",    label: "Queuing scan...",              icon: "⏳" },
  { key: "processing", label: "Launching headless browser...", icon: "🌐" },
  { key: "completed",  label: "Audit complete!",               icon: "✅" },
  { key: "failed",     label: "Scan failed",                   icon: "❌" },
]

// Cycling sub-messages shown while processing to keep the user engaged
const PROCESSING_MESSAGES = [
  "Connecting to Browserless...",
  "Loading page in headless Chrome...",
  "Injecting axe-core audit engine...",
  "Running WCAG accessibility checks...",
  "Compiling violation report...",
]

export default function ScanProgress({ url, status, errorMessage }: ScanProgressProps) {
  const [elapsed, setElapsed] = useState(0)
  const [msgIndex, setMsgIndex] = useState(0)

  // Elapsed timer
  useEffect(() => {
    if (status === "completed" || status === "failed") return
    const t = setInterval(() => setElapsed((s) => s + 1), 1000)
    return () => clearInterval(t)
  }, [status])

  // Cycle sub-messages every 3s while processing
  useEffect(() => {
    if (status !== "processing") return
    const t = setInterval(
      () => setMsgIndex((i) => (i + 1) % PROCESSING_MESSAGES.length),
      3000
    )
    return () => clearInterval(t)
  }, [status])

  const displayUrl = url.replace(/^https?:\/\//, "").replace(/\/$/, "")
  const isFailed = status === "failed"

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className={`relative bg-slate-900/40 backdrop-blur-md border rounded-2xl p-6 md:p-8 shadow-2xl overflow-hidden transition-colors duration-500 ${
        isFailed ? "border-rose-500/30" : "border-slate-800/80"
      }`}>
        {/* Ambient glow */}
        <div className={`absolute -top-16 left-1/2 -translate-x-1/2 w-72 h-72 rounded-full blur-3xl pointer-events-none transition-colors duration-1000 ${
          isFailed ? "bg-rose-500/10" : "bg-indigo-500/10"
        }`} />

        <div className="relative z-10 space-y-6">
          {/* URL being scanned */}
          <div className="flex items-center gap-3">
            {isFailed ? (
              <div className="shrink-0 w-2.5 h-2.5 rounded-full bg-rose-400" />
            ) : (
              <PulseDot className="shrink-0 w-2.5 h-2.5 rounded-full bg-indigo-400" />
            )}
            <p className="text-sm text-slate-400 truncate">
              Scanning{" "}
              <span className="text-slate-200 font-medium">{displayUrl}</span>
            </p>
            {!isFailed && (
              <span className="ml-auto shrink-0 text-xs text-slate-500 tabular-nums font-mono">
                {elapsed}s
              </span>
            )}
          </div>

          {/* Progress steps */}
          <div className="space-y-3">
            {STATUS_STEPS.filter((s) => s.key !== "completed" || status === "completed")
              .filter((s) => s.key !== "failed" || isFailed)
              .map((step, i) => {
                const stepOrder = ["pending", "processing", "completed", "failed"]
                const currentIndex = stepOrder.indexOf(status)
                const stepIndex = stepOrder.indexOf(step.key)

                const isDone = stepIndex < currentIndex && !isFailed
                const isActive = step.key === status
                const isFuture = stepIndex > currentIndex && !isFailed

                return (
                  <div
                    key={step.key}
                    className={`flex items-center gap-3 transition-opacity duration-300 ${
                      isFuture ? "opacity-30" : "opacity-100"
                    }`}
                  >
                    {/* Step indicator */}
                    <div className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs transition-all duration-300 ${
                      isDone
                        ? "bg-emerald-500/20 border border-emerald-500/40 text-emerald-400"
                        : isActive && !isFailed
                        ? "bg-indigo-500/20 border border-indigo-500/40"
                        : isFailed && step.key === "failed"
                        ? "bg-rose-500/20 border border-rose-500/40 text-rose-400"
                        : "bg-slate-800/60 border border-slate-700/40 text-slate-600"
                    }`}>
                      {isDone ? (
                        <svg className="w-3 h-3 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      ) : isActive && !isFailed ? (
                        <svg className="animate-spin w-3 h-3 text-indigo-400" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                      ) : (
                        <span>{step.icon}</span>
                      )}
                    </div>

                    {/* Step label */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-medium ${
                        isDone
                          ? "text-emerald-400"
                          : isActive && !isFailed
                          ? "text-white"
                          : isFailed && step.key === "failed"
                          ? "text-rose-400"
                          : "text-slate-500"
                      }`}>
                        {step.label}
                      </p>
                      {/* Sub-message while processing */}
                      {isActive && status === "processing" && (
                        <p className="text-2xs text-indigo-400 mt-0.5 transition-all duration-500">
                          {PROCESSING_MESSAGES[msgIndex]}
                        </p>
                      )}
                      {/* Error message */}
                      {step.key === "failed" && errorMessage && (
                        <p className="text-2xs text-rose-400/80 mt-0.5 font-mono">
                          {errorMessage}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
          </div>

          {/* Indeterminate progress bar (shown while not failed) */}
          {!isFailed && status !== "completed" && (
            <div className="w-full h-0.5 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-linear-to-r from-indigo-500 to-purple-500 rounded-full animate-[shimmer_2s_ease-in-out_infinite]"
                style={{ width: "40%", animation: "shimmer 2s ease-in-out infinite" }} />
            </div>
          )}

          {/* Skeleton preview of the upcoming report while the audit runs */}
          {status === "processing" && (
            <div className="space-y-2.5 pt-1" aria-hidden="true">
              <ShimmerSkeleton className="h-3 w-1/3" />
              <ShimmerSkeleton className="h-12 w-full" />
              <ShimmerSkeleton className="h-12 w-full" />
            </div>
          )}

          {isFailed && (
            <p className="text-xs text-slate-500 text-center">
              Please try again or try a different URL.
            </p>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes shimmer {
          0%   { transform: translateX(-100%); width: 40%; }
          50%  { width: 70%; }
          100% { transform: translateX(300%); width: 40%; }
        }
      `}</style>
    </div>
  )
}
