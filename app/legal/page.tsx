import Link from "next/link"
import { SITE } from "@/lib/site"
import { BrandLogo } from "@/components/brand_logo"

export const metadata = {
  title: `Legal, Terms of Service & Compliance Disclaimers — ${SITE.name}`,
  description:
    "Terms of Service, Privacy Policy, and Accessibility Compliance Disclaimers for A11ytica Pro. Understand our honest automated audit model and legal protections.",
}

export default function LegalPage() {
  return (
    <div className="min-h-[100dvh] bg-slate-950 text-slate-100 bg-grid-pattern selection:bg-indigo-500/30 selection:text-indigo-200">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[400px] bg-radial from-indigo-500/8 via-transparent to-transparent pointer-events-none z-0" />

      {/* Top Header */}
      <header>
        <nav aria-label="Legal Navigation" className="w-full bg-slate-950/75 backdrop-blur-md border-b border-slate-900 py-3.5 px-6 flex justify-between items-center fixed top-0 left-0 z-40">
          <Link href="/" className="flex items-center gap-2.5 group">
            <BrandLogo size={32} />
            <span className="text-xl font-bold bg-linear-to-r from-indigo-400 via-indigo-300 to-indigo-400 bg-clip-text text-transparent group-hover:from-indigo-300 transition-all duration-300 font-display">
              A11ytica Pro
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/docs"
              className="text-xs font-bold text-slate-300 hover:text-slate-50 px-3.5 py-2 rounded-xl transition-all"
            >
              API Docs
            </Link>
            <Link
              href="/"
              className="text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded-xl transition-all shadow-md"
            >
              Audit Console
            </Link>
          </div>
        </nav>
      </header>

      {/* Main Content */}
      <main id="main-content" tabIndex={-1} className="container mx-auto max-w-4xl pt-28 pb-20 px-4 md:px-6 relative z-10 focus:outline-none">
        <header className="mb-12 border-b border-slate-900 pb-8 space-y-3">
          <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 rounded-full">
            Legal Master Agreement
          </span>
          <h1 className="text-3xl md:text-5xl font-black text-slate-50 tracking-tight font-display">
            Terms of Service & Compliance Disclaimers
          </h1>
          <p className="text-sm text-slate-400 font-medium">
            Effective Date: October 15, 2026 · Governing Standard: WCAG 2.2 Level AA · Jurisdiction: Delaware, USA
          </p>
        </header>

        {/* Plain-English Callout */}
        <div className="glass-panel p-6 md:p-8 rounded-2xl border border-indigo-500/30 bg-slate-900/60 mb-12 space-y-4">
          <h2 className="text-base font-black text-indigo-300 uppercase tracking-wider flex items-center gap-2">
            Plain-English Executive Summary
          </h2>
          <ul className="text-xs text-slate-300 space-y-2.5 leading-relaxed font-medium">
            <li className="flex items-start gap-2">
              <span className="text-indigo-400 font-bold shrink-0">1.</span>
              <span><strong>Automated testing catches roughly 30% to 50% of WCAG criteria.</strong> No tool in the world can make a site "100% compliant" automatically. Full compliance mandates manual review by human specialists.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-indigo-400 font-bold shrink-0">2.</span>
              <span><strong>Engineering tool, not legal advice.</strong> A11ytica Pro provides automated diagnostic code reports. We do not provide legal representation or legal immunity from ADA lawsuits.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-indigo-400 font-bold shrink-0">3.</span>
              <span><strong>Review AI fixes before shipping.</strong> AI remediation suggestions are drafts. Your engineers must test all suggested code changes before pushing them to production.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-indigo-400 font-bold shrink-0">4.</span>
              <span><strong>We never sell your data.</strong> Scans, account data, and payment information are handled under strict GDPR and CCPA/CPRA privacy safeguards.</span>
            </li>
          </ul>
        </div>

        {/* Detailed Sections */}
        <article className="space-y-12 text-xs md:text-sm text-slate-300 leading-relaxed font-normal">
          <section className="space-y-4">
            <h2 className="text-xl font-black text-slate-50 tracking-tight font-display">1. Terms of Service & Acceptable Use</h2>
            <p>
              By accessing or using A11ytica Pro, you agree to be bound by these Terms. You represent and warrant that you own or possess valid authorization from the owner to submit every URL processed through our audit engine.
            </p>
            <p>
              You agree not to submit internal network IP addresses (including 127.0.0.1, localhost, and private IPv4 subnets) or attempt Server-Side Request Forgery (SSRF). You agree not to reverse engineer or tamper with subscription limits.
            </p>
          </section>

          <section className="space-y-4 border-t border-slate-900 pt-8">
            <h2 className="text-xl font-black text-rose-300 tracking-tight font-display">
              2. Accessibility Compliance & Non-Reliance Disclaimer (The Anti-Lawsuit Shield)
            </h2>
            <div className="bg-rose-500/10 border border-rose-500/30 p-5 rounded-xl space-y-3">
              <p className="text-rose-200 font-bold text-xs uppercase tracking-wider">
                Critical Regulatory Limitation Notice
              </p>
              <p className="text-slate-200 text-xs leading-relaxed">
                A11ytica Pro provides <strong>NO WARRANTY, EXPRESS OR IMPLIED</strong>, that any website, application, or digital property audited by our Service is fully compliant with WCAG 2.0/2.1/2.2, Title III of the Americans with Disabilities Act (ADA), Section 508 of the Rehabilitation Act, California's Unruh Civil Rights Act, or the European Accessibility Act (EAA).
              </p>
              <p className="text-slate-300 text-xs leading-relaxed">
                Using our Service does <strong>NOT</strong> provide legal immunity, certification of full compliance, safe harbor, or protection against demand letters, administrative complaints, or civil litigation. Comprehensive accessibility conformance requires manual testing by certified human auditors and user testing by individuals with disabilities.
              </p>
            </div>
          </section>

          <section className="space-y-4 border-t border-slate-900 pt-8">
            <h2 className="text-xl font-black text-slate-50 tracking-tight font-display">3. AI Code Remediation Disclaimer</h2>
            <p>
              Fix suggestions generated by our AI models (OpenAI GPT-4o / GPT-4o-mini) are educational recommendations. While designed to satisfy WCAG specifications, generative models can introduce syntax errors, layout shifts, or framework conflicts. You assume full responsibility for inspecting, testing, and verifying all suggested code before deployment.
            </p>
          </section>

          <section className="space-y-4 border-t border-slate-900 pt-8">
            <h2 className="text-xl font-black text-slate-50 tracking-tight font-display">4. Privacy Policy & Data Processing</h2>
            <p>
              We collect user emails, audit target URLs, scan summaries, and API key hashes. Payment information is processed directly by Stripe under PCI-DSS Level 1 compliance. We do not sell or monetize personal information. You retain the right to export your scan data and delete your account at any time, which permanently removes all associated database records.
            </p>
          </section>

          <section className="space-y-4 border-t border-slate-900 pt-8">
            <h2 className="text-xl font-black text-slate-50 tracking-tight font-display">5. Limitation of Liability & Indemnification</h2>
            <p className="font-semibold text-slate-200 uppercase tracking-wide text-2xs">
              To the maximum extent permitted by applicable law:
            </p>
            <p>
              A11ytica Pro and its operators shall not be liable for any indirect, consequential, punitive, or statutory damages, including lost profits, regulatory fines, or legal settlement costs arising from your reliance on scan reports. Our total aggregate liability is capped at the amount paid by you during the twelve (12) months preceding the claim or $100 USD, whichever is greater.
            </p>
            <p>
              You agree to indemnify and hold harmless A11ytica Pro against any third-party claims or accessibility lawsuits alleging that a digital property audited by you fails to satisfy disability rights legislation.
            </p>
          </section>

          <footer className="border-t border-slate-900 pt-8 text-slate-500 text-2xs space-y-1">
            <p>&copy; {new Date().getFullYear()} A11ytica Pro. All rights reserved.</p>
            <p>For inquiries, contact legal@a11yticapro.app or security@a11yticapro.app.</p>
          </footer>
        </article>
      </main>
    </div>
  )
}
