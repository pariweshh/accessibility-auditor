"use client"

import { useEffect } from "react"
import Link from "next/link"
import { BrandLogo } from "@/components/brand_logo"

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function RouteError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log unexpected client or SSR render failure
    console.error("Unhandled Application Error:", error)
  }, [error])

  return (
    <main
      role="alert"
      aria-live="assertive"
      className="min-h-[100dvh] bg-slate-950 text-slate-100 flex flex-col justify-between relative overflow-hidden selection:bg-rose-500/30 selection:text-rose-200"
    >
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[450px] bg-radial from-rose-500/10 via-transparent to-transparent pointer-events-none z-0" />
      <div className="absolute -top-32 -right-32 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header */}
      <header className="w-full bg-slate-950/75 backdrop-blur-md border-b border-slate-900 py-3.5 px-6 flex justify-between items-center relative z-10">
        <Link href="/" className="flex items-center gap-2.5 group">
          <BrandLogo size={32} />
          <span className="text-xl font-bold bg-linear-to-r from-indigo-400 via-indigo-300 to-indigo-400 bg-clip-text text-transparent group-hover:from-indigo-300 transition-all duration-300 font-display">
            Equivance
          </span>
        </Link>
        <button
          onClick={() => reset()}
          className="text-xs font-semibold text-slate-300 hover:text-white px-3 py-1.5 rounded-lg border border-slate-800 hover:border-slate-700 transition-all cursor-pointer"
        >
          Reload View
        </button>
      </header>

      {/* Error Message Hero */}
      <div className="container mx-auto max-w-2xl px-6 py-20 flex-1 flex flex-col items-center justify-center text-center relative z-10">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold uppercase tracking-widest mb-6">
          <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" />
          HTTP 500 · System Exception
        </div>

        <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-linear-to-b from-white via-slate-200 to-slate-400 tracking-tight font-display mb-4">
          Something went wrong
        </h1>

        <p className="text-sm text-slate-400 max-w-md mb-8 leading-relaxed">
          An unexpected error occurred while rendering this interface. Our telemetry
          has flagged this occurrence. You can attempt to retry the operation or return to the audit console.
        </p>

        {error?.digest && (
          <div className="mb-6 px-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800 text-3xs font-mono text-slate-400">
            Incident Hash: {error.digest}
          </div>
        )}

        {/* Action CTAs */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-xs sm:max-w-none justify-center">
          <button
            type="button"
            onClick={() => reset()}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-all shadow-lg shadow-indigo-600/20 focus:outline-hidden focus:ring-2 focus:ring-indigo-400 cursor-pointer"
          >
            Try Again
          </button>
          <Link
            href="/"
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white font-bold text-xs border border-slate-800 transition-all focus:outline-hidden focus:ring-2 focus:ring-slate-400"
          >
            Return to Audit Console
          </Link>
        </div>

        {/* Directory links */}
        <div className="mt-12 pt-8 border-t border-slate-900/80 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-500">
          <Link href="/docs" className="hover:text-slate-300 transition-colors">
            API Documentation
          </Link>
          <span>·</span>
          <Link href="/dashboard" className="hover:text-slate-300 transition-colors">
            User Dashboard
          </Link>
          <span>·</span>
          <Link href="/legal" className="hover:text-slate-300 transition-colors">
            Legal & Support
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="w-full border-t border-slate-900 py-6 px-6 text-center text-xs text-slate-500 relative z-10">
        Safe failure protection powered by Equivance Error Boundaries
      </footer>
    </main>
  )
}
