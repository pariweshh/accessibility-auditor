import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const memberId = searchParams.get("id")

    if (!memberId || !UUID_REGEX.test(memberId)) {
      return NextResponse.json({ error: "Valid Member ID is required" }, { status: 400 })
    }

    const adminSupabase = getAdminClient()

    // 1. Fetch member details
    const { data: member, error: memberErr } = await adminSupabase
      .from("team_members")
      .select("id, team_id, user_id, role, status, email")
      .eq("id", memberId)
      .maybeSingle()

    if (memberErr || !member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 })
    }

    // 2. Prevent removing the team owner
    if (member.role === "owner") {
      return NextResponse.json(
        { error: "The team owner cannot be removed from the team" },
        { status: 400 }
      )
    }

    // 3. Check authorization: must be either team owner or the member themselves
    const { data: team } = await adminSupabase
      .from("teams")
      .select("id, owner_id")
      .eq("id", member.team_id)
      .single()

    const isOwner = team?.owner_id === user.id
    const isSelf = member.user_id === user.id

    if (!isOwner && !isSelf) {
      return NextResponse.json(
        { error: "You do not have permission to remove this member" },
        { status: 403 }
      )
    }

    // 4. Delete the member record
    const { error: deleteErr } = await adminSupabase
      .from("team_members")
      .delete()
      .eq("id", memberId)

    if (deleteErr) {
      console.error("Error deleting team member:", deleteErr)
      return NextResponse.json({ error: "Failed to remove member" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: isSelf ? "You have left the team" : "Member removed successfully",
    })
  } catch (error) {
    console.error("DELETE /api/team/member error:", error)
    return NextResponse.json(
      { error: "Failed to remove team member" },
      { status: 500 }
    )
  }
}
