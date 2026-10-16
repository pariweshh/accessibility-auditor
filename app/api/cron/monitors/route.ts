import { NextRequest, NextResponse } from "next/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { Resend } from "resend"
import { checkQuota, resolveEffectiveTier } from "@/lib/quota"
import { generateMonitorAlertHtml } from "@/lib/monitor-alert-email"

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET

  // In production, strictly require CRON_SECRET match
  if (process.env.NODE_ENV === "production" && cronSecret) {
    if (authHeader !== `Bearer ${cronSecret}`) {
      const urlSecret = request.nextUrl.searchParams.get("key")
      if (urlSecret !== cronSecret) {
        return false
      }
    }
    return true
  }

  // In development, allow if secret matches or if secret is not configured
  if (!cronSecret) return true
  return authHeader === `Bearer ${cronSecret}` || request.nextUrl.searchParams.get("key") === cronSecret
}

/**
 * Core monitor processor function
 */
async function processDueMonitors(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized cron trigger" }, { status: 401 })
  }

  const adminSupabase = getAdminClient()
  const now = new Date()

  // 1. Fetch due monitors (up to 15 per batch to prevent serverless execution timeout)
  const { data: monitors, error: fetchError } = await adminSupabase
    .from("monitors")
    .select(`
      *,
      teams:team_id (
        id,
        name,
        brand_name,
        brand_primary_color,
        brand_logo_url
      )
    `)
    .eq("status", "active")
    .lte("next_run_at", now.toISOString())
    .order("next_run_at", { ascending: true })
    .limit(15)

  if (fetchError) {
    console.error("Cron monitors fetch error:", fetchError)
    return NextResponse.json({ error: "Failed to fetch due monitors" }, { status: 500 })
  }

  if (!monitors || monitors.length === 0) {
    return NextResponse.json({
      success: true,
      message: "No monitors currently due for scanning",
      processedCount: 0,
    })
  }

  const results: Array<{
    monitorId: string
    url: string
    status: "dispatched" | "skipped_quota" | "skipped_tier" | "error"
    scanId?: string
    alertSent?: boolean
  }> = []

  const edgeFnUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/scan-site`
  const resendKey = process.env.RESEND_API_KEY
  const resend = resendKey ? new Resend(resendKey) : null
  const emailFrom =
    process.env.EMAIL_FROM ||
    process.env.RESEND_FROM_EMAIL ||
    "Equivance Alerts <alerts@equivance.app>"

  for (const monitor of monitors) {
    try {
      // Verify owner effective tier
      const { tier, teamId } = await resolveEffectiveTier(monitor.user_id, adminSupabase)

      // If user downgraded to free, automatically pause monitor
      if (tier === "free") {
        await adminSupabase
          .from("monitors")
          .update({ status: "paused" })
          .eq("id", monitor.id)

        results.push({
          monitorId: monitor.id,
          url: monitor.url,
          status: "skipped_tier",
        })
        continue
      }

      // Check monthly quota
      const quota = await checkQuota(monitor.user_id, adminSupabase)
      if (!quota.allowed) {
        // Compute next run interval to avoid stuck loop
        const intervalMs =
          monitor.frequency === "daily"
            ? 24 * 60 * 60 * 1000
            : 7 * 24 * 60 * 60 * 1000
        const nextRun = new Date(Date.now() + intervalMs).toISOString()

        await adminSupabase
          .from("monitors")
          .update({ next_run_at: nextRun })
          .eq("id", monitor.id)

        results.push({
          monitorId: monitor.id,
          url: monitor.url,
          status: "skipped_quota",
        })
        continue
      }

      // Create pending scan record
      const { data: scan, error: insertError } = await adminSupabase
        .from("scans")
        .insert({
          user_id: monitor.user_id,
          team_id: quota.teamId ?? monitor.team_id ?? null,
          url: monitor.url,
          status: "pending",
        })
        .select("id")
        .single()

      if (insertError || !scan) {
        console.error("Failed to insert scan for monitor:", monitor.id, insertError)
        results.push({
          monitorId: monitor.id,
          url: monitor.url,
          status: "error",
        })
        continue
      }

      const scanId = scan.id

      // Compute next run time
      const intervalMs =
        monitor.frequency === "daily"
          ? 24 * 60 * 60 * 1000
          : 7 * 24 * 60 * 60 * 1000
      const nextRunAt = new Date(Date.now() + intervalMs).toISOString()

      // Update monitor record with last_run_at and next_run_at
      await adminSupabase
        .from("monitors")
        .update({
          last_run_at: now.toISOString(),
          last_scan_id: scanId,
          next_run_at: nextRunAt,
        })
        .eq("id", monitor.id)

      // Invoke Edge Function
      fetch(edgeFnUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          scanId,
          url: monitor.url,
          userId: monitor.user_id,
          tier: quota.tier,
        }),
      }).catch((err) => {
        console.error("Failed to invoke scan-site edge function for monitor:", err)
      })

      // Check degradation alert on previous scan vs new baseline if available
      // If monitor already had a last_score and user wants alert on degradation
      let alertSent = false
      if (monitor.alert_on_degradation && monitor.last_score !== null && monitor.alert_email && resend) {
        // Poll for scan completion with backoff (up to 15s) to evaluate score
        let completedScan: any = null
        for (let attempt = 0; attempt < 6; attempt++) {
          await new Promise((r) => setTimeout(r, 2500))
          const { data: latestScan } = await adminSupabase
            .from("scans")
            .select("*")
            .eq("id", scanId)
            .maybeSingle()

          if (latestScan && (latestScan.status === "completed" || latestScan.status === "failed")) {
            completedScan = latestScan
            break
          }
        }

        if (completedScan && completedScan.status === "completed") {
          const passesCount = completedScan.passes ?? completedScan.result?.passes ?? 0
          const violationsCount = completedScan.violations ?? completedScan.result?.violations?.length ?? 0
          const totalChecks = passesCount + violationsCount
          const newScore = totalChecks > 0 ? Math.round((passesCount / totalChecks) * 100) : 100

          const prevScore = monitor.last_score
          const isDrop = prevScore !== null && (prevScore - newScore >= 5 || newScore < monitor.min_score_threshold)

          const summary = completedScan.summary || {}
          const criticalCount = summary.critical ?? 0
          const seriousCount = summary.serious ?? 0
          const moderateCount = summary.moderate ?? 0

          // Update monitor with new score
          await adminSupabase
            .from("monitors")
            .update({ last_score: newScore })
            .eq("id", monitor.id)

          // Dispatch email if score dropped significantly or fell below threshold
          if (isDrop || criticalCount > 0) {
            let team = monitor.teams
            if (!team && teamId) {
              const { data: teamRecord } = await adminSupabase
                .from("teams")
                .select("brand_name, brand_primary_color, brand_logo_url")
                .eq("id", teamId)
                .maybeSingle()
              team = teamRecord
            }
            const topViolations = (completedScan.result?.violations || []).slice(0, 5).map((v: any) => ({
              id: v.id,
              help: v.help,
              count: v.nodes?.length || 1,
            }))

            const emailPayload = generateMonitorAlertHtml({
              url: monitor.url,
              previousScore: prevScore,
              newScore,
              threshold: monitor.min_score_threshold,
              scanId,
              criticalCount,
              seriousCount,
              moderateCount,
              topViolations,
              brandName: team?.brand_name || null,
              brandPrimaryColor: team?.brand_primary_color || null,
              brandLogoUrl: team?.brand_logo_url || null,
            })

            try {
              await resend.emails.send({
                from: emailFrom,
                to: monitor.alert_email,
                subject: emailPayload.subject,
                html: emailPayload.html,
              })
              alertSent = true
            } catch (emailErr) {
              console.error("Failed to dispatch monitor degradation email:", emailErr)
            }
          }
        }
      }

      results.push({
        monitorId: monitor.id,
        url: monitor.url,
        status: "dispatched",
        scanId,
        alertSent,
      })
    } catch (itemErr: any) {
      console.error(`Error processing monitor ${monitor.id}:`, itemErr)
      results.push({
        monitorId: monitor.id,
        url: monitor.url,
        status: "error",
      })
    }
  }

  return NextResponse.json({
    success: true,
    processedCount: results.length,
    results,
  })
}

export async function GET(request: NextRequest) {
  return processDueMonitors(request)
}

export async function POST(request: NextRequest) {
  return processDueMonitors(request)
}
