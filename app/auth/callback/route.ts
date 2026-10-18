import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getSafeRedirectUrl } from "@/lib/safe-redirect"
import { SITE } from "@/lib/site"

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const rawNext = searchParams.get("next") ?? searchParams.get("returnTo")
  const next = getSafeRedirectUrl(rawNext, "/dashboard")

  const isLocalEnv = process.env.NODE_ENV === "development"
  const canonicalOrigin = isLocalEnv ? origin : SITE.url

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`)
      }
      // Validate x-forwarded-host against configured canonical site host to prevent Host header open redirects
      const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim()
      try {
        const expectedHost = new URL(SITE.url).host
        if (forwardedHost && forwardedHost.toLowerCase() === expectedHost.toLowerCase()) {
          return NextResponse.redirect(`https://${expectedHost}${next}`)
        }
      } catch {
        // fallback to canonicalOrigin
      }
      return NextResponse.redirect(`${canonicalOrigin}${next}`)
    }
  }

  return NextResponse.redirect(
    `${canonicalOrigin}/login?error=Could+not+authenticate+user+with+the+provided+link`
  )
}
