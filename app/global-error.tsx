"use client"

import { useEffect } from "react"
import Link from "next/link"

interface GlobalErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    // Log fatal root-level layout error
    console.error("Fatal Root Layout Exception:", error)
  }, [error])

  return (
    <html lang="en">
      <body className="bg-slate-950 text-slate-100 min-h-screen flex flex-col justify-between m-0 p-0 font-sans antialiased selection:bg-rose-500/30 selection:text-rose-200">
        {/* Top Header */}
        <header className="w-full bg-slate-950/80 border-b border-slate-900 py-4 px-6 flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <svg
              className="w-8 h-8 text-indigo-400"
              viewBox="0 0 32 32"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <rect x="2" y="2" width="28" height="28" rx="6" fill="#0f172a" stroke="#6366f1" strokeWidth="2" />
              <circle cx="16" cy="16" r="6" fill="#6366f1" />
              <path d="M16 6v4M16 22v4M6 16h4M22 16h4" stroke="#818cf8" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <span className="text-xl font-bold text-slate-50">Equivance</span>
          </div>
          <button
            type="button"
            onClick={() => reset()}
            className="text-xs font-semibold text-slate-300 hover:text-white px-3.5 py-1.5 rounded-lg border border-slate-800 hover:border-slate-700 transition-colors cursor-pointer"
          >
            Reload App
          </button>
        </header>

        {/* Main Content Alert */}
        <main
          role="alert"
          aria-live="assertive"
          className="container mx-auto max-w-xl px-6 py-20 flex-1 flex flex-col items-center justify-center text-center"
        >
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold uppercase tracking-widest mb-6">
            <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" aria-hidden="true" />
            Fatal System Exception
          </div>

          <h1 className="text-3xl md:text-4xl font-black text-slate-50 tracking-tight mb-4">
            Application Shell Error
          </h1>

          <p className="text-sm text-slate-400 max-w-md mb-8 leading-relaxed">
            The root application layout encountered an unhandled exception. This event has been recorded for diagnostics. You can attempt to restore the application state below.
          </p>

          {error?.digest && (
            <div className="mb-6 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono text-slate-400">
              Error Digest: {error.digest}
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-xs sm:max-w-none justify-center">
            <button
              type="button"
              onClick={() => reset()}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-colors cursor-pointer"
            >
              Recover Application
            </button>
            <Link
              href="/"
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white font-bold text-xs border border-slate-800 transition-colors text-center"
            >
              Return Home
            </Link>
          </div>
        </main>

        {/* Footer */}
        <footer className="w-full border-t border-slate-900 py-6 px-6 text-center text-xs text-slate-500">
          Equivance Root Fault Isolation Barrier
        </footer>
      </body>
    </html>
  )
}
