// Accessibility issue from axe-core
export interface AccessibilityIssue {
  id: string
  impact: "minor" | "moderate" | "serious" | "critical"
  description: string
  help: string
  helpUrl: string
  tags: string[]
  nodes: {
    html: string
    target: string[]
    failureSummary: string
  }[]
}

// Scan result
export interface ScanResult {
  url: string
  timestamp: string
  violations: AccessibilityIssue[]
  passes: number
  incomplete: number
  summary: {
    critical: number
    serious: number
    moderate: number
    minor: number
  }
}

// AI fix suggestion
export interface FixSuggestion {
  issueId: string
  originalCode: string
  suggestedFix: string
  explanation: string
  confidence: "high" | "medium" | "low"
}
