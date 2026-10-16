"use client"

import { useState } from "react"
import { ScanResult } from "@/lib/types"
import { WCAG_STANDARD, AUTOMATED_COVERAGE_NOTE } from "@/lib/constants"
import IssueCard from "./issue_card"
import IncompleteCard from "./incomplete_card"
import ManualChecklist from "./manual_checklist"
import ComplianceKitModal from "./compliance_kit_modal"
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
  scanId?: string | null
}

export default function ResultsDisplay({
  result,
  onNewScan,
  tier = "free",
  scanId = null,
}: ResultsDisplayProps) {
  const [isComplianceKitOpen, setIsComplianceKitOpen] = useState(false)
  const totalIssues = result.violations.length
  const { critical, serious, moderate, minor } = result.summary
  const score = computeScore(result.summary)
  // Older scans predate this field; default to an empty list.
  const incompleteItems = result.incompleteItems ?? []

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
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-0.5 mb-2 text-2xs font-bold rounded-full border bg-indigo-500/10 border-indigo-500/25 text-indigo-300 uppercase tracking-wide"
              title="Highest standard the automated engine evaluates against"
            >
              {WCAG_STANDARD.label} · Automated
            </span>
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
            <div className="mt-3 inline-flex items-center gap-1.5 text-3xs text-slate-400 bg-slate-950/60 border border-slate-800/80 px-2.5 py-1 rounded-lg">
              <svg className="w-3.5 h-3.5 text-indigo-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Automated scan covers ~40–57% of WCAG criteria. Combine with manual testing.</span>
              <Link href="/legal" className="text-indigo-400 underline hover:text-indigo-300 ml-1">
                Details →
              </Link>
            </div>
          </div>
          <div className="flex items-center gap-3.5 self-start sm:self-auto shrink-0 flex-wrap">
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
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setIsComplianceKitOpen(true)}
                className="inline-flex items-center justify-center gap-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/35 px-3.5 py-2 rounded-xl transition-all duration-200 text-xs font-bold cursor-pointer"
              >
                <svg className="w-3.5 h-3.5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                Compliance Kit
              </button>
              <button
                onClick={onNewScan}
                className="bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 px-4 py-2 rounded-xl transition-all duration-200 text-xs font-semibold hover:shadow-md cursor-pointer"
              >
                New Scan
              </button>
            </div>
          </div>
        </div>

        <ComplianceKitModal
          isOpen={isComplianceKitOpen}
          onClose={() => setIsComplianceKitOpen(false)}
          scanId={scanId}
          url={result.url}
          scanDate={result.timestamp}
          summary={result.summary}
          passesCount={result.passes}
          violationsCount={result.violations.length}
          tier={tier}
        />

        {/* Summary Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5 mt-6 relative z-10">
          <div className="col-span-2 sm:col-span-1 text-center p-4 bg-slate-950/60 border border-slate-800/80 rounded-xl">
            <p className="text-3xl font-extrabold text-slate-50"><Counter to={totalIssues} /></p>
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
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mb-3">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
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

      {/* Needs Manual Review (axe-core "incomplete" results) */}
      {incompleteItems.length > 0 && (
        <div className="space-y-5 mt-12">
          <div>
            <h3 className="text-xl font-extrabold text-slate-100 flex items-center gap-2">
              <span>Needs Manual Review</span>
              <span className="px-2.5 py-0.5 text-xs bg-amber-500/10 border border-amber-500/20 rounded-full text-amber-300">
                {incompleteItems.length}
              </span>
            </h3>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed max-w-2xl">
              {AUTOMATED_COVERAGE_NOTE}
            </p>
          </div>
          {incompleteItems.map((issue, index) => (
            <IncompleteCard key={issue.id + index} issue={issue} index={index} />
          ))}
        </div>
      )}

      {/* WCAG 2.2 manual checklist */}
      <div className="mt-12">
        <ManualChecklist />
      </div>
    </div>
  )
}
