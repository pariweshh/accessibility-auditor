"use client"

import { useState, useEffect } from "react"

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
  user: any
  profile: any
  tier: string
}

export default function SettingsModal({
  isOpen,
  onClose,
  user,
  profile,
  tier,
}: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<"account" | "ai">("account")
  const [defaultAIModel, setDefaultAIModel] = useState<"gpt-4o-mini" | "gpt-4o">("gpt-4o-mini")
  const [isRedirectingBilling, setIsRedirectingBilling] = useState(false)
  const [billingError, setBillingError] = useState<string | null>(null)

  const isPremiumTier = tier === "pro" || tier === "agency"

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedModel = localStorage.getItem("default_ai_model")
      if (savedModel === "gpt-4o" && isPremiumTier) {
        setDefaultAIModel("gpt-4o")
      } else {
        setDefaultAIModel("gpt-4o-mini")
      }
    }
  }, [isPremiumTier, isOpen])

  const handleAIModelChange = (model: "gpt-4o-mini" | "gpt-4o") => {
    if (model === "gpt-4o" && !isPremiumTier) {
      return
    }
    setDefaultAIModel(model)
    localStorage.setItem("default_ai_model", model)
  }

  const handleManageBilling = async () => {
    setIsRedirectingBilling(true)
    setBillingError(null)
    try {
      const res = await fetch("/api/billing/portal", {
        method: "POST",
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Failed to launch billing portal")
      }
      if (data.url) {
        window.location.href = data.url
      } else {
        throw new Error("No URL returned from billing portal")
      }
    } catch (err: any) {
      console.error(err)
      setBillingError(err.message || "Could not launch billing portal. Make sure you have an active Stripe subscription.")
    } finally {
      setIsRedirectingBilling(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm cursor-pointer"
      />

      {/* Modal Content */}
      <div className="relative bg-slate-900 border border-slate-800/80 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-fadeIn text-slate-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-800/80">
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-1.5">
            <span>⚙️</span> Settings
          </h2>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 transition-colors p-1 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800/80 px-6">
          <button
            onClick={() => setActiveTab("account")}
            className={`py-3 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === "account" 
                ? "border-indigo-500 text-slate-100" 
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            Account & Plan
          </button>
          <button
            onClick={() => setActiveTab("ai")}
            className={`py-3 px-6 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === "ai" 
                ? "border-indigo-500 text-slate-100" 
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            AI Engine
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {activeTab === "account" && (
            <div className="space-y-5">
              {/* Profile details */}
              <div className="space-y-4 bg-slate-950/40 border border-slate-800/50 p-4 rounded-xl">
                <div>
                  <span className="text-3xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Email Address
                  </span>
                  <span className="text-sm font-medium text-slate-200">
                    {user?.email}
                  </span>
                </div>
                <div className="pt-3 border-t border-slate-850">
                  <span className="text-3xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Subscription Tier
                  </span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`px-2 py-0.5 text-3xs font-extrabold uppercase tracking-wider border rounded-md ${
                      tier === "agency" 
                        ? "bg-purple-500/10 text-purple-300 border-purple-500/20"
                        : tier === "pro"
                        ? "bg-indigo-500/10 text-indigo-300 border-indigo-500/20"
                        : "bg-slate-500/10 text-slate-400 border-slate-500/20"
                    }`}>
                      {tier} plan
                    </span>
                  </div>
                </div>
              </div>

              {/* Billing Actions */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-300">Billing & Subscription Management</h3>
                <p className="text-2xs text-slate-400 leading-normal">
                  Update billing information, modify your tier plan, download invoices, or cancel subscriptions through Stripe's customer portal.
                </p>
                
                {billingError && (
                  <p className="text-2xs text-rose-400 bg-rose-500/5 border border-rose-500/15 p-2.5 rounded-lg leading-normal">
                    ⚠️ {billingError}
                  </p>
                )}

                {isPremiumTier ? (
                  <button
                    onClick={handleManageBilling}
                    disabled={isRedirectingBilling}
                    className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 py-2.5 px-4 rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed text-xs cursor-pointer shadow-md"
                  >
                    {isRedirectingBilling ? "Redirecting to Stripe..." : "💳 Open Stripe Customer Portal"}
                  </button>
                ) : (
                  <div className="p-4 bg-indigo-950/20 border border-indigo-500/15 rounded-xl flex flex-col gap-2.5">
                    <p className="text-2xs text-indigo-300/90 leading-normal font-medium">
                      🚀 Unlock scan history, API integration keys, and custom downloadable PDF reports by upgrading your account.
                    </p>
                    <a
                      href="/#pricing"
                      onClick={onClose}
                      className="inline-block text-center bg-indigo-600 hover:bg-indigo-500 text-white py-2 px-4 rounded-xl text-xs font-bold transition-all"
                    >
                      Upgrade Plan
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "ai" && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-300">Default AI Model</h3>
              <p className="text-2xs text-slate-400 leading-normal">
                Choose the default AI model used to generate WCAG fix recommendations. Standard users are limited to gpt-4o-mini.
              </p>

              <div className="space-y-3 mt-3">
                {/* Standard option */}
                <div 
                  onClick={() => handleAIModelChange("gpt-4o-mini")}
                  className={`flex items-start gap-3 p-3.5 border rounded-xl cursor-pointer transition-all ${
                    defaultAIModel === "gpt-4o-mini"
                      ? "bg-slate-950 border-indigo-500/50"
                      : "bg-slate-950/30 border-slate-800 hover:border-slate-700"
                  }`}
                >
                  <div className="pt-0.5">
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                      defaultAIModel === "gpt-4o-mini" ? "border-indigo-500" : "border-slate-600"
                    }`}>
                      {defaultAIModel === "gpt-4o-mini" && (
                        <div className="w-2 h-2 rounded-full bg-indigo-500" />
                      )}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-200">gpt-4o-mini (Standard)</h4>
                    <p className="text-2xs text-slate-400 mt-1 leading-normal">
                      Ultra-fast and cost-effective. Excellent for standard HTML structure and CSS style violations.
                    </p>
                  </div>
                </div>

                {/* Premium option */}
                <div 
                  onClick={() => isPremiumTier && handleAIModelChange("gpt-4o")}
                  className={`flex items-start gap-3 p-3.5 border rounded-xl transition-all ${
                    !isPremiumTier 
                      ? "opacity-50 cursor-not-allowed bg-slate-950/10 border-slate-900" 
                      : defaultAIModel === "gpt-4o"
                      ? "bg-slate-950 border-indigo-500/50 cursor-pointer"
                      : "bg-slate-950/30 border-slate-800 hover:border-slate-700 cursor-pointer"
                  }`}
                >
                  <div className="pt-0.5">
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                      defaultAIModel === "gpt-4o" ? "border-indigo-500" : "border-slate-600"
                    }`}>
                      {defaultAIModel === "gpt-4o" && (
                        <div className="w-2 h-2 rounded-full bg-indigo-500" />
                      )}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-xs font-bold text-slate-200">gpt-4o (Premium)</h4>
                      {!isPremiumTier && (
                        <span className="text-3xs px-1.5 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/25 rounded-md font-extrabold uppercase tracking-wide">
                          Pro
                        </span>
                      )}
                    </div>
                    <p className="text-2xs text-slate-400 mt-1 leading-normal">
                      Premium engine. Best for complex accessibility violations, dynamic React/Vue code, and nested shadow DOM elements.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800/80 flex justify-end">
          <button
            onClick={onClose}
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-5 py-2 rounded-xl transition-all cursor-pointer"
          >
            Close Settings
          </button>
        </div>
      </div>
    </div>
  )
}
