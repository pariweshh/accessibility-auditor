import Link from "next/link"
import { BrandLogo } from "@/components/brand_logo"
import { SITE } from "@/lib/site"

export const metadata = {
  title: `Page Not Found — ${SITE.name}`,
  description: "The page you are looking for does not exist or has been moved.",
}

export default function NotFound() {
  return (
    <div className="min-h-[100dvh] bg-slate-950 text-slate-100 flex flex-col justify-between relative overflow-hidden selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[450px] bg-radial from-indigo-500/10 via-transparent to-transparent pointer-events-none z-0" />
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-sky-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header */}
      <header className="w-full bg-slate-950/75 backdrop-blur-md border-b border-slate-900 py-3.5 px-6 flex justify-between items-center relative z-10">
        <Link href="/" className="flex items-center gap-2.5 group">
          <BrandLogo size={32} />
          <span className="text-xl font-bold bg-linear-to-r from-indigo-400 via-indigo-300 to-indigo-400 bg-clip-text text-transparent group-hover:from-indigo-300 transition-all duration-300 font-display">
            A11ytica Pro
          </span>
        </Link>
        <Link
          href="/"
          className="text-xs font-semibold text-slate-300 hover:text-white px-3 py-1.5 rounded-lg border border-slate-800 hover:border-slate-700 transition-all"
        >
          Console
        </Link>
      </header>

      {/* Hero 404 Notice */}
      <main id="main-content" tabIndex={-1} className="container mx-auto max-w-2xl px-6 py-20 flex-1 flex flex-col items-center justify-center text-center relative z-10 focus:outline-hidden">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold uppercase tracking-widest mb-6">
          <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
          HTTP 404 · Resource Not Located
        </div>

        <h1 className="text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-linear-to-b from-white via-slate-200 to-slate-500 tracking-tight font-display mb-4">
          404
        </h1>

        <h2 className="text-xl md:text-2xl font-bold text-slate-100 tracking-tight mb-3">
          We couldn’t find the page you were looking for
        </h2>

        <p className="text-sm text-slate-400 max-w-md mb-8 leading-relaxed">
          The requested URL may have moved, expired, or been entered incorrectly.
          Our automated accessibility audit suite is ready to inspect any live page.
        </p>

        {/* Action CTAs */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-xs sm:max-w-none justify-center">
          <Link
            href="/"
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-all shadow-lg shadow-indigo-600/20 focus:outline-hidden focus:ring-2 focus:ring-indigo-400"
          >
            Return to Audit Console
          </Link>
          <Link
            href="/dashboard"
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white font-bold text-xs border border-slate-800 transition-all focus:outline-hidden focus:ring-2 focus:ring-slate-400"
          >
            Go to Dashboard
          </Link>
        </div>

        {/* Directory links */}
        <div className="mt-12 pt-8 border-t border-slate-900/80 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400">
          <Link href="/docs" className="hover:text-slate-200 transition-colors">
            API Documentation
          </Link>
          <span>·</span>
          <Link href="/pricing" className="hover:text-slate-200 transition-colors">
            Pricing Plans
          </Link>
          <span>·</span>
          <Link href="/legal" className="hover:text-slate-200 transition-colors">
            Legal Terms & Disclaimers
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-slate-900 py-6 px-6 text-center text-xs text-slate-400 relative z-10">
        &copy; {new Date().getFullYear()} {SITE.name}. All rights reserved.
      </footer>
    </div>
  )
}
