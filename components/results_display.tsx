"use client"

import { ScanResult } from "@/lib/types"
import IssueCard from "./issue_card"

interface ResultsDisplayProps {
  result: ScanResult
  onNewScan: () => void
}

export default function ResultsDisplay({
  result,
  onNewScan,
}: ResultsDisplayProps) {
  const totalIssues = result.violations.length
  const { critical, serious, moderate, minor } = result.summary

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Scan Results
            </h2>
            <p className="text-sm text-gray-600">
              <strong>URL:</strong>{" "}
              <a
                href={result.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                {result.url}
              </a>
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Scanned on {new Date(result.timestamp).toLocaleString()}
            </p>
          </div>
          <button
            onClick={onNewScan}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            New Scan
          </button>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <p className="text-2xl font-bold text-gray-900">{totalIssues}</p>
            <p className="text-xs text-gray-600 mt-1">Total Issues</p>
          </div>
          <div className="text-center p-3 bg-red-50 rounded-lg border border-red-200">
            <p className="text-2xl font-bold text-red-700">{critical}</p>
            <p className="text-xs text-red-600 mt-1">Critical</p>
          </div>
          <div className="text-center p-3 bg-orange-50 rounded-lg border border-orange-200">
            <p className="text-2xl font-bold text-orange-700">{serious}</p>
            <p className="text-xs text-orange-600 mt-1">Serious</p>
          </div>
          <div className="text-center p-3 bg-yellow-50 rounded-lg border border-yellow-200">
            <p className="text-2xl font-bold text-yellow-700">{moderate}</p>
            <p className="text-xs text-yellow-600 mt-1">Moderate</p>
          </div>
          <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-2xl font-bold text-blue-700">{minor}</p>
            <p className="text-xs text-blue-600 mt-1">Minor</p>
          </div>
        </div>

        {/* Additional Stats */}
        <div className="flex gap-6 mt-4 pt-4 border-t">
          <div>
            <p className="text-sm text-gray-600">
              <span className="font-semibold text-green-600">
                {result.passes}
              </span>{" "}
              tests passed
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">
              <span className="font-semibold text-gray-700">
                {result.incomplete}
              </span>{" "}
              incomplete
            </p>
          </div>
        </div>
      </div>

      {/* Issues List */}
      <div className="space-y-4">
        <h3 className="text-xl font-bold text-gray-900">
          Accessibility Issues ({totalIssues})
        </h3>

        {totalIssues === 0 ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-8 text-center">
            <div className="text-4xl mb-3">🎉</div>
            <h3 className="text-xl font-semibold text-green-900 mb-2">
              No Issues Found!
            </h3>
            <p className="text-green-700">
              This page passed all automated accessibility tests.
            </p>
            <p className="text-sm text-green-600 mt-2">
              Note: Manual testing is still recommended for complete
              accessibility coverage.
            </p>
          </div>
        ) : (
          result.violations.map((issue, index) => (
            <IssueCard key={issue.id + index} issue={issue} index={index} />
          ))
        )}
      </div>
    </div>
  )
}
