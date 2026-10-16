"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { ScanResult } from "@/lib/types"
import { useFocusTrap } from "@/hooks/use-focus-trap"

export interface ComplianceKitModalProps {
  isOpen: boolean
  onClose: () => void
  scanId?: string | null
  url: string
  scanDate?: string
  summary: ScanResult["summary"]
  passesCount?: number
  violationsCount?: number
  tier?: string
}

type RegulationType = "eaa" | "ada" | "wcag"

function getHostname(rawUrl: string): string {
  try {
    return new URL(rawUrl).hostname.replace(/^www\./, "")
  } catch {
    return rawUrl.replace(/^https?:\/\//, "").split("/")[0] || "Website"
  }
}

function computeScore(summary: ScanResult["summary"]): number {
  const penalty =
    (summary.critical || 0) * 15 +
    (summary.serious || 0) * 7 +
    (summary.moderate || 0) * 3 +
    (summary.minor || 0) * 1
  return Math.max(0, Math.min(100, 100 - penalty))
}

export default function ComplianceKitModal({
  isOpen,
  onClose,
  scanId,
  url,
  scanDate,
  summary,
  passesCount = 0,
  violationsCount,
  tier = "free",
}: ComplianceKitModalProps) {
  const isPaid = tier === "pro" || tier === "agency"
  const modalRef = useRef<HTMLDivElement>(null)

  const defaultOrg = useMemo(() => {
    const host = getHostname(url)
    return host.charAt(0).toUpperCase() + host.slice(1)
  }, [url])

  const [activeTab, setActiveTab] = useState<"statement" | "badge" | "widget">("statement")
  const [orgName, setOrgName] = useState(defaultOrg)
  const [contactEmail, setContactEmail] = useState(`accessibility@${getHostname(url)}`)
  const [regulation, setRegulation] = useState<RegulationType>("eaa")
  const [statementFormat, setStatementFormat] = useState<"html" | "markdown">("html")
  const [widgetPosition, setWidgetPosition] = useState<"bottom-right" | "bottom-left">("bottom-right")
  const [widgetTheme, setWidgetTheme] = useState<"dark" | "light">("dark")
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  useEffect(() => {
    const host = getHostname(url)
    setOrgName(host.charAt(0).toUpperCase() + host.slice(1))
    setContactEmail(`accessibility@${host}`)
  }, [url])

  // Accessible Escape & Focus Trap (WCAG 2.1.2 & 2.4.3)
  useFocusTrap({
    isOpen,
    onClose,
    containerRef: modalRef,
  })

  const handleTabKeyDown = (e: React.KeyboardEvent) => {
    const tabs: ("statement" | "badge" | "widget")[] = ["statement", "badge", "widget"]
    const currentIndex = tabs.indexOf(activeTab)
    if (e.key === "ArrowRight") {
      e.preventDefault()
      const nextTab = tabs[(currentIndex + 1) % tabs.length]
      setActiveTab(nextTab)
      document.getElementById(`tab-compliance-${nextTab}`)?.focus()
    } else if (e.key === "ArrowLeft") {
      e.preventDefault()
      const prevTab = tabs[(currentIndex - 1 + tabs.length) % tabs.length]
      setActiveTab(prevTab)
      document.getElementById(`tab-compliance-${prevTab}`)?.focus()
    } else if (e.key === "Home") {
      e.preventDefault()
      setActiveTab("statement")
      document.getElementById("tab-compliance-statement")?.focus()
    } else if (e.key === "End") {
      e.preventDefault()
      setActiveTab("widget")
      document.getElementById("tab-compliance-widget")?.focus()
    }
  }

  if (!isOpen) return null

  const score = computeScore(summary)
  const totalViolations =
    typeof violationsCount === "number"
      ? violationsCount
      : summary.critical + summary.serious + summary.moderate + summary.minor
  const formattedDate = scanDate
    ? new Date(scanDate).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })

  const isSubstantiallyConformant = summary.critical === 0 && summary.serious === 0
  const conformanceStatus = isSubstantiallyConformant
    ? "Substantially Conformant"
    : "Partially Conformant"

  const regulationLabel =
    regulation === "eaa"
      ? "European Accessibility Act (Directive (EU) 2019/882 / EAA 2025) and EN 301 549"
      : regulation === "ada"
      ? "United States Americans with Disabilities Act (ADA Title III) and Section 508 of the Rehabilitation Act"
      : "World Wide Web Consortium (W3C) Web Content Accessibility Guidelines (WCAG) 2.2 Level AA"

  const origin =
    typeof window !== "undefined" ? window.location.origin : "https://equivance.app"
  const effectiveScanId = scanId || "00000000-0000-0000-0000-000000000000"
  const badgeUrl = `${origin}/api/badge/${effectiveScanId}`
  const verifyUrl = `${origin}/report/${effectiveScanId}?verify=1`

  const markdownStatement = `# Accessibility Statement for ${orgName}

**Website:** ${url}
**Last Audited:** ${formattedDate}
**Automated Compliance Score:** ${score}% (${passesCount} passed rules, ${totalViolations} detected issues)

## Commitment to Digital Accessibility
${orgName} is committed to ensuring digital accessibility for people with disabilities. We continually improve the user experience for everyone and apply the relevant accessibility standards aligned with the **${regulationLabel}**.

## Conformance Status
The Web Content Accessibility Guidelines (WCAG) defines requirements for designers and developers to improve accessibility for people with disabilities. It defines three levels of conformance: Level A, Level AA, and Level AAA.

**${url}** is **${conformanceStatus}** with **WCAG 2.2 Level AA**.
- **Passed Automated Checks:** ${passesCount} WCAG 2.2 Level A & AA rules
- **Critical / Serious Blockers:** ${summary.critical + summary.serious}
- **Moderate / Minor Refinements:** ${summary.moderate + summary.minor}

## Assessment Approach
${orgName} assessed the accessibility of ${url} via automated headless Chromium DOM inspection (axe-core WCAG 2.2 Level A/AA engine) on ${formattedDate}.${scanId ? ` Public verification report: [View Verification Report](${verifyUrl})` : ""}

## Feedback & Contact Information
We welcome your feedback on the accessibility of ${orgName}. Please let us know if you encounter accessibility barriers:
- **Email:** [${contactEmail}](mailto:${contactEmail})
- **Target Response Time:** Within 5 business days`

  const htmlStatement = `<section aria-labelledby="a11y-statement-heading">
  <h1 id="a11y-statement-heading">Accessibility Statement for ${orgName}</h1>
  <p><strong>Website:</strong> <a href="${url}">${url}</a><br />
  <strong>Last Audited:</strong> ${formattedDate}<br />
  <strong>Automated Compliance Score:</strong> ${score}% (${passesCount} passed rules)</p>

  <h2>Commitment to Digital Accessibility</h2>
  <p>${orgName} is committed to ensuring digital accessibility for people with disabilities. We continually improve the user experience for everyone and apply the relevant accessibility standards aligned with the <strong>${regulationLabel}</strong>.</p>

  <h2>Conformance Status</h2>
  <p><strong>${url}</strong> is <strong>${conformanceStatus}</strong> with <strong>WCAG 2.2 Level AA</strong>.</p>
  <ul>
    <li><strong>Passed Automated Checks:</strong> ${passesCount} WCAG 2.2 Level A &amp; AA rules</li>
    <li><strong>Critical / Serious Blockers:</strong> ${summary.critical + summary.serious}</li>
    <li><strong>Moderate / Minor Refinements:</strong> ${summary.moderate + summary.minor}</li>
  </ul>

  <h2>Assessment Approach</h2>
  <p>${orgName} assessed the accessibility of ${url} via automated headless Chromium DOM inspection (WCAG 2.2 Level A &amp; AA) on ${formattedDate}.${
    scanId
      ? ` <a href="${verifyUrl}" target="_blank" rel="noopener noreferrer">View Public Verification Report</a>.`
      : ""
  }</p>

  <h2>Feedback &amp; Contact Information</h2>
  <p>We welcome your feedback on the accessibility of ${orgName}. Please let us know if you encounter accessibility barriers:</p>
  <ul>
    <li><strong>Email:</strong> <a href="mailto:${contactEmail}">${contactEmail}</a></li>
    <li><strong>Target Response Time:</strong> Within 5 business days</li>
  </ul>
</section>`

  const htmlBadgeSnippet = `<a href="${verifyUrl}" target="_blank" rel="noopener noreferrer" title="Verify WCAG 2.2 AA Accessibility Audit for ${orgName}">
  <img src="${badgeUrl}" alt="WCAG 2.2 AA Accessibility Audit: ${score}% Pass" height="28" />
</a>`

  const markdownBadgeSnippet = `[![WCAG 2.2 AA Accessibility Audit: ${score}% Pass](${badgeUrl})](${verifyUrl})`

  const handleCopy = (key: string, text: string) => {
    if (!isPaid) return
    navigator.clipboard.writeText(text)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm cursor-pointer"
        aria-hidden="true"
      />

      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="compliance-kit-title"
        className="relative bg-slate-900 border border-slate-800/80 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-fadeIn text-slate-100 flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex justify-between items-center px-5 py-4 border-b border-slate-800/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <h2 id="compliance-kit-title" className="text-sm font-bold text-slate-100 flex items-center gap-2">
                Compliance Kit & Verification Badge
                <span className="px-2 py-0.5 text-3xs font-extrabold uppercase tracking-wider bg-indigo-500/15 text-indigo-300 border border-indigo-500/25 rounded-md">
                  {tier === "agency" ? "Agency White-Label" : "Pro & Agency"}
                </span>
              </h2>
              <p className="text-2xs text-slate-400 truncate max-w-md">{url}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close compliance kit dialog"
            className="text-slate-400 hover:text-slate-200 transition-colors p-2 min-w-[32px] min-h-[32px] flex items-center justify-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Screen Reader Live Region for Copy Feedback */}
        <div role="status" aria-live="polite" className="sr-only">
          {copiedKey ? "Content copied to clipboard" : ""}
        </div>

        {/* Tabs */}
        <div
          role="tablist"
          aria-label="Compliance kit sections"
          onKeyDown={handleTabKeyDown}
          className="flex border-b border-slate-800/80 px-5"
        >
          <button
            role="tab"
            id="tab-compliance-statement"
            aria-controls="panel-compliance-statement"
            aria-selected={activeTab === "statement"}
            tabIndex={activeTab === "statement" ? 0 : -1}
            onClick={() => setActiveTab("statement")}
            className={`py-3 pr-5 text-xs font-semibold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "statement"
                ? "border-indigo-500 text-slate-100"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <svg className="w-3.5 h-3.5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Accessibility Statement (EAA / ADA)
          </button>
          <button
            role="tab"
            id="tab-compliance-badge"
            aria-controls="panel-compliance-badge"
            aria-selected={activeTab === "badge"}
            tabIndex={activeTab === "badge" ? 0 : -1}
            onClick={() => setActiveTab("badge")}
            className={`py-3 px-5 text-xs font-semibold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "badge"
                ? "border-indigo-500 text-slate-100"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Live SVG Compliance Badge
          </button>
          <button
            role="tab"
            id="tab-compliance-widget"
            aria-controls="panel-compliance-widget"
            aria-selected={activeTab === "widget"}
            tabIndex={activeTab === "widget" ? 0 : -1}
            onClick={() => setActiveTab("widget")}
            className={`py-3 px-5 text-xs font-semibold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "widget"
                ? "border-indigo-500 text-slate-100"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <svg className="w-3.5 h-3.5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
            Embeddable Widget
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-5">
          {!isPaid && (
            <div className="p-3.5 bg-amber-500/10 border border-amber-500/25 rounded-xl flex items-center justify-between gap-3">
              <div className="text-2xs text-amber-200 leading-relaxed">
                <strong className="font-bold text-amber-300">Pro & Agency Feature Preview:</strong> Upgrade to export legally structured EAA 2025 / ADA Conformance Statements and embed live verification badges.
              </div>
              <a
                href="/#pricing"
                onClick={onClose}
                className="shrink-0 bg-indigo-600 hover:bg-indigo-500 text-white text-2xs font-bold px-3.5 py-2 rounded-lg transition-colors"
              >
                Upgrade Plan
              </a>
            </div>
          )}

          {activeTab === "statement" && (
            <div id="panel-compliance-statement" role="tabpanel" aria-labelledby="tab-compliance-statement" className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label htmlFor="ck-org-name" className="block text-2xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Organization Name
                  </label>
                  <input
                    id="ck-org-name"
                    type="text"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label htmlFor="ck-contact-email" className="block text-2xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Accessibility Contact Email
                  </label>
                  <input
                    id="ck-contact-email"
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label htmlFor="ck-regulation" className="block text-2xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Target Regulation
                  </label>
                  <select
                    id="ck-regulation"
                    value={regulation}
                    onChange={(e) => setRegulation(e.target.value as RegulationType)}
                    className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="eaa">EU EAA 2025 & EN 301 549</option>
                    <option value="ada">US ADA Title III & Section 508</option>
                    <option value="wcag">W3C WCAG 2.2 Level AA</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setStatementFormat("html")}
                      className={`px-2.5 py-1 rounded-md text-2xs font-bold transition-colors cursor-pointer ${
                        statementFormat === "html"
                          ? "bg-indigo-600 text-white"
                          : "bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800"
                      }`}
                    >
                      Semantic HTML
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatementFormat("markdown")}
                      className={`px-2.5 py-1 rounded-md text-2xs font-bold transition-colors cursor-pointer ${
                        statementFormat === "markdown"
                          ? "bg-indigo-600 text-white"
                          : "bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800"
                      }`}
                    >
                      Markdown
                    </button>
                  </div>

                  <button
                    type="button"
                    disabled={!isPaid}
                    onClick={() =>
                      handleCopy(
                        "statement",
                        statementFormat === "html" ? htmlStatement : markdownStatement
                      )
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-2xs font-bold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 transition-colors cursor-pointer"
                  >
                    {copiedKey === "statement" ? "Copied Statement!" : `Copy ${statementFormat.toUpperCase()} Statement`}
                  </button>
                </div>

                <pre className="text-2xs bg-slate-950 border border-slate-800 p-3.5 rounded-xl overflow-x-auto max-h-64 font-mono text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {statementFormat === "html" ? htmlStatement : markdownStatement}
                </pre>
              </div>
            </div>
          )}

          {activeTab === "badge" && (
            <div id="panel-compliance-badge" role="tabpanel" aria-labelledby="tab-compliance-badge" className="space-y-4">
              {/* Badge Live Preview Card */}
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-2xs font-bold uppercase tracking-wider text-slate-400 block">
                    Live Embeddable Shield Preview
                  </span>
                  <p className="text-2xs text-slate-500">
                    {tier === "agency"
                      ? "Automatically displays your custom Agency white-label brand name and primary color."
                      : "Links directly to your public read-only WCAG 2.2 AA verification report."}
                  </p>
                </div>
                <div className="shrink-0 bg-slate-900/90 border border-slate-800 px-4 py-3 rounded-xl flex items-center justify-center">
                  {scanId ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={`/api/badge/${scanId}`}
                      alt={`WCAG 2.2 AA Accessibility Audit: ${score}% Pass`}
                      height={28}
                      className="h-7"
                    />
                  ) : (
                    <span className="inline-flex items-center rounded-md overflow-hidden border border-slate-700 text-2xs font-bold">
                      <span className="bg-slate-950 text-slate-100 px-2.5 py-1 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-indigo-500" />
                        Equivance Audit
                      </span>
                      <span
                        className={`px-2.5 py-1 text-white ${
                          score >= 90
                            ? "bg-emerald-600"
                            : score >= 70
                            ? "bg-amber-600"
                            : "bg-rose-600"
                        }`}
                      >
                        WCAG 2.2 AA · {score}% Pass
                      </span>
                    </span>
                  )}
                </div>
              </div>

              {!scanId && (
                <p className="text-2xs text-amber-400 bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-lg">
                  Sign in and run a saved scan to generate a permanent scan ID for live badge verification.
                </p>
              )}

              {/* HTML Snippet */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-2xs font-bold text-slate-300 uppercase tracking-wider">
                    HTML Footer Embed Snippet
                  </span>
                  <button
                    type="button"
                    disabled={!isPaid || !scanId}
                    onClick={() => handleCopy("html-badge", htmlBadgeSnippet)}
                    className="text-2xs font-bold text-indigo-300 hover:text-indigo-200 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/25 px-2.5 py-1 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {copiedKey === "html-badge" ? "Copied HTML!" : "Copy HTML"}
                  </button>
                </div>
                <pre className="text-2xs bg-slate-950 border border-slate-800 p-3 rounded-xl overflow-x-auto font-mono text-emerald-300">
                  {htmlBadgeSnippet}
                </pre>
              </div>

              {/* Markdown Snippet */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-2xs font-bold text-slate-300 uppercase tracking-wider">
                    Markdown / GitHub README Snippet
                  </span>
                  <button
                    type="button"
                    disabled={!isPaid || !scanId}
                    onClick={() => handleCopy("md-badge", markdownBadgeSnippet)}
                    className="text-2xs font-bold text-indigo-300 hover:text-indigo-200 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/25 px-2.5 py-1 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {copiedKey === "md-badge" ? "Copied Markdown!" : "Copy Markdown"}
                  </button>
                </div>
                <pre className="text-2xs bg-slate-950 border border-slate-800 p-3 rounded-xl overflow-x-auto font-mono text-indigo-300">
                  {markdownBadgeSnippet}
                </pre>
              </div>
            </div>
          )}

          {activeTab === "widget" && (
            <div id="panel-compliance-widget" role="tabpanel" aria-labelledby="tab-compliance-widget" className="space-y-4">
              {/* Configuration Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="ck-widget-pos" className="block text-2xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Screen Position
                  </label>
                  <select
                    id="ck-widget-pos"
                    value={widgetPosition}
                    onChange={(e) => setWidgetPosition(e.target.value as "bottom-right" | "bottom-left")}
                    className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="bottom-right">Bottom Right (Default)</option>
                    <option value="bottom-left">Bottom Left</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="ck-widget-theme" className="block text-2xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Widget Theme
                  </label>
                  <select
                    id="ck-widget-theme"
                    value={widgetTheme}
                    onChange={(e) => setWidgetTheme(e.target.value as "dark" | "light")}
                    className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="dark">Dark Theme (Default)</option>
                    <option value="light">Light Theme</option>
                  </select>
                </div>
              </div>

              {/* Zero-Overlay Callout */}
              <div className="p-3 bg-indigo-950/40 border border-indigo-500/20 rounded-xl flex items-start gap-2.5">
                <svg className="w-4 h-4 text-cyan-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-2xs text-slate-300 leading-relaxed">
                  <strong className="text-slate-100 font-semibold">Zero-Overlay Guarantee:</strong> Unlike commercial overlays that inject destructive DOM hacks, this widget is an accessible WCAG 2.2 AA statement trigger. It opens an isolated Shadow DOM compliance dialog without interfering with screen readers or keyboard navigation.
                </div>
              </div>

              {/* Live Preview Canvas */}
              <div className="space-y-1.5">
                <span className="text-2xs font-bold text-slate-300 uppercase tracking-wider block">
                  Interactive Widget Preview
                </span>
                <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl relative overflow-hidden flex flex-col items-center justify-center min-h-[140px] text-center">
                  <div className="text-2xs text-slate-500 mb-3">
                    Simulated host webpage ({widgetPosition})
                  </div>
                  
                  {/* Miniature Trigger Pill */}
                  <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border shadow-lg text-xs font-semibold ${
                    widgetTheme === "dark" 
                      ? "bg-slate-900 border-slate-700 text-slate-100" 
                      : "bg-white border-slate-300 text-slate-900"
                  }`}>
                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-3xs font-bold">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <circle cx="12" cy="5" r="2" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 9h16M12 9v6m-4 6l4-6 4 6" />
                      </svg>
                    </span>
                    <span>Accessibility</span>
                    <span className={`text-2xs font-bold px-1.5 py-0.5 rounded-full text-white ${
                      score >= 90 ? "bg-emerald-600" : score >= 70 ? "bg-amber-600" : "bg-rose-600"
                    }`}>
                      {score}%
                    </span>
                  </div>

                  <p className="text-3xs text-slate-500 mt-2">
                    Clicking opens full WCAG 2.2 AA statement with POUR principle breakdown &amp; barrier reporting.
                  </p>
                </div>
              </div>

              {/* Copy Script Embed Code */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-2xs font-bold text-slate-300 uppercase tracking-wider">
                    Embed Script Snippet (Paste before &lt;/body&gt;)
                  </span>
                  <button
                    type="button"
                    disabled={!isPaid || !scanId}
                    onClick={() =>
                      handleCopy(
                        "widget-script",
                        `<!-- Equivance Accessibility Statement & Compliance Widget -->\n<script src="${origin}/widget.js" data-scan-id="${effectiveScanId}" data-position="${widgetPosition}" data-theme="${widgetTheme}" async defer></script>`
                      )
                    }
                    className="text-2xs font-bold text-indigo-300 hover:text-indigo-200 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/25 px-2.5 py-1 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {copiedKey === "widget-script" ? "Copied Script!" : "Copy Script Tag"}
                  </button>
                </div>
                <pre className="text-2xs bg-slate-950 border border-slate-800 p-3 rounded-xl overflow-x-auto font-mono text-cyan-300">
                  {`<!-- Equivance Accessibility Statement & Compliance Widget -->\n<script src="${origin}/widget.js" data-scan-id="${effectiveScanId}" data-position="${widgetPosition}" data-theme="${widgetTheme}" async defer></script>`}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-slate-800/80 flex items-center justify-between">
          {scanId && isPaid ? (
            <a
              href={`/report/${scanId}?verify=1`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-2xs font-semibold text-indigo-400 hover:text-indigo-300 underline underline-offset-2"
            >
              Preview Public Verification Page →
            </a>
          ) : (
            <span className="text-2xs text-slate-500">
              Aligned with W3C WCAG 2.2 AA, EAA 2025 & ADA Title III
            </span>
          )}
          <button
            type="button"
            onClick={onClose}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold px-4 py-2 rounded-xl transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
