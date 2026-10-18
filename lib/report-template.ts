import { ScanRecord, AgencyBranding } from "./types"
import {
  WCAG_STANDARD,
  AUTOMATED_COVERAGE_NOTE,
  WCAG_22_MANUAL_CHECKS,
} from "./constants"

const IMPACT_COLORS: Record<string, string> = {
  critical: "#ef4444",
  serious:  "#f97316",
  moderate: "#eab308",
  minor:    "#3b82f6",
}

const IMPACT_BG: Record<string, string> = {
  critical: "#fef2f2",
  serious:  "#fff7ed",
  moderate: "#fefce8",
  minor:    "#eff6ff",
}

const HEX_COLOR_REGEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/
const SAFE_DATA_IMAGE_REGEX = /^data:image\/(png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=]+$/

function sanitizeHexColor(rawColor: string | null | undefined, fallback: string): string {
  const trimmed = rawColor?.trim() || ""
  return HEX_COLOR_REGEX.test(trimmed) ? trimmed : fallback
}

function sanitizeHttpUrl(rawUrl: string | null | undefined, fallback: string = "#"): string {
  if (!rawUrl || typeof rawUrl !== "string") return fallback
  try {
    const parsed = new URL(rawUrl.trim())
    if (parsed.protocol === "https:" || parsed.protocol === "http:") {
      return parsed.toString()
    }
  } catch {
    // ignore
  }
  return fallback
}

function sanitizeLogoUrl(rawLogo: string | null | undefined): string | null {
  if (!rawLogo || typeof rawLogo !== "string") return null
  const trimmed = rawLogo.trim()
  if (SAFE_DATA_IMAGE_REGEX.test(trimmed)) {
    return trimmed
  }
  try {
    const parsed = new URL(trimmed)
    if (parsed.protocol === "https:" || parsed.protocol === "http:") {
      return parsed.toString()
    }
  } catch {
    // ignore
  }
  return null
}

/**
 * Generates a self-contained HTML string for a scan report.
 * Supports White-Label custom branding for Agency tier.
 * Used by:
 *   - /report/[scanId]/page.tsx (rendered in-browser)
 *   - /api/reports/pdf/route.ts (passed to Browserless via page.setContent())
 */
