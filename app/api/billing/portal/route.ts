import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { SITE } from "@/lib/site"
import Stripe from "stripe"

const stripeSecretKey = process.env.STRIPE_SECRET_KEY || ""
const stripe = new Stripe(stripeSecretKey)

function getTrustedOrigin(request: NextRequest): string {
  const configured = SITE.url?.replace(/\/$/, "")
  if (process.env.NODE_ENV === "production" && configured) {
    return configured
  }
  const reqOrigin = request.headers.get("origin")
  if (
    reqOrigin &&
    (reqOrigin === configured ||
      reqOrigin.startsWith("http://localhost:") ||
      reqOrigin.startsWith("http://127.0.0.1:"))
  ) {
    return reqOrigin
  }
  return configured || "http://localhost:3000"
}

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

    // Determine trusted origin for redirection back to app settings
    const origin = getTrustedOrigin(request)

    // Create Stripe Billing Portal Session
    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${origin}/dashboard`,
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error("Stripe Customer Portal API error:", error)
    return NextResponse.json(
      { error: "Failed to create billing portal session" },
      { status: 500 }
    )
  }
}
