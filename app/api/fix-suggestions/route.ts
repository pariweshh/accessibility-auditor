import { NextRequest, NextResponse } from "next/server"
import { generateBatchFixes } from "@/lib/ai-fixer"
import { AccessibilityIssue } from "@/lib/types"
import { createClient } from "@/lib/supabase/server"

// Free tier: 10 seconds maximum
export const maxDuration = 10
export const dynamic = "force-dynamic"

const PAID_TIERS = ["pro", "agency"]

export async function POST(request: NextRequest) {
  try {
    const { issues, limit = 5, model = "gpt-4o-mini" } = await request.json()

    if (!issues || !Array.isArray(issues)) {
      return NextResponse.json(
        { error: "Issues array is required" },
        { status: 400 }
      )
    }

    if (issues.length === 0) {
      return NextResponse.json(
        { error: "At least one issue is required" },
        { status: 400 }
      )
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        {
          error:
            "OpenAI API key not configured. Please add OPENAI_API_KEY to environment variables.",
        },
        { status: 500 }
      )
    }

    // ── Check authentication and tier ───────────────────────────────────────
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized: You must be logged in to get AI suggestions." },
        { status: 401 }
      )
    }

    // Enforce tier restriction for premium model gpt-4o
    if (model === "gpt-4o") {
      const { data: profile } = await supabase
        .from("profiles")
        .select("subscription_tier")
        .eq("id", user.id)
        .single()

      const tier = profile?.subscription_tier ?? "free"
      if (!PAID_TIERS.includes(tier)) {
        return NextResponse.json(
          {
            error: "upgrade_required",
            message: "The premium gpt-4o model is only available on Pro and Agency plans."
          },
          { status: 403 }
        )
      }
    }

    // Limit to prevent excessive API calls on free tier
    const maxLimit = 10
    const actualLimit = Math.min(limit, maxLimit)

    const fixes = await generateBatchFixes(
      issues as AccessibilityIssue[],
      actualLimit,
      model,
      supabase
    )

    return NextResponse.json({
      fixes,
      count: fixes.length,
    })
  } catch (error) {
    console.error("Fix suggestions API error:", error)

    const errorMessage =
      error instanceof Error
        ? error.message
        : "Failed to generate fix suggestions"

    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

