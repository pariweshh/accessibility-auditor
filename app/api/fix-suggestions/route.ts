import { NextRequest, NextResponse } from "next/server"
import { generateBatchFixes } from "@/lib/ai-fixer"
import { resolveEffectiveTier } from "@/lib/quota"
import { AccessibilityIssue, AIFramework } from "@/lib/types"
import { createClient } from "@/lib/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { checkRateLimit, getClientIp } from "@/lib/rate-limit"
import crypto from "crypto"

// Free tier: 10 seconds maximum
export const maxDuration = 10
export const dynamic = "force-dynamic"

const PAID_TIERS = ["pro", "agency"]
const VALID_FRAMEWORKS: AIFramework[] = ["html", "react-tailwind", "vue", "angular"]
const VALID_MODELS = ["gpt-4o-mini", "gpt-4o"] as const

function getAdminSupabase() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { limit = 5, model: rawModel = "gpt-4o-mini", framework: rawFramework = "html" } = body
    const requestedFramework: AIFramework = VALID_FRAMEWORKS.includes(rawFramework)
      ? rawFramework
      : "html"

    // Validate model against strict allowlist to prevent tier bypass via model aliases (e.g. gpt-4o-2024-11-20, o1)
    const model: "gpt-4o-mini" | "gpt-4o" = VALID_MODELS.includes(rawModel)
      ? rawModel
      : rawModel && String(rawModel).startsWith("gpt-4o") && rawModel !== "gpt-4o-mini"
      ? "gpt-4o"
      : "gpt-4o-mini"

    // Support both batch `{ issues: [...] }` and single-issue `{ issueId, html, ... }` (from docs/API.md)
    let normalizedIssues: AccessibilityIssue[] = []
    if (Array.isArray(body.issues) && body.issues.length > 0) {
      normalizedIssues = body.issues.slice(0, 10) as AccessibilityIssue[]
    } else if (body.issueId && typeof body.html === "string") {
      normalizedIssues = [
        {
          id: String(body.issueId).slice(0, 120),
          impact: body.impact || "serious",
          description: String(body.issueDescription || body.description || body.issueId).slice(0, 1000),
          help: String(body.help || body.issueDescription || body.issueId).slice(0, 500),
          helpUrl: String(body.helpUrl || "").slice(0, 500),
          tags: Array.isArray(body.tags) ? body.tags.slice(0, 20) : ["wcag2aa"],
          nodes: [
            {
              html: String(body.html).slice(0, 2000),
              target: Array.isArray(body.target) ? body.target.slice(0, 10) : ["element"],
              failureSummary: String(body.failureSummary || "").slice(0, 1000),
            },
          ],
        },
      ]
    } else {
      return NextResponse.json(
        { error: "Provide either an 'issues' array or single issue fields ('issueId' and 'html')." },
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

    // ── Check authentication (Session Cookie OR x-api-key) ──────────────────
    const supabase = await createClient()
    const adminSupabase = getAdminSupabase()

    let userId: string | null = null
    let authMethod: "session" | "api_key" | null = null

    const {
      data: { user: sessionUser },
    } = await supabase.auth.getUser()

    if (sessionUser) {
      userId = sessionUser.id
      authMethod = "session"
    }

    if (!userId) {
      const apiKey = request.headers.get("x-api-key")
      if (apiKey) {
        if (!apiKey.startsWith("aud_live_")) {
          return NextResponse.json({ error: "Invalid API key format" }, { status: 401 })
        }

        const keyHash = crypto.createHash("sha256").update(apiKey).digest("hex")
        const { data: keyRecord, error: keyError } = await adminSupabase
          .from("api_keys")
          .select("user_id, id")
          .eq("key_hash", keyHash)
          .single()

        if (!keyError && keyRecord) {
          userId = keyRecord.user_id
          authMethod = "api_key"

          adminSupabase
            .from("api_keys")
            .update({ last_used_at: new Date().toISOString() })
            .eq("id", keyRecord.id)
            .then(({ error }) => {
              if (error) console.error("Failed to update api key last_used_at:", error)
            })
        }
      }
    }

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized: You must be signed in or provide a valid x-api-key header." },
        { status: 401 }
      )
    }

    // ── Per-user and per-IP rate limiting to protect OpenAI token budget ────
    const clientIp = getClientIp(request)
    const userLimit = checkRateLimit({
      key: `ai_fix:user:${userId}:${clientIp}`,
      limit: 30,
      windowMs: 60 * 1000, // 30 requests per minute
    })

    if (!userLimit.success) {
      return NextResponse.json(
        { error: "Rate limit exceeded for AI remediation requests. Please wait a moment." },
        {
          status: 429,
          headers: {
            "Retry-After": String(userLimit.resetSeconds),
          },
        }
      )
    }

    const { tier } = await resolveEffectiveTier(userId, adminSupabase)

    // API key access requires Pro or Agency tier
    if (authMethod === "api_key" && !PAID_TIERS.includes(tier)) {
      return NextResponse.json(
        { error: "API key access requires an active Pro or Agency subscription." },
        { status: 403 }
      )
    }

    // Enforce tier restriction for premium model gpt-4o
    if (model === "gpt-4o" && !PAID_TIERS.includes(tier)) {
      return NextResponse.json(
        {
          error: "upgrade_required",
          message: "The premium gpt-4o model is only available on Pro and Agency plans.",
        },
        { status: 403 }
      )
    }

    // Enforce tier restriction for custom frameworks (Pro & Agency only; Free falls back to html)
    const effectiveFramework: AIFramework = PAID_TIERS.includes(tier)
      ? requestedFramework
      : "html"

    // Limit to prevent excessive API calls
    const maxLimit = 10
    const actualLimit = Math.max(1, Math.min(Number(limit) || 5, maxLimit))

    // Use adminSupabase (service_role) so cache reads/writes succeed under locked-down RLS
    const fixes = await generateBatchFixes(
      normalizedIssues,
      actualLimit,
      model,
      adminSupabase,
      effectiveFramework
    )

    return NextResponse.json({
      fixes,
      suggestions: fixes,
      fix: fixes[0] ?? null,
      count: fixes.length,
      framework: effectiveFramework,
    })
  } catch (error) {
    console.error("Fix suggestions API error:", error)
    return NextResponse.json(
      { error: "Failed to generate fix suggestions" },
      { status: 500 }
    )
  }
}
