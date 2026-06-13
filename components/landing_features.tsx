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
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
      title: "Automated WCAG Audits",
      description: "Trigger comprehensive checks powered by axe-core and Chromium-headless. Scan for color contrast, broken keyboard tab order, missing aria tags, and structure issues.",
    },
    {
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 21l8.904-4.113a12.002 12.002 0 01-11.182-1.378zm5.824-3.524a4.5 4.5 0 00-5.83-5.83 4.5 4.5 0 105.83 5.83z" />
        </svg>
      ),
      title: "AI-Generated Fixes",
      description: "Receive exact HTML adjustments tailored to each specific code violation. Run standard gpt-4o-mini fixes or unlock premium gpt-4o support for complex components.",
      badge: "OpenAI Integrated",
    },
    {
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      ),
      title: "Export Compliance PDFs",
      description: "Export clean, professional audit reports. Demonstrate accessibility compliance to your clients, development managers, or legal team instantly.",
      badge: "Pro",
    },
    {
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
      ),
      title: "Developer API & CI/CD",
      description: "Integrate compliance testing directly into deployment flows. Generate secure cryptographical keys to automate auditing via custom API triggers.",
      badge: "Developer Ready",
    },
  ]

  return (
    <section className="mt-28 relative animate-slideUp">
      {/* Decorative orbs */}
      <div className="absolute top-[20%] right-[10%] w-80 h-80 bg-blue-600/5 rounded-full blur-3xl pointer-events-none" />
      
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <span className="text-2xs font-extrabold uppercase tracking-widest text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 rounded-full">
            Product Capabilities
          </span>
          <h2 className="text-2xl md:text-3xl font-black text-white mt-3.5 tracking-tight font-display">
            Developer-First Accessibility Tooling
          </h2>
          <p className="text-xs text-slate-400 max-w-md mx-auto mt-2 leading-relaxed">
            A11ytica Pro combines headless browser automation, accessibility standard rulesets, and AI to help you build WCAG-compliant web apps.
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

              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-600/10 text-indigo-400 border border-indigo-500/15 group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-500 transition-all duration-350 shadow-xs">
                  {feat.icon}
                </div>
                <h3 className="text-xs md:text-sm font-bold text-slate-200 group-hover:text-white transition-colors font-display">
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
