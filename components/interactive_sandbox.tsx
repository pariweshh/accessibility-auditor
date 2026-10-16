"use client"

import { useState, useEffect, type ReactNode } from "react"

interface MockIssue {
  id: string
  title: string
  issueHelp: string
  impact: "critical" | "serious" | "moderate"
  brokenHtml: string
  fixedHtml: string
  explanation: string
  confidence: "high" | "medium"
}

const MOCK_ISSUES: MockIssue[] = [
  {
    id: "contrast",
    title: "Color Contrast Ratio",
    issueHelp: "Elements must have sufficient color contrast (WCAG 2.1 AA)",
    impact: "critical",
    brokenHtml: `<button style="background: #e2e8f0; color: #94a3b8; border: none;">\n  Submit Now\n</button>`,
    fixedHtml: `<button style="background: #4f46e5; color: #ffffff; border: none; font-weight: 600; padding: 10px 20px; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.2);">\n  Submit Now\n</button>`,
    explanation: "The original background (#e2e8f0) and text (#94a3b8) yield an extremely low contrast ratio of 1.4:1, far below the required 4.5:1. Remedied by upgrading the button to an indigo background (#4f46e5) and white text (#ffffff), elevating contrast to 5.8:1.",
    confidence: "high",
  },
  {
    id: "alt-text",
    title: "Missing Alt Tag",
    issueHelp: "Images must have alternate text (WCAG 2.1 A)",
    impact: "serious",
    brokenHtml: `<img src="/assets/logo.png" width="120" height="40" />`,
    fixedHtml: `<img src="/assets/logo.png" width="120" height="40" alt="A11ytica Pro SaaS Logo" />`,
    explanation: "The image tag lacked an 'alt' attribute, leaving screen reader users unaware of the graphic's meaning. Appended `alt=\"A11ytica Pro SaaS Logo\"` to provide a clear, descriptive text alternative.",
    confidence: "high",
  },
  {
    id: "form-label",
    title: "Unassociated Input",
    issueHelp: "Form elements must have labels (WCAG 2.1 AA)",
    impact: "serious",
    brokenHtml: `<input type="email" placeholder="Enter email..." />`,
    fixedHtml: `<label for="email-field" class="sr-only">Email Address</label>\n<input type="email" id="email-field" placeholder="Enter email..." />`,
    explanation: "Form controls must have accessible names. Added a visually hidden `<label>` (using a standard screen-reader-only class) and associated it via the `for` and `id` attributes to guarantee accessibility.",
    confidence: "high",
  },
]

