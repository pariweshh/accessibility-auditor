"use client"

import { ScanResult } from "@/lib/types"
import IssueCard from "./issue_card"
import Link from "next/link"
import { Counter } from "./motion/counter"
import { ProgressRing } from "./motion/progress-ring"

/**
 * Derives a 0–100 accessibility score from the violation severity mix.
 * Each severity is weighted; the score is the complement of the penalty.
 */
function computeScore(summary: ScanResult["summary"]): number {
  const penalty =
    summary.critical * 15 + summary.serious * 7 + summary.moderate * 3 + summary.minor * 1
  return Math.max(0, Math.min(100, 100 - penalty))
}

function scoreColor(score: number): string {
  if (score >= 90) return "#34d399" // emerald
  if (score >= 70) return "#fbbf24" // amber
  return "#fb7185" // rose
}

interface ResultsDisplayProps {
  result: ScanResult
  onNewScan: () => void
  tier?: string
}

export default function ResultsDisplay({
  result,
  onNewScan,
  tier = "free",
}: ResultsDisplayProps) {
  const totalIssues = result.violations.length
  const { critical, serious, moderate, minor } = result.summary
  const score = computeScore(result.summary)

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Header Summary Card */}
      <div className="relative bg-slate-900/40 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 md:p-8 shadow-2xl overflow-hidden mb-8">
        {/* Glow effect */}
        <div className="absolute -top-12 -left-12 w-48 h-48 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6 relative z-10">
          <div>
            <h2 className="text-2xl font-black bg-linear-to-r from-white to-slate-300 bg-clip-text text-transparent mb-2">
              Scan Results
            </h2>
            <p className="text-sm text-slate-300 flex items-center gap-1.5 flex-wrap">
              <span className="text-slate-500">URL:</span>{" "}
              <a
                href={result.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-400 hover:text-indigo-300 hover:underline break-all"
              >
                {result.url}
              </a>
            </p>
            <p className="text-xs text-slate-500 mt-2">
              Scanned on {new Date(result.timestamp).toLocaleString()}
            </p>
          </div>
          <div className="flex items-center gap-5 self-start sm:self-auto shrink-0">
            {/* Animated accessibility score ring (SVG strokeDashoffset) */}
            <ProgressRing
              progress={score}
              size={92}
              strokeWidth={7}
              color={scoreColor(score)}
            >
              <span
                className="text-2xl font-black leading-none"
                style={{ color: scoreColor(score) }}
              >
                <Counter to={score} />
              </span>
              <span className="text-3xs font-bold text-slate-500 uppercase tracking-wider mt-0.5">
                Score
              </span>
            </ProgressRing>
            <button
              onClick={onNewScan}
              className="bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 px-4 py-2 rounded-xl transition-all duration-200 text-xs font-semibold hover:shadow-md cursor-pointer"
            >
              New Scan
            </button>
          </div>
        </div>

        {/* Summary Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5 mt-6 relative z-10">
          <div className="text-center p-4 bg-slate-950/60 border border-slate-800/80 rounded-xl">
            <p className="text-3xl font-extrabold text-white"><Counter to={totalIssues} /></p>
            <p className="text-2xs font-medium text-slate-400 mt-1 uppercase tracking-wider">Total Issues</p>
          </div>
          <div className="text-center p-4 bg-rose-500/10 border border-rose-500/15 rounded-xl">
            <p className="text-3xl font-extrabold text-rose-400"><Counter to={critical} /></p>
            <p className="text-2xs font-semibold text-rose-300/80 mt-1 uppercase tracking-wider">Critical</p>
          </div>
          <div className="text-center p-4 bg-amber-500/10 border border-amber-500/15 rounded-xl">
            <p className="text-3xl font-extrabold text-amber-400"><Counter to={serious} /></p>
            <p className="text-2xs font-semibold text-amber-300/80 mt-1 uppercase tracking-wider">Serious</p>
          </div>
          <div className="text-center p-4 bg-yellow-500/10 border border-yellow-500/15 rounded-xl">
            <p className="text-3xl font-extrabold text-yellow-400"><Counter to={moderate} /></p>
            <p className="text-2xs font-semibold text-yellow-300/80 mt-1 uppercase tracking-wider">Moderate</p>
          </div>
          <div className="text-center p-4 bg-sky-500/10 border border-sky-500/15 rounded-xl">
            <p className="text-3xl font-extrabold text-sky-400"><Counter to={minor} /></p>
            <p className="text-2xs font-semibold text-sky-300/80 mt-1 uppercase tracking-wider">Minor</p>
          </div>
        </div>

        {/* Additional Stats */}
        <div className="flex gap-6 mt-6 pt-5 border-t border-slate-800/80 relative z-10 text-xs text-slate-400">
          <div>
            <p>
              <span className="font-bold text-emerald-400">
                {result.passes}
              </span>{" "}
              checks passed
            </p>
          </div>
          <div>
            <p>
              <span className="font-bold text-slate-300">
                {result.incomplete}
              </span>{" "}
              incomplete
            </p>
          </div>
        </div>
      </div>

      {/* Issues List */}
      <div className="space-y-5">
        <h3 className="text-xl font-extrabold text-slate-100 flex items-center gap-2">
          <span>Accessibility Issues</span>
          <span className="px-2.5 py-0.5 text-xs bg-slate-900 border border-slate-800 rounded-full text-slate-400">
            {totalIssues}
          </span>
        </h3>

        {totalIssues === 0 ? (
          <div className="bg-emerald-500/5 border border-emerald-500/15 rounded-2xl p-8 text-center">
            <div className="text-4xl mb-3">🎉</div>
            <h3 className="text-lg font-bold text-emerald-300 mb-2">
              No Issues Found!
            </h3>
            <p className="text-xs text-emerald-400 max-w-md mx-auto leading-relaxed">
              This webpage successfully passed all automated Deque axe-core compliance checks.
            </p>
            <p className="text-2xs text-slate-500 mt-4 leading-relaxed">
              Note: Automated tools catch ~40-50% of issues. Manual accessibility audits, keyboard navigation, and screen reader tests are still recommended for full WCAG compliance.
            </p>
          </div>
        ) : (
          result.violations.map((issue, index) => (
            <IssueCard key={issue.id + index} issue={issue} index={index} tier={tier} />
          ))
        )}
      </div>
    </div>
  )
}
