import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import puppeteer from "puppeteer-core"
import { generateReportHTML, escapeHtml } from "@/lib/report-template"
import { resolveEffectiveTier } from "@/lib/quota"
import { validateScanTargetUrl } from "@/lib/ssrf"
import { checkRateLimit } from "@/lib/rate-limit"
import { ScanRecord } from "@/lib/types"
import { Resend } from "resend"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

const PAID_TIERS = ["pro", "agency"]
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function getAdminSupabase() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function handlePdfRequest(scanId: string | null, force: boolean) {
  if (!scanId || !UUID_REGEX.test(scanId)) {
    return NextResponse.json({ error: "Valid scanId is required" }, { status: 400 })
  }

  // ── Auth ────────────────────────────────────────────────────────────────
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // ── Tier check (verifies personal subscription or active Agency team whose owner is active)
  const adminSupabase = getAdminSupabase()
  const { tier, teamId: activeTeamId } = await resolveEffectiveTier(user.id, adminSupabase)

  if (!PAID_TIERS.includes(tier)) {
    return NextResponse.json(
      { error: "upgrade_required", message: "PDF export is available on Pro and Agency plans." },
      { status: 403 }
    )
  }

  // ── Fetch scan (verifies ownership or team membership via RLS) ───────────
  const { data: scan, error: scanError } = await supabase
    .from("scans")
    .select("*")
    .eq("id", scanId)
    .single()

  if (scanError || !scan?.result) {
    return NextResponse.json({ error: "Scan not found or incomplete" }, { status: 404 })
  }

  const ownerFolder = scan.user_id && UUID_REGEX.test(scan.user_id) ? scan.user_id : user.id
  const storagePath = `${ownerFolder}/${scanId}.pdf`

  // ── Return cached PDF if it already exists (unless force = true) ────────
  if (!force) {
    const { data: existingFile } = await adminSupabase
      .storage
      .from("reports")
      .list(ownerFolder, { search: `${scanId}.pdf` })

    if (existingFile && existingFile.length > 0) {
      const { data: urlData } = await adminSupabase
        .storage
        .from("reports")
        .createSignedUrl(storagePath, 3600)

      if (urlData?.signedUrl) {
        return NextResponse.json({ url: urlData.signedUrl, cached: true })
      }
    }
  }

  // ── Rate limit Browserless PDF rendering per user ───────────────────────
  const rateLimit = checkRateLimit({
    key: `pdf_gen:user:${user.id}`,
    limit: 20,
    windowMs: 60 * 60 * 1000, // 20 renders per hour
  })
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: "Too many PDF generation requests. Please wait before regenerating." },
      {
        status: 429,
        headers: {
          "Retry-After": String(rateLimit.resetSeconds),
        },
      }
    )
  }

  // ── Resolve Agency White-Label Branding ─────────────────────────────────
  let branding = null
  if (tier === "agency") {
    const targetTeamId = activeTeamId || scan.team_id
    let team = null

    if (targetTeamId && UUID_REGEX.test(targetTeamId)) {
      const { data } = await adminSupabase
        .from("teams")
        .select(
          "brand_name, brand_logo_url, brand_primary_color, brand_tagline, brand_footer_text, brand_hide_watermark"
        )
        .eq("id", targetTeamId)
        .maybeSingle()
      team = data
    }
    if (!team) {
      const { data } = await adminSupabase
        .from("teams")
        .select(
          "brand_name, brand_logo_url, brand_primary_color, brand_tagline, brand_footer_text, brand_hide_watermark"
        )
        .eq("owner_id", user.id)
        .limit(1)
      team = data?.[0] ?? null
    }

    if (team) {
      branding = {
        brandName: team.brand_name,
        brandLogoUrl: team.brand_logo_url,
        brandPrimaryColor: team.brand_primary_color,
        brandTagline: team.brand_tagline,
        brandFooterText: team.brand_footer_text,
        brandHideWatermark: team.brand_hide_watermark,
      }
    }
  }

  // ── Generate HTML and print to PDF via Browserless ──────────────────────
  const browserlessToken = process.env.BROWSERLESS_TOKEN
  if (!browserlessToken) {
    return NextResponse.json({ error: "PDF service not configured" }, { status: 500 })
  }

  const html = generateReportHTML(scan as ScanRecord, user.email, branding)

  const browser = await puppeteer.connect({
    browserWSEndpoint: `wss://production-sfo.browserless.io?token=${browserlessToken}&timeout=30000`,
  })

  let pdfBuffer: Buffer
  try {
    const page = await browser.newPage()

    // Intercept network requests during PDF generation to prevent SSRF via custom logo URLs
    await page.setRequestInterception(true)
    page.on("request", async (req) => {
      try {
        const reqUrl = req.url()
        if (reqUrl.startsWith("data:") || reqUrl.startsWith("about:")) {
          await req.continue()
          return
        }
        const check = await validateScanTargetUrl(reqUrl)
        if (!check.valid) {
          await req.abort("accessdenied")
          return
        }
        await req.continue()
      } catch {
        try {
          await req.abort("accessdenied")
        } catch {
          // ignore if already handled
        }
      }
    })

    await page.setContent(html, { waitUntil: "domcontentloaded" })
    // Wait for any web fonts or images to settle
    await new Promise((r) => setTimeout(r, 800))
    const pdfBytes = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
    })
    pdfBuffer = Buffer.from(pdfBytes)
    await page.close()
  } finally {
    await browser.close()
  }

  // ── Upload to Supabase Storage ──────────────────────────────────────────
  const { error: uploadError } = await adminSupabase
    .storage
    .from("reports")
    .upload(storagePath, pdfBuffer, {
      contentType: "application/pdf",
      upsert: true,
    })

  if (uploadError) {
    console.error("Storage upload error:", uploadError)
    return NextResponse.json({ error: "Failed to save PDF" }, { status: 500 })
  }

  // ── Generate signed URL (valid 1 hour) ──────────────────────────────────
  const { data: urlData, error: urlError } = await adminSupabase
    .storage
    .from("reports")
    .createSignedUrl(storagePath, 3600)

  if (urlError || !urlData?.signedUrl) {
    return NextResponse.json({ error: "Failed to generate download link" }, { status: 500 })
  }

  const signedUrl = urlData.signedUrl

  // ── Email the signed URL via Resend (optional — graceful if not configured) ─
  const resendKey = process.env.RESEND_API_KEY
  if (resendKey && !resendKey.startsWith("re_xxxx") && user.email) {
    try {
      const resend = new Resend(resendKey)
      const domain = new URL(scan.url).hostname.replace(/[\r\n]+/g, "")
      const safeDomain = escapeHtml(domain)
      const safeSignedUrl = escapeHtml(signedUrl)
      const emailFrom =
        process.env.EMAIL_FROM ||
        process.env.RESEND_FROM_EMAIL ||
        "Equivance <reports@yourdomain.com>"
      await resend.emails.send({
        from: emailFrom,
        to: user.email,
        subject: `Your accessibility report for ${domain}`,
        html: `
          <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px">
            <h2 style="color:#4f46e5;margin-bottom:8px">Your PDF Report is Ready</h2>
            <p style="color:#475569;margin-bottom:24px">Your accessibility audit report for <strong>${safeDomain}</strong> has been generated.</p>
            <a href="${safeSignedUrl}" style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600">Download PDF Report &rarr;</a>
            <p style="color:#94a3b8;font-size:12px;margin-top:24px">This link expires in 1 hour. You can regenerate it any time from your dashboard.</p>
          </div>
        `,
      })
    } catch (emailError) {
      // Non-fatal — PDF download still works without email
      console.error("Email send failed:", emailError)
    }
  }

  return NextResponse.json({ url: signedUrl })
}

export async function GET(request: NextRequest) {
  try {
    const scanId = request.nextUrl.searchParams.get("scanId")
    const force = request.nextUrl.searchParams.get("force") === "true"
    return await handlePdfRequest(scanId, force)
  } catch (error) {
    console.error("PDF generation GET error:", error)
    return NextResponse.json(
      { error: "PDF generation failed" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { scanId, force } = await request.json()
    return await handlePdfRequest(scanId, Boolean(force))
  } catch (error) {
    console.error("PDF generation error:", error)
    return NextResponse.json(
      { error: "PDF generation failed" },
      { status: 500 }
    )
  }
}

