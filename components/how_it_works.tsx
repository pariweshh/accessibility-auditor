"use client"

export default function HowItWorks() {
  const steps = [
    {
      num: "01",
      title: "Crawl & Scan",
      desc: "Our headless Chromium fleet crawls your target website, running comprehensive axe-core assertions across dynamic states and interactive interfaces.",
      badge: "Chromium Engine"
    },
    {
      num: "02",
      title: "Classify & Flag",
      desc: "Violations are catalogued based on severity levels (Critical, Serious, Moderate) and specific WCAG standard rulesets (A, AA, AAA).",
      badge: "WCAG 2.2 Standard"
    },
    {
      num: "03",
      title: "AI Auto-Fix",
      desc: "Our integrated AI engine analyzes code context, generating precise, drop-in HTML adjustments to remediate violations instantly.",
      badge: "AI-Powered"
    }
  ]

  return (
    <section className="mt-28 relative animate-slideUp">
      {/* Background gradients */}
      <div className="absolute top-1/2 left-1/4 w-72 h-72 bg-indigo-600/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-72 h-72 bg-indigo-600/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-5xl mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-16">
          <span className="text-2xs font-extrabold uppercase tracking-widest text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 rounded-full">
            Operation Flow
          </span>
          <h2 className="text-2xl md:text-3xl font-black text-slate-50 mt-3.5 tracking-tight">
            How A11ytica Pro Works
          </h2>
          <p className="text-xs text-slate-400 max-w-md mx-auto mt-2 leading-relaxed">
            A three-step continuous compliance pipeline designed for modern development and engineering cycles.
          </p>
        </div>

        {/* Steps Grid */}
        <div className="grid md:grid-cols-3 gap-8 relative">
          
          {/* Connector Line (Desktop only) */}
          <div className="hidden md:block absolute top-[44px] left-[15%] right-[15%] h-[1px] bg-gradient-to-r from-indigo-500/15 via-indigo-500/30 to-indigo-500/15 z-0" />

          {steps.map((step, idx) => (
            <div key={idx} className="relative z-10 space-y-4 text-center md:text-left group">
              {/* Step indicator node */}
              <div className="flex justify-center md:justify-start items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 font-black text-xs flex items-center justify-center relative shadow-md group-hover:border-indigo-500/50 group-hover:text-slate-50 transition-all duration-300">
                  {/* Glowing halo behind active node */}
                  <div className="absolute inset-0 rounded-xl bg-indigo-500/10 opacity-0 group-hover:opacity-100 blur-xs transition-opacity duration-300" />
                  <span className="relative z-10 font-mono">{step.num}</span>
                </div>
                
                <span className="text-3xs px-2 py-0.5 bg-slate-900 border border-slate-800 text-slate-400 font-extrabold uppercase tracking-widest rounded-md">
                  {step.badge}
                </span>
              </div>

              {/* Title & Description */}
              <div className="space-y-2.5 bg-slate-900/10 border border-slate-900 hover:border-slate-800/80 p-5 rounded-2xl transition-all duration-300 hover:bg-slate-900/30">
                <h3 className="text-sm font-bold text-slate-50 flex items-center justify-center md:justify-start gap-2">
                  {step.title}
                </h3>
                <p className="text-xs text-slate-400 group-hover:text-slate-300 transition-colors leading-relaxed">
                  {step.desc}
                </p>
              </div>
            </div>
          ))}

        </div>
      </div>
    </section>
  )
}