export function generateReportHTML(
  scan: ScanRecord,
  userEmail?: string,
  branding?: AgencyBranding | null
): string {
  const result = scan.result
  if (!result) return "<html><body>No scan data available.</body></html>"

  const brandName = branding?.brandName?.trim() || "Equivance"
  const brandLogoUrl = sanitizeLogoUrl(branding?.brandLogoUrl)
  const primaryColor = sanitizeHexColor(branding?.brandPrimaryColor, "#4f46e5")
  const tagline = branding?.brandTagline?.trim() || "Accessibility Audit Report"
  const footerText = branding?.brandFooterText?.trim() || null
  const hideWatermark = Boolean(branding?.brandHideWatermark)

  const date = new Date(scan.created_at).toLocaleDateString("en-AU", {
    day: "numeric", month: "long", year: "numeric",
  })

  const violationsHTML = result.violations.map((v, i) => `
    <div class="violation" style="margin-bottom:20px;padding:16px;border:1px solid #e2e8f0;border-left:4px solid ${IMPACT_COLORS[v.impact] ?? "#94a3b8"};border-radius:4px;background:${IMPACT_BG[v.impact] ?? "#f8fafc"}">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
        <h3 style="margin:0;font-size:14px;font-weight:700;color:#1e293b">${i + 1}. ${escapeHtml(String(v.help || ""))}</h3>
        <span style="padding:2px 8px;border-radius:999px;font-size:11px;font-weight:700;text-transform:uppercase;background:${IMPACT_COLORS[v.impact] ?? "#94a3b8"};color:#fff;white-space:nowrap;margin-left:8px">${escapeHtml(String(v.impact || "minor"))}</span>
      </div>
      <p style="margin:0 0 8px;font-size:12px;color:#475569">${escapeHtml(String(v.description || ""))}</p>
      <p style="margin:0 0 8px;font-size:11px;color:#64748b">Rule: <code style="background:#f1f5f9;padding:1px 4px;border-radius:2px">${escapeHtml(String(v.id || ""))}</code> · <a href="${escapeHtml(sanitizeHttpUrl(v.helpUrl, "https://dequeuniversity.com/rules/axe/"))}" style="color:${primaryColor}">Learn more ↗</a></p>
      ${(v.nodes || []).slice(0, 3).map(node => {
        const nodeHtml = String(node?.html || "")
        return `
        <div style="margin-top:8px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:4px;padding:8px;overflow:hidden">
          <p style="margin:0 0 4px;font-size:10px;font-weight:600;color:#64748b;text-transform:uppercase">Affected element</p>
          <code style="font-size:11px;color:#0f172a;word-break:break-all;display:block;white-space:pre-wrap">${escapeHtml(nodeHtml.slice(0, 300))}${nodeHtml.length > 300 ? "…" : ""}</code>
        </div>
      `}).join("")}
      ${(v.nodes || []).length > 3 ? `<p style="font-size:11px;color:#94a3b8;margin:4px 0 0">+ ${(v.nodes || []).length - 3} more element(s) affected</p>` : ""}
    </div>
  `).join("")

  const { critical, serious, moderate, minor } = result.summary

  // Compute WCAG 2.2 POUR (Perceivable, Operable, Understandable, Robust) Conformance Matrix
  const pourDefinitions = [
    {
      id: "1",
      name: "1. Perceivable",
      desc: "Text alternatives, adaptable layouts, distinguishable color contrast & media",
      match: (tags: string[]) =>
        tags.some(
          (t) =>
            /^wcag1\d{2,3}$/.test(t) ||
            ["cat.text-alternatives", "cat.color", "cat.time-and-media", "cat.sensory-and-visual-cues", "cat.tables"].includes(t)
        ),
    },
    {
      id: "2",
      name: "2. Operable",
      desc: "Keyboard accessibility, focus navigation, timing, and target size",
      match: (tags: string[]) =>
        tags.some(
          (t) =>
            /^wcag2\d{2,3}$/.test(t) ||
            ["cat.keyboard", "cat.navigation", "cat.semantics"].includes(t)
        ),
    },
    {
      id: "3",
      name: "3. Understandable",
      desc: "Readable language declarations, predictable navigation, and form input assistance",
      match: (tags: string[]) =>
        tags.some(
          (t) =>
            /^wcag3\d{2,3}$/.test(t) ||
            ["cat.forms", "cat.language"].includes(t)
        ),
    },
    {
      id: "4",
      name: "4. Robust",
      desc: "Valid WAI-ARIA roles, name/role/value semantics, and assistive technology parsing",
      match: (tags: string[]) =>
        tags.some(
          (t) =>
            /^wcag4\d{2,3}$/.test(t) ||
            ["cat.aria", "cat.name-role-value", "cat.parsing", "cat.structure"].includes(t)
        ),
    },
  ]

  const pourRowsHTML = pourDefinitions
    .map((p) => {
      const matching = result.violations.filter((v) => p.match(v.tags || []))
      const hasBlocker = matching.some((v) => v.impact === "critical" || v.impact === "serious")
      const statusLabel =
        matching.length === 0
          ? "Supports"
          : hasBlocker
          ? "Does Not Support"
          : "Partially Supports"
      const statusBg =
        matching.length === 0 ? "#dcfce7" : hasBlocker ? "#fee2e2" : "#fef3c7"
      const statusColor =
        matching.length === 0 ? "#15803d" : hasBlocker ? "#b91c1c" : "#b45309"

      const criteriaTags = Array.from(
        new Set(
          matching.flatMap((v) =>
            (v.tags || [])
              .filter((t) => /^wcag\d{3,4}$/.test(t))
              .map((t) => {
                const digits = t.replace("wcag", "")
                return `${digits[0]}.${digits[1]}.${digits.slice(2)}`
              })
          )
        )
      )

      return `<tr style="border-bottom:1px solid #e2e8f0">
        <td style="padding:10px 12px;font-size:12px;font-weight:700;color:#0f172a">
          ${escapeHtml(p.name)}
          <div style="font-size:11px;font-weight:400;color:#64748b;margin-top:2px">${escapeHtml(p.desc)}</div>
        </td>
        <td style="padding:10px 12px;font-size:12px;text-align:center;font-weight:700;color:#1e293b">${matching.length}</td>
        <td style="padding:10px 12px;font-size:11px;color:#475569;font-family:monospace">${
          criteriaTags.length > 0 ? escapeHtml(criteriaTags.join(", ")) : "All automated checks passed"
        }</td>
        <td style="padding:10px 12px;text-align:right;white-space:nowrap">
          <span style="display:inline-block;padding:3px 9px;border-radius:999px;font-size:10px;font-weight:700;text-transform:uppercase;background:${statusBg};color:${statusColor}">${statusLabel}</span>
        </td>
      </tr>`
    })
    .join("")

  // Older scans predate this field; default to an empty list.
  const incompleteItems = result.incompleteItems ?? []

  const incompleteHTML = incompleteItems.map((v, i) => `
    <div style="margin-bottom:16px;padding:16px;border:1px solid #fde68a;border-left:4px solid #f59e0b;border-radius:4px;background:#fffbeb">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
        <h3 style="margin:0;font-size:14px;font-weight:700;color:#1e293b">${i + 1}. ${escapeHtml(String(v.help || ""))}</h3>
        <span style="padding:2px 8px;border-radius:999px;font-size:11px;font-weight:700;text-transform:uppercase;background:#f59e0b;color:#fff;white-space:nowrap;margin-left:8px">Review</span>
      </div>
      <p style="margin:0 0 8px;font-size:12px;color:#475569">${escapeHtml(String(v.description || ""))}</p>
      <p style="margin:0;font-size:11px;color:#64748b">Rule: <code style="background:#f1f5f9;padding:1px 4px;border-radius:2px">${escapeHtml(String(v.id || ""))}</code> · <a href="${escapeHtml(sanitizeHttpUrl(v.helpUrl, "https://dequeuniversity.com/rules/axe/"))}" style="color:#4f46e5">Learn more ↗</a></p>
    </div>
  `).join("")

  const checklistHTML = WCAG_22_MANUAL_CHECKS.map(c => `
    <div style="display:flex;gap:10px;padding:12px;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:8px;break-inside:avoid">
      <div style="flex-shrink:0;width:16px;height:16px;border:1px solid #cbd5e1;border-radius:3px;margin-top:2px"></div>
      <div>
        <p style="margin:0;font-size:13px;font-weight:700;color:#0f172a">${escapeHtml(c.title)} <span style="font-size:10px;font-weight:700;color:#64748b;font-family:monospace">${c.criterion} · ${c.level}</span>${c.partiallyAutomated ? ` <span style="font-size:10px;font-weight:700;color:#0284c7">(partially automated)</span>` : ""}</p>
        <p style="margin:4px 0 0;font-size:11px;color:#475569;line-height:1.5">${escapeHtml(c.description)}</p>
      </div>
    </div>
  `).join("")

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Accessibility Report — ${escapeHtml(String(result.url || ""))}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #fff; color: #1e293b; line-height: 1.5; }
    .page { max-width: 900px; margin: 0 auto; padding: 40px 32px; }
    @media print {
      .no-print { display: none !important; }
      .page { padding: 20px; }
      body { font-size: 12px; }
      .violation { break-inside: avoid; }
    }
    @media (max-width: 600px) {
      .page { padding: 20px 16px; }
      .stat-grid { grid-template-columns: repeat(2, 1fr) !important; }
    }
  </style>
</head>
<body>
  <div class="page">
    <!-- Header -->
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px;padding-bottom:24px;border-bottom:2px solid #e2e8f0">
      <div>
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
          ${brandLogoUrl
            ? `<img src="${escapeHtml(brandLogoUrl)}" alt="${escapeHtml(brandName)}" style="max-height:38px;max-width:180px;object-fit:contain;display:block" />`
            : hideWatermark
            ? `<span style="font-size:18px;font-weight:800;color:${primaryColor}">${escapeHtml(brandName)}</span>`
            : `<svg width="24" height="24" viewBox="0 0 120 120" fill="none" style="vertical-align:middle;display:inline-block"><rect width="120" height="120" rx="28" fill="#0f172a"/><circle cx="60" cy="27" r="10" fill="#38bdf8"/><circle cx="60" cy="27" r="4.5" fill="#ffffff"/><path d="M34 94 L54 44 C56 38 64 38 66 44 L86 94" stroke="#6366f1" stroke-width="12" stroke-linecap="round"/><path d="M40 73 Q60 58 80 73" stroke="#38bdf8" stroke-width="10" stroke-linecap="round"/></svg><span style="font-size:18px;font-weight:800;color:${primaryColor}">${escapeHtml(brandName)}</span>`
          }
        </div>
        <h1 style="font-size:22px;font-weight:800;color:#0f172a;margin-bottom:4px">${escapeHtml(tagline)}</h1>
        <p style="font-size:13px;color:#64748b;word-break:break-all">${escapeHtml(String(result.url || ""))}</p>
        <span style="display:inline-block;margin-top:8px;padding:3px 10px;border-radius:999px;font-size:11px;font-weight:700;background:#f8fafc;color:${primaryColor};border:1px solid #cbd5e1">${WCAG_STANDARD.label} · Automated</span>
      </div>
      <div style="text-align:right;flex-shrink:0;margin-left:16px">
        <p style="font-size:12px;color:#94a3b8">Generated</p>
        <p style="font-size:13px;font-weight:600;color:#475569">${date}</p>
        ${userEmail ? `<p style="font-size:11px;color:#94a3b8;margin-top:4px">${escapeHtml(userEmail)}</p>` : ""}
      </div>
    </div>

    <!-- Summary stats -->
    <div class="stat-grid" style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:32px">
      ${[
        { label: "Critical", value: critical, color: IMPACT_COLORS.critical },
        { label: "Serious",  value: serious,  color: IMPACT_COLORS.serious  },
        { label: "Moderate", value: moderate, color: IMPACT_COLORS.moderate },
        { label: "Minor",    value: minor,    color: IMPACT_COLORS.minor    },
      ].map(s => `
        <div style="padding:14px;border:1px solid #e2e8f0;border-radius:8px;text-align:center">
          <p style="font-size:26px;font-weight:800;color:${s.color}">${Number(s.value) || 0}</p>
          <p style="font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;margin-top:2px">${s.label}</p>
        </div>
      `).join("")}
    </div>

    <!-- Pass rate bar -->
    <div style="margin-bottom:28px;padding:16px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px">
      <div style="display:flex;justify-content:space-between;margin-bottom:8px">
        <span style="font-size:13px;font-weight:600;color:#475569">Pass Rate</span>
        <span style="font-size:13px;font-weight:700;color:#0f172a">${Number(result.passes) || 0} / ${(Number(result.passes) || 0) + result.violations.length} checks passed</span>
      </div>
      <div style="height:8px;background:#e2e8f0;border-radius:999px;overflow:hidden">
        <div style="height:100%;width:${Math.round(((Number(result.passes) || 0) / Math.max(1, (Number(result.passes) || 0) + result.violations.length)) * 100)}%;background:#22c55e;border-radius:999px"></div>
      </div>
    </div>

    <!-- WCAG 2.2 POUR Principle Conformance Matrix -->
    <div style="margin-bottom:32px;break-inside:avoid">
      <h2 style="font-size:16px;font-weight:700;color:#0f172a;margin-bottom:6px">WCAG 2.2 Conformance Summary Matrix (POUR)</h2>
      <p style="font-size:12px;color:#64748b;margin-bottom:12px">Executive breakdown across the four W3C Web Content Accessibility Guidelines principles (aligned with EN 301 549 &amp; Section 508 VPAT/ACR structure).</p>
      <div style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden">
        <table style="width:100%;border-collapse:collapse;text-align:left">
          <thead>
            <tr style="background:#f8fafc;border-bottom:1px solid #e2e8f0">
              <th style="padding:10px 12px;font-size:11px;font-weight:700;color:#475569;text-transform:uppercase">WCAG Principle</th>
              <th style="padding:10px 12px;font-size:11px;font-weight:700;color:#475569;text-transform:uppercase;text-align:center">Issues</th>
              <th style="padding:10px 12px;font-size:11px;font-weight:700;color:#475569;text-transform:uppercase">Impacted Criteria</th>
              <th style="padding:10px 12px;font-size:11px;font-weight:700;color:#475569;text-transform:uppercase;text-align:right">Conformance</th>
            </tr>
          </thead>
          <tbody>
            ${pourRowsHTML}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Violations -->
    ${result.violations.length === 0
      ? `<div style="text-align:center;padding:40px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px">
          <div style="margin-bottom:8px;color:#16a34a;font-size:28px;font-weight:700">&#10003;</div>
          <p style="font-size:16px;font-weight:700;color:#16a34a">No accessibility violations found!</p>
          <p style="font-size:13px;color:#4ade80;margin-top:4px">This page passed all ${Number(result.passes) || 0} axe-core checks.</p>
        </div>`
      : `<div>
          <h2 style="font-size:16px;font-weight:700;color:#0f172a;margin-bottom:16px">
            ${result.violations.length} Violation${result.violations.length !== 1 ? "s" : ""} Found
          </h2>
          ${violationsHTML}
        </div>`
    }

    <!-- Needs manual review (axe-core "incomplete" results) -->
    ${incompleteItems.length > 0
      ? `<div style="margin-top:32px">
          <h2 style="font-size:16px;font-weight:700;color:#0f172a;margin-bottom:6px">Needs Manual Review (${incompleteItems.length})</h2>
          <p style="font-size:12px;color:#64748b;margin-bottom:16px;line-height:1.5">${escapeHtml(AUTOMATED_COVERAGE_NOTE)}</p>
          ${incompleteHTML}
        </div>`
      : ""}

    <!-- WCAG 2.2 manual checklist -->
    <div style="margin-top:32px">
      <h2 style="font-size:16px;font-weight:700;color:#0f172a;margin-bottom:6px">WCAG 2.2 Manual Checklist</h2>
      <p style="font-size:12px;color:#64748b;margin-bottom:16px;line-height:1.5">These ${WCAG_22_MANUAL_CHECKS.length} criteria require human judgement and are not covered by the automated scan.</p>
      ${checklistHTML}
    </div>

    <!-- Footer -->
    <div style="margin-top:40px;padding-top:20px;border-top:1px solid #e2e8f0;text-align:center">
      ${footerText ? `<p style="font-size:12px;color:#64748b;font-weight:500;margin-bottom:6px">${escapeHtml(footerText)}</p>` : ""}
      <p style="font-size:11px;color:#94a3b8">
        ${hideWatermark
          ? `Audit conducted on ${new Date().toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })} · Evaluated against ${WCAG_STANDARD.label}`
          : `Generated by ${escapeHtml(brandName)} · Powered by axe-core · ${new Date().toISOString()}`
        }
      </p>
    </div>
  </div>
</body>
</html>`
}

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}
