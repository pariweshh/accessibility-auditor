import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { Resend } from "resend"
import { checkRateLimit, getClientIp } from "@/lib/rate-limit"
import { escapeHtml } from "@/lib/report-template"
import { SITE } from "@/lib/site"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function isSubscriptionActive(status: string | null | undefined): boolean {
  if (!status) return true
  return status === "active" || status === "trialing"
}

function getTrustedOrigin(request: NextRequest): string {
  const configured = SITE.url?.replace(/\/$/, "")
  if (process.env.NODE_ENV === "production" && configured) {
    return configured
  }
  try {
    const reqOrigin = new URL(request.url).origin
    if (
      reqOrigin.startsWith("http://localhost:") ||
      reqOrigin.startsWith("http://127.0.0.1:")
    ) {
      return reqOrigin
    }
  } catch {
    // ignore
  }
  return configured || "http://localhost:3000"
}

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { email } = await request.json()

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "A valid email address is required" }, { status: 400 })
    }

    const targetEmail = email.trim().toLowerCase()
    if (
      targetEmail.length === 0 ||
      targetEmail.length > 254 ||
      !EMAIL_REGEX.test(targetEmail) ||
      /[\r\n]/.test(targetEmail)
    ) {
      return NextResponse.json({ error: "A valid email address is required" }, { status: 400 })
    }

    if (targetEmail === user.email?.toLowerCase()) {
      return NextResponse.json(
        { error: "You cannot invite yourself to your own team workspace" },
        { status: 400 }
      )
    }

    // ── Rate Limiting (Prevent invitation flooding / spam) ───────────────────
    const clientIp = getClientIp(request)
    const ipLimit = checkRateLimit({
      key: `team_invite:ip:${clientIp}`,
      limit: 20,
      windowMs: 60 * 60 * 1000, // 1 hour
    })

    if (!ipLimit.success) {
      return NextResponse.json(
        { error: "Too many invitation requests from this IP. Please wait before inviting more members." },
        {
          status: 429,
          headers: {
            "Retry-After": String(ipLimit.resetSeconds),
            "X-RateLimit-Limit": String(ipLimit.limit),
            "X-RateLimit-Remaining": String(ipLimit.remaining),
            "X-RateLimit-Reset": String(ipLimit.resetSeconds),
          },
        }
      )
    }

    const userLimit = checkRateLimit({
      key: `team_invite:user:${user.id}`,
      limit: 10,
      windowMs: 60 * 60 * 1000, // 1 hour
    })

    if (!userLimit.success) {
      return NextResponse.json(
        { error: "Invitation limit reached. You can send up to 10 invitations per hour." },
        {
          status: 429,
          headers: {
            "Retry-After": String(userLimit.resetSeconds),
            "X-RateLimit-Limit": String(userLimit.limit),
            "X-RateLimit-Remaining": String(userLimit.remaining),
            "X-RateLimit-Reset": String(userLimit.resetSeconds),
          },
        }
      )
    }

    const adminSupabase = getAdminClient()

    // 1. Always verify the inviter currently holds an active Agency subscription
    const { data: profile } = await supabase
      .from("profiles")
      .select("subscription_tier, subscription_status")
      .eq("id", user.id)
      .single()

    if (
      profile?.subscription_tier !== "agency" ||
      !isSubscriptionActive(profile?.subscription_status)
    ) {
      return NextResponse.json(
        { error: "Team Access is exclusively available on an active Agency plan" },
        { status: 403 }
      )
    }

    // 2. Verify or provision team ownership
    let { data: team } = await adminSupabase
      .from("teams")
      .select("id, name, max_seats, owner_id")
      .eq("owner_id", user.id)
      .maybeSingle()

    if (!team) {
      // Provision team
      const { data: newTeam, error: createErr } = await adminSupabase
        .from("teams")
        .insert({
          owner_id: user.id,
          name: "Agency Team",
          max_seats: 3,
        })
        .select("id, name, max_seats, owner_id")
        .single()

      if (createErr || !newTeam) {
        return NextResponse.json({ error: "Failed to initialize team workspace" }, { status: 500 })
      }

      team = newTeam

      // Add owner as active member
      await adminSupabase.from("team_members").insert({
        team_id: newTeam.id,
        user_id: user.id,
        email: user.email!,
        role: "owner",
        status: "active",
      })
    }

    // 2. Count existing members and check max seats (limit 3)
    const { data: existingMembers, error: membersErr } = await adminSupabase
      .from("team_members")
      .select("id, email, status")
      .eq("team_id", team.id)

    if (membersErr) {
      return NextResponse.json({ error: "Failed to inspect team roster" }, { status: 500 })
    }

    const totalSeatsOccupied = existingMembers?.length || 0
    const maxSeatsAllowed = team.max_seats || 3

    if (totalSeatsOccupied >= maxSeatsAllowed) {
      return NextResponse.json(
        {
          error: `Seat limit reached (${totalSeatsOccupied}/${maxSeatsAllowed}). Remove an existing member or cancel a pending invitation to invite someone new.`,
        },
        { status: 400 }
      )
    }

    // 3. Check if email is already on the team
    const alreadyInvited = existingMembers?.some(
      (m) => m.email.toLowerCase() === targetEmail
    )
    if (alreadyInvited) {
      return NextResponse.json(
        { error: "This email address is already part of the team or has a pending invitation." },
        { status: 400 }
      )
    }

    // 4. Generate invite token and insert pending record
    const inviteToken = crypto.randomUUID()

    const { data: newMember, error: insertErr } = await adminSupabase
      .from("team_members")
      .insert({
        team_id: team.id,
        user_id: null,
        email: targetEmail,
        role: "member",
        status: "pending",
        invite_token: inviteToken,
      })
      .select("id, team_id, email, role, status, created_at")
      .single()

    if (insertErr || !newMember) {
      console.error("Failed to insert team member:", insertErr)
      return NextResponse.json({ error: "Failed to create team invitation" }, { status: 500 })
    }

    // 5. Build invite URL and dispatch email
    const origin = getTrustedOrigin(request)
    const inviteUrl = `${origin}/auth/join?token=${encodeURIComponent(inviteToken)}`
    const safeInviteUrl = escapeHtml(inviteUrl)
    const safeTeamName = escapeHtml(team.name || "Agency Team")
    const safeInviterEmail = escapeHtml(user.email || "A team administrator")
    const safeSubjectTeamName = (team.name || "Agency Team").replace(/[\r\n]+/g, " ").slice(0, 80)

    const resendKey = process.env.RESEND_API_KEY
    if (!resendKey || resendKey.startsWith("re_xxxx")) {
      if (process.env.NODE_ENV !== "production") {
        console.log("----------------------------------------")
        console.log("RESEND TEAM INVITATION FALLBACK (DEV MODE)")
        console.log(`Team invite sent to ${targetEmail} for ${team.name}:`)
        console.log(inviteUrl)
        console.log("----------------------------------------")
      }

      return NextResponse.json({
        success: true,
        message: "Invitation created (email logged to console in dev mode)",
        inviteUrl,
        member: newMember,
      })
    }

    const resend = new Resend(resendKey)
    const emailFrom =
      process.env.EMAIL_FROM ||
      process.env.RESEND_FROM_EMAIL ||
      "Equivance <notifications@yourdomain.com>"

    try {
      await resend.emails.send({
        from: emailFrom,
        to: targetEmail,
        subject: `You've been invited to join ${safeSubjectTeamName} on Equivance`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Team Invitation - Equivance</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #020617; color: #f1f5f9; margin: 0; padding: 0; }
              .container { max-width: 500px; margin: 40px auto; padding: 32px; background-color: #0f172a; border: 1px solid #1e293b; border-radius: 16px; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3); }
              .logo { font-size: 22px; font-weight: 800; color: #f8fafc; text-align: center; margin-bottom: 24px; }
              h1 { font-size: 20px; font-weight: 700; color: #ffffff; text-align: center; margin-bottom: 12px; }
              p { font-size: 14px; line-height: 1.6; color: #94a3b8; text-align: center; margin-bottom: 24px; }
              .btn-container { text-align: center; margin-bottom: 28px; }
              .btn { display: inline-block; padding: 12px 28px; background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); color: #ffffff !important; font-weight: 600; font-size: 14px; text-decoration: none; border-radius: 10px; box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3); }
              .perks { background-color: #1e293b; border-radius: 12px; padding: 16px; margin-bottom: 24px; text-align: left; }
              .perks ul { margin: 0; padding-left: 20px; color: #cbd5e1; font-size: 13px; line-height: 1.6; }
              .footer { font-size: 12px; color: #64748b; text-align: center; border-top: 1px solid #1e293b; padding-top: 20px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="logo">
                <img src="${escapeHtml(origin)}/logo.png" width="32" height="32" style="vertical-align: middle; border-radius: 8px; margin-right: 8px;" alt="Equivance" />
                <span>Equivance</span>
              </div>
              <h1>You're invited to collaborate</h1>
              <p>
                <strong>${safeInviterEmail}</strong> has invited you to join <strong>${safeTeamName}</strong> on Equivance with full agency member privileges.
              </p>
              <div class="perks">
                <ul>
                  <li>Shared team quota pool (600 scans/month)</li>
                  <li>Automated WCAG 2.1 AA/AAA compliance audits</li>
                  <li>Executive PDF reporting &amp; AI code remediation</li>
                </ul>
              </div>
              <div class="btn-container">
                <a href="${safeInviteUrl}" class="btn">Accept Invitation &amp; Join Team</a>
              </div>
              <p style="font-size: 12px; color: #64748b;">
                Or copy and paste this link in your browser:<br/>
                <a href="${safeInviteUrl}" style="color: #6366f1; word-break: break-all;">${safeInviteUrl}</a>
              </p>
              <div class="footer">
                If you weren't expecting this invitation, you can safely ignore this email.
              </div>
            </div>
          </body>
          </html>
        `,
      })
    } catch (emailErr) {
      console.error("Resend error sending team invite:", emailErr)
      // Continue and return link so owner still has invite link
    }

    return NextResponse.json({
      success: true,
      inviteUrl,
      member: newMember,
    })
  } catch (error) {
    console.error("POST /api/team/invite error:", error)
    return NextResponse.json(
      { error: "Failed to process invitation" },
      { status: 500 }
    )
  }
}
