import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { SITE } from "@/lib/site"
import Stripe from "stripe"

const stripeSecretKey = process.env.STRIPE_SECRET_KEY || ""
const stripe = new Stripe(stripeSecretKey)

const PRICE_IDS: Record<string, string | undefined> = {
  pro: process.env.STRIPE_PRO_PRICE_ID,
  agency: process.env.STRIPE_AGENCY_PRICE_ID,
}

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
    const { plan } = await request.json()

    if (!plan || typeof plan !== "string" || !PRICE_IDS[plan]) {
      return NextResponse.json(
        { error: "Invalid or missing plan" },
        { status: 400 }
      )
    }

    const priceId = PRICE_IDS[plan] as string

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

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "User profile not found" },
        { status: 404 }
      )
    }

    let customerId = profile.stripe_customer_id
    if (customerId) {
      try {
        await stripe.customers.update(customerId, {
          metadata: { supabase_user_id: user.id },
        })
      } catch (err) {
        console.warn("Could not update existing customer metadata:", err)
      }
    } else {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          supabase_user_id: user.id,
        },
      })
      customerId = customer.id

      // Update the user's profile in Supabase using service_role to satisfy billing column protection trigger
      const adminSupabase = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )
      const { error: updateError } = await adminSupabase
        .from("profiles")
        .update({ stripe_customer_id: customerId })
        .eq("id", user.id)

      if (updateError) {
        console.error("Failed to update stripe_customer_id:", updateError)
      }
    }

    // Determine trusted origin for redirects
    const origin = getTrustedOrigin(request)

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      allow_promotion_codes: true,
      success_url: `${origin}/dashboard?checkout_success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/#pricing`,
      metadata: {
        supabase_user_id: user.id,
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error("Stripe Checkout API error:", error)
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    )
  }
}
