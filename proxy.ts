import { NextResponse, type NextRequest } from "next/server"
import { updateSession } from "@/lib/supabase/proxy"
import { getSafeRedirectUrl } from "@/lib/safe-redirect"

export async function proxy(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request)

  const isLoginPage = request.nextUrl.pathname.startsWith("/login")
  const isDashboardPage = request.nextUrl.pathname.startsWith("/dashboard")

  // Protect dashboard routes for unauthenticated users
  if (!user && isDashboardPage) {
    const returnTo = getSafeRedirectUrl(request.nextUrl.pathname + request.nextUrl.search, "/dashboard")
    return NextResponse.redirect(new URL(`/login?returnTo=${encodeURIComponent(returnTo)}`, request.url))
  }

  // Redirect authenticated users away from the login page (respect returnTo if present, else dashboard)
  if (user && isLoginPage) {
    const rawReturn = request.nextUrl.searchParams.get("returnTo") || request.nextUrl.searchParams.get("next")
    const dest = getSafeRedirectUrl(rawReturn, "/dashboard")
    return NextResponse.redirect(new URL(dest, request.url))
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
