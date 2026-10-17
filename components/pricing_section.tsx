"use client"

import { useState } from "react"

interface PricingSectionProps {
  user: any
  profile: any
  tier: string
}

export default function PricingSection({ user, profile, tier }: PricingSectionProps) {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null)

  const handleChoosePlan = async (plan: "pro" | "agency") => {
    if (!user) {
      window.location.href = `/login?returnTo=${encodeURIComponent(`/?checkout=${plan}#pricing`)}`
      return
    }

    setLoadingPlan(plan)
    try {
      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to start checkout")
      }

      const data = await response.json()
      if (data.url) {
        window.location.href = data.url
      }
    } catch (error) {
      console.error("Pricing checkout error:", error)
      alert(error instanceof Error ? error.message : "Error initiating checkout")
    } finally {
      setLoadingPlan(null)
    }
  }

  const handleManageBilling = async () => {
    setLoadingPlan("manage")
    try {
      const response = await fetch("/api/billing/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to open billing portal")
      }

      const data = await response.json()
      if (data.url) {
        window.location.href = data.url
      }
    } catch (error) {
      console.error("Billing portal error:", error)
      alert(error instanceof Error ? error.message : "Error opening billing portal")
    } finally {
      setLoadingPlan(null)
    }
  }

  return (
    <section id="pricing" className="mt-24 relative animate-slideUp">
      {/* Decorative side glow */}
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-600/5 rounded-full blur-3xl pointer-events-none z-0" />

      <div className="max-w-5xl mx-auto relative z-10">
        <div className="text-center mb-12">
          <span className="text-2xs font-extrabold uppercase tracking-widest text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 rounded-full">
            Pricing Plans
          </span>
          <h2 className="text-2xl md:text-3xl font-black text-slate-50 mt-3.5 tracking-tight">
            Simple, Transparent Pricing
          </h2>
          <p className="text-xs text-slate-400 max-w-md mx-auto mt-2 leading-relaxed">
            Upgrade your account to unlock higher scan limits, executive compliance exports, developer APIs, and premium AI engines. All prices in AUD.
          </p>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid md:grid-cols-3 gap-6 items-stretch">
          {/* Free Tier */}
          <div className="glass-panel rounded-2xl p-6 flex flex-col justify-between border-slate-800/60 shadow-xl">
            <div>
              <div className="flex justify-between items-start mb-3">
                <h3 className="text-sm font-bold text-slate-200">Free Tier</h3>
              </div>
              <div className="flex items-baseline gap-1 mb-5">
                <span className="text-3xl font-black text-slate-50">$0</span>
                <span className="text-xs text-slate-500 font-semibold">AUD / month</span>
              </div>
              <ul className="space-y-3 text-xs text-slate-400 mb-8">
                <li className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span><span className="sr-only">Included: </span>5 automated scans / month</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span><span className="sr-only">Included: </span>Standard HTML/CSS AI fixes (gpt-4o-mini)</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span><span className="sr-only">Not included: </span>React, Vue 3 &amp; Angular AI code fixes</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span><span className="sr-only">Not included: </span>EAA 2025 / ADA Statement &amp; Live Badge</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span><span className="sr-only">Not included: </span>PDF POUR Conformance Matrix &amp; History</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span><span className="sr-only">Not included: </span>Developer API &amp; CI/CD Quality Gates</span>
                </li>
              </ul>
            </div>
            
            <button
              disabled={tier === "free" || tier === "pro" || tier === "agency"}
              className="w-full py-2.5 text-2xs font-extrabold bg-slate-800 hover:bg-slate-700 disabled:bg-slate-900/60 disabled:text-slate-600 text-slate-200 border border-slate-700/40 rounded-xl transition-all disabled:cursor-not-allowed select-none"
            >
              {tier === "free" ? "Active Plan" : tier === "pro" || tier === "agency" ? "Free Tier" : "Get Started"}
            </button>
          </div>

          {/* Pro Tier */}
          <div className="glass-panel rounded-2xl p-6 flex flex-col justify-between border-indigo-500/35 relative overflow-hidden shadow-2xl md:scale-[1.03]">
            {/* Ambient Popular Accent */}
            <div className="absolute top-0 right-0 px-3 py-1 bg-indigo-600 text-white text-[9px] font-black uppercase tracking-widest rounded-bl-xl border-l border-b border-indigo-500/30">
              Popular
            </div>

            <div>
              <div className="flex justify-between items-start mb-3">
                <h3 className="text-sm font-bold text-slate-50">Pro Plan</h3>
              </div>
              <div className="flex items-baseline gap-1 mb-5">
                <span className="text-3xl font-black text-slate-50">$29</span>
                <span className="text-xs text-slate-500 font-semibold">AUD / month</span>
              </div>
              <ul className="space-y-3 text-xs text-slate-300 mb-8">
                <li className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span><span className="sr-only">Included: </span>150 automated scans / month</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span><span className="sr-only">Included: </span>Everything in Free Plan</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span><span className="sr-only">Included: </span>React/Tailwind, Vue 3 &amp; Angular AI fixes</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span><span className="sr-only">Included: </span>Premium AI engine (gpt-4o) &amp; history</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span><span className="sr-only">Included: </span>Live SVG Compliance Badge &amp; verification</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span><span className="sr-only">Included: </span>EAA 2025 &amp; ADA Statement generator</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span><span className="sr-only">Included: </span>PDF exports with WCAG 2.2 POUR Matrix</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span><span className="sr-only">Included: </span>Turnkey CI/CD Quality Gate &amp; API keys</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span><span className="sr-only">Not included: </span>White-label custom branding &amp; 3 seats</span>
                </li>
              </ul>
            </div>

            {tier === "pro" ? (
              <button
                onClick={handleManageBilling}
                disabled={loadingPlan === "manage"}
                className="w-full py-2.5 text-2xs font-extrabold bg-indigo-950/60 hover:bg-indigo-900 border border-indigo-500/30 text-indigo-300 rounded-xl transition-all cursor-pointer select-none"
              >
                {loadingPlan === "manage" ? "Loading..." : "Manage Billing"}
              </button>
            ) : (
              <button
                onClick={() => handleChoosePlan("pro")}
                disabled={loadingPlan !== null}
                className="w-full py-2.5 text-2xs font-extrabold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all cursor-pointer shadow-md hover:shadow-lg shadow-indigo-500/10 disabled:opacity-50 select-none"
              >
                {loadingPlan === "pro" ? "Starting Checkout..." : "Choose Pro"}
              </button>
            )}
          </div>

          {/* Agency Tier */}
          <div className="glass-panel rounded-2xl p-6 flex flex-col justify-between border-slate-800/60 shadow-xl">
            <div>
              <div className="flex justify-between items-start mb-3">
                <h3 className="text-sm font-bold text-slate-200">Agency Plan</h3>
              </div>
              <div className="flex items-baseline gap-1 mb-5">
                <span className="text-3xl font-black text-slate-50">$99</span>
                <span className="text-xs text-slate-500 font-semibold">AUD / month</span>
              </div>
              <ul className="space-y-3 text-xs text-slate-400 mb-8">
                <li className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span><span className="sr-only">Included: </span>600 automated scans / month</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span><span className="sr-only">Included: </span>Everything in Pro Plan</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span><span className="sr-only">Included: </span>White-label PDF reports &amp; POUR Matrix</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span><span className="sr-only">Included: </span>White-label Live SVG Compliance Badges</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span><span className="sr-only">Included: </span>Client-ready EAA 2025 / ADA Kits</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span><span className="sr-only">Included: </span>Team access (3 multi-user seats)</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span><span className="sr-only">Included: </span>Full Developer API &amp; CI/CD Builder</span>
                </li>
              </ul>
            </div>

            {tier === "agency" ? (
              <button
                onClick={handleManageBilling}
                disabled={loadingPlan === "manage"}
                className="w-full py-2.5 text-2xs font-extrabold bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-xl transition-all cursor-pointer select-none"
              >
                {loadingPlan === "manage" ? "Loading..." : "Manage Billing"}
              </button>
            ) : (
              <button
                onClick={() => handleChoosePlan("agency")}
                disabled={loadingPlan !== null}
                className="w-full py-2.5 text-2xs font-extrabold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all cursor-pointer shadow-md hover:shadow-lg shadow-indigo-500/10 disabled:opacity-50 select-none"
              >
                {loadingPlan === "agency" ? "Starting Checkout..." : "Choose Agency"}
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
