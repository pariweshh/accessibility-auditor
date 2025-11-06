import { NextRequest, NextResponse } from "next/server"
import { generateBatchFixes } from "@/lib/ai-fixer"
import { AccessibilityIssue } from "@/lib/types"

// Free tier: 10 seconds maximum
export const maxDuration = 10
export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  try {
    const { issues, limit = 5 } = await request.json()

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

    // Limit to prevent excessive API calls on free tier
    const maxLimit = 10
    const actualLimit = Math.min(limit, maxLimit)

    const fixes = await generateBatchFixes(
      issues as AccessibilityIssue[],
      actualLimit
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
