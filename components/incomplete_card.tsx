"use client"

import { useState } from "react"
import { AccessibilityIssue } from "@/lib/types"

interface IncompleteCardProps {
  issue: AccessibilityIssue
  index: number
}

/**
 * Renders a single axe-core "incomplete" result — a check the automated engine
 * could not decide on its own and that a human must review. Intentionally has
 * no AI-fix action, since there is no confirmed violation to fix yet.
 */
export default function IncompleteCard({ issue, index }: IncompleteCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className="border rounded-xl p-5 bg-amber-950/5 border-amber-500/15 transition-all duration-200 hover:shadow-md">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-2.5 flex-wrap">
          <span className="text-xs font-semibold text-slate-500 font-mono">
            #{String(index + 1).padStart(2, "0")}
          </span>
          <span className="px-2 py-0.5 text-2xs font-bold rounded-md border tracking-wide bg-amber-500/10 text-amber-300 border-amber-500/20">
            NEEDS REVIEW
          </span>
        </div>
        <h3 className="text-base font-bold text-slate-100 mb-1.5 leading-snug">
          {issue.help}
        </h3>
        <p className="text-xs text-slate-400 mb-4 leading-relaxed">
          {issue.description}
        </p>

        <div className="flex gap-4 items-center flex-wrap">
          <a
            href={issue.helpUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-indigo-400 hover:text-indigo-300 font-medium underline"
          >
            Learn more →
          </a>
          {issue.nodes.length > 0 && (
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              aria-expanded={isExpanded}
              aria-controls={`incomplete-details-${issue.id}-${index}`}
              className="text-xs text-slate-400 hover:text-slate-200 font-semibold cursor-pointer select-none"
            >
              {isExpanded ? "Hide details ↑" : "Show details ↓"}
            </button>
          )}
        </div>

        {isExpanded && (
          <div id={`incomplete-details-${issue.id}-${index}`} className="space-y-5 mt-5 border-t border-slate-800/80 pt-5">
            <div>
              <h4 className="font-bold text-xs text-slate-400 mb-3 uppercase tracking-wider">
                Elements To Review ({issue.nodes.length})
              </h4>
              {issue.nodes.slice(0, 3).map((node, idx) => (
                <div
                  key={idx}
                  className="mb-3.5 bg-slate-950/60 p-4 rounded-xl border border-slate-800/80"
                >
                  <p className="text-2xs text-slate-500 mb-2 font-medium">
                    <strong className="text-slate-400">SELECTOR:</strong>{" "}
                    {node.target.join(" > ")}
                  </p>
                  <pre className="text-2xs bg-slate-900 border border-slate-850 p-3 rounded-lg overflow-x-auto whitespace-pre-wrap break-all max-w-full font-mono text-slate-300">
                    {node.html}
                  </pre>
                  {node.failureSummary && (
                    <p className="text-xs text-amber-400 mt-3 flex items-start gap-1.5 leading-normal">
                      <svg className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <span>{node.failureSummary}</span>
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

            {issue.tags.length > 0 && (
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
            )}
          </div>
        )}
      </div>
    </div>
  )
}
