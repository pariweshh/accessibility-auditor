import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"

const stripeSecretKey = process.env.STRIPE_SECRET_KEY || ""
const stripe = new Stripe(stripeSecretKey)

// Create an admin Supabase client that bypasses RLS to update profiles
function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ""
  return createSupabaseClient(supabaseUrl, serviceRoleKey)
}

export async function POST(request: NextRequest) {
  const body = await request.text()
  const sig = request.headers.get("stripe-signature") || ""
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET is not configured.")
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 }
    )
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch (err: any) {
    console.error(`Webhook signature verification failed: ${err.message}`)
    return NextResponse.json(
      { error: `Webhook Error: ${err.message}` },
      { status: 400 }
    )
  }

  const supabaseAdmin = getAdminClient()

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session
        const customerId = session.customer as string
        const userId = session.metadata?.supabase_user_id

        if (userId && customerId) {
          const { error } = await supabaseAdmin
            .from("profiles")
            .update({ stripe_customer_id: customerId })
            .eq("id", userId)

          if (error) {
            console.error("Error updating profile with customer ID:", error)
            throw error
          }
          console.log(`Associated Stripe Customer ${customerId} with user ${userId}`)
        }
        break
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string
        const priceId = subscription.items.data[0]?.price.id
        const subscriptionId = subscription.id
        const status = subscription.status

        // Map Price ID to Subscription Tier
        let tier = "free"
        if (priceId === process.env.STRIPE_PRO_PRICE_ID) {
          tier = "pro"
        } else if (priceId === process.env.STRIPE_AGENCY_PRICE_ID) {
          tier = "agency"
        }

        // Only give Pro/Agency active status if subscription status is active or trialing
        const isActive = status === "active" || status === "trialing"
        const dbTier = isActive ? tier : "free"
        const dbStatus = isActive ? "active" : status

        const { error } = await supabaseAdmin
          .from("profiles")
          .update({
            subscription_tier: dbTier,
            stripe_subscription_id: subscriptionId,
            subscription_status: dbStatus,
          })
          .eq("stripe_customer_id", customerId)

        if (error) {
          console.error("Error updating subscription status:", error)
          throw error
        }
        console.log(`Updated subscription for customer ${customerId}: Tier=${dbTier}, Status=${dbStatus}`)
        break
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string

        const { error } = await supabaseAdmin
          .from("profiles")
          .update({
            subscription_tier: "free",
            stripe_subscription_id: null,
            subscription_status: "inactive",
          })
          .eq("stripe_customer_id", customerId)

        if (error) {
          console.error("Error deleting subscription:", error)
          throw error
        }
        console.log(`Cancelled subscription for customer ${customerId}`)
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("Webhook processing error:", error)
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    )
  }
}
