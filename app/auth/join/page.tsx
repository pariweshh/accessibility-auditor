"use client"

import { useState, useEffect, useCallback, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"

interface InviteDetails {
  valid: boolean
  teamId: string
  teamName: string
  invitedEmail: string
  role: string
}

function JoinTeamContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get("token")
  const autoAccept = searchParams.get("autoAccept") === "true"

  const [user, setUser] = useState<any>(null)
  const [loadingUser, setLoadingUser] = useState(true)
  const [inviteDetails, setInviteDetails] = useState<InviteDetails | null>(null)
  const [loadingInvite, setLoadingInvite] = useState(true)
  const [inviteError, setInviteError] = useState<string | null>(null)

  const [isAccepting, setIsAccepting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Auth form state if not logged in
  const [email, setEmail] = useState("")
  const [isSendingMagicLink, setIsSendingMagicLink] = useState(false)
  const [magicLinkSent, setMagicLinkSent] = useState(false)
  const [devLink, setDevLink] = useState<string | null>(null)
  const [isSigningOut, setIsSigningOut] = useState(false)

  const supabase = createClient()

  // 1. Fetch invite metadata
  useEffect(() => {
    if (!token) {
      setLoadingInvite(false)
      return
    }

    async function loadInvite() {
      try {
        setLoadingInvite(true)
        const res = await fetch(`/api/team/accept?token=${encodeURIComponent(token!)}`)
        const data = await res.json()

        if (!res.ok) {
          setInviteError(data.error || "This invitation link is invalid or has expired.")
        } else {
          setInviteDetails(data)
          if (data.invitedEmail) {
            setEmail(data.invitedEmail)
          }
        }
      } catch (err: any) {
        setInviteError("Failed to verify invitation. Please check your internet connection.")
      } finally {
        setLoadingInvite(false)
      }
    }

    loadInvite()
  }, [token])

  // 2. Check current session
  useEffect(() => {
    async function checkAuth() {
      try {
        const {
          data: { user: currentUser },
        } = await supabase.auth.getUser()
        setUser(currentUser)
      } catch (err) {
        console.error("Auth check failed:", err)
      } finally {
        setLoadingUser(false)
      }
    }
    checkAuth()
  }, [supabase.auth])

  const handleAcceptInvite = useCallback(async () => {
    if (!token) {
      setErrorMsg("Missing invitation token.")
      return
    }

    setIsAccepting(true)
    setErrorMsg(null)

    try {
      const res = await fetch("/api/team/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Failed to accept invitation")
      }

      setSuccessMsg(data.message || `Welcome to ${data.teamName || "the team"}! Redirecting to dashboard...`)
      setTimeout(() => {
        router.push("/dashboard")
      }, 1500)
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred.")
    } finally {
      setIsAccepting(false)
    }
  }, [token, router])

  // 3. Handle Auto-Accept once user and invite are loaded
  useEffect(() => {
    if (!loadingUser && !loadingInvite && user && token && !inviteError && !successMsg && !errorMsg) {
      if (autoAccept) {
        // If emails match or invite doesn't specify email, auto-accept immediately
        const userEmail = (user.email || "").toLowerCase()
        const invitedEmail = (inviteDetails?.invitedEmail || "").toLowerCase()
        if (!invitedEmail || userEmail === invitedEmail) {
          handleAcceptInvite()
        }
      }
    }
  }, [loadingUser, loadingInvite, user, token, autoAccept, inviteDetails, inviteError, successMsg, errorMsg, handleAcceptInvite])

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return

    setIsSendingMagicLink(true)
    setErrorMsg(null)
    setDevLink(null)

    try {
      const returnTo = `/auth/join?token=${encodeURIComponent(token || "")}&autoAccept=true`
      const response = await fetch("/api/auth/magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, returnTo }),
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to send magic link")
      }

      setMagicLinkSent(true)
      if (data.devLink) {
        setDevLink(data.devLink)
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to send login link.")
    } finally {
      setIsSendingMagicLink(false)
    }
  }

  const handleSignOut = async () => {
    setIsSigningOut(true)
    try {
      await supabase.auth.signOut()
      setUser(null)
      setErrorMsg(null)
    } catch (err: any) {
      console.error("Sign out error:", err)
    } finally {
      setIsSigningOut(false)
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900/60 border border-slate-800 rounded-2xl p-8 text-center space-y-4">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4c-.77-1.33-2.69-1.33-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3z" />
            </svg>
          </div>
          <h1 className="text-lg font-bold text-slate-100">Invalid Invitation Link</h1>
          <p className="text-xs text-slate-400">
            This invitation link is missing a security token. Please check the link provided in your invitation email.
          </p>
          <Link
            href="/dashboard"
            className="inline-block px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition-all"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  if (loadingInvite) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900/80 border border-slate-800 rounded-2xl p-8 text-center space-y-3">
          <div className="inline-block w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-400">Verifying team invitation...</p>
        </div>
      </div>
    )
  }

  if (inviteError) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900/60 border border-rose-500/30 rounded-2xl p-8 text-center space-y-4">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          </div>
          <h1 className="text-lg font-bold text-rose-300">Invitation Invalid or Expired</h1>
          <p className="text-xs text-slate-400 leading-relaxed">{inviteError}</p>
          <div className="pt-2">
            <Link
              href="/dashboard"
              className="inline-block px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition-all"
            >
              Go to Dashboard
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const isEmailMismatch =
    user &&
    inviteDetails?.invitedEmail &&
    user.email?.toLowerCase() !== inviteDetails.invitedEmail.toLowerCase()

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-900/80 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mb-1">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h1 className="text-xl font-black text-slate-50 tracking-tight">
            Join {inviteDetails?.teamName || "Agency Team"}
          </h1>
          <p className="text-xs text-slate-400 leading-relaxed">
            You have been invited to collaborate as{" "}
            <span className="font-semibold text-indigo-300 capitalize">
              {inviteDetails?.role || "Member"}
            </span>{" "}
            on accessibility audits, automated scans, and compliance reports.
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs flex items-start gap-2">
            <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4c-.77-1.33-2.69-1.33-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3z" />
            </svg>
            <span className="break-words">{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs flex items-start gap-2">
            <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <span>{successMsg}</span>
          </div>
        )}

        {loadingUser ? (
          <div className="py-8 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
            <div className="w-4 h-4 border-2 border-slate-500 border-t-transparent rounded-full animate-spin" />
            <span>Checking authentication status...</span>
          </div>
        ) : user ? (
          /* User is logged in: can accept directly */
          <div className="space-y-4">
            <div className="p-3.5 bg-slate-950/60 border border-slate-850 rounded-xl space-y-1">
              <span className="text-2xs text-slate-500 uppercase tracking-wider font-semibold">
                Signed in as
              </span>
              <p className="text-xs font-semibold text-slate-200">{user.email}</p>
            </div>

            {isEmailMismatch && (
              <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-2xs text-amber-300 space-y-2">
                <p className="font-semibold flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4c-.77-1.33-2.69-1.33-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3z" />
                  </svg>
                  Account Email Notice
                </p>
                <p className="leading-relaxed">
                  This invitation was addressed to{" "}
                  <strong className="text-amber-200">{inviteDetails?.invitedEmail}</strong>, but you
                  are currently signed in as <strong className="text-amber-200">{user.email}</strong>.
                </p>
                <button
                  type="button"
                  onClick={handleSignOut}
                  disabled={isSigningOut}
                  className="mt-1 text-2xs text-amber-400 underline hover:text-amber-200 font-medium cursor-pointer disabled:opacity-50"
                >
                  {isSigningOut ? "Signing out..." : "Sign out & sign in with invited email"}
                </button>
              </div>
            )}

            <button
              onClick={handleAcceptInvite}
              disabled={isAccepting || !!successMsg}
              className="w-full py-3 px-4 rounded-xl font-semibold text-xs bg-linear-to-r from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 text-white transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isAccepting ? "Joining Team..." : `Accept Invitation & Join ${inviteDetails?.teamName || "Team"}`}
            </button>
          </div>
        ) : (
          /* User is not logged in: prompt magic link or login */
          <div className="space-y-4">
            {magicLinkSent ? (
              <div className="p-4 bg-indigo-950/40 border border-indigo-500/30 rounded-xl text-center space-y-3">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-xs font-bold text-slate-200">Magic Link Sent!</h3>
                <p className="text-2xs text-slate-400 leading-relaxed">
                  We sent a sign-in link to <strong className="text-slate-300">{email}</strong>. Open
                  the email to sign in and you will automatically join{" "}
                  <strong className="text-indigo-300">{inviteDetails?.teamName || "the team"}</strong>.
                </p>
                {devLink && (
                  <div className="pt-2 text-left">
                    <p className="text-2xs text-amber-400 font-semibold mb-1">Dev Link:</p>
                    <a
                      href={devLink}
                      className="text-2xs text-indigo-400 underline break-all font-mono"
                    >
                      {devLink}
                    </a>
                  </div>
                )}
              </div>
            ) : (
              <form onSubmit={handleMagicLink} className="space-y-4">
                <div className="space-y-1.5">
                  <label
                    htmlFor="email"
                    className="block text-2xs font-semibold text-slate-400 uppercase tracking-wider"
                  >
                    Your Email Address
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    required
                    disabled={isSendingMagicLink}
                    className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-50 placeholder-slate-600 focus:outline-hidden focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-50 transition-all"
                  />
                  {inviteDetails?.invitedEmail && (
                    <p className="text-3xs text-slate-500">
                      Pre-filled with invited address: {inviteDetails.invitedEmail}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSendingMagicLink || !email}
                  className="w-full py-3 px-4 rounded-xl font-semibold text-xs bg-linear-to-r from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 text-white transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isSendingMagicLink ? "Sending Link..." : "Sign In & Accept Invite"}
                </button>

                <div className="text-center">
                  <Link
                    href={`/login?returnTo=${encodeURIComponent(`/auth/join?token=${token}&autoAccept=true`)}`}
                    className="text-2xs text-slate-400 hover:text-slate-200 underline"
                  >
                    Or sign in with existing password
                  </Link>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default function JoinTeamPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center text-xs text-slate-500">
          Loading invitation...
        </div>
      }
    >
      <JoinTeamContent />
    </Suspense>
  )
}