export default function InteractiveSandbox() {
  const [selectedIssue, setSelectedIssue] = useState<MockIssue>(MOCK_ISSUES[0])
  const [isFixing, setIsFixing] = useState(false)
  const [showFix, setShowFix] = useState(false)
  const [typedExplanation, setTypedExplanation] = useState("")

  const handleSelectIssue = (issue: MockIssue) => {
    if (isFixing) return
    setSelectedIssue(issue)
    setShowFix(false)
    setTypedExplanation("")
  }

  const handleSimulateFix = () => {
    setIsFixing(true)
    setShowFix(false)
    setTypedExplanation("")

    // Audit scanning animation delay
    setTimeout(() => {
      setIsFixing(false)
      setShowFix(true)
    }, 1800)
  }

  // Simulated typing effect for explanation
  useEffect(() => {
    if (!showFix) return
    let index = 0
    const text = selectedIssue.explanation
    setTypedExplanation("")

    const interval = setInterval(() => {
      setTypedExplanation((prev) => prev + text.charAt(index))
      index++
      if (index >= text.length) {
        clearInterval(interval)
      }
    }, 10)

    return () => clearInterval(interval)
  }, [showFix, selectedIssue])

  const impactClasses = {
    critical: "bg-rose-500/10 text-rose-300 border-rose-500/20",
    serious: "bg-amber-500/10 text-amber-300 border-amber-500/20",
    moderate: "bg-yellow-500/10 text-yellow-300 border-yellow-500/20",
  }

  // Simple tokenizing syntax highlighter for HTML display
  const highlightHtml = (code: string): ReactNode[] => {
    const lines = code.split("\n")
    return lines.map((line, lineIdx) => {
      const tokens: ReactNode[] = []
      let i = 0
      let remaining = line

      while (remaining.length > 0) {
        // Match tag boundaries
        const tagMatch = remaining.match(/<([^>]+)>/)
        if (tagMatch && tagMatch.index !== undefined) {
          // Text before tag
          if (tagMatch.index > 0) {
            tokens.push(<span key={`txt-${lineIdx}-${i++}`}>{remaining.slice(0, tagMatch.index)}</span>)
          }

          // Inside tag attributes parsing
          const tagContent = tagMatch[1]
          const isClose = tagContent.startsWith("/")
          const cleanTag = isClose ? tagContent.slice(1) : tagContent

          const tagTokens: ReactNode[] = []
          let tagRemaining = cleanTag
          let attrKey = 0

          // Tag Name
          const nameMatch = tagRemaining.match(/^([a-zA-Z0-9-]+)/)
          if (nameMatch) {
            tagTokens.push(
              <span key={`name-${lineIdx}-${attrKey++}`} className="token-tag">
                {isClose ? "/" : ""}
                {nameMatch[1]}
              </span>
            )
            tagRemaining = tagRemaining.slice(nameMatch[0].length)
          }

          // Attributes key/value pairs
          while (tagRemaining.length > 0) {
            const attrMatch = tagRemaining.match(/^(\s+)([a-zA-Z0-9-]+)(?:(=)"([^"]*)")?/)
            if (attrMatch) {
              tagTokens.push(<span key={`sp-${lineIdx}-${attrKey++}`}>{attrMatch[1]}</span>)
              tagTokens.push(
                <span key={`attr-${lineIdx}-${attrKey++}`} className="token-attr">
                  {attrMatch[2]}
                </span>
              )
              if (attrMatch[3]) {
                tagTokens.push(<span key={`eq-${lineIdx}-${attrKey++}`} className="text-slate-600">=</span>)
                const isStyle = attrMatch[2] === "style"
                tagTokens.push(
                  <span key={`val-${lineIdx}-${attrKey++}`} className={isStyle ? "token-style" : "token-val"}>
                    "{attrMatch[4]}"
                  </span>
                )
              }
              tagRemaining = tagRemaining.slice(attrMatch[0].length)
            } else {
              tagTokens.push(<span key={`rest-${lineIdx}-${attrKey++}`}>{tagRemaining}</span>)
              break
            }
          }

          tokens.push(
            <span key={`tag-${lineIdx}-${i++}`} className="text-slate-500">
              &lt;{tagTokens}&gt;
            </span>
          )
          remaining = remaining.slice(tagMatch.index + tagMatch[0].length)
        } else {
          // Plain text content node
          tokens.push(<span key={`end-${lineIdx}-${i++}`}>{remaining}</span>)
          break
        }
      }

      return (
        <div key={`line-${lineIdx}`} className="min-h-[1.2em] leading-relaxed font-mono">
          {tokens}
        </div>
      )
    })
  }

  return (
    <section className="mt-28 relative animate-slideUp">
      {/* Background radial gradient */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-5xl h-[350px] bg-radial from-indigo-500/5 via-transparent to-transparent pointer-events-none z-0" />

      <div className="max-w-4xl mx-auto relative z-10">
        <div className="text-center mb-10">
          <span className="text-2xs font-extrabold uppercase tracking-widest text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 rounded-full">
            Try AI Remediation
          </span>
          <h2 className="text-2xl md:text-3xl font-black text-slate-50 mt-3.5 tracking-tight">
            See the AI Engine in Action
          </h2>
          <p className="text-xs text-slate-400 max-w-md mx-auto mt-2 leading-relaxed">
            Select a common accessibility violation below and witness how A11ytica Pro detects and automatically suggests WCAG-compliant fixes.
          </p>
        </div>

        {/* Control Tabs */}
        <div className="flex justify-center gap-2 mb-8 flex-wrap">
          {MOCK_ISSUES.map((issue) => (
            <button
              type="button"
              key={issue.id}
              onClick={() => handleSelectIssue(issue)}
              disabled={isFixing}
              className={`px-4.5 py-2.5 text-2xs font-extrabold rounded-xl border transition-all cursor-pointer select-none ${
                selectedIssue.id === issue.id
                  ? "bg-indigo-600 text-white border-indigo-500 shadow-lg"
                  : "bg-slate-900/40 text-slate-400 border-slate-800 hover:text-slate-200 hover:bg-slate-900/60"
              }`}
            >
              {issue.title}
            </button>
          ))}
        </div>

        {/* Main Sandbox Box */}
        <div className={`glass-panel rounded-2xl overflow-hidden shadow-2xl transition-all duration-300 border ${
          isFixing ? "border-indigo-500/50 shadow-indigo-500/5" : "border-slate-800"
        }`}>
          {/* Header Panel */}
          <div className="px-5 py-4 border-b border-slate-800/80 bg-slate-950/45 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`px-2 py-0.5 text-3xs font-extrabold rounded-md border tracking-wide uppercase ${
                impactClasses[selectedIssue.impact]
              }`}>
                {selectedIssue.impact}
              </span>
              <span className="text-xs font-bold text-slate-300 leading-snug">
                {selectedIssue.issueHelp}
              </span>
            </div>
            
            <button
              type="button"
              onClick={handleSimulateFix}
              disabled={isFixing}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-900 text-slate-950 disabled:text-slate-600 rounded-xl text-2xs font-extrabold transition-all cursor-pointer shadow-md hover:shadow-lg disabled:cursor-not-allowed select-none"
            >
              {isFixing ? "Auditing Code..." : "Simulate AI Fix"}
            </button>
          </div>

          {/* Editors Grid */}
          <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-800/60 bg-slate-950/15">
            {/* Before / Broken Code */}
            <div className="p-5 flex flex-col justify-between min-h-[190px] md:min-h-[220px]">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-3xs font-bold text-rose-400 uppercase tracking-widest block">
                    Original HTML (Broken)
                  </span>
                  {/* macOS Editor Dots */}
                  <div className="flex gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-slate-800" />
                    <span className="w-2 h-2 rounded-full bg-slate-800" />
                    <span className="w-2 h-2 rounded-full bg-slate-800" />
                  </div>
                </div>
                <div className="text-2xs font-mono text-slate-300 bg-slate-950/75 border border-slate-850 p-4 rounded-xl overflow-x-auto min-h-[96px] flex items-center">
                  <div className="w-full text-left">{highlightHtml(selectedIssue.brokenHtml)}</div>
                </div>
              </div>
              <p className="text-3xs text-slate-500 mt-3 flex items-start gap-1">
                <span className="text-rose-500 font-bold" aria-hidden="true">!</span> Screen readers and search crawlers struggle here.
              </p>
            </div>

            {/* After / AI Remediated Code */}
            <div className="p-5 flex flex-col justify-between min-h-[190px] md:min-h-[220px] relative overflow-hidden">
              {/* Scan Laser Overlay */}
              {isFixing && (
                <div className="absolute inset-0 bg-indigo-500/5 z-20 flex flex-col items-center justify-center">
                  <div className="w-full h-[2px] bg-indigo-400/80 absolute top-0 animate-[bounce_1.8s_infinite] shadow-lg shadow-indigo-500" />
                  <div className="flex items-center gap-2 bg-slate-950 border border-indigo-500/30 px-3.5 py-2 rounded-xl shadow-lg">
                    <svg className="animate-spin h-3.5 w-3.5 text-indigo-400" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span className="text-3xs font-extrabold text-indigo-300 font-sans tracking-wide uppercase">AI Audit Engine Running...</span>
                  </div>
                </div>
              )}

              {!isFixing && !showFix && (
                <div className="h-full flex flex-col items-center justify-center text-center opacity-70 p-4">
                  <div className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <p className="text-2xs text-slate-500 font-semibold mt-2 leading-relaxed">
                    Click "Simulate AI Fix" above to trigger compliance suggestions.
                  </p>
                </div>
              )}

              {showFix && !isFixing && (
                <div className="animate-fadeIn">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-3xs font-bold text-emerald-400 uppercase tracking-widest">
                      AI Suggested Fix
                    </span>
                    <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-3xs font-extrabold border border-emerald-500/25 rounded-md uppercase tracking-wider">
                      {selectedIssue.confidence} confidence
                    </span>
                  </div>
                  <div className="text-2xs font-mono text-emerald-300 bg-slate-950/75 border border-emerald-500/15 p-4 rounded-xl overflow-x-auto min-h-[96px] flex items-center">
                    <div className="w-full text-left">{highlightHtml(selectedIssue.fixedHtml)}</div>
                  </div>
                </div>
              )}

              {showFix && !isFixing && (
                <p className="text-3xs text-slate-500 mt-3 flex items-start gap-1">
                  <span className="text-emerald-400 font-bold">✓</span> Code complies fully with WCAG standards.
                </p>
              )}
            </div>
          </div>

          {/* Explanation Panel */}
          {showFix && !isFixing && (
            <div className="px-5 py-4.5 border-t border-slate-800/80 bg-slate-950/45 animate-fadeIn">
              <span className="text-3xs font-bold text-slate-500 uppercase tracking-widest block mb-1">
                AI Explanation
              </span>
              <p className="text-xs text-slate-300 leading-relaxed font-sans min-h-[40px] font-medium">
                {typedExplanation}
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
