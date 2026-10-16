import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"

export const runtime = "nodejs"

/**
 * GET /widget.js
 * Serves the standalone public compliance widget JavaScript bundle with CORS and caching headers.
 */
export async function GET() {
  try {
    const filePath = path.join(process.cwd(), "public", "widget.js")
    const scriptContent = fs.readFileSync(filePath, "utf-8")

    return new NextResponse(scriptContent, {
      status: 200,
      headers: {
        "Content-Type": "application/javascript; charset=utf-8",
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
        "Access-Control-Allow-Origin": "*",
      },
    })
  }
}
