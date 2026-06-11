import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import Stripe from "stripe"

const stripeSecretKey = process.env.STRIPE_SECRET_KEY || ""
const stripe = new Stripe(stripeSecretKey)

export async function POST(request: NextRequest) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: "Stripe is not configured on the server." },
        { status: 500 }
      )
    }

    const supabase = await createClient()

    // Get the authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get the user's profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .single()

    if (profileError || !profile || !profile.stripe_customer_id) {
      return NextResponse.json(
        { error: "Stripe customer not found for this account" },
        { status: 400 }
      )
    }

    // Determine origin for redirection back to app settings
    const origin = request.headers.get("origin") || "http://localhost:3000"

    // Create Stripe Billing Portal Session
    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${origin}/`,
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error("Stripe Customer Portal API error:", error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create billing portal session",
      },
      { status: 500 }
    )
  }
}
