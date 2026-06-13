"use client"

import { useState } from "react"
import Link from "next/link"

interface CodeExample {
  lang: string
  label: string
  code: string
}

const SCAN_EXAMPLES: CodeExample[] = [
  {
    lang: "curl",
    label: "cURL",
    code: `curl -X POST https://a11ytica-pro.vercel.app/api/scan \\\n  -H "Content-Type: application/json" \\\n  -H "x-api-key: aud_live_xxxxxxxxxxxxxxxxxxxxxxxx" \\\n  -d '{"url":"https://example.com"}'`,
  },
  {
    lang: "javascript",
    label: "JavaScript",
    code: `const response = await fetch("https://a11ytica-pro.vercel.app/api/scan", {\n  method: "POST",\n  headers: {\n    "Content-Type": "application/json",\n    "x-api-key": "aud_live_xxxxxxxxxxxxxxxxxxxxxxxx"\n  },\n  body: JSON.stringify({\n    url: "https://example.com"\n  })\n});\n\nconst data = await response.json();\nconsole.log("Scan Queued. ID:", data.scanId);`,
  },
  {
    lang: "python",
    label: "Python",
    code: `import requests\n\nurl = "https://a11ytica-pro.vercel.app/api/scan"\nheaders = {\n    "Content-Type": "application/json",\n    "x-api-key": "aud_live_xxxxxxxxxxxxxxxxxxxxxxxx"\n}\ndata = {\n    "url": "https://example.com"\n}\n\nresponse = requests.post(url, headers=headers, json=data)\nprint("Scan Queued. ID:", response.json().get("scanId"))`,
  },
]

const FIX_EXAMPLES: CodeExample[] = [
  {
    lang: "javascript",
    label: "JavaScript",
    code: `const response = await fetch("https://a11ytica-pro.vercel.app/api/fix-suggestions", {\n  method: "POST",\n  headers: {\n    "Content-Type": "application/json",\n    "Authorization": "Bearer YOUR_SUPABASE_ACCESS_TOKEN"\n  },\n  body: JSON.stringify({\n    issues: [\n      {\n        id: "image-alt",\n        impact: "critical",\n        description: "Ensures images have alt text",\n        help: "Images must have alternate text",\n        tags: ["wcag2a"],\n        nodes: [\n          { html: '<img src=\"logo.png\">', target: ['img'], failureSummary: 'No alt attribute' }\n        ]\n      }\n    ],\n    limit: 1,\n    model: "gpt-4o-mini"\n  })\n});\n\nconst data = await response.json();\nconsole.log(data.fixes);`,
  },
]

