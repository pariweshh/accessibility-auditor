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
    critical: "bg-red-100 text-red-800 border-red-300",
    serious: "bg-orange-100 text-orange-800 border-orange-300",
    moderate: "bg-yellow-100 text-yellow-800 border-yellow-300",
    minor: "bg-blue-100 text-blue-800 border-blue-300",
  }

  const impactBgColors = {
    critical: "bg-red-50 border-red-200",
    serious: "bg-orange-50 border-orange-200",
    moderate: "bg-yellow-50 border-yellow-200",
    minor: "bg-blue-50 border-blue-200",
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
    <div className={`border rounded-lg p-4 ${impactBgColors[issue.impact]}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          {" "}
          {/* Added min-w-0 for text truncation */}
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="text-sm font-mono text-gray-600">
              #{index + 1}
            </span>
            <span
              className={`px-2 py-1 text-xs font-semibold rounded-full ${
                impactColors[issue.impact]
              }`}
            >
              {issue.impact.toUpperCase()}
            </span>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            {issue.help}
          </h3>
          <p className="text-sm text-gray-700 mb-3">{issue.description}</p>
          <div className="flex gap-2 mb-3 flex-wrap">
            <a
              href={issue.helpUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:text-blue-800 underline"
            >
              Learn more →
            </a>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-sm text-gray-600 hover:text-gray-800 font-medium"
            >
              {isExpanded ? "Hide details ↑" : "Show details ↓"}
            </button>
          </div>
          {isExpanded && (
            <div className="space-y-4 mt-4 border-t pt-4">
              <div>
                <h4 className="font-semibold text-sm text-gray-900 mb-2">
                  Affected Elements ({issue.nodes.length})
                </h4>
                {issue.nodes.slice(0, 3).map((node, idx) => (
                  <div key={idx} className="mb-3 bg-white p-3 rounded border">
                    <p className="text-xs text-gray-600 mb-1 wrap-break-word">
                      <strong>Selector:</strong> {node.target.join(" > ")}
                    </p>
                    {/* Fixed: Added proper overflow handling */}
                    <pre className="text-xs bg-gray-50 p-2 rounded overflow-x-auto whitespace-pre-wrap break-all max-w-full">
                      {node.html}
                    </pre>
                    {node.failureSummary && (
                      <p className="text-xs text-red-600 mt-2 wrap-break-word">
                        {node.failureSummary}
                      </p>
                    )}
                  </div>
                ))}
                {issue.nodes.length > 3 && (
                  <p className="text-xs text-gray-500 mt-2">
                    ... and {issue.nodes.length - 3} more element(s)
                  </p>
                )}
              </div>

              <div>
                <h4 className="font-semibold text-sm text-gray-900 mb-2">
                  WCAG Tags
                </h4>
                <div className="flex flex-wrap gap-1">
                  {issue.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded"
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
                  className="w-full bg-green-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm"
                >
                  {isLoadingFix ? (
                    <span className="flex items-center justify-center">
                      <svg
                        className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
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
                      Generating AI Fix...
                    </span>
                  ) : (
                    "✨ Get AI-Powered Fix Suggestion"
                  )}
                </button>
              )}

              {fixSuggestion && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <span className="text-lg">🤖</span>
                    <h4 className="font-semibold text-gray-900">
                      AI-Generated Fix
                    </h4>
                    <span className="ml-auto px-2 py-1 text-xs bg-green-200 text-green-800 rounded">
                      {fixSuggestion.confidence} confidence
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">
                        Explanation:
                      </p>
                      <p className="text-sm text-gray-600 wrap-break-word">
                        {fixSuggestion.explanation}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">
                        Suggested Fix:
                      </p>
                      {/* Fixed: Added proper overflow handling */}
                      <pre className="text-xs bg-white p-3 rounded border overflow-x-auto whitespace-pre-wrap break-all max-w-full">
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
