import { createClient } from "@/lib/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { generateReportHTML } from "@/lib/report-template"
import { resolveEffectiveTier } from "@/lib/quota"
import { ScanRecord } from "@/lib/types"
import { redirect } from "next/navigation"

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

interface Props {
  params: Promise<{ scanId: string }>
  searchParams: Promise<{ verify?: string }>
}

export default async function ReportPage({ params, searchParams }: Props) {
  const { scanId } = await params
  const resolvedSearchParams = await searchParams
  const isPublicVerify = resolvedSearchParams?.verify === "1"

  if (!scanId || !UUID_REGEX.test(scanId)) {
    return (
      <main id="main-content" tabIndex={-1} className="min-h-screen bg-white flex items-center justify-center focus:outline-hidden">
        <div className="text-center p-8">
          <h1 className="text-lg font-bold text-slate-800">Report not found</h1>
          <p className="text-sm text-slate-500 mt-1">Invalid report identifier.</p>
        </div>
      </main>
    )
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user && !isPublicVerify) {
    redirect("/login")
  }

  const adminDb =
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
      ? createAdminClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL,
          process.env.SUPABASE_SERVICE_ROLE_KEY
        )
      : supabase

  const db = isPublicVerify ? adminDb : supabase

  const { data: scan, error } = await db
    .from("scans")
    .select("*")
    .eq("id", scanId)
    .single()

  if (error || !scan || !scan.result) {
    return (
      <main id="main-content" tabIndex={-1} className="min-h-screen bg-white flex items-center justify-center focus:outline-hidden">
        <div className="text-center p-8">
          <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-3">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-lg font-bold text-slate-800">Report not found</h1>
          <p className="text-sm text-slate-500 mt-1">This scan doesn&apos;t exist or belongs to another account.</p>
        </div>
      </main>
    )
  }

  const targetUserId = scan.user_id || user?.id
  let tier = "free"
  let activeTeamId: string | null = null

  if (targetUserId) {
    const resolved = await resolveEffectiveTier(targetUserId, adminDb)
    tier = resolved.tier
    activeTeamId = resolved.teamId
  }

  let viewerTeamId: string | null = null
  if (user) {
    if (user.id === targetUserId) {
      viewerTeamId = activeTeamId
    } else {
      const viewerResolved = await resolveEffectiveTier(user.id, adminDb)
      viewerTeamId = viewerResolved.teamId
    }
  }

  const isOwnerOrTeam = Boolean(
    user &&
      (scan.user_id === user.id ||
        (viewerTeamId && scan.team_id && viewerTeamId === scan.team_id))
  )

  // Public verification view is only unlocked for Pro & Agency scans
  if (!isOwnerOrTeam && (!isPublicVerify || (tier !== "pro" && tier !== "agency"))) {
    if (!user) redirect("/login")
    return (
      <main id="main-content" tabIndex={-1} className="min-h-screen bg-white flex items-center justify-center focus:outline-hidden">
        <div className="text-center p-8 max-w-md">
          <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-3">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-lg font-bold text-slate-800">Public Verification Requires Pro or Agency</h1>
          <p className="text-sm text-slate-500 mt-1">
            Publicly verifiable compliance reports are an active Pro and Agency tier feature.
          </p>
        </div>
      </main>
    )
  }

  // Resolve Agency White-Label Branding (only if owner/team currently has active Agency subscription)
  let branding = null
  if (tier === "agency" && targetUserId) {
    const lookupTeamId = activeTeamId || scan.team_id
    let team = null

    if (lookupTeamId && UUID_REGEX.test(lookupTeamId)) {
      const { data } = await adminDb
        .from("teams")
        .select("brand_name, brand_logo_url, brand_primary_color, brand_tagline, brand_footer_text, brand_hide_watermark")
        .eq("id", lookupTeamId)
        .maybeSingle()
      team = data
    }
    if (!team && UUID_REGEX.test(targetUserId)) {
      const { data } = await adminDb
        .from("teams")
        .select("brand_name, brand_logo_url, brand_primary_color, brand_tagline, brand_footer_text, brand_hide_watermark")
        .eq("owner_id", targetUserId)
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

  // Mask owner's personal email address on public verification views
  const displayEmail = isOwnerOrTeam ? user?.email : undefined
  const html = generateReportHTML(scan as ScanRecord, displayEmail, branding)

  return (
    <main id="main-content" tabIndex={-1} className="w-full min-h-screen bg-white focus:outline-hidden">
      <iframe
        title="WCAG 2.2 Level AA Accessibility Audit Report"
        srcDoc={html}
        sandbox="allow-popups allow-popups-to-escape-sandbox"
        className="w-full min-h-screen border-none block"
      />
    </main>
  )
}
