import { NextResponse } from "next/server"
import fs from "fs/promises"
import path from "path"

export const runtime = "nodejs"

let cachedScriptContent: string | null = null

/**
 * GET /widget.js
 * Serves the standalone public compliance widget JavaScript bundle with CORS and caching headers.
 */
export async function GET() {
  try {
    if (!cachedScriptContent || process.env.NODE_ENV !== "production") {
      const filePath = path.join(process.cwd(), "public", "widget.js")
      cachedScriptContent = await fs.readFile(filePath, "utf-8")
    }

    return new NextResponse(cachedScriptContent, {
      status: 200,
      headers: {
        "Content-Type": "application/javascript; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400",
      },
    })
  } catch (err) {
    console.error("Failed to read public/widget.js:", err)
    return new NextResponse("// Error loading widget script", {
      status: 500,
      headers: {
        "Content-Type": "application/javascript; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
        "Access-Control-Allow-Origin": "*",
      },
    })
  }
}
