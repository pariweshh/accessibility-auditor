"use client"

import { useState } from "react"

interface FAQItem {
  question: string
  answer: string
}

export default function FAQsSection() {
  const faqs: FAQItem[] = [
    {
      question: "What standards are tested during the scans?",
      answer: "We test against the latest WCAG 2.1 & 2.2 rulesets at conformance levels A, AA, and AAA, alongside standard federal Section 508 and ADA requirements. Scans utilize axe-core compliance libraries wrapped in headless browser scripts."
    },
    {
      question: "How does the AI generate HTML accessibility fixes?",
      answer: "When a violation is detected (such as low contrast, missing alt attributes, or missing ARIA roles), our engine sends the specific context and HTML node to our secure AI agent. The AI suggests clean, compliant HTML adjustments that you can review and paste directly into your codebase."
    },
    {
      question: "Can I integrate compliance checks into my CI/CD pipeline?",
      answer: "Yes. Pro and Agency subscribers can generate secure API keys to trigger audits programmatically. We provide lightweight integration wrappers, including curl endpoints, NodeJS, Python templates, and sample configurations for GitHub Actions."
    },
    {
      question: "Is there a limit to the size of webpages scanned?",
      answer: "On the Free tier, audits have a strict 10-second processing timeout suitable for simple public pages. Upgrading to Pro or Agency unlocks dedicated server instances that handle complex, heavily dynamic Single Page Applications (SPAs) and authenticated views."
    }
  ]

  const [openIdx, setOpenIdx] = useState<number | null>(null)

  const handleToggle = (idx: number) => {
    setOpenIdx(openIdx === idx ? null : idx)
  }

  return (
    <section className="mt-28 relative animate-slideUp">
      <div className="absolute top-[20%] left-1/2 -translate-x-1/2 w-80 h-80 bg-indigo-600/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-3xl mx-auto px-4 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-12">
          <span className="text-2xs font-extrabold uppercase tracking-widest text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 rounded-full">
            Knowledge Base
          </span>
          <h2 className="text-2xl md:text-3xl font-black text-slate-50 mt-3.5 tracking-tight">
            Frequently Asked Questions
          </h2>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mt-2 leading-relaxed">
            Have questions about rulesets, AI remediation, or developer APIs? Find answers here.
          </p>
        </div>

        {/* FAQs List */}
        <div className="space-y-4">
          {faqs.map((faq, idx) => {
            const isOpen = openIdx === idx
            return (
              <div
                key={idx}
                className="bg-slate-900/30 border border-slate-850 hover:border-slate-800 rounded-2xl overflow-hidden transition-all duration-300"
              >
                <button
                  type="button"
                  id={`faq-question-${idx}`}
                  onClick={() => handleToggle(idx)}
                  aria-expanded={isOpen}
                  aria-controls={`faq-answer-${idx}`}
                  className="w-full px-5 py-4 flex items-center justify-between gap-4 text-left cursor-pointer select-none"
                >
                  <span className="text-xs font-bold text-slate-100 hover:text-slate-50 transition-colors">
                    {faq.question}
                  </span>
                  <span className="w-5 h-5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center shrink-0">
                    <svg
                      className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-300 ${
                        isOpen ? "rotate-180 text-slate-50" : ""
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                      aria-hidden="true"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </span>
                </button>

                {/* Animated collapse block */}
                <div
                  id={`faq-answer-${idx}`}
                  role="region"
                  aria-labelledby={`faq-question-${idx}`}
                  className={`transition-all duration-300 ease-in-out ${
                    isOpen ? "max-h-[200px] border-t border-slate-900" : "max-h-0"
                  } overflow-hidden`}
                >
                  <div className="p-5 text-xs text-slate-400 leading-relaxed bg-slate-950/15">
                    {faq.answer}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

      </div>
    </section>
  )
}
