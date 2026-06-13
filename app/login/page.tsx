"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isPasswordLogin, setIsPasswordLogin] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [devLink, setDevLink] = useState<string | null>(null)

  const supabase = createClient()

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return

    setIsLoading(true)
    setMessage(null)
    setDevLink(null)

    try {
      const response = await fetch("/api/auth/magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to send magic link")
      }

      setMessage({
        type: "success",
        text: "✨ Check your inbox! We've sent a magic login link to your email.",
      })

      if (data.devLink) {
        setDevLink(data.devLink)
      }
    } catch (err: any) {
      setMessage({
        type: "error",
        text: err.message || "Something went wrong. Please try again.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) return

    setIsLoading(true)
    setMessage(null)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      setMessage({
        type: "success",
        text: "🎉 Success! Redirecting...",
      })

      // Wait a moment then redirect to homepage
      setTimeout(() => {
        window.location.href = "/"
      }, 1000)
    } catch (err: any) {
      setMessage({
        type: "error",
        text: err.message || "Invalid email or password.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handlePasswordSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) return

    setIsLoading(true)
    setMessage(null)

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) throw error

      if (data.session) {
        setMessage({
          type: "success",
          text: "🎉 Account created successfully! Redirecting...",
        })
        setTimeout(() => {
          window.location.href = "/"
        }, 1000)
      } else {
        setMessage({
          type: "success",
          text: "📧 Account created! Please check your email to confirm your registration.",
        })
      }
    } catch (err: any) {
      setMessage({
        type: "error",
        text: err.message || "Something went wrong during sign up.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setIsLoading(true)
    setMessage(null)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      if (error) throw error
    } catch (err: any) {
      setMessage({
        type: "error",
        text: err.message || "Failed to initialize Google Sign In.",
      })
      setIsLoading(false)
    }
  }

  return (
    <main className="relative min-h-screen flex items-center justify-center bg-linear-to-br from-slate-950 via-indigo-950 to-slate-900 px-4 overflow-hidden">
      {/* Decorative Orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>

      <div className="relative z-10 w-full max-w-md">
        {/* Logo / Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5 group mb-2">
            <img src="/logo.png" alt="A11ytica Pro Logo" className="w-9 h-9 object-contain rounded-lg border border-white/10" />
            <span className="text-2xl font-bold bg-linear-to-r from-blue-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent group-hover:from-blue-300 group-hover:to-purple-300 transition-all duration-300">
              A11ytica Pro
            </span>
          </Link>
          <p className="text-sm text-slate-400">
            Sign in to access advanced auditing history & custom reports
          </p>
        </div>

        {/* Card */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl rounded-2xl p-6 md:p-8">
          {/* Tabs */}
          <div className="flex gap-2 p-1 bg-slate-900/50 rounded-lg mb-6 border border-white/5">
            <button
              onClick={() => {
                setIsPasswordLogin(false)
                setMessage(null)
                setDevLink(null)
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-md transition-all duration-200 cursor-pointer ${
                !isPasswordLogin
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Passwordless Link
            </button>
            <button
              onClick={() => {
                setIsPasswordLogin(true)
                setMessage(null)
                setDevLink(null)
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-md transition-all duration-200 cursor-pointer ${
                isPasswordLogin
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Password Access
            </button>
          </div>

          {/* Form */}
          <form
            onSubmit={
              isPasswordLogin
                ? (isSignUp ? handlePasswordSignUp : handlePasswordLogin)
                : handleMagicLink
            }
            className="space-y-4"
          >
            <div>
              <label htmlFor="email" className="block text-xs font-medium text-slate-300 mb-1">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-900/50 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all duration-200"
              />
            </div>

            {isPasswordLogin && (
              <div>
                <label htmlFor="password" className="block text-xs font-medium text-slate-300 mb-1">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  required={isPasswordLogin}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-900/50 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all duration-200"
                />
              </div>
            )}

            {message && (
              <div
                className={`p-3.5 rounded-lg text-xs font-medium border ${
                  message.type === "success"
                    ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
                    : "bg-rose-500/10 text-rose-300 border-rose-500/20"
                }`}
              >
                {message.text}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full relative overflow-hidden group bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium text-sm py-2.5 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Processing...
                </span>
              ) : isPasswordLogin ? (
                isSignUp ? "Register Account" : "Sign In"
              ) : (
                "Send Magic Link"
              )}
            </button>
          </form>

          {/* Password sign in/up toggle */}
          {isPasswordLogin && (
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp)
                  setMessage(null)
                }}
                className="text-xs text-indigo-400 hover:text-indigo-300 hover:underline cursor-pointer"
              >
                {isSignUp ? "Already have an account? Sign In" : "Don't have an account? Sign Up"}
              </button>
            </div>
          )}

          {/* Magic link dev fallback */}
          {!isPasswordLogin && devLink && (
            <div className="mt-4 p-3.5 bg-indigo-950/40 border border-indigo-500/30 rounded-xl space-y-2 text-center animate-fadeIn">
              <p className="text-2xs text-indigo-300 font-semibold leading-none">🔧 Development Link Generated:</p>
              <p className="text-2xs text-slate-500 leading-relaxed">Resend is in dev-mode. Click below to bypass email inbox:</p>
              <a
                href={devLink}
                className="inline-block px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-2xs rounded-lg transition-all"
              >
                Bypass Email & Log In →
              </a>
            </div>
          )}

          {/* Social Sign In Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-slate-900/60 backdrop-blur-md px-2 text-slate-500 rounded-md border border-white/5">
                Or continue with
              </span>
            </div>
          </div>

          {/* Google Login Button */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full py-2.5 px-4 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-white font-medium text-xs flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            <span>Google</span>
          </button>
        </div>

        {/* Back Link */}
        <div className="text-center mt-6">
          <Link href="/" className="text-xs text-slate-400 hover:text-slate-200 transition-colors">
            ← Back to Free Auditor
          </Link>
        </div>
      </div>
    </main>
  )
}
