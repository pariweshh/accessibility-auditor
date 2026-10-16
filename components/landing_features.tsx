interface FeatureItem {
  icon: React.ReactNode
  title: string
  description: string
  badge?: string
}

export default function LandingFeatures() {
  const features: FeatureItem[] = [
    {
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
      title: "Automated WCAG 2.2 AA Audits",
      description: "Trigger comprehensive DOM inspections powered by axe-core and headless Chromium. Detect color contrast failures, broken keyboard tab order, and missing ARIA semantics.",
      badge: "WCAG 2.2 AA",
    },
    {
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 21l8.904-4.113a12.002 12.002 0 01-11.182-1.378zm5.824-3.524a4.5 4.5 0 00-5.83-5.83 4.5 4.5 0 105.83 5.83z" />
        </svg>
      ),
      title: "Framework-Aware AI Remediation",
      description: "Generate drop-in accessibility fixes tailored to your exact frontend stack: React / Next.js (JSX + Tailwind), Vue 3 SFCs, Angular, or semantic HTML/CSS.",
      badge: "React · Vue · Angular",
    },
    {
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      title: "EAA 2025 & ADA Compliance Kit",
      description: "Export legally structured Accessibility Conformance Statements and embed live, dynamically verified SVG compliance badges in your website footer or README.",
      badge: "Pro & Agency",
    },
    {
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      ),
      title: "Executive PDF & POUR Matrix",
      description: "Download VPAT-style executive PDF reports featuring a 4-principle WCAG 2.2 Conformance Summary Matrix (Perceivable, Operable, Understandable, Robust). White-label ready for Agencies.",
      badge: "White-Label Ready",
    },
    {
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
      ),
      title: "Turnkey CI/CD Quality Gates",
      description: "Generate ready-to-commit GitHub Actions, GitLab CI, or Bash pipeline scripts with configurable failure thresholds to block inaccessible code before it ships.",
      badge: "CI/CD Builder",
    },
    {
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      title: "Agency Multi-Seat & Branding",
      description: "Collaborate across 3 team seats with shared scan pools, custom agency logos, brand primary colors, and white-label client verification badges.",
      badge: "Agency Tier",
    },
  ]

  return (
    <section className="mt-28 relative animate-slideUp">
      {/* Decorative orbs */}
      <div className="absolute top-[20%] right-[10%] w-80 h-80 bg-indigo-600/5 rounded-full blur-3xl pointer-events-none" />
      
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <span className="text-2xs font-extrabold uppercase tracking-widest text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 rounded-full">
            Product Capabilities
          </span>
          <h2 className="text-2xl md:text-3xl font-black text-slate-50 mt-3.5 tracking-tight font-display">
            Developer-First Accessibility Tooling
          </h2>
          <p className="text-xs text-slate-400 max-w-md mx-auto mt-2 leading-relaxed">
            Equivance combines headless browser automation, accessibility standard rulesets, and AI to help you build WCAG-compliant web apps.
          </p>
        </div>

        {/* Feature Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {features.map((feat, idx) => (
            <div
              key={idx}
              className="glass-panel p-6.5 rounded-2xl relative group overflow-hidden transition-all duration-300 hover:shadow-2xl hover:scale-[1.01] hover:border-slate-700/80 border border-slate-800/80"
            >
              {/* Hover radial background glow */}
              <div className="absolute inset-0 bg-radial from-indigo-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

              <div className="flex items-center gap-3 mb-4 flex-wrap">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-600/10 text-indigo-400 border border-indigo-500/15 group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-500 transition-all duration-350 shadow-xs">
                  {feat.icon}
                </div>
                <h3 className="text-xs md:text-sm font-bold text-slate-200 group-hover:text-slate-50 transition-colors font-display">
                  {feat.title}
                </h3>
                {feat.badge && (
                  <span className="ml-auto text-[9px] px-2 py-0.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/25 rounded-md font-extrabold uppercase tracking-widest">
                    {feat.badge}
                  </span>
                )}
              </div>
              
              <p className="text-xs text-slate-400 group-hover:text-slate-300 transition-colors leading-relaxed font-medium">
                {feat.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
