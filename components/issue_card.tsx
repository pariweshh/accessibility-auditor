"use client"

import { useState, useEffect } from "react"
import { AccessibilityIssue, FixSuggestion, AIFramework } from "@/lib/types"

interface IssueCardProps {
  issue: AccessibilityIssue
  index: number
  tier?: string
}

const FRAMEWORKS: { id: AIFramework; label: string; shortLabel: string; proOnly: boolean }[] = [
  { id: "html", label: "HTML / CSS", shortLabel: "HTML", proOnly: false },
  { id: "react-tailwind", label: "React + Tailwind", shortLabel: "React JSX", proOnly: true },
  { id: "vue", label: "Vue 3 SFC", shortLabel: "Vue 3", proOnly: true },
  { id: "angular", label: "Angular", shortLabel: "Angular", proOnly: true },
]

export default function IssueCard({ issue, index, tier = "free" }: IssueCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [fixSuggestion, setFixSuggestion] = useState<FixSuggestion | null>(null)
  const [isLoadingFix, setIsLoadingFix] = useState(false)
  const [usePremiumModel, setUsePremiumModel] = useState(false)
  const [selectedFramework, setSelectedFramework] = useState<AIFramework>("html")
  const [copiedFix, setCopiedFix] = useState(false)

  const isPremiumTier = tier === "pro" || tier === "agency"

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedModel = localStorage.getItem("default_ai_model")
      if (savedModel === "gpt-4o" && isPremiumTier) {
        setUsePremiumModel(true)
      }
      const savedFramework = localStorage.getItem("default_ai_framework") as AIFramework | null
      if (
        savedFramework &&
        ["html", "react-tailwind", "vue", "angular"].includes(savedFramework) &&
        (savedFramework === "html" || isPremiumTier)
      ) {
        setSelectedFramework(savedFramework)
      }
    }
  }, [isPremiumTier])

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

  const handleGetFix = async (overrideFramework?: AIFramework) => {
    const activeFramework = overrideFramework || selectedFramework
    setIsLoadingFix(true)
    setCopiedFix(false)
    try {
      const response = await fetch("/api/fix-suggestions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          issues: [issue],
          limit: 1,
          model: usePremiumModel ? "gpt-4o" : "gpt-4o-mini",
          framework: activeFramework,
        }),
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

  const handleFrameworkClick = (fw: AIFramework, proOnly: boolean) => {
    if (proOnly && !isPremiumTier) return
    setSelectedFramework(fw)
    if (fixSuggestion && fixSuggestion.framework !== fw) {
      handleGetFix(fw)
    }
  }

  const handleCopyCode = () => {
    if (!fixSuggestion?.suggestedFix) return
    navigator.clipboard.writeText(fixSuggestion.suggestedFix)
    setCopiedFix(true)
    setTimeout(() => setCopiedFix(false), 2000)
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
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              aria-expanded={isExpanded}
              aria-controls={`issue-details-${issue.id}-${index}`}
              className="text-xs text-slate-400 hover:text-slate-200 font-semibold cursor-pointer select-none"
            >
              {isExpanded ? "Hide details ↑" : "Show details ↓"}
            </button>
          </div>

          {isExpanded && (
            <div id={`issue-details-${issue.id}-${index}`} className="space-y-5 mt-5 border-t border-slate-800/80 pt-5">
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
                      <p className="text-xs text-rose-400 mt-3 flex items-start gap-1.5 leading-normal">
                        <svg className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
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

              {/* Target Code Framework Selector */}
              <div className="bg-slate-900/60 border border-slate-800/80 p-3.5 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-200">Target Code Framework</span>
                    {!isPremiumTier && (
                      <span className="text-3xs px-1.5 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/25 rounded-md font-extrabold uppercase tracking-wide">
                        Pro Frameworks
                      </span>
                    )}
                  </div>
                  <span className="text-2xs text-slate-400">
                    Generate idiomatic remediation snippets for your stack
                  </span>
                </div>
                <div className="flex flex-wrap gap-2" role="group" aria-label="Target code framework">
                  {FRAMEWORKS.map((fw) => {
                    const isLocked = fw.proOnly && !isPremiumTier
                    const isSelected = selectedFramework === fw.id
                    return (
                      <button
                        key={fw.id}
                        type="button"
                        disabled={isLocked || isLoadingFix}
                        onClick={() => handleFrameworkClick(fw.id, fw.proOnly)}
                        className={`px-3 py-1.5 rounded-lg text-2xs font-bold border transition-all flex items-center gap-1.5 ${
                          isSelected
                            ? "bg-indigo-600/20 text-indigo-300 border-indigo-500/50 shadow-sm"
                            : isLocked
                            ? "bg-slate-950/40 text-slate-500 border-slate-800/60 opacity-60 cursor-not-allowed"
                            : "bg-slate-950/60 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700 cursor-pointer"
                        }`}
                      >
                        <span>{fw.label}</span>
                        {isLocked && (
                          <svg className="w-3 h-3 text-amber-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>

              {!fixSuggestion && (
                <div className="space-y-4">
                  {/* Model Selection Toggle */}
                  <div className="flex items-center justify-between bg-slate-900/60 border border-slate-800/80 p-3.5 rounded-xl transition-all duration-200">
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-200">
                          Premium AI Engine (gpt-4o)
                        </span>
                        {!isPremiumTier && (
                          <span className="text-3xs px-1.5 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/25 rounded-md font-extrabold uppercase tracking-wide">
                            Pro
                          </span>
                        )}
                      </div>
                      <span className="text-2xs text-slate-400">
                        Better for complex React, Vue, or nested layouts.
                      </span>
                    </div>

                    <button
                      type="button"
                      role="switch"
                      aria-checked={usePremiumModel}
                      aria-label="Toggle premium AI engine gpt-4o"
                      disabled={!isPremiumTier}
                      onClick={() => setUsePremiumModel(!usePremiumModel)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                        usePremiumModel ? 'bg-emerald-500 border-emerald-400' : 'bg-slate-800 border-slate-700'
                      } ${!isPremiumTier ? 'opacity-40 cursor-not-allowed' : ''}`}
                    >
                      <span className="sr-only">Toggle premium engine</span>
                      <span
                        className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-slate-100 shadow-sm transition duration-200 ease-in-out ${
                          usePremiumModel ? 'translate-x-4.5 bg-slate-950' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                  </div>

                  {!isPremiumTier && (
                    <p className="text-3xs text-amber-400/90 pl-1 leading-normal">
                      Standard gpt-4o-mini & HTML output active. Upgrade to Pro or Agency to unlock React/Tailwind, Vue 3, Angular & gpt-4o remediation.
                    </p>
                  )}

                  <button
                    onClick={() => handleGetFix()}
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
                        Generating {FRAMEWORKS.find((f) => f.id === selectedFramework)?.shortLabel || "HTML"} Fix ({usePremiumModel ? "gpt-4o" : "gpt-4o-mini"})...
                      </span>
                    ) : (
                      `Get AI-Powered ${FRAMEWORKS.find((f) => f.id === selectedFramework)?.shortLabel || "HTML"} Fix (${usePremiumModel ? "gpt-4o" : "gpt-4o-mini"})`
                    )}
                  </button>
                </div>
              )}

              {fixSuggestion && (
                <div className="bg-emerald-500/5 border border-emerald-500/25 rounded-xl p-5 relative overflow-hidden shadow-2xl">
                  {/* Glow accent */}
                  <div className="absolute -top-12 -right-12 w-36 h-36 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none"></div>

                  <div className="flex items-center gap-2 mb-3.5 flex-wrap relative z-10">
                    <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <h4 className="font-bold text-sm text-emerald-300">
                      AI-Generated Fix ({usePremiumModel ? "gpt-4o" : "gpt-4o-mini"})
                    </h4>
                    <span className="px-2 py-0.5 text-2xs bg-indigo-500/15 text-indigo-300 font-semibold border border-indigo-500/25 rounded-md font-mono uppercase tracking-wider">
                      {FRAMEWORKS.find((f) => f.id === (fixSuggestion.framework || selectedFramework))?.shortLabel || "HTML"}
                    </span>
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
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="text-2xs font-semibold text-slate-400 uppercase tracking-wider">
                          SUGGESTED FIX ({FRAMEWORKS.find((f) => f.id === (fixSuggestion.framework || selectedFramework))?.label || "HTML / CSS"}):
                        </p>
                        <button
                          type="button"
                          onClick={handleCopyCode}
                          className="text-2xs font-bold text-emerald-300 hover:text-emerald-200 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/25 px-2.5 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                        >
                          {copiedFix ? (
                            <>
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                              Copied!
                            </>
                          ) : (
                            <>
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                              Copy Code
                            </>
                          )}
                        </button>
                        <span role="status" className="sr-only">
                          {copiedFix ? "Code fix copied to clipboard" : ""}
                        </span>
                      </div>
                      <pre className="text-2xs bg-slate-950 border border-emerald-500/15 p-3.5 rounded-lg overflow-x-auto font-mono text-emerald-300 leading-relaxed">
                        {isLoadingFix ? "Regenerating fix for selected framework..." : fixSuggestion.suggestedFix}
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
