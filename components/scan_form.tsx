"use client"

import { useState } from "react"

interface ScanFormProps {
  onScanStarted: (scanId: string, url: string) => void
  user?: any
  profile?: any
  scansUsed?: number
  scansLimit?: number
  onUpgradeClick?: () => void
}

export default function ScanForm({
  onScanStarted,
  user,
  profile,
  scansUsed = 0,
  scansLimit = 5,
  onUpgradeClick,
}: ScanFormProps) {
  const [url, setUrl] = useState("")
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState("")

  const tier = profile?.subscription_tier ?? "free"
  const isLoggedIn = !!user
  const isQuotaExceeded = isLoggedIn && scansUsed >= scansLimit
  const usagePercent = isLoggedIn ? Math.min((scansUsed / scansLimit) * 100, 100) : 0
  const isNearLimit = isLoggedIn && usagePercent >= 80

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsScanning(true)

    try {
      const response = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        if (response.status === 429) {
          setError(errorData.message || "Monthly scan limit reached. Please upgrade your plan.")
          return
        }
        throw new Error(errorData.error || "Failed to scan URL")
      }

      // 202 Accepted — scan is queued, we get back a scanId
      const { scanId } = await response.json()
      onScanStarted(scanId, url)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsScanning(false)
    }
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="relative bg-slate-900/40 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 md:p-8 shadow-2xl overflow-hidden">
        {/* Glow effect */}
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
          <div>
            <label
              htmlFor="url"
              className="block text-sm font-semibold text-slate-300 mb-2"
            >
              Website URL
            </label>
            <input
              type="url"
              id="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              required
              disabled={isScanning || isQuotaExceeded}
              className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-3.5 text-sm text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 disabled:bg-slate-950/30 disabled:text-slate-600 disabled:cursor-not-allowed transition-all duration-200"
            />
          </div>

          {/* Usage Bar (logged-in users only) */}
          {isLoggedIn ? (
            <div className={`p-4 rounded-xl border transition-colors ${
              isQuotaExceeded
                ? "bg-rose-500/5 border-rose-500/20"
                : isNearLimit
                ? "bg-amber-500/5 border-amber-500/15"
                : "bg-slate-800/30 border-slate-700/40"
            }`}>
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-medium text-slate-400">
                  Monthly scans
                </span>
                <span className={`text-xs font-bold tabular-nums ${
                  isQuotaExceeded ? "text-rose-400" : isNearLimit ? "text-amber-400" : "text-slate-300"
                }`}>
                  {scansUsed} / {scansLimit}
                </span>
              </div>
              {/* Progress bar */}
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isQuotaExceeded
                      ? "bg-rose-500"
                      : isNearLimit
                      ? "bg-amber-500"
                      : "bg-indigo-500"
                  }`}
                  style={{ width: `${usagePercent}%` }}
                />
              </div>
              {isQuotaExceeded ? (
                <p className="text-xs text-rose-400 mt-2">
                  You've used all your scans this month.{" "}
                  <button
                    type="button"
                    onClick={onUpgradeClick}
                    className="underline underline-offset-2 font-semibold hover:text-rose-300 transition-colors cursor-pointer"
                  >
                    Upgrade your plan
                  </button>{" "}
                  to continue scanning.
                </p>
              ) : isNearLimit ? (
                <p className="text-xs text-amber-400 mt-2">
                  Running low on scans.{" "}
                  <button
                    type="button"
                    onClick={onUpgradeClick}
                    className="underline underline-offset-2 font-semibold hover:text-amber-300 transition-colors cursor-pointer"
                  >
                    Upgrade
                  </button>{" "}
                  for more.
                </p>
              ) : (
                <p className="text-xs text-slate-500 mt-1.5 capitalize">
                  {tier} plan · resets on the 1st of each month
                </p>
              )}
            </div>
          ) : (
            /* Anonymous user — static warning */
            <div className="p-4 bg-amber-500/5 border border-amber-500/15 rounded-xl flex items-start gap-2.5">
              <span className="text-sm mt-0.5">⚠️</span>
              <p className="text-xs text-amber-300 leading-relaxed">
                <strong>Free tier:</strong> Scans timeout after 10 seconds.{" "}
                <a href="#" className="underline underline-offset-2 font-semibold hover:text-amber-200">
                  Sign in
                </a>{" "}
                for tracked history and more scans.
              </p>
            </div>
          )}

          {error && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/15 rounded-xl flex items-start gap-2.5">
              <span className="text-sm">❌</span>
              <p className="text-xs text-rose-300 leading-relaxed">{error}</p>
            </div>
          )}

          {isQuotaExceeded ? (
            <button
              type="button"
              onClick={onUpgradeClick}
              className="w-full py-3.5 px-6 rounded-xl font-semibold text-sm bg-linear-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 transition-all duration-200 shadow-md hover:shadow-lg hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
            >
              🚀 Upgrade to Keep Scanning
            </button>
          ) : (
            <button
              type="submit"
              disabled={isScanning}
              className="w-full relative overflow-hidden group bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold py-3.5 px-6 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer text-sm"
            >
              {isScanning ? (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="animate-spin h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Analyzing Webpage...
                </span>
              ) : (
                "Scan for Accessibility Issues"
              )}
            </button>
          )}
        </form>
      </div>

      {isScanning && (
        <div className="mt-6 p-5 bg-slate-900/30 border border-slate-800/80 rounded-xl flex items-center gap-4">
          <div className="flex h-3 w-3 relative shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
          </div>
          <p className="text-xs text-indigo-300">
            Opening headless browser and compiling axe-core rules... This may take up to 30 seconds.
          </p>
        </div>
      )}
    </div>
  )
}
