/**
 * Monthly scan limits per subscription tier.
 * Kept in a separate file so both client and server code can import it
 * without pulling in server-only modules (next/headers, etc.)
 */
export const SCAN_LIMITS: Record<string, number> = {
  free: 5,
  pro: 150,
  agency: 600,
}

/**
 * The accessibility standard our automated engine evaluates against.
 * axe-core 4.12 runs WCAG 2.0/2.1/2.2 Level A & AA rules plus best-practice
 * rules by default, so this is the highest standard we can honestly claim.
 */
export const WCAG_STANDARD = {
  version: "WCAG 2.2",
  level: "Level AA",
  label: "WCAG 2.2 Level AA",
} as const

/**
 * Plain-language reminder that automated scanning is only part of conformance.
 * Surfaced on results and in the exported report to avoid overstating coverage.
 */
export const AUTOMATED_COVERAGE_NOTE =
  "Automated checks catch roughly 30–50% of WCAG success criteria. The items below require human judgement and cannot be verified by an automated scan."

/**
 * A single WCAG 2.2 success criterion that requires manual review.
 */
export interface ManualCheck {
  criterion: string
  level: "A" | "AA"
  title: string
  description: string
  /** True when our scan can partially detect this; a human should still confirm. */
  partiallyAutomated?: boolean
}

/**
 * The Level A/AA success criteria introduced in WCAG 2.2. Most cannot be
 * detected automatically, so we present them as an explicit manual checklist
 * rather than silently omitting them from the report.
 */
export const WCAG_22_MANUAL_CHECKS: ManualCheck[] = [
  {
    criterion: "2.4.11",
    level: "AA",
    title: "Focus Not Obscured (Minimum)",
    description:
      "When an element receives keyboard focus, it must not be entirely hidden by other content such as sticky headers, footers, or cookie banners.",
  },
  {
    criterion: "2.5.7",
    level: "AA",
    title: "Dragging Movements",
    description:
      "Any action that relies on dragging must also be operable with a single pointer without dragging (e.g. a tap or click alternative), unless dragging is essential.",
  },
  {
    criterion: "2.5.8",
    level: "AA",
    title: "Target Size (Minimum)",
    description:
      "Interactive targets should be at least 24×24 CSS pixels, or have sufficient spacing, so they are easy to activate. Our scan flags some violations, but spacing exceptions need manual confirmation.",
    partiallyAutomated: true,
  },
  {
    criterion: "3.2.6",
    level: "A",
    title: "Consistent Help",
    description:
      "If help mechanisms (contact details, chat, FAQ links) appear on multiple pages, they must appear in the same relative order across those pages.",
  },
  {
    criterion: "3.3.7",
    level: "A",
    title: "Redundant Entry",
    description:
      "Information the user already entered in the same process must be auto-populated or available to select, rather than asking them to re-enter it.",
  },
  {
    criterion: "3.3.8",
    level: "AA",
    title: "Accessible Authentication (Minimum)",
    description:
      "Logging in must not rely on a cognitive function test (such as remembering a password or solving a puzzle) unless an alternative like copy-paste or a password manager is supported.",
  },
]
