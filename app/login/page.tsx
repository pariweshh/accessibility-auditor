"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isPasswordLogin, setIsPasswordLogin] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const supabase = createClient()

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return

    setIsLoading(true)
    setMessage(null)

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) throw error

      setMessage({
        type: "success",
        text: "✨ Check your inbox! We've sent a magic login link to your email.",
      })
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

  return (
    <main className="relative min-h-screen flex items-center justify-center bg-linear-to-br from-slate-950 via-indigo-950 to-slate-900 px-4 overflow-hidden">
      {/* Decorative Orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>

      <div className="relative z-10 w-full max-w-md">
        {/* Logo / Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 group mb-2">
            <span className="text-3xl">🎯</span>
            <span className="text-2xl font-bold bg-linear-to-r from-blue-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent group-hover:from-blue-300 group-hover:to-purple-300 transition-all duration-300">
              Auditor Pro
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
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-md transition-all duration-200 ${
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
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-md transition-all duration-200 ${
                isPasswordLogin
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Password Sign In
            </button>
          </div>

          {/* Form */}
          <form onSubmit={isPasswordLogin ? handlePasswordLogin : handleMagicLink} className="space-y-4">
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
                <div className="flex justify-between items-center mb-1">
                  <label htmlFor="password" className="block text-xs font-medium text-slate-300">
                    Password
                  </label>
                </div>
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
                "Sign In"
              ) : (
                "Send Magic Link"
              )}
            </button>
          </form>

          {/* Additional info / helper */}
          <div className="mt-6 text-center text-xs text-slate-500 border-t border-white/5 pt-4">
            New here? Magic links will automatically create an account if you don't have one.
          </div>
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
