import { scanURL } from "@/lib/scanner"
import { NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"
export const maxDuration = 10 // Set based on your Vercel plan
export const dynamic = "force-dynamic" // Disable static optimization

export async function POST(request: NextRequest) {
  try {
    const { url, includeScreenshot = false } = await request.json()

    if (!url) {
      return NextResponse.json(
        {
          error: "URL is required",
        },
        { status: 400 }
      )
    }

    // validate url
    let urlObj: URL
    try {
      urlObj = new URL(url)
    } catch (error) {
      return NextResponse.json({ error: "Invalid URL format" }, { status: 400 })
    }

    // security: Block scanning of localhost/internal IPs in production
    const hostname = urlObj.hostname.toLowerCase()

    if (process.env.NODE_ENV === "production") {
      const blockedHosts = ["localhost", "127.0.0.1", "0.0.0.0", "::1"]
      if (
        blockedHosts.includes(hostname) ||
        hostname.startsWith("192.168.") ||
        hostname.startsWith("10.") ||
        hostname.match(/^172\.(1[6-9]|2[0-9]|3[01])\./)
      ) {
        return NextResponse.json(
          { error: "Cannot scan internal/local URLs in production" },
          { status: 400 }
        )
      }
    }

    // perform the scan
    const scanResult = await scanURL(url)
    return NextResponse.json(scanResult)
  } catch (error) {
    console.error("Scan API error:", error)
    const errorMessage =
      error instanceof Error ? error.message : "Failed to scan URL"

    // Handle timeout errors specifically
    if (
      errorMessage.includes("timeout") ||
      errorMessage.includes("Navigation timeout")
    ) {
      return NextResponse.json(
        { error: "Page took too long to load. Try a faster loading page." },
        { status: 408 }
      )
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
