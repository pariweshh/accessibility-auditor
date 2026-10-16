import OpenAI from "openai"
import { AccessibilityIssue, AIFramework, FixSuggestion } from "./types"
import crypto from "crypto"

let openaiClient: OpenAI | null = null

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || "dummy-key-for-build",
    })
  }
  return openaiClient
}

const FRAMEWORK_INSTRUCTIONS: Record<AIFramework, { label: string; promptRule: string }> = {
  html: {
    label: "Standard HTML / CSS",
    promptRule:
      "Output standard semantic HTML5 and inline or standard CSS attributes (`class`, `for`, `aria-*`).",
  },
  "react-tailwind": {
    label: "React / Next.js (JSX + Tailwind CSS)",
    promptRule:
      "Output idiomatic React / Next.js JSX using `className`, `htmlFor`, camelCase event/DOM props, and accessible Tailwind CSS utilities (e.g. `sr-only`, `focus-visible:ring-2`, high-contrast color tokens).",
  },
  vue: {
    label: "Vue 3 (SFC Template)",
    promptRule:
      "Output idiomatic Vue 3 Single-File Component `<template>` markup using semantic elements, `:aria-*` bindings where dynamic, and clean utility classes.",
  },
  angular: {
    label: "Angular / Web Components",
    promptRule:
      "Output idiomatic Angular template markup (`[attr.aria-*]` where dynamic, semantic HTML5 controls, and accessible label associations).",
  },
}

export async function generateFixSuggestion(
  issue: AccessibilityIssue,
  model: string = "gpt-4o-mini",
  supabase?: any,
  framework: AIFramework = "html"
): Promise<FixSuggestion> {
  const originalCode = issue.nodes[0]?.html || ""
  const fwConfig = FRAMEWORK_INSTRUCTIONS[framework] ?? FRAMEWORK_INSTRUCTIONS.html

  // ─── Cache Key Calculation (includes framework to prevent cross-stack collisions) ───
  const keyRaw = `${issue.id}:${framework}:${originalCode}:${model}`
  const keyHash = crypto.createHash("sha256").update(keyRaw).digest("hex")

  // ─── Cache Lookup ─────────────────────────────────────────────────────────
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("ai_fix_cache")
        .select("suggested_fix, explanation, confidence")
        .eq("key_hash", keyHash)
        .maybeSingle()

      if (!error && data) {
        console.log(`[AI Cache Hit] Reusing fix for hash ${keyHash}`)
        return {
          issueId: issue.id,
          originalCode,
          suggestedFix: data.suggested_fix,
          explanation: data.explanation,
          confidence: data.confidence as "high" | "medium" | "low",
          framework,
        }
      }
    } catch (dbError) {
      console.error("[AI Cache Lookup Error] Failed to lookup cache, proceeding to OpenAI:", dbError)
    }
  }

  // ─── OpenAI Generation ────────────────────────────────────────────────────
  try {
    const prompt = `You are an accessibility expert. Analyze this accessibility issue and provide a specific code fix targeted for ${fwConfig.label}.

Issue: ${issue.help}
Description: ${issue.description}
Impact: ${issue.impact}
Target Stack: ${fwConfig.label}
Stack Guideline: ${fwConfig.promptRule}

Problematic DOM HTML:
${originalCode || "No HTML available"}

Failure Summary: ${issue.nodes[0]?.failureSummary || "No summary available"}

WCAG Tags: ${issue.tags.join(", ")}

Provide:
1. The corrected code snippet in ${fwConfig.label}
2. A brief explanation of what was wrong and how you fixed it for ${fwConfig.label}
3. Your confidence level in this fix (high/medium/low)

Format your response as JSON:
{
  "suggestedFix": "corrected code here",
  "explanation": "explanation here",
  "confidence": "high/medium/low"
}`

    const completion = await getOpenAIClient().chat.completions.create({
      model: model, // Dynamically selected model (gpt-4o-mini or gpt-4o)
      messages: [
        {
          role: "system",
          content:
            "You are an expert in web accessibility (WCAG 2.2) and modern frontend frameworks. You provide precise, drop-in accessible code fixes. Always return valid JSON.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3, // Lower temperature for more consistent fixes
      max_tokens: 550, // Limit tokens to save costs
    })

    const response = JSON.parse(completion.choices[0].message.content || "{}")
    const suggestedFix = response.suggestedFix || "Unable to generate fix"
    const explanation = response.explanation || "No explanation available"
    const confidence = (response.confidence || "low") as "high" | "medium" | "low"

    // ─── Async Cache Insertion (Fire-and-Forget) ────────────────────────────
    if (supabase && response.suggestedFix) {
      supabase
        .from("ai_fix_cache")
        .insert({
          key_hash: keyHash,
          issue_id: issue.id,
          original_html: originalCode || null,
          model: `${model}:${framework}`,
          suggested_fix: suggestedFix,
          explanation,
          confidence,
        })
        .then(({ error }: any) => {
          if (error) {
            // Ignore duplicate key errors if multiple concurrent operations hit same code path
            if (error.code !== "23505") {
              console.error(`[AI Cache Insert Error] Failed to write cache for hash ${keyHash}:`, error)
            }
          } else {
            console.log(`[AI Cache Saved] Fix saved for hash ${keyHash}`)
          }
        })
        .catch((dbError: any) => {
          console.error("[AI Cache Insert Exception] Exception inserting to cache:", dbError)
        })
    }

    return {
      issueId: issue.id,
      originalCode,
      suggestedFix,
      explanation,
      confidence,
      framework,
    }
  } catch (error) {
    console.error("AI fix generation error:", error)

    // Return a fallback response instead of throwing
    return {
      issueId: issue.id,
      originalCode,
      suggestedFix: "Error generating fix",
      explanation: `Failed to generate fix: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
      confidence: "low",
      framework,
    }
  }
}

export async function generateBatchFixes(
  issues: AccessibilityIssue[],
  limit: number = 5,
  model: string = "gpt-4o-mini",
  supabase?: any,
  framework: AIFramework = "html"
): Promise<FixSuggestion[]> {
  // Only process the most critical issues to save on API costs
  const impactOrder = { critical: 4, serious: 3, moderate: 2, minor: 1 }

  const priorityIssues = issues
    .sort((a, b) => impactOrder[b.impact] - impactOrder[a.impact])
    .slice(0, limit)

  // Process fixes sequentially to avoid rate limits
  const fixes: FixSuggestion[] = []

  for (const issue of priorityIssues) {
    try {
      const fix = await generateFixSuggestion(issue, model, supabase, framework)
      fixes.push(fix)
    } catch (error) {
      console.error(`Failed to generate fix for issue ${issue.id}:`, error)
      // Continue with other fixes even if one fails
    }
  }

  return fixes
}

