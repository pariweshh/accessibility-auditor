import { NextResponse, type NextRequest } from "next/server"
import { updateSession } from "@/lib/supabase/proxy"

export async function proxy(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request)

  const isLoginPage = request.nextUrl.pathname.startsWith("/login")

  // Redirect authenticated users away from the login page
  if (user && isLoginPage) {
    return NextResponse.redirect(new URL("/", request.url))
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
