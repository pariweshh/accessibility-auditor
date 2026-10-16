"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { AIFramework } from "@/lib/types"
import { useFocusTrap } from "@/hooks/use-focus-trap"

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
  user: any
  profile: any
  tier: string
}

const FRAMEWORK_OPTIONS: { id: AIFramework; label: string; desc: string; proOnly: boolean }[] = [
  {
    id: "html",
    label: "Standard HTML / CSS",
    desc: "Clean, semantic HTML5 and standard ARIA attributes.",
    proOnly: false,
  },
  {
    id: "react-tailwind",
    label: "React / Next.js (JSX + Tailwind)",
    desc: "Idiomatic JSX syntax (className, htmlFor) with Tailwind utility classes.",
    proOnly: true,
  },
  {
    id: "vue",
    label: "Vue 3 (SFC Template)",
    desc: "Vue 3 template bindings (:aria-*, @keydown) and accessible directives.",
    proOnly: true,
  },
  {
    id: "angular",
    label: "Angular / Web Components",
    desc: "Angular [attr.aria-*] bindings and custom element host semantics.",
    proOnly: true,
  },
]

export default function SettingsModal({
  isOpen,
  onClose,
  user,
  profile,
  tier,
}: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<"account" | "ai">("account")
  const [defaultAIModel, setDefaultAIModel] = useState<"gpt-4o-mini" | "gpt-4o">("gpt-4o-mini")
  const [defaultAIFramework, setDefaultAIFramework] = useState<AIFramework>("html")
  const [isRedirectingBilling, setIsRedirectingBilling] = useState(false)
  const [billingError, setBillingError] = useState<string | null>(null)

  // Account Deletion State
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState("")
  const [isDeletingAccount, setIsDeletingAccount] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const modalRef = useRef<HTMLDivElement>(null)
  const isPremiumTier = tier === "pro" || tier === "agency"

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedModel = localStorage.getItem("default_ai_model")
      if (savedModel === "gpt-4o" && isPremiumTier) {
        setDefaultAIModel("gpt-4o")
      } else {
        setDefaultAIModel("gpt-4o-mini")
      }

      const savedFramework = localStorage.getItem("default_ai_framework") as AIFramework | null
      if (
        savedFramework &&
        ["html", "react-tailwind", "vue", "angular"].includes(savedFramework) &&
        (savedFramework === "html" || isPremiumTier)
      ) {
        setDefaultAIFramework(savedFramework)
      } else {
        setDefaultAIFramework("html")
      }
    }
  }, [isPremiumTier, isOpen])

  useEffect(() => {
    if (!isOpen) {
      setShowDeleteConfirm(false)
      setDeleteConfirmText("")
      setDeleteError(null)
    }
  }, [isOpen])

  const handleAIModelChange = (model: "gpt-4o-mini" | "gpt-4o") => {
    if (model === "gpt-4o" && !isPremiumTier) {
      return
    }
    setDefaultAIModel(model)
    localStorage.setItem("default_ai_model", model)
  }

  const handleAIFrameworkChange = (framework: AIFramework) => {
    if (framework !== "html" && !isPremiumTier) {
      return
    }
    setDefaultAIFramework(framework)
    localStorage.setItem("default_ai_framework", framework)
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
      setBillingError(
        err.message || "Could not launch billing portal. Make sure you have an active Stripe subscription."
      )
    } finally {
      setIsRedirectingBilling(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "DELETE") return
    setIsDeletingAccount(true)
    setDeleteError(null)
    try {
      const res = await fetch("/api/auth/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: "DELETE" }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Failed to delete account")
      }
      window.location.href = "/"
    } catch (err: any) {
      console.error(err)
      setDeleteError(err.message || "Could not delete account. Please try again.")
      setIsDeletingAccount(false)
    }
  }

  // Accessible Escape & Focus Trap (WCAG 2.1.2 & 2.4.3)
  useFocusTrap({
    isOpen,
    onClose,
    containerRef: modalRef,
  })

  const handleTabKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault()
      const nextTab = activeTab === "account" ? "ai" : "account"
      setActiveTab(nextTab)
      const nextBtn = document.getElementById(`tab-${nextTab}`)
      nextBtn?.focus()
    } else if (e.key === "Home") {
      e.preventDefault()
      setActiveTab("account")
      document.getElementById("tab-account")?.focus()
    } else if (e.key === "End") {
      e.preventDefault()
      setActiveTab("ai")
      document.getElementById("tab-ai")?.focus()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm cursor-pointer"
        aria-hidden="true"
      />

      {/* Modal Content */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-dialog-title"
        className="relative bg-slate-900 border border-slate-800/80 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-fadeIn text-slate-100 flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex justify-between items-center px-4 sm:px-6 py-4 border-b border-slate-800/80">
          <h2 id="settings-dialog-title" className="text-base font-bold text-slate-100 flex items-center gap-2">
            <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Settings
          </h2>
          <button
            onClick={onClose}
            aria-label="Close settings dialog"
            className="text-slate-400 hover:text-slate-200 transition-colors p-2 min-w-[32px] min-h-[32px] flex items-center justify-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Navigation Tabs */}
        <div
          role="tablist"
          aria-label="Settings navigation"
          onKeyDown={handleTabKeyDown}
          className="flex border-b border-slate-800/80 px-4 sm:px-6"
        >
          <button
            role="tab"
            aria-selected={activeTab === "account"}
            aria-controls="settings-tab-account"
            id="tab-account"
            tabIndex={activeTab === "account" ? 0 : -1}
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
            role="tab"
            aria-selected={activeTab === "ai"}
            aria-controls="settings-tab-ai"
            id="tab-ai"
            tabIndex={activeTab === "ai" ? 0 : -1}
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
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
          {activeTab === "account" && (
            <div id="settings-tab-account" role="tabpanel" aria-labelledby="tab-account" className="space-y-5">
              {/* Profile details */}
              <div className="space-y-4 bg-slate-950/40 border border-slate-800/50 p-4 rounded-xl">
                <div>
                  <span className="text-3xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Email Address
                  </span>
                  <span className="text-sm font-medium text-slate-200">
                    {user?.email}
                  </span>
                </div>
                <div className="pt-3 border-t border-slate-850">
                  <span className="text-3xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Subscription Tier
                  </span>
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className={`px-2 py-0.5 text-3xs font-extrabold uppercase tracking-wider border rounded-md ${
                        tier === "agency"
                          ? "bg-indigo-500/10 text-indigo-300 border-indigo-500/20"
                          : tier === "pro"
                          ? "bg-indigo-500/10 text-indigo-300 border-indigo-500/20"
                          : "bg-slate-500/10 text-slate-400 border-slate-500/20"
                      }`}
                    >
                      {tier} plan
                    </span>
                  </div>
                </div>
              </div>

              {/* Billing Actions */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-300">Billing & Subscription Management</h3>
                <p className="text-2xs text-slate-400 leading-normal">
                  Update billing information, modify your tier plan, download invoices, or cancel subscriptions through Stripe&apos;s customer portal.
                </p>

                {billingError && (
                  <p role="alert" className="text-2xs text-rose-400 bg-rose-500/5 border border-rose-500/15 p-2.5 rounded-lg leading-normal flex items-center gap-2">
                    <svg className="w-4 h-4 shrink-0 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span>{billingError}</span>
                  </p>
                )}

                {isPremiumTier ? (
                  <button
                    onClick={handleManageBilling}
                    disabled={isRedirectingBilling}
                    className="w-full inline-flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 py-2.5 px-4 rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed text-xs cursor-pointer shadow-md"
                  >
                    <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                    {isRedirectingBilling ? "Redirecting to Stripe..." : "Open Stripe Customer Portal"}
                  </button>
                ) : (
                  <div className="p-4 bg-indigo-950/20 border border-indigo-500/15 rounded-xl flex flex-col gap-2.5">
                    <p className="text-2xs text-indigo-300/90 leading-normal font-medium">
                      Unlock full scan history, CI/CD API integration keys, and downloadable PDF compliance reports by upgrading your account.
                    </p>
                    <Link
                      href="/#pricing"
                      onClick={onClose}
                      className="inline-block text-center bg-indigo-600 hover:bg-indigo-500 text-white py-2 px-4 rounded-xl text-xs font-bold transition-all"
                    >
                      Upgrade Plan
                    </Link>
                  </div>
                )}
              </div>

              {/* Danger Zone: GDPR / CCPA Right to Erasure */}
              <div className="pt-4 border-t border-slate-800/80 space-y-3">
                <h3 className="text-xs font-bold text-rose-400">Danger Zone & Data Privacy</h3>
                <p className="text-2xs text-slate-400 leading-normal">
                  Permanently delete your account, active subscriptions, API keys, and all stored accessibility scan records in accordance with GDPR and CCPA data erasure rights.
                </p>

                {!showDeleteConfirm ? (
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="text-2xs font-bold text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/15 border border-rose-500/20 px-3.5 py-2 rounded-xl transition-all cursor-pointer"
                  >
                    Delete Account & All Data
                  </button>
                ) : (
                  <div className="p-3.5 bg-rose-950/25 border border-rose-500/30 rounded-xl space-y-3">
                    <label htmlFor="delete-account-confirm-input" className="block text-2xs text-slate-300 font-medium">
                      Type <code className="font-mono font-bold text-rose-300">DELETE</code> below to confirm permanent account erasure:
                    </label>
                    <input
                      id="delete-account-confirm-input"
                      type="text"
                      value={deleteConfirmText}
                      onChange={(e) => setDeleteConfirmText(e.target.value)}
                      placeholder="Type DELETE"
                      className="w-full px-3 py-2 text-xs font-mono bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500"
                    />
                    {deleteError && (
                      <p role="alert" className="text-2xs text-rose-400">
                        {deleteError}
                      </p>
                    )}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleDeleteAccount}
                        disabled={deleteConfirmText !== "DELETE" || isDeletingAccount}
                        className="bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-2xs font-bold px-3.5 py-2 rounded-lg transition-all cursor-pointer"
                      >
                        {isDeletingAccount ? "Deleting Account..." : "Permanently Delete Account"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowDeleteConfirm(false)
                          setDeleteConfirmText("")
                          setDeleteError(null)
                        }}
                        className="text-slate-400 hover:text-slate-200 text-2xs font-semibold px-3 py-2 rounded-lg transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "ai" && (
            <div id="settings-tab-ai" role="tabpanel" aria-labelledby="tab-ai" className="space-y-4">
              <h3 className="text-xs font-bold text-slate-300">Default AI Model</h3>
              <p className="text-2xs text-slate-400 leading-normal">
                Choose the default AI model used to generate WCAG fix recommendations. Standard users are limited to gpt-4o-mini.
              </p>

              <div role="radiogroup" aria-label="Default AI Model" className="space-y-3 mt-3">
                {/* Standard option */}
                <div
                  role="radio"
                  aria-checked={defaultAIModel === "gpt-4o-mini"}
                  tabIndex={0}
                  onClick={() => handleAIModelChange("gpt-4o-mini")}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault()
                      handleAIModelChange("gpt-4o-mini")
                    }
                  }}
                  className={`flex items-start gap-3 p-3.5 border rounded-xl cursor-pointer transition-all focus:outline-hidden focus:ring-2 focus:ring-indigo-500/50 ${
                    defaultAIModel === "gpt-4o-mini"
                      ? "bg-slate-950 border-indigo-500/50"
                      : "bg-slate-950/30 border-slate-800 hover:border-slate-700"
                  }`}
                >
                  <div className="pt-0.5">
                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        defaultAIModel === "gpt-4o-mini" ? "border-indigo-500" : "border-slate-600"
                      }`}
                    >
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
                  role="radio"
                  aria-checked={defaultAIModel === "gpt-4o"}
                  aria-disabled={!isPremiumTier}
                  tabIndex={isPremiumTier ? 0 : -1}
                  onClick={() => isPremiumTier && handleAIModelChange("gpt-4o")}
                  onKeyDown={(e) => {
                    if (isPremiumTier && (e.key === "Enter" || e.key === " ")) {
                      e.preventDefault()
                      handleAIModelChange("gpt-4o")
                    }
                  }}
                  className={`flex items-start gap-3 p-3.5 border rounded-xl transition-all focus:outline-hidden focus:ring-2 focus:ring-indigo-500/50 ${
                    !isPremiumTier
                      ? "opacity-50 cursor-not-allowed bg-slate-950/10 border-slate-900"
                      : defaultAIModel === "gpt-4o"
                      ? "bg-slate-950 border-indigo-500/50 cursor-pointer"
                      : "bg-slate-950/30 border-slate-800 hover:border-slate-700 cursor-pointer"
                  }`}
                >
                  <div className="pt-0.5">
                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        defaultAIModel === "gpt-4o" ? "border-indigo-500" : "border-slate-600"
                      }`}
                    >
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

              <div className="pt-4 border-t border-slate-800/80 space-y-3">
                <div>
                  <h3 className="text-xs font-bold text-slate-300">Default Code Framework</h3>
                  <p className="text-2xs text-slate-400 leading-normal mt-0.5">
                    Generate drop-in remediation code tailored to your frontend stack. You can also override this per issue.
                  </p>
                </div>

                <div role="radiogroup" aria-label="Default Code Framework" className="grid grid-cols-1 gap-2.5">
                  {FRAMEWORK_OPTIONS.map((fw) => {
                    const isLocked = fw.proOnly && !isPremiumTier
                    const isSelected = defaultAIFramework === fw.id
                    return (
                      <div
                        key={fw.id}
                        role="radio"
                        aria-checked={isSelected}
                        aria-disabled={isLocked}
                        tabIndex={isLocked ? -1 : 0}
                        onClick={() => !isLocked && handleAIFrameworkChange(fw.id)}
                        onKeyDown={(e) => {
                          if (!isLocked && (e.key === "Enter" || e.key === " ")) {
                            e.preventDefault()
                            handleAIFrameworkChange(fw.id)
                          }
                        }}
                        className={`flex items-start gap-3 p-3 border rounded-xl transition-all focus:outline-hidden focus:ring-2 focus:ring-indigo-500/50 ${
                          isLocked
                            ? "opacity-50 cursor-not-allowed bg-slate-950/10 border-slate-900"
                            : isSelected
                            ? "bg-slate-950 border-indigo-500/50 cursor-pointer"
                            : "bg-slate-950/30 border-slate-800 hover:border-slate-700 cursor-pointer"
                        }`}
                      >
                        <div className="pt-0.5">
                          <div
                            className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                              isSelected ? "border-indigo-500" : "border-slate-600"
                            }`}
                          >
                            {isSelected && <div className="w-2 h-2 rounded-full bg-indigo-500" />}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h4 className="text-xs font-bold text-slate-200">{fw.label}</h4>
                            {fw.proOnly && !isPremiumTier && (
                              <span className="text-3xs px-1.5 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/25 rounded-md font-extrabold uppercase tracking-wide">
                                Pro
                              </span>
                            )}
                          </div>
                          <p className="text-2xs text-slate-400 mt-0.5 leading-normal">{fw.desc}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-4 border-t border-slate-800/80 flex justify-end">
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

