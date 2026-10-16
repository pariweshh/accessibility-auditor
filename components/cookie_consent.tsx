"use client"

import { useState, useEffect } from "react"
import Link from "next/link"

export default function CookieConsent() {
  const [showConsent, setShowConsent] = useState(false)

  useEffect(() => {
    if (typeof window !== "undefined") {
      const acknowledged = localStorage.getItem("equivance_consent_acknowledged")
      if (!acknowledged) {
        setShowConsent(true)
      }
    }
  }, [])

  const handleDismiss = () => {
    setShowConsent(false)
    if (typeof window !== "undefined") {
      localStorage.setItem("equivance_consent_acknowledged", "true")
    }
  }

  if (!showConsent) return null

  return (
    <aside
      aria-label="Cookie and Privacy Consent"
      role="region"
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 animate-slideUp"
    >
      <div className="bg-slate-900/95 backdrop-blur-xl border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-2xl text-slate-100 flex flex-col gap-3">
        <div className="flex items-start gap-2.5">
          <svg
            className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
            />
          </svg>
          <div className="space-y-1 text-2xs leading-relaxed text-slate-400">
            <p className="font-semibold text-slate-200">
              Essential Cookies & Privacy Notice
            </p>
            <p>
              We use essential cookies strictly required for secure authentication (Supabase) and subscription processing (Stripe). We never sell your personal data or audit history.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 pt-1 border-t border-slate-800/60">
          <Link
            href="/legal"
            className="text-3xs text-indigo-400 hover:text-indigo-300 underline font-medium"
          >
            Review Legal Terms & Disclaimers →
          </Link>
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Accept and dismiss cookie consent notice"
            className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-2xs font-extrabold transition-all shadow-xs cursor-pointer select-none"
          >
            Got it
          </button>
        </div>
      </div>
    </aside>
  )
}
