import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

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

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("subscription_tier, subscription_status")
      .eq("id", user.id)
      .single()

    const rawTier = profile?.subscription_tier ?? "free"
    const tier = isSubscriptionActive(profile?.subscription_status) ? rawTier : "free"
    const adminSupabase = getAdminClient()

    let teamId: string | null = null
    let isOwner = false
    let teamName = "Agency Workspace"
    let maxSeats = 3

    // 1. Check if user owns a team AND has an active Agency subscription
    if (tier === "agency") {
      const { data: ownedTeam } = await adminSupabase
        .from("teams")
        .select("*")
        .eq("owner_id", user.id)
        .maybeSingle()

      if (ownedTeam) {
        teamId = ownedTeam.id
        isOwner = true
        teamName = ownedTeam.name
        maxSeats = ownedTeam.max_seats
      } else {
        // Auto-provision team for Agency subscriber
        const { data: newTeam, error: teamCreateErr } = await adminSupabase
          .from("teams")
          .insert({
            owner_id: user.id,
            name: "Agency Team",
            max_seats: 3,
          })
          .select("*")
          .single()

        if (!teamCreateErr && newTeam) {
          teamId = newTeam.id
          isOwner = true
          teamName = newTeam.name
          maxSeats = newTeam.max_seats

          // Insert owner as active member
          await adminSupabase.from("team_members").insert({
            team_id: newTeam.id,
            user_id: user.id,
            email: user.email!,
            role: "owner",
            status: "active",
          })
        }
      }
    } else {
      // 2. Check if user is an active member in someone else's team whose owner has an active Agency subscription
      const { data: memberships } = await adminSupabase
        .from("team_members")
        .select("team_id, role, teams(id, name, owner_id, max_seats)")
        .eq("user_id", user.id)
        .eq("status", "active")
        .order("created_at", { ascending: false })

      if (memberships && memberships.length > 0) {
        for (const membership of memberships) {
          if (!membership?.team_id) continue
          const teamData = membership.teams as {
            id?: string
            name?: string
            owner_id?: string
            max_seats?: number
          } | null
          const ownerId = teamData?.owner_id
          if (ownerId && ownerId !== user.id) {
            const { data: ownerProfile } = await adminSupabase
              .from("profiles")
              .select("subscription_tier, subscription_status")
              .eq("id", ownerId)
              .maybeSingle()

            if (
              ownerProfile?.subscription_tier === "agency" &&
              isSubscriptionActive(ownerProfile?.subscription_status)
            ) {
              teamId = membership.team_id
              isOwner = false
              teamName = teamData?.name ?? "Agency Team"
              maxSeats = teamData?.max_seats ?? 3
              break
            }
          }
        }
      }
    }

    if (!teamId) {
      return NextResponse.json({
        hasTeam: false,
        tier,
      })
    }

    // Fetch all members for this team
    const { data: members, error: membersErr } = await adminSupabase
      .from("team_members")
      .select("id, team_id, user_id, email, role, status, invite_token, created_at")
      .eq("team_id", teamId)
      .order("created_at", { ascending: true })

    if (membersErr) {
      console.error("Failed to fetch team members:", membersErr)
      return NextResponse.json({ error: "Failed to fetch team members" }, { status: 500 })
    }

    const seatsUsed = members?.length ?? 1

    const sanitizedMembers = (members || []).map((m) => ({
      ...m,
      invite_token: isOwner ? m.invite_token : null,
    }))

    return NextResponse.json({
      hasTeam: true,
      team: {
        id: teamId,
        name: teamName,
        maxSeats,
        seatsUsed,
        seatsRemaining: Math.max(0, maxSeats - seatsUsed),
      },
      isOwner,
      members: sanitizedMembers,
    })
  } catch (error) {
    console.error("GET /api/team error:", error)
    return NextResponse.json(
      { error: "Failed to load team data" },
      { status: 500 }
    )
  }
}
