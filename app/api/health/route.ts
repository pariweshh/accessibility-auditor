import { NextResponse } from "next/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function getAdminSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createAdminClient(url, key)
}

export async function GET() {
  const startTime = Date.now()
  const checks: Record<string, { status: string; latencyMs?: number }> = {}
  let isHealthy = true

  // 1. Supabase PostgreSQL Connectivity Check
  const adminSupabase = getAdminSupabase()
  if (!adminSupabase) {
    checks.database = {
      status: "degraded",
    }
    isHealthy = false
  } else {
    try {
      const dbStart = Date.now()
      const { error } = await adminSupabase
        .from("profiles")
        .select("id")
        .limit(1)

      const latencyMs = Date.now() - dbStart

      if (error) {
        console.error("Health check database error:", error)
        checks.database = {
          status: "degraded",
          latencyMs,
        }
        isHealthy = false
      } else {
        checks.database = {
          status: "connected",
          latencyMs,
        }
      }
    } catch (err: unknown) {
      console.error("Health check database exception:", err)
      checks.database = {
        status: "disconnected",
      }
      isHealthy = false
    }
  }

  // 2. Service Health Status
  const responsePayload = {
    status: isHealthy ? "healthy" : "degraded",
    timestamp: new Date().toISOString(),
    latencyMs: Date.now() - startTime,
    checks,
  }

  return NextResponse.json(responsePayload, {
    status: isHealthy ? 200 : 503,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  })
}
