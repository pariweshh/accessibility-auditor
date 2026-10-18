import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import Stripe from "stripe"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

/**
 * DELETE /api/auth/account
 * Permanently deletes the authenticated user's account, cancels any active Stripe
 * subscription, purges stored PDF reports, and cascades deletion across all
 * database tables (`profiles`, `scans`, `violations`, `api_keys`, `teams`, `team_members`)
 * in compliance with GDPR Right to Erasure and CCPA/CPRA.
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    if (body?.confirm !== "DELETE") {
      return NextResponse.json(
        { error: "Please confirm account deletion by passing { confirm: 'DELETE' }." },
        { status: 400 }
      )
    }

    const adminSupabase = getAdminClient()

    // 1. Cancel active Stripe subscription if present
    const { data: profile } = await adminSupabase
      .from("profiles")
      .select("stripe_subscription_id, stripe_customer_id")
      .eq("id", user.id)
      .maybeSingle()

    if (profile?.stripe_subscription_id && process.env.STRIPE_SECRET_KEY) {
      try {
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
        await stripe.subscriptions.cancel(profile.stripe_subscription_id)
      } catch (stripeErr) {
        console.warn("Non-fatal error canceling Stripe subscription during account deletion:", stripeErr)
      }
    }

    // 2. Purge stored PDF reports in Supabase Storage bucket `reports/{userId}/`
    try {
      const { data: storedFiles } = await adminSupabase
        .storage
        .from("reports")
        .list(user.id)

      if (storedFiles && storedFiles.length > 0) {
        const paths = storedFiles.map((f) => `${user.id}/${f.name}`)
        await adminSupabase.storage.from("reports").remove(paths)
      }
    } catch (storageErr) {
      console.warn("Non-fatal error removing user PDF files during account deletion:", storageErr)
    }

    // 3. Delete the user from auth.users (cascades to profiles, scans, violations, api_keys, teams, team_members)
    const { error: deleteUserError } = await adminSupabase.auth.admin.deleteUser(user.id)

    if (deleteUserError) {
      console.error("Failed to delete user from auth.users:", deleteUserError)
      return NextResponse.json(
        { error: "Failed to delete account. Please contact support." },
        { status: 500 }
      )
    }

    // 4. Sign out local session cookie
    await supabase.auth.signOut().catch(() => {})

    return NextResponse.json({
      success: true,
      message: "Your account and all associated audit data have been permanently deleted.",
    })
  } catch (error) {
    console.error("DELETE /api/auth/account error:", error)
    return NextResponse.json(
      { error: "Failed to delete account" },
      { status: 500 }
    )
  }
}
