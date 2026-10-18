import { NextResponse, type NextRequest } from "next/server"
import { updateSession } from "@/lib/supabase/proxy"
import { getSafeRedirectUrl } from "@/lib/safe-redirect"

const STATELESS_PUBLIC_PREFIXES = [
  "/api/billing/webhook",
  "/api/cron/",
  "/api/health",
  "/api/badge/",
  "/api/widget/",
  "/widget.js",
]

function copyCookies(source: NextResponse, target: NextResponse) {
  source.cookies.getAll().forEach((cookie) => {
    target.cookies.set(cookie)
  })
  return target
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip Supabase Auth session refresh for stateless public/webhook/cron routes
  if (STATELESS_PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next()
  }

  const { supabaseResponse, user } = await updateSession(request)

  const isLoginPage = pathname.startsWith("/login")
  const isDashboardPage = pathname.startsWith("/dashboard")

  // Protect dashboard routes for unauthenticated users
  if (!user && isDashboardPage) {
    const returnTo = getSafeRedirectUrl(pathname + request.nextUrl.search, "/dashboard")
    const redirectResponse = NextResponse.redirect(
      new URL(`/login?returnTo=${encodeURIComponent(returnTo)}`, request.url)
    )
    return copyCookies(supabaseResponse, redirectResponse)
  }

  // Redirect authenticated users away from the login page (respect returnTo if present, else dashboard)
  if (user && isLoginPage) {
    const rawReturn = request.nextUrl.searchParams.get("returnTo") || request.nextUrl.searchParams.get("next")
    const dest = getSafeRedirectUrl(rawReturn, "/dashboard")
    const redirectResponse = NextResponse.redirect(new URL(dest, request.url))
    return copyCookies(supabaseResponse, redirectResponse)
  }

  return supabaseResponse
}

export default async function defaultProxy(request: NextRequest) {
  return proxy(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public/ (public assets if matched)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
