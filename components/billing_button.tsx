"use client";

import { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { createPortal } from "react-dom";

export interface BillingButtonHandle {
  openModal: () => void;
}

interface BillingButtonProps {
  user: any;
  profile: any;
}

const BillingButton = forwardRef<BillingButtonHandle, BillingButtonProps>(
  function BillingButton({ user, profile }, ref) {
  const [isLoading, setIsLoading] = useState(false);
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useImperativeHandle(ref, () => ({
    openModal: () => setShowPricingModal(true),
  }));

  const handleCheckout = async (plan: string) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to start checkout");
      }

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error("Checkout redirect error:", error);
      alert(
        error instanceof Error ? error.message : "Error initiating checkout",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleManageBilling = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/billing/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to open billing portal");
      }

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error("Billing portal error:", error);
      alert(
        error instanceof Error ? error.message : "Error opening billing portal",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const isPremium =
    profile?.subscription_tier === "pro" ||
    profile?.subscription_tier === "agency";

  if (!user) {
    return (
      <button
        onClick={() => {
          window.location.href = "/login";
        }}
        className="px-4 py-2 text-xs font-semibold bg-linear-to-r from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 text-white rounded-lg transition-all duration-200 shadow-md cursor-pointer select-none"
      >
        Sign In
      </button>
    );
  }

  return (
    <div className="relative inline-flex items-center gap-3">
      {/* Current Tier Badge */}
      <span
        className={`px-2.5 py-1 text-xs font-bold rounded-full border tracking-wide ${
          profile?.subscription_tier === "agency"
            ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
            : profile?.subscription_tier === "pro"
              ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
              : "bg-slate-800/60 text-slate-400 border-slate-700/60"
        }`}
      >
        {profile?.subscription_tier?.toUpperCase() || "FREE"}
      </span>

      {isPremium ? (
        <button
          onClick={handleManageBilling}
          disabled={isLoading}
          className="px-4 py-2 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 rounded-lg transition-all duration-200 disabled:opacity-50 cursor-pointer select-none"
        >
          {isLoading ? "Loading..." : "Manage Billing"}
        </button>
      ) : (
        <button
          onClick={() => setShowPricingModal(true)}
          className="px-4 py-2 text-xs font-semibold bg-linear-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg hover:scale-105 active:scale-95 cursor-pointer font-bold select-none"
        >
          Upgrade Plan
        </button>
      )}

      {/* Pricing Modal rendered via Portal to escape relative/inline-flex parent */}
      {mounted && showPricingModal && typeof document !== 'undefined' && createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, overflowY: 'auto', backgroundColor: 'rgba(2,6,23,0.85)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
          {/* Flex centering container using viewport height */}
          <div className="min-h-screen flex items-center justify-center p-4 md:p-6">
            <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800/80 rounded-2xl p-6 md:p-8 shadow-2xl overflow-hidden my-8">
              {/* Top ambient glow */}
              <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-80 h-80 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none"></div>

              {/* Close Button */}
              <button
                onClick={() => setShowPricingModal(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-50 transition-colors p-1 rounded-md hover:bg-white/5 cursor-pointer z-10 text-sm"
              >
                ✕
              </button>

              <div className="text-center mb-8 relative z-10">
                <h3 className="text-2xl font-black bg-linear-to-r from-white to-slate-300 bg-clip-text text-transparent mb-2">
                  Upgrade to A11ytica Pro
                </h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Unlock detailed scan history, multi-page crawling, and PDF
                  compliance reports.
                </p>
              </div>

              {/* Plans Grid */}
              <div className="grid md:grid-cols-2 gap-6 relative z-10">
                {/* Pro Plan */}
                <div className="bg-slate-950/60 border border-indigo-500/30 rounded-xl p-5 flex flex-col justify-between hover:border-indigo-500/60 transition-colors shadow-xl">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="text-base font-bold text-slate-50">
                        Pro Plan
                      </h4>
                      <span className="px-2 py-0.5 text-2xs bg-indigo-500/10 text-indigo-400 border border-indigo-500/25 font-bold rounded-full font-mono uppercase">
                        Popular
                      </span>
                    </div>
                    <div className="flex items-baseline gap-1 mb-4">
                      <span className="text-3xl font-black text-slate-50">
                        $19
                      </span>
                      <span className="text-xs text-slate-500 font-medium">
                        / month
                      </span>
                    </div>
                    <ul className="space-y-2.5 text-xs text-slate-300 mb-6">
                      <li className="flex items-start gap-2">
                        <span className="text-emerald-400 font-bold">✓</span>{" "}
                        150 site scans / month
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-emerald-400 font-bold">✓</span>{" "}
                        Unlimited AI-powered fixes
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-emerald-400 font-bold">✓</span>{" "}
                        Searchable scan history
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-emerald-400 font-bold">✓</span>{" "}
                        PDF report downloads
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-emerald-400 font-bold">✓</span>{" "}
                        Full Developer API & CI/CD Keys
                      </li>
                    </ul>
                  </div>
                  <button
                    onClick={() => handleCheckout("pro")}
                    disabled={isLoading}
                    className="w-full py-2.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-all duration-200 disabled:opacity-50 cursor-pointer shadow-md shadow-indigo-500/10 hover:shadow-indigo-500/20"
                  >
                    {isLoading ? "Starting checkout..." : "Choose Pro"}
                  </button>
                </div>

                {/* Agency Plan */}
                <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-5 flex flex-col justify-between hover:border-indigo-500/40 transition-colors shadow-xl">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="text-base font-bold text-slate-50">
                        Agency Plan
                      </h4>
                    </div>
                    <div className="flex items-baseline gap-1 mb-4">
                      <span className="text-3xl font-black text-slate-50">
                        $59
                      </span>
                      <span className="text-xs text-slate-500 font-medium">
                        / month
                      </span>
                    </div>
                    <ul className="space-y-2.5 text-xs text-slate-300 mb-6">
                      <li className="flex items-start gap-2">
                        <span className="text-emerald-400 font-bold">✓</span>{" "}
                        600 site scans / month
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-emerald-400 font-bold">✓</span>{" "}
                        Everything in Pro Plan
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-emerald-400 font-bold">✓</span>{" "}
                        White-label custom branding
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-emerald-400 font-bold">✓</span>{" "}
                        Team access (3 seats)
                      </li>
                    </ul>
                  </div>
                  <button
                    onClick={() => handleCheckout("agency")}
                    disabled={isLoading}
                    className="w-full py-2.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-all duration-200 disabled:opacity-50 cursor-pointer shadow-md shadow-indigo-500/10 hover:shadow-indigo-500/20"
                  >
                    {isLoading ? "Starting checkout..." : "Choose Agency"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      , document.body)}
    </div>
  );
  }
);

export default BillingButton;
