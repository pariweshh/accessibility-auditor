import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function isSubscriptionActive(status: string | null | undefined): boolean {
  if (!status) return true
  return status === "active" || status === "trialing"
}

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get("token")

    if (!token || typeof token !== "string" || !UUID_REGEX.test(token.trim())) {
      return NextResponse.json({ error: "Missing or invalid invitation token" }, { status: 400 })
    }

    const adminSupabase = getAdminClient()

    // 1. Look up the pending member record and team details
    const { data: member, error: memberErr } = await adminSupabase
      .from("team_members")
      .select("id, team_id, email, role, status, teams(id, name, owner_id)")
      .eq("invite_token", token.trim())
      .maybeSingle()

    if (memberErr || !member) {
      return NextResponse.json(
        { error: "Invalid, expired, or already redeemed invitation token." },
        { status: 404 }
      )
    }

    if (member.status !== "pending") {
      return NextResponse.json(
        { error: "This invitation has already been accepted." },
        { status: 410 }
      )
    }

    const team = member.teams as { id?: string; name?: string; owner_id?: string } | null

    return NextResponse.json({
      valid: true,
      teamId: member.team_id,
      teamName: team?.name || "Agency Workspace",
      invitedEmail: member.email,
      role: member.role,
    })
  } catch (error) {
    console.error("GET /api/team/accept error:", error)
    return NextResponse.json(
      { error: "Failed to inspect invitation token" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required. Please log in or sign up to accept this invitation." },
        { status: 401 }
      )
    }

    const { token } = await request.json()

    if (!token || typeof token !== "string" || !UUID_REGEX.test(token.trim())) {
      return NextResponse.json({ error: "A valid invitation token is required" }, { status: 400 })
    }

    const adminSupabase = getAdminClient()

    // 1. Find the pending invite
    const { data: member, error: memberErr } = await adminSupabase
      .from("team_members")
      .select("id, team_id, email, role, status")
      .eq("invite_token", token.trim())
      .maybeSingle()

    if (memberErr || !member) {
      // Check if user is already accepted/active
      const { data: existingActiveRows } = await adminSupabase
        .from("team_members")
        .select("id, team_id")
        .eq("user_id", user.id)
        .eq("status", "active")
        .limit(1)

      const existingActive = existingActiveRows?.[0]
      if (existingActive) {
        return NextResponse.json({
          success: true,
          message: "You are already a member of this team workspace.",
          teamId: existingActive.team_id,
        })
      }

      return NextResponse.json(
        { error: "Invalid, expired, or already redeemed invitation token." },
        { status: 404 }
      )
    }

    if (member.status !== "pending") {
      return NextResponse.json(
        { error: "This invitation has already been accepted." },
        { status: 400 }
      )
    }

    // Verify authenticated user's email matches the invited email
    const authenticatedEmail = (user.email || "").trim().toLowerCase()
    const invitedEmail = (member.email || "").trim().toLowerCase()
    if (!authenticatedEmail || authenticatedEmail !== invitedEmail) {
      return NextResponse.json(
        {
          error:
            "This invitation was issued to a different email address. Please sign in with the invited email account.",
        },
        { status: 403 }
      )
    }

    // 2. Fetch team info and verify owner still has an active Agency subscription
    const { data: team, error: teamErr } = await adminSupabase
      .from("teams")
      .select("id, name, max_seats, owner_id")
      .eq("id", member.team_id)
      .single()

    if (teamErr || !team) {
      return NextResponse.json({ error: "The associated team workspace no longer exists" }, { status: 404 })
    }

    const { data: ownerProfile } = await adminSupabase
      .from("profiles")
      .select("subscription_tier, subscription_status")
      .eq("id", team.owner_id)
      .maybeSingle()

    if (
      ownerProfile?.subscription_tier !== "agency" ||
      !isSubscriptionActive(ownerProfile?.subscription_status)
    ) {
      return NextResponse.json(
        { error: "This team workspace does not currently have an active Agency subscription." },
        { status: 403 }
      )
    }

    // 3. Verify seat capacity hasn't been exceeded by other concurrent invites
    const { count: activeCount } = await adminSupabase
      .from("team_members")
      .select("id", { count: "exact", head: true })
      .eq("team_id", member.team_id)
      .eq("status", "active")

    if ((activeCount || 0) >= (team.max_seats || 3)) {
      return NextResponse.json(
        { error: "This team has already reached its maximum seat limit (3 seats)." },
        { status: 400 }
      )
    }

    // 4. Activate the member atomically only if still pending
    const { data: activatedMember, error: updateErr } = await adminSupabase
      .from("team_members")
      .update({
        user_id: user.id,
        email: authenticatedEmail,
        status: "active",
        invite_token: null,
      })
      .eq("id", member.id)
      .eq("status", "pending")
      .select("id")
      .maybeSingle()

    if (updateErr || !activatedMember) {
      console.error("Failed to activate team membership:", updateErr)
      return NextResponse.json({ error: "Failed to join team workspace" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `You have successfully joined ${team.name}!`,
      teamId: team.id,
      teamName: team.name,
    })
  } catch (error) {
    console.error("POST /api/team/accept error:", error)
    return NextResponse.json(
      { error: "Failed to accept team invitation" },
      { status: 500 }
    )
  }
}
