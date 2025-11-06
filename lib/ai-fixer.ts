import OpenAI from "openai"
import { AccessibilityIssue, FixSuggestion } from "./types"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function generateFixSuggestion(
  issue: AccessibilityIssue
): Promise<FixSuggestion> {
  try {
    const prompt = `You are an accessibility expert. Analyze this accessibility issue and provide a specific code fix.

Issue: ${issue.help}
Description: ${issue.description}
Impact: ${issue.impact}

Problematic HTML:
${issue.nodes[0]?.html || "No HTML available"}

Failure Summary: ${issue.nodes[0]?.failureSummary || "No summary available"}

WCAG Tags: ${issue.tags.join(", ")}

Provide:
1. The corrected HTML code
2. A brief explanation of what was wrong and how you fixed it
3. Your confidence level in this fix (high/medium/low)

Format your response as JSON:
{
  "suggestedFix": "corrected HTML code here",
  "explanation": "explanation here",
  "confidence": "high/medium/low"
}`

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Cost-effective model
      messages: [
        {
          role: "system",
          content:
            "You are an expert in web accessibility (WCAG) and provide precise, actionable code fixes. Always return valid JSON.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3, // Lower temperature for more consistent fixes
      max_tokens: 500, // Limit tokens to save costs
    })

    const response = JSON.parse(completion.choices[0].message.content || "{}")

    return {
      issueId: issue.id,
      originalCode: issue.nodes[0]?.html || "",
      suggestedFix: response.suggestedFix || "Unable to generate fix",
      explanation: response.explanation || "No explanation available",
      confidence: (response.confidence || "low") as "high" | "medium" | "low",
    }
  } catch (error) {
    console.error("AI fix generation error:", error)

    // Return a fallback response instead of throwing
    return {
      issueId: issue.id,
      originalCode: issue.nodes[0]?.html || "",
      suggestedFix: "Error generating fix",
      explanation: `Failed to generate fix: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
      confidence: "low",
    }
  }
}

export async function generateBatchFixes(
  issues: AccessibilityIssue[],
  limit: number = 5
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
      const fix = await generateFixSuggestion(issue)
      fixes.push(fix)
    } catch (error) {
      console.error(`Failed to generate fix for issue ${issue.id}:`, error)
      // Continue with other fixes even if one fails
    }
  }

  return fixes
}
