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
      window.location.href = `/login?plan=${plan}`
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
          <h2 className="text-2xl md:text-3xl font-black text-white mt-3.5 tracking-tight">
            Simple, Transparent Pricing
          </h2>
          <p className="text-xs text-slate-400 max-w-md mx-auto mt-2 leading-relaxed">
            Upgrade your account to unlock higher scan limits, executive compliance exports, developer APIs, and premium AI engines.
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
                <span className="text-3xl font-black text-white">$0</span>
                <span className="text-xs text-slate-500 font-semibold">/ month</span>
              </div>
              <ul className="space-y-3 text-xs text-slate-400 mb-8">
                <li className="flex items-start gap-2">
                  <span className="text-indigo-400 font-bold">✓</span> 5 automated scans / month
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-indigo-400 font-bold">✓</span> Standard AI suggestions (gpt-4o-mini)
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-slate-600 font-bold">✗</span> Dedicated scan history log
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-slate-600 font-bold">✗</span> PDF compliance report exports
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-slate-600 font-bold">✗</span> Developer API & keys
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
          <div className="glass-panel rounded-2xl p-6 flex flex-col justify-between border-indigo-500/35 relative overflow-hidden shadow-2xl scale-[1.02] md:scale-[1.03]">
            {/* Ambient Popular Accent */}
            <div className="absolute top-0 right-0 px-3 py-1 bg-indigo-600 text-white text-[9px] font-black uppercase tracking-widest rounded-bl-xl border-l border-b border-indigo-500/30">
              Popular
            </div>

            <div>
              <div className="flex justify-between items-start mb-3">
                <h3 className="text-sm font-bold text-white">Pro Plan</h3>
              </div>
              <div className="flex items-baseline gap-1 mb-5">
                <span className="text-3xl font-black text-white">$29</span>
                <span className="text-xs text-slate-500 font-semibold">/ month</span>
              </div>
              <ul className="space-y-3 text-xs text-slate-300 mb-8">
                <li className="flex items-start gap-2">
                  <span className="text-indigo-400 font-bold">✓</span> 200 automated scans / month
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-indigo-400 font-bold">✓</span> Unlimited AI-powered fixes
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-indigo-400 font-bold">✓</span> Select default engine (gpt-4o)
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-indigo-400 font-bold">✓</span> Searchable scan history
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-indigo-400 font-bold">✓</span> PDF compliance report exports
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-slate-600 font-bold">✗</span> White-label custom branding
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
                <span className="text-3xl font-black text-white">$99</span>
                <span className="text-xs text-slate-500 font-semibold">/ month</span>
              </div>
              <ul className="space-y-3 text-xs text-slate-400 mb-8">
                <li className="flex items-start gap-2">
                  <span className="text-indigo-400 font-bold">✓</span> 1,000 automated scans / month
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-indigo-400 font-bold">✓</span> Everything in Pro Plan
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-indigo-400 font-bold">✓</span> White-label custom branding
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-indigo-400 font-bold">✓</span> Team access (3 seats)
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-indigo-400 font-bold">✓</span> Full Developer API & Keys
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
                className="w-full py-2.5 text-2xs font-extrabold bg-purple-600 hover:bg-purple-500 text-white rounded-xl transition-all cursor-pointer shadow-md hover:shadow-lg shadow-purple-500/10 disabled:opacity-50 select-none"
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
