import { SITE } from "./site"

export interface MonitorAlertEmailProps {
  url: string
  previousScore: number | null
  newScore: number
  threshold: number
  scanId: string
  criticalCount: number
  seriousCount: number
  moderateCount: number
  topViolations?: Array<{ id: string; help: string; count: number }>
  brandName?: string | null
  brandPrimaryColor?: string | null
  brandLogoUrl?: string | null
}

export function generateMonitorAlertHtml({
  url,
  previousScore,
  newScore,
  threshold,
  scanId,
  criticalCount,
  seriousCount,
  moderateCount,
  topViolations = [],
  brandName,
  brandPrimaryColor,
  brandLogoUrl,
}: MonitorAlertEmailProps): { subject: string; html: string } {
  const siteUrl = SITE.url
  const reportUrl = `${siteUrl}/report/${scanId}`
  const primaryColor = brandPrimaryColor || "#6366f1"
  const platformName = brandName || SITE.name

  const scoreDrop = previousScore !== null ? previousScore - newScore : null
  const isDrop = scoreDrop !== null && scoreDrop > 0
  const isBelowThreshold = newScore < threshold

  const subject = `Accessibility Alert: Score dropped on ${url} (${newScore}%)`

  const topViolationsHtml =
    topViolations.length > 0
      ? `
      <div style="margin-top: 24px; padding: 16px; background-color: #0b0f19; border: 1px solid #1e293b; border-radius: 12px;">
        <p style="margin: 0 0 12px 0; font-size: 13px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em;">
          Failing Criteria Detected
        </p>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          ${topViolations
            .slice(0, 5)
            .map(
              (v) => `
            <tr>
              <td style="padding: 8px 0; color: #f8fafc; border-bottom: 1px solid #1e293b;">
                <code style="background-color: #1e1b4b; color: #a5b4fc; padding: 2px 6px; border-radius: 4px; font-size: 12px;">${escapeHtml(v.id)}</code>
                <span style="margin-left: 8px;">${escapeHtml(v.help)}</span>
              </td>
              <td style="padding: 8px 0; text-align: right; color: #f43f5e; font-weight: 700; border-bottom: 1px solid #1e293b;">
                ${v.count} node${v.count > 1 ? "s" : ""}
              </td>
            </tr>
          `
            )
            .join("")}
        </table>
      </div>
    `
      : ""

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(subject)}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #020617; color: #f1f5f9; margin: 0; padding: 20px;">
  <div style="max-width: 600px; margin: 30px auto; background-color: #0f172a; border: 1px solid #1e293b; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.4);">
    
    <!-- Header -->
    <div style="padding: 24px 32px; border-bottom: 1px solid #1e293b; background: linear-gradient(to right, #0f172a, #1e1b4b); display: flex; align-items: center;">
      ${
        brandLogoUrl
          ? `<img src="${escapeHtml(brandLogoUrl)}" alt="${escapeHtml(platformName)}" style="height: 28px; max-width: 160px; object-fit: contain; margin-bottom: 8px;" />`
          : `<span style="font-size: 18px; font-weight: 800; color: #ffffff; letter-spacing: -0.02em;">${escapeHtml(platformName)}</span>`
      }
      <div style="margin-top: 4px; font-size: 12px; color: #94a3b8; font-weight: 500;">
        Automated Accessibility Continuous Monitor
      </div>
    </div>

    <!-- Alert Banner -->
    <div style="padding: 32px;">
      <div style="display: inline-block; padding: 4px 10px; border-radius: 9999px; background-color: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.3); color: #f87171; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 16px;">
        Regression Alert
      </div>

      <h1 style="font-size: 22px; font-weight: 800; color: #ffffff; line-height: 1.3; margin: 0 0 8px 0;">
        Accessibility score degradation detected
      </h1>
      <p style="font-size: 14px; color: #94a3b8; margin: 0 0 24px 0; word-break: break-all;">
        A scheduled audit for <a href="${escapeHtml(url)}" style="color: #38bdf8; text-decoration: none;" target="_blank">${escapeHtml(url)}</a> completed with issues requiring attention.
      </p>

      <!-- Score Card Comparison -->
      <table style="width: 100%; border-collapse: separate; border-spacing: 12px 0; margin-bottom: 24px;">
        <tr>
          <td style="width: 50%; padding: 16px; background-color: #0b0f19; border: 1px solid #1e293b; border-radius: 12px; text-align: center;">
            <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">
              Previous Score
            </div>
            <div style="font-size: 28px; font-weight: 800; color: ${previousScore !== null ? "#94a3b8" : "#475569"};">
              ${previousScore !== null ? `${previousScore}%` : "—"}
            </div>
          </td>
          <td style="width: 50%; padding: 16px; background-color: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.25); border-radius: 12px; text-align: center;">
            <div style="font-size: 11px; font-weight: 700; color: #f87171; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">
              New Score ${isDrop ? `(-${scoreDrop}%)` : ""}
            </div>
            <div style="font-size: 28px; font-weight: 800; color: #ef4444;">
              ${newScore}%
            </div>
          </td>
        </tr>
      </table>

      <!-- Violation Count Badges -->
      <div style="display: flex; gap: 8px; margin-bottom: 20px;">
        ${
          criticalCount > 0
            ? `<div style="padding: 6px 12px; background-color: rgba(225, 29, 72, 0.15); border: 1px solid rgba(225, 29, 72, 0.3); border-radius: 8px; font-size: 12px; font-weight: 700; color: #fda4af;">
                ${criticalCount} Critical
              </div>`
            : ""
        }
        ${
          seriousCount > 0
            ? `<div style="padding: 6px 12px; background-color: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 8px; font-size: 12px; font-weight: 700; color: #fde68a;">
                ${seriousCount} Serious
              </div>`
            : ""
        }
        ${
          moderateCount > 0
            ? `<div style="padding: 6px 12px; background-color: rgba(99, 102, 241, 0.15); border: 1px solid rgba(99, 102, 241, 0.3); border-radius: 8px; font-size: 12px; font-weight: 700; color: #c7d2fe;">
                ${moderateCount} Moderate
              </div>`
            : ""
        }
      </div>

      <!-- Top Violations List -->
      ${topViolationsHtml}

      <!-- CTA Button -->
      <div style="margin-top: 32px; text-align: center;">
        <a href="${reportUrl}" target="_blank" style="display: inline-block; padding: 14px 28px; background-color: ${primaryColor}; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 700; border-radius: 10px; box-shadow: 0 4px 14px rgba(99, 102, 241, 0.4);">
          Inspect Audit & Fix with AI →
        </a>
      </div>
      
      <p style="margin-top: 16px; font-size: 12px; color: #64748b; text-align: center;">
        Clicking above opens the audit report with deterministic before-and-after code diffs.
      </p>
    </div>

    <!-- Footer -->
    <div style="padding: 20px 32px; background-color: #0b0f19; border-top: 1px solid #1e293b; font-size: 12px; color: #64748b; text-align: center;">
      <p style="margin: 0 0 6px 0;">
        This alert was generated automatically by your ${escapeHtml(platformName)} continuous monitor.
      </p>
      <p style="margin: 0;">
        <a href="${siteUrl}/dashboard" style="color: #94a3b8; text-decoration: underline;">Manage Monitor Settings</a> ·
        <a href="${siteUrl}/legal" style="color: #94a3b8; text-decoration: underline;">Compliance Terms</a>
      </p>
    </div>
  </div>
</body>
</html>
  `

  return { subject, html }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}
