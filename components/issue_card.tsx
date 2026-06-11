"use client"

import { useState } from "react"
import { AccessibilityIssue, FixSuggestion } from "@/lib/types"

interface IssueCardProps {
  issue: AccessibilityIssue
  index: number
}

export default function IssueCard({ issue, index }: IssueCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [fixSuggestion, setFixSuggestion] = useState<FixSuggestion | null>(null)
  const [isLoadingFix, setIsLoadingFix] = useState(false)

  const impactColors = {
    critical: "bg-rose-500/10 text-rose-300 border-rose-500/20",
    serious: "bg-amber-500/10 text-amber-300 border-amber-500/20",
    moderate: "bg-yellow-500/10 text-yellow-300 border-yellow-500/20",
    minor: "bg-sky-500/10 text-sky-300 border-sky-500/20",
  }

  const impactBgColors = {
    critical: "bg-rose-950/5 border-rose-500/15",
    serious: "bg-amber-950/5 border-amber-500/15",
    moderate: "bg-yellow-950/5 border-yellow-500/15",
    minor: "bg-sky-950/5 border-sky-500/15",
  }

  const handleGetFix = async () => {
    setIsLoadingFix(true)
    try {
      const response = await fetch("/api/fix-suggestions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ issues: [issue], limit: 1 }),
      })

      if (!response.ok) {
        throw new Error("Failed to generate fix")
      }

      const data = await response.json()
      if (data.fixes && data.fixes.length > 0) {
        setFixSuggestion(data.fixes[0])
      }
    } catch (error) {
      console.error("Error getting fix:", error)
    } finally {
      setIsLoadingFix(false)
    }
  }

  return (
    <div className={`border rounded-xl p-5 ${impactBgColors[issue.impact]} transition-all duration-200 hover:shadow-md`}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2.5 flex-wrap">
            <span className="text-xs font-semibold text-slate-500 font-mono">
              #{String(index + 1).padStart(2, "0")}
            </span>
            <span
              className={`px-2 py-0.5 text-2xs font-bold rounded-md border tracking-wide ${
                impactColors[issue.impact]
              }`}
            >
              {issue.impact.toUpperCase()}
            </span>
          </div>
          <h3 className="text-base font-bold text-slate-100 mb-1.5 leading-snug">
            {issue.help}
          </h3>
          <p className="text-xs text-slate-400 mb-4 leading-relaxed">{issue.description}</p>
          
          <div className="flex gap-4 items-center flex-wrap">
            <a
              href={issue.helpUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium underline"
            >
              Learn more →
            </a>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-xs text-slate-400 hover:text-slate-200 font-semibold cursor-pointer select-none"
            >
              {isExpanded ? "Hide details ↑" : "Show details ↓"}
            </button>
          </div>

          {isExpanded && (
            <div className="space-y-5 mt-5 border-t border-slate-800/80 pt-5">
              <div>
                <h4 className="font-bold text-xs text-slate-400 mb-3 uppercase tracking-wider">
                  Affected Elements ({issue.nodes.length})
                </h4>
                {issue.nodes.slice(0, 3).map((node, idx) => (
                  <div key={idx} className="mb-3.5 bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
                    <p className="text-2xs text-slate-500 mb-2 font-medium">
                      <strong className="text-slate-400">SELECTOR:</strong> {node.target.join(" > ")}
                    </p>
                    <pre className="text-2xs bg-slate-900 border border-slate-850 p-3 rounded-lg overflow-x-auto whitespace-pre-wrap break-all max-w-full font-mono text-slate-300">
                      {node.html}
                    </pre>
                    {node.failureSummary && (
                      <p className="text-xs text-rose-400 mt-3 flex items-start gap-1 leading-normal">
                        <span className="text-rose-500">⚠</span> {node.failureSummary}
                      </p>
                    )}
                  </div>
                ))}
                {issue.nodes.length > 3 && (
                  <p className="text-2xs text-slate-500 mt-2 font-medium pl-1">
                    ... and {issue.nodes.length - 3} more element(s)
                  </p>
                )}
              </div>

              <div>
                <h4 className="font-bold text-xs text-slate-400 mb-2.5 uppercase tracking-wider">
                  WCAG Tags
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {issue.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 text-2xs bg-slate-900 border border-slate-800 text-slate-400 rounded-md font-semibold font-mono"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {!fixSuggestion && (
                <button
                  onClick={handleGetFix}
                  disabled={isLoadingFix}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-slate-950 py-2.5 px-4 rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed text-xs cursor-pointer shadow-md hover:shadow-lg"
                >
                  {isLoadingFix ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg
                        className="animate-spin h-4 w-4 text-slate-950"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Generating AI Suggestion...
                    </span>
                  ) : (
                    "✨ Get AI-Powered Fix Suggestion"
                  )}
                </button>
              )}

              {fixSuggestion && (
                <div className="bg-emerald-500/5 border border-emerald-500/25 rounded-xl p-5 relative overflow-hidden shadow-2xl">
                  {/* Glow accent */}
                  <div className="absolute -top-12 -right-12 w-36 h-36 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none"></div>

                  <div className="flex items-center gap-2 mb-3.5 flex-wrap relative z-10">
                    <span className="text-base">🤖</span>
                    <h4 className="font-bold text-sm text-emerald-300">
                      AI-Generated Fix
                    </h4>
                    <span className="ml-auto px-2 py-0.5 text-2xs bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20 rounded-full font-mono uppercase tracking-wider">
                      {fixSuggestion.confidence} confidence
                    </span>
                  </div>

                  <div className="space-y-4 relative z-10">
                    <div>
                      <p className="text-2xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                        EXPLANATION:
                      </p>
                      <p className="text-xs text-slate-300 leading-relaxed font-normal">
                        {fixSuggestion.explanation}
                      </p>
                    </div>

                    <div>
                      <p className="text-2xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                        SUGGESTED FIX:
                      </p>
                      <pre className="text-2xs bg-slate-950 border border-emerald-500/15 p-3.5 rounded-lg overflow-x-auto font-mono text-emerald-300 leading-relaxed">
                        {fixSuggestion.suggestedFix}
                      </pre>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
