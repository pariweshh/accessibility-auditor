import { ScanResult, ScanRecord } from "./types"

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

/**
 * Generates a self-contained HTML string for a scan report.
 * Used by:
 *   - /report/[scanId]/page.tsx (rendered in-browser)
 *   - /api/reports/pdf/route.ts (passed to Browserless via page.setContent())
 */
export function generateReportHTML(scan: ScanRecord, userEmail?: string): string {
  const result = scan.result
  if (!result) return "<html><body>No scan data available.</body></html>"

  const date = new Date(scan.created_at).toLocaleDateString("en-AU", {
    day: "numeric", month: "long", year: "numeric",
  })

  const violationsHTML = result.violations.map((v, i) => `
    <div class="violation" style="margin-bottom:20px;padding:16px;border:1px solid #e2e8f0;border-left:4px solid ${IMPACT_COLORS[v.impact] ?? "#94a3b8"};border-radius:4px;background:${IMPACT_BG[v.impact] ?? "#f8fafc"}">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
        <h3 style="margin:0;font-size:14px;font-weight:700;color:#1e293b">${i + 1}. ${escapeHtml(v.help)}</h3>
        <span style="padding:2px 8px;border-radius:999px;font-size:11px;font-weight:700;text-transform:uppercase;background:${IMPACT_COLORS[v.impact] ?? "#94a3b8"};color:#fff;white-space:nowrap;margin-left:8px">${v.impact}</span>
      </div>
      <p style="margin:0 0 8px;font-size:12px;color:#475569">${escapeHtml(v.description)}</p>
      <p style="margin:0 0 8px;font-size:11px;color:#64748b">Rule: <code style="background:#f1f5f9;padding:1px 4px;border-radius:2px">${escapeHtml(v.id)}</code> · <a href="${escapeHtml(v.helpUrl)}" style="color:#4f46e5">Learn more ↗</a></p>
      ${v.nodes.slice(0, 3).map(node => `
        <div style="margin-top:8px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:4px;padding:8px;overflow:hidden">
          <p style="margin:0 0 4px;font-size:10px;font-weight:600;color:#64748b;text-transform:uppercase">Affected element</p>
          <code style="font-size:11px;color:#0f172a;word-break:break-all;display:block;white-space:pre-wrap">${escapeHtml(node.html.slice(0, 300))}${node.html.length > 300 ? "…" : ""}</code>
        </div>
      `).join("")}
      ${v.nodes.length > 3 ? `<p style="font-size:11px;color:#94a3b8;margin:4px 0 0">+ ${v.nodes.length - 3} more element(s) affected</p>` : ""}
    </div>
  `).join("")

  const { critical, serious, moderate, minor } = result.summary

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Accessibility Report — ${escapeHtml(result.url)}</title>
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
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
          <span style="font-size:20px">🎯</span>
          <span style="font-size:18px;font-weight:800;color:#4f46e5">A11ytica Pro</span>
        </div>
        <h1 style="font-size:22px;font-weight:800;color:#0f172a;margin-bottom:4px">Accessibility Audit Report</h1>
        <p style="font-size:13px;color:#64748b;word-break:break-all">${escapeHtml(result.url)}</p>
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
          <p style="font-size:26px;font-weight:800;color:${s.color}">${s.value}</p>
          <p style="font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;margin-top:2px">${s.label}</p>
        </div>
      `).join("")}
    </div>

    <!-- Pass rate bar -->
    <div style="margin-bottom:32px;padding:16px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px">
      <div style="display:flex;justify-content:space-between;margin-bottom:8px">
        <span style="font-size:13px;font-weight:600;color:#475569">Pass Rate</span>
        <span style="font-size:13px;font-weight:700;color:#0f172a">${result.passes} / ${result.passes + result.violations.length} checks passed</span>
      </div>
      <div style="height:8px;background:#e2e8f0;border-radius:999px;overflow:hidden">
        <div style="height:100%;width:${Math.round((result.passes / Math.max(1, result.passes + result.violations.length)) * 100)}%;background:#22c55e;border-radius:999px"></div>
      </div>
    </div>

    <!-- Violations -->
    ${result.violations.length === 0
      ? `<div style="text-align:center;padding:40px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px">
          <p style="font-size:32px;margin-bottom:8px">✅</p>
          <p style="font-size:16px;font-weight:700;color:#16a34a">No accessibility violations found!</p>
          <p style="font-size:13px;color:#4ade80;margin-top:4px">This page passed all ${result.passes} axe-core checks.</p>
        </div>`
      : `<div>
          <h2 style="font-size:16px;font-weight:700;color:#0f172a;margin-bottom:16px">
            ${result.violations.length} Violation${result.violations.length !== 1 ? "s" : ""} Found
          </h2>
          ${violationsHTML}
        </div>`
    }

    <!-- Footer -->
    <div style="margin-top:40px;padding-top:20px;border-top:1px solid #e2e8f0;text-align:center">
      <p style="font-size:11px;color:#94a3b8">Generated by A11ytica Pro · Powered by axe-core · ${new Date().toISOString()}</p>
    </div>
  </div>
</body>
</html>`
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}