export default function DocsPage() {
  const [scanTab, setScanTab] = useState("curl")
  const [copiedText, setCopiedText] = useState<string | null>(null)

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedText(id)
    setTimeout(() => setCopiedText(null), 2000)
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 bg-grid-pattern">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[400px] bg-radial from-indigo-500/8 via-transparent to-transparent pointer-events-none z-0" />

      {/* Navbar */}
      <nav className="w-full bg-slate-950/75 backdrop-blur-md border-b border-slate-900 py-3.5 px-6 flex justify-between items-center fixed top-0 left-0 z-40">
        <Link href="/" className="flex items-center gap-2.5 group">
          <img src="/logo.png" alt="A11ytica Pro Logo" className="w-8 h-8 object-contain rounded-lg border border-white/10" />
          <span className="text-xl font-bold bg-linear-to-r from-blue-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent group-hover:from-blue-300 group-hover:to-purple-300 transition-all duration-300">
            A11ytica Pro
          </span>
        </Link>
        <div className="flex gap-4">
          <Link
            href="/dashboard"
            className="text-xs font-bold text-slate-300 hover:text-white px-3.5 py-2 rounded-xl transition-all cursor-pointer"
          >
            Dashboard
          </Link>
          <Link
            href="/"
            className="text-xs font-bold text-slate-100 bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded-xl transition-all shadow-md hover:shadow-lg cursor-pointer"
          >
            New Scan
          </Link>
        </div>
      </nav>

      {/* Documentation Layout */}
      <div className="container mx-auto max-w-6xl pt-24 pb-16 px-4 md:px-6 flex flex-col md:flex-row gap-8 relative z-10">
        {/* Left Navigation Sidebar */}
        <aside className="w-full md:w-56 shrink-0 h-fit md:sticky md:top-24 space-y-4">
          <h3 className="text-3xs font-extrabold text-slate-500 uppercase tracking-widest px-3 select-none">
            Documentation
          </h3>
          <nav className="flex flex-col gap-1.5 text-xs font-semibold text-slate-400">
            <a href="#introduction" className="px-3 py-1.5 hover:text-slate-200 hover:bg-white/5 rounded-lg transition-all">
              👋 Introduction
            </a>
            <a href="#auth" className="px-3 py-1.5 hover:text-slate-200 hover:bg-white/5 rounded-lg transition-all">
              🔑 Authentication
            </a>
            <a href="#endpoint-scan" className="px-3 py-1.5 hover:text-slate-200 hover:bg-white/5 rounded-lg transition-all">
              📡 POST /api/scan
            </a>
            <a href="#endpoint-fixes" className="px-3 py-1.5 hover:text-slate-200 hover:bg-white/5 rounded-lg transition-all">
              🤖 POST /api/fix-suggestions
            </a>
            <a href="#cicd" className="px-3 py-1.5 hover:text-slate-200 hover:bg-white/5 rounded-lg transition-all">
              ⚙️ CI/CD Integration
            </a>
            <a href="#errors" className="px-3 py-1.5 hover:text-slate-200 hover:bg-white/5 rounded-lg transition-all">
              ⚠️ Errors & Rates
            </a>
          </nav>
        </aside>

        {/* Content Panel */}
        <div className="flex-1 space-y-12 max-w-3xl leading-relaxed">
          {/* Section: Introduction */}
          <section id="introduction" className="scroll-mt-24 space-y-4">
            <h1 className="text-3xl font-black text-white tracking-tight">API Documentation</h1>
            <p className="text-sm text-slate-400">
              Welcome to the A11ytica Pro Developer API. Our programmatic endpoints allow you to schedule automated website audits, query violations, and fetch AI-driven accessibility fixes straight from your own code repository, CI/CD setup, or deployment processes.
            </p>
            <div className="bg-slate-900/40 border border-slate-800/80 p-4 rounded-xl space-y-1">
              <span className="text-3xs font-bold text-slate-500 uppercase tracking-wider block">Base API URL</span>
              <code className="text-xs text-indigo-300 font-mono select-all block">
                https://a11ytica-pro.vercel.app
              </code>
            </div>
          </section>

          {/* Section: Authentication */}
          <section id="auth" className="scroll-mt-24 space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-1.5">
              <span>🔑</span> Authentication
            </h2>
            <p className="text-xs text-slate-400">
              API endpoints require authentication via a secret token passed inside the headers. You can generate and manage these keys in the **Developer API** tab of your **Dashboard**. Keys begin with the `aud_live_` prefix.
            </p>
            <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl">
              <p className="text-2xs font-semibold text-slate-300 mb-2">Required Header:</p>
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-850 font-mono text-2xs text-slate-400 space-y-1">
                <span className="text-indigo-300">x-api-key:</span> aud_live_xxxxxxxxxxxxxxxxxxxxxxxx
              </div>
            </div>
          </section>

          {/* Section: POST /api/scan */}
          <section id="endpoint-scan" className="scroll-mt-24 space-y-4">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="px-2.5 py-0.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-3xs font-black rounded-md uppercase tracking-wider">
                POST
              </span>
              <h2 className="text-lg font-bold text-white">/api/scan</h2>
            </div>
            <p className="text-xs text-slate-400">
              Queues an asynchronous accessibility audit for the specified target URL. This triggers a headless Chromium browser instance on our server to compile axe-core checks.
            </p>

            <div className="space-y-3">
              <p className="text-xs font-bold text-slate-300">Request Body Parameters:</p>
              <div className="overflow-x-auto rounded-xl border border-slate-850/60 bg-slate-950/20">
                <table className="w-full text-left text-2xs border-collapse">
                  <thead>
                    <tr className="bg-slate-900/60 border-b border-slate-850">
                      <th className="px-4 py-2 font-bold text-slate-400">Parameter</th>
                      <th className="px-3 py-2 font-bold text-slate-400">Type</th>
                      <th className="px-3 py-2 font-bold text-slate-400">Required</th>
                      <th className="px-4 py-2 font-bold text-slate-400">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850/40 text-slate-300">
                    <tr>
                      <td className="px-4 py-3 font-mono font-bold text-slate-200">url</td>
                      <td className="px-3 py-3 text-slate-400">string</td>
                      <td className="px-3 py-3 text-indigo-400 font-bold">Yes</td>
                      <td className="px-4 py-3">The fully qualified website URL to audit (e.g. `https://example.com`).</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Code Examples Tabs */}
            <div className="space-y-2.5">
              <div className="flex gap-1.5 p-1 bg-slate-900/50 rounded-xl border border-slate-850/50 w-fit">
                {SCAN_EXAMPLES.map((ex) => (
                  <button
                    key={ex.lang}
                    onClick={() => setScanTab(ex.lang)}
                    className={`px-3 py-1.5 text-3xs font-black rounded-lg transition-all cursor-pointer ${
                      scanTab === ex.lang
                        ? "bg-slate-850 text-white shadow-xs"
                        : "text-slate-500 hover:text-slate-300"
                    }`}
                  >
                    {ex.label}
                  </button>
                ))}
              </div>

              {SCAN_EXAMPLES.map(
                (ex) =>
                  scanTab === ex.lang && (
                    <div key={ex.lang} className="relative group animate-fadeIn">
                      <pre className="text-2xs font-mono text-indigo-200 bg-slate-950 border border-slate-850 p-4 rounded-xl overflow-x-auto whitespace-pre leading-relaxed">
                        <code>{ex.code}</code>
                      </pre>
                      <button
                        onClick={() => handleCopy(ex.code, `scan-${ex.lang}`)}
                        className="absolute top-3.5 right-3.5 opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-slate-900 border border-transparent hover:border-slate-800 text-slate-400 hover:text-white transition-all shrink-0 cursor-pointer"
                        title="Copy to clipboard"
                      >
                        {copiedText === `scan-${ex.lang}` ? (
                          <span className="text-3xs font-extrabold text-emerald-400 uppercase">Copied!</span>
                        ) : (
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                          </svg>
                        )}
                      </button>
                    </div>
                  )
              )}
            </div>

            <div className="space-y-3">
              <p className="text-xs font-bold text-slate-300">Example Response (`202 Accepted`):</p>
              <pre className="text-2xs font-mono text-slate-400 bg-slate-950 border border-slate-850 p-4 rounded-xl overflow-x-auto">
                <code>{`{\n  "scanId": "8f8e02d0-5b5c-4d89-8d76-e17f058022a1"\n}`}</code>
              </pre>
            </div>
          </section>

          {/* Section: POST /api/fix-suggestions */}
          <section id="endpoint-fixes" className="scroll-mt-24 space-y-4">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="px-2.5 py-0.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-3xs font-black rounded-md uppercase tracking-wider">
                POST
              </span>
              <h2 className="text-lg font-bold text-white">/api/fix-suggestions</h2>
            </div>
            <p className="text-xs text-slate-400">
              Generates AI-powered accessibility remediation code fixes for WCAG issues. This endpoint is used internally or programmatically.
            </p>

            <div className="space-y-3">
              <p className="text-xs font-bold text-slate-300">Request Specification:</p>
              <pre className="text-2xs font-mono text-indigo-200 bg-slate-950 border border-slate-850 p-4 rounded-xl overflow-x-auto">
                <code>{FIX_EXAMPLES[0].code}</code>
              </pre>
            </div>
          </section>

          {/* Section: CI/CD Integration */}
          <section id="cicd" className="scroll-mt-24 space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-1.5">
              <span>⚙️</span> CI/CD Pipeline Integration
            </h2>
            <p className="text-xs text-slate-400">
              Run automated scans on every deployment. Here is how you can set up a GitHub Actions workflow step to trigger audits:
            </p>
            <div className="relative group">
              <pre className="text-2xs font-mono text-indigo-200 bg-slate-950 border border-slate-850 p-4 rounded-xl overflow-x-auto leading-relaxed">
                <code>{`- name: Trigger A11ytica Pro Compliance Scan\n  run: |\n    curl -X POST https://a11ytica-pro.vercel.app/api/scan \\\n      -H "Content-Type: application/json" \\\n      -H "x-api-key: \${{ secrets.A11YTICA_API_KEY }}" \\\n      -d '{"url": "https://staging.yourdomain.com"}'`}</code>
              </pre>
              <button
                onClick={() => handleCopy(`- name: Trigger A11ytica Pro Compliance Scan\n  run: |\n    curl -X POST https://a11ytica-pro.vercel.app/api/scan \\\n      -H "Content-Type: application/json" \\\n      -H "x-api-key: \${{ secrets.A11YTICA_API_KEY }}" \\\n      -d '{"url": "https://staging.yourdomain.com"}'`, "cicd-code")}
                className="absolute top-3.5 right-3.5 opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-slate-900 border border-transparent hover:border-slate-800 text-slate-400 hover:text-white transition-all shrink-0 cursor-pointer"
                title="Copy to clipboard"
              >
                {copiedText === "cicd-code" ? (
                  <span className="text-3xs font-extrabold text-emerald-400 uppercase">Copied!</span>
                ) : (
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                  </svg>
                )}
              </button>
            </div>
          </section>

          {/* Section: Errors & Rates */}
          <section id="errors" className="scroll-mt-24 space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-1.5">
              <span>⚠️</span> Error Status Codes
            </h2>
            <div className="overflow-x-auto rounded-xl border border-slate-850/60 bg-slate-950/20">
              <table className="w-full text-left text-2xs border-collapse">
                <thead>
                  <tr className="bg-slate-900/60 border-b border-slate-850">
                    <th className="px-4 py-2.5 font-bold text-slate-400">Status Code</th>
                    <th className="px-3 py-2.5 font-bold text-slate-400">Meaning</th>
                    <th className="px-4 py-2.5 font-bold text-slate-400">Remedy</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850/40 text-slate-300">
                  <tr>
                    <td className="px-4 py-3 font-mono font-bold text-rose-400">400 Bad Request</td>
                    <td className="px-3 py-3 font-medium">Invalid parameters or body structure.</td>
                    <td className="px-4 py-3 text-slate-400">Validate URL schema, payload formatting, and parameters.</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-mono font-bold text-rose-400">401 Unauthorized</td>
                    <td className="px-3 py-3 font-medium">API key is missing or revoked.</td>
                    <td className="px-4 py-3 text-slate-400">Include a valid `x-api-key` header matching a generated token in your dashboard.</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-mono font-bold text-rose-400">429 Quota Exceeded</td>
                    <td className="px-3 py-3 font-medium">Monthly scan usage limit reached.</td>
                    <td className="px-4 py-3 text-slate-400">Upgrade your subscription plan from your billing settings.</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-mono font-bold text-rose-400">500 Server Error</td>
                    <td className="px-3 py-3 font-medium">Internal scan trigger failure.</td>
                    <td className="px-4 py-3 text-slate-400">Check server console logs, or verify Browserless integration.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}
