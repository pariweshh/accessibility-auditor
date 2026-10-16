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
  // Count of axe-core "incomplete" results (checks needing human review).
  incomplete: number
  // Full detail of those incomplete results. Optional for backward
  // compatibility with scans recorded before this field existed.
  incompleteItems?: AccessibilityIssue[]
  summary: {
    critical: number
    serious: number
    moderate: number
    minor: number
  }
}

// Supported target frameworks for AI remediation
export type AIFramework = "html" | "react-tailwind" | "vue" | "angular"

// AI fix suggestion
export interface FixSuggestion {
  issueId: string
  originalCode: string
  suggestedFix: string
  explanation: string
  confidence: "high" | "medium" | "low"
  framework?: AIFramework
}

// A single scan row from the database
export interface ScanRecord {
  id: string
  user_id: string
  team_id?: string | null
  url: string
  status: "pending" | "processing" | "completed" | "failed"
  violations: number
  passes: number
  summary: {
    critical: number
    serious: number
    moderate: number
    minor: number
  } | null
  result: ScanResult | null
  error_message: string | null
  created_at: string
  pdf_url: string | null
}

// White-Label Custom Branding (Agency Tier)
export interface AgencyBranding {
  brandName?: string | null
  brandLogoUrl?: string | null
  brandPrimaryColor?: string | null
  brandTagline?: string | null
  brandFooterText?: string | null
  brandHideWatermark?: boolean
}

// Agency Team Workspace
export interface Team {
  id: string
  owner_id: string
  name: string
  max_seats: number
  brand_name?: string | null
  brand_logo_url?: string | null
  brand_primary_color?: string | null
  brand_tagline?: string | null
  brand_footer_text?: string | null
  brand_hide_watermark?: boolean
  created_at: string
}

// Team Member / Seat
export interface TeamMember {
  id: string
  team_id: string
  user_id: string | null
  email: string
  role: "owner" | "member"
  status: "pending" | "active"
  invite_token?: string | null
  created_at: string
}

// Scheduled Monitor
export type MonitorFrequency = "daily" | "weekly"
export type MonitorStatus = "active" | "paused"

export interface ScheduledMonitor {
  id: string
  user_id: string
  team_id: string | null
  url: string
  frequency: MonitorFrequency
  status: MonitorStatus
  alert_email: string
  alert_on_degradation: boolean
  min_score_threshold: number
  last_run_at: string | null
  last_score: number | null
  last_scan_id: string | null
  next_run_at: string
  created_at: string
}

