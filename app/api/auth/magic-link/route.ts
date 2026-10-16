import { NextRequest, NextResponse } from "next/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { Resend } from "resend"
import { getSafeRedirectUrl } from "@/lib/safe-redirect"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  try {
    const { email, returnTo } = await request.json()

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ error: "A valid email is required" }, { status: 400 })
    }

    // 1. Initialize admin supabase client
    const adminSupabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get request origin for redirect callback and sanitize return destination
    const origin = new URL(request.url).origin
    const safeReturnTo = getSafeRedirectUrl(returnTo, "/dashboard")
    const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent(safeReturnTo)}`

    // 2. Generate passwordless magic link
    const { data, error: generateError } = await adminSupabase.auth.admin.generateLink({
      type: "magiclink",
      email: email.trim().toLowerCase(),
      options: {
        redirectTo,
      },
    })

    if (generateError || !data?.properties?.action_link) {
      console.error("Magic link generation error:", generateError)
      return NextResponse.json(
        { error: generateError?.message || "Failed to generate login link" },
        { status: 500 }
      )
    }

    const loginLink = data.properties.action_link

    // 3. Send email via Resend
    const resendKey = process.env.RESEND_API_KEY
    if (!resendKey || resendKey.startsWith("re_xxxx")) {
      // If Resend is not configured/mock, fallback to console output and return link for dev ease
      console.log("----------------------------------------")
      console.log("RESEND EMAIL FALLBACK (DEVELOPMENT ONLY)")
      console.log(`Magic link generated for ${email}:`)
      console.log(loginLink)
      console.log("----------------------------------------")
      
      return NextResponse.json({
        success: true,
        message: "Email client not configured. Link printed to server console.",
        devLink: loginLink,
      })
    }

    const resend = new Resend(resendKey)
    const emailFrom =
      process.env.EMAIL_FROM ||
      process.env.RESEND_FROM_EMAIL ||
      "A11ytica Pro <reports@yourdomain.com>"

    const { data: sendData, error: sendError } = await resend.emails.send({
      from: emailFrom,
      to: email.trim().toLowerCase(),
      subject: "Sign in to A11ytica Pro",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Sign in to A11ytica Pro</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #020617; color: #f1f5f9; margin: 0; padding: 0; }
            .container { max-width: 500px; margin: 40px auto; padding: 32px; background-color: #0f172a; border: 1px solid #1e293b; border-radius: 16px; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3); }
            .logo { font-size: 22px; font-weight: 800; color: #f8fafc; text-align: center; margin-bottom: 24px; }
            h1 { font-size: 20px; font-weight: 700; color: #ffffff; text-align: center; margin-bottom: 8px; }
            p { font-size: 14px; line-height: 1.6; color: #94a3b8; text-align: center; margin-bottom: 24px; }
            .btn-container { text-align: center; margin-bottom: 24px; }
            .btn { display: inline-block; background-color: #4f46e5; color: #ffffff !important; font-weight: 600; font-size: 14px; text-decoration: none; padding: 12px 28px; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.2); transition: background-color 0.2s; }
            .btn:hover { background-color: #4338ca; }
            .footer { font-size: 11px; color: #475569; text-align: center; border-top: 1px solid #1e293b; padding-top: 16px; }
            .link-alt { word-break: break-all; font-size: 11px; color: #6366f1; text-align: center; margin-top: 16px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="logo">
              <img src="${origin}/logo.png" width="32" height="32" style="vertical-align: middle; border-radius: 8px; margin-right: 8px;" alt="A11ytica Pro" />
              <span>A11ytica Pro</span>
            </div>
            <h1>Your magic login link is ready</h1>
            <p>Click the button below to sign in to your A11ytica Pro account. This link will expire shortly.</p>
            
            <div class="btn-container">
              <a href="${loginLink}" class="btn">Log In to A11ytica Pro →</a>
            </div>

            <p style="font-size: 11px; color: #64748b; margin-top: 24px;">If the button doesn't work, copy and paste this URL into your browser:</p>
            <div class="link-alt">
              <a href="${loginLink}" style="color: #6366f1; text-decoration: none;">${loginLink}</a>
            </div>

            <div class="footer" style="margin-top: 32px;">
              If you didn't request this login link, you can safely ignore this email.
            </div>
          </div>
        </body>
        </html>
      `,
    })

    if (sendError) {
      console.error("Resend send error:", sendError)

      // Fallback in development so developer is never blocked by domain verification
      if (process.env.NODE_ENV !== "production") {
        console.log("----------------------------------------")
        console.log("RESEND EMAIL FAILURE FALLBACK (DEVELOPMENT ONLY)")
        console.log(`Could not send email via Resend: ${sendError.message}`)
        console.log(`Magic link for ${email}:`)
        console.log(loginLink)
        console.log("----------------------------------------")

        return NextResponse.json({
          success: true,
          message: `Email delivery failed: ${sendError.message}. Bypass link generated.`,
          devLink: loginLink,
        })
      }

      return NextResponse.json(
        { error: `Email service error: ${sendError.message}` },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error("Magic link POST error:", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    )
  }
}
