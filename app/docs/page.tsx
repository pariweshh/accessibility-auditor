"use client"

import { useState } from "react"
import Link from "next/link"
import { BrandLogo } from "@/components/brand_logo"

interface CodeExample {
  lang: string
  label: string
  code: string
}

const SCAN_EXAMPLES: CodeExample[] = [
  {
    lang: "curl",
    label: "cURL",
    code: `# 1. Queue an asynchronous WCAG 2.2 scan\ncurl -X POST https://equivance.app/api/scan \\\n  -H "Content-Type: application/json" \\\n  -H "x-api-key: aud_live_xxxxxxxxxxxxxxxxxxxxxxxx" \\\n  -d '{"url":"https://example.com"}'\n\n# 2. Poll scan status and fetch violation results\ncurl -X GET "https://equivance.app/api/scan?scanId=8f8e02d0-5b5c-4d89-8d76-e17f058022a1" \\\n  -H "x-api-key: aud_live_xxxxxxxxxxxxxxxxxxxxxxxx"`,
  },
  {
    lang: "javascript",
    label: "JavaScript",
    code: `const response = await fetch("https://equivance.app/api/scan", {\n  method: "POST",\n  headers: {\n    "Content-Type": "application/json",\n    "x-api-key": "aud_live_xxxxxxxxxxxxxxxxxxxxxxxx"\n  },\n  body: JSON.stringify({\n    url: "https://example.com"\n  })\n});\n\nconst { scanId } = await response.json();\nconsole.log("Scan Queued. ID:", scanId);\n\n// Poll for completion\nconst statusRes = await fetch(\`https://equivance.app/api/scan?scanId=\${scanId}\`, {\n  headers: { "x-api-key": "aud_live_xxxxxxxxxxxxxxxxxxxxxxxx" }\n});\nconst result = await statusRes.json();\nconsole.log("Status:", result.status, "Score:", result.score);`,
  },
  {
    lang: "python",
    label: "Python",
    code: `import requests\n\nurl = "https://equivance.app/api/scan"\nheaders = {\n    "Content-Type": "application/json",\n    "x-api-key": "aud_live_xxxxxxxxxxxxxxxxxxxxxxxx"\n}\n\n# 1. Start Scan\nresponse = requests.post(url, headers=headers, json={"url": "https://example.com"})\nscan_id = response.json().get("scanId")\nprint("Scan Queued. ID:", scan_id)\n\n# 2. Poll Scan Status\nresult = requests.get(f"{url}?scanId={scan_id}", headers=headers).json()\nprint("Status:", result.get("status"), "Score:", result.get("score"))`,
  },
]

const FIX_EXAMPLES: CodeExample[] = [
  {
    lang: "javascript",
    label: "JavaScript",
    code: `const response = await fetch("https://equivance.app/api/fix-suggestions", {\n  method: "POST",\n  headers: {\n    "Content-Type": "application/json",\n    "x-api-key": "aud_live_xxxxxxxxxxxxxxxxxxxxxxxx"\n  },\n  body: JSON.stringify({\n    issues: [\n      {\n        id: "image-alt",\n        impact: "critical",\n        description: "Ensures images have alt text",\n        help: "Images must have alternate text",\n        tags: ["wcag2a"],\n        nodes: [\n          { html: '<img src="logo.png">', target: ['img'], failureSummary: 'No alt attribute' }\n        ]\n      }\n    ],\n    limit: 1,\n    model: "gpt-4o",\n    framework: "react-tailwind" // "html" | "react-tailwind" | "vue" | "angular"\n  })\n});\n\nconst data = await response.json();\nconsole.log(data.fixes);`,
  },
]

const CICD_SNIPPET = `- name: Trigger & Verify Equivance Compliance Scan
  run: |
    SCAN_ID=$(curl -s -X POST https://equivance.app/api/scan \\
      -H "Content-Type: application/json" \\
      -H "x-api-key: \${{ secrets.EQUIVANCE_API_KEY }}" \\
      -d '{"url": "https://staging.yourdomain.com"}' | jq -r '.scanId')
    echo "Queued Scan ID: $SCAN_ID"
    for i in {1..15}; do
      sleep 3
      RES=$(curl -s "https://equivance.app/api/scan?scanId=$SCAN_ID" \\
        -H "x-api-key: \${{ secrets.EQUIVANCE_API_KEY }}")
      STATUS=$(echo "$RES" | jq -r '.status')
      if [ "$STATUS" = "completed" ]; then
        CRITICAL=$(echo "$RES" | jq -r '.summary.critical')
        echo "Scan completed. Critical violations: $CRITICAL"
        [ "$CRITICAL" -eq 0 ] || exit 1
        exit 0
      fi
    done`

export default function DocsPage() {
  const [scanTab, setScanTab] = useState("curl")
  const [copiedText, setCopiedText] = useState<string | null>(null)

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedText(id)
    setTimeout(() => setCopiedText(null), 2000)
  }

  const handleScanTabKeyDown = (e: React.KeyboardEvent) => {
    const langs = SCAN_EXAMPLES.map((ex) => ex.lang)
    const currentIndex = langs.indexOf(scanTab)
    if (e.key === "ArrowRight") {
      e.preventDefault()
      const nextLang = langs[(currentIndex + 1) % langs.length]
      setScanTab(nextLang)
      document.getElementById(`tab-doc-${nextLang}`)?.focus()
    } else if (e.key === "ArrowLeft") {
      e.preventDefault()
      const prevLang = langs[(currentIndex - 1 + langs.length) % langs.length]
      setScanTab(prevLang)
      document.getElementById(`tab-doc-${prevLang}`)?.focus()
    } else if (e.key === "Home") {
      e.preventDefault()
      setScanTab(langs[0])
      document.getElementById(`tab-doc-${langs[0]}`)?.focus()
    } else if (e.key === "End") {
      e.preventDefault()
      setScanTab(langs[langs.length - 1])
      document.getElementById(`tab-doc-${langs[langs.length - 1]}`)?.focus()
    }
  }

  return (
    <div className="min-h-dvh bg-slate-950 text-slate-100 bg-grid-pattern">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[400px] bg-radial from-indigo-500/8 via-transparent to-transparent pointer-events-none z-0" />

      {/* Navbar Header */}
      <header>
        <nav aria-label="Main Navigation" className="w-full bg-slate-950/75 backdrop-blur-md border-b border-slate-900 py-3.5 px-6 flex justify-between items-center fixed top-0 left-0 z-40">
          <Link href="/" className="flex items-center gap-2.5 group">
            <BrandLogo size={32} />
            <span className="text-xl font-bold text-slate-50 group-hover:text-indigo-300 transition-colors duration-300">
              Equivance
            </span>
          </Link>
          <div className="flex gap-4">
            <Link
              href="/dashboard"
              className="text-xs font-bold text-slate-300 hover:text-slate-50 px-3.5 py-2 rounded-xl transition-all cursor-pointer"
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
      </header>

      {/* Main Documentation Area */}
      <main id="main-content" tabIndex={-1} className="focus:outline-none">
        <div className="container mx-auto max-w-6xl pt-24 pb-16 px-4 md:px-6 flex flex-col md:flex-row gap-8 relative z-10">
        {/* Left Navigation Sidebar */}
        <aside className="w-full md:w-56 shrink-0 h-fit md:sticky md:top-24 space-y-4">
          <h3 className="text-3xs font-extrabold text-slate-500 uppercase tracking-widest px-3 select-none">
            Documentation
          </h3>
          <nav aria-label="Documentation sections" className="flex flex-col gap-1.5 text-xs font-semibold text-slate-400">
            <a href="#introduction" className="flex items-center gap-2 px-3 py-1.5 hover:text-slate-200 hover:bg-white/5 rounded-lg transition-all">
              <svg className="w-3.5 h-3.5 text-indigo-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              Introduction
            </a>
            <a href="#auth" className="flex items-center gap-2 px-3 py-1.5 hover:text-slate-200 hover:bg-white/5 rounded-lg transition-all">
              <svg className="w-3.5 h-3.5 text-indigo-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
              Authentication
            </a>
            <a href="#endpoint-scan" className="flex items-center gap-2 px-3 py-1.5 hover:text-slate-200 hover:bg-white/5 rounded-lg transition-all">
              <svg className="w-3.5 h-3.5 text-indigo-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
              </svg>
              POST & GET /api/scan
            </a>
            <a href="#endpoint-fixes" className="flex items-center gap-2 px-3 py-1.5 hover:text-slate-200 hover:bg-white/5 rounded-lg transition-all">
              <svg className="w-3.5 h-3.5 text-indigo-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
              POST /api/fix-suggestions
            </a>
            <a href="#cicd" className="flex items-center gap-2 px-3 py-1.5 hover:text-slate-200 hover:bg-white/5 rounded-lg transition-all">
              <svg className="w-3.5 h-3.5 text-indigo-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              CI/CD Integration
            </a>
            <a href="#widget" className="flex items-center gap-2 px-3 py-1.5 hover:text-slate-200 hover:bg-white/5 rounded-lg transition-all">
              <svg className="w-3.5 h-3.5 text-cyan-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
              Compliance Widget
            </a>
            <a href="#errors" className="flex items-center gap-2 px-3 py-1.5 hover:text-slate-200 hover:bg-white/5 rounded-lg transition-all">
              <svg className="w-3.5 h-3.5 text-indigo-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Errors & Rates
            </a>
          </nav>
        </aside>

        {/* Content Panel */}
        <div className="flex-1 space-y-12 max-w-3xl leading-relaxed">
          {/* Section: Introduction */}
          <section id="introduction" className="scroll-mt-24 space-y-4">
            <h1 className="text-3xl font-black text-slate-50 tracking-tight">API Documentation</h1>
            <p className="text-sm text-slate-400">
              Welcome to the Equivance Developer API. Our programmatic endpoints allow you to schedule automated website audits, poll scan completion status, query WCAG 2.2 violations, and fetch AI-driven accessibility fixes straight from your repository or CI/CD deployment pipeline.
            </p>
            <div className="bg-slate-900/40 border border-slate-800/80 p-4 rounded-xl space-y-1">
              <span className="text-3xs font-bold text-slate-500 uppercase tracking-wider block">Base API URL</span>
              <code className="text-xs text-indigo-300 font-mono select-all block">
                https://equivance.app
              </code>
            </div>
          </section>

          {/* Section: Authentication */}
          <section id="auth" className="scroll-mt-24 space-y-4">
            <h2 className="text-lg font-bold text-slate-50 flex items-center gap-2">
              <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
              Authentication
            </h2>
            <p className="text-xs text-slate-400">
              API endpoints require authentication via a secret token passed inside the headers. You can generate and manage these keys in the <strong>Developer API</strong> tab of your <strong>Dashboard</strong>. Keys begin with the <code className="font-mono text-indigo-300">aud_live_</code> prefix.
            </p>
            <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl">
              <p className="text-2xs font-semibold text-slate-300 mb-2">Required Header:</p>
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-850 font-mono text-2xs text-slate-400 space-y-1">
                <span className="text-indigo-300">x-api-key:</span> aud_live_xxxxxxxxxxxxxxxxxxxxxxxx
              </div>
            </div>
          </section>

          {/* Section: POST & GET /api/scan */}
          <section id="endpoint-scan" className="scroll-mt-24 space-y-4">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="px-2.5 py-0.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-3xs font-black rounded-md uppercase tracking-wider">
                POST
              </span>
              <span className="px-2.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-3xs font-black rounded-md uppercase tracking-wider">
                GET
              </span>
              <h2 className="text-lg font-bold text-slate-50">/api/scan</h2>
            </div>
            <p className="text-xs text-slate-400">
              <code className="font-mono text-slate-200">POST /api/scan</code> queues an asynchronous accessibility audit for the target URL and returns a <code className="font-mono text-slate-200">scanId</code> (<code className="font-mono text-indigo-300">202 Accepted</code>). Use <code className="font-mono text-slate-200">GET /api/scan?scanId=&lt;uuid&gt;</code> to poll the scan lifecycle (<code className="font-mono">pending</code> &rarr; <code className="font-mono">processing</code> &rarr; <code className="font-mono">completed</code>) and retrieve the full WCAG 2.2 violation report.
            </p>

            <div className="space-y-3">
              <p className="text-xs font-bold text-slate-300">POST Request Body &amp; GET Query Parameters:</p>
              <div className="overflow-x-auto rounded-xl border border-slate-850/60 bg-slate-950/20">
                <table className="w-full text-left text-2xs border-collapse">
                  <thead>
                    <tr className="bg-slate-900/60 border-b border-slate-850">
                      <th className="px-4 py-2 font-bold text-slate-400">Parameter</th>
                      <th className="px-3 py-2 font-bold text-slate-400">Method</th>
                      <th className="px-3 py-2 font-bold text-slate-400">Required</th>
                      <th className="px-4 py-2 font-bold text-slate-400">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850/40 text-slate-300">
                    <tr>
                      <td className="px-4 py-3 font-mono font-bold text-slate-200">url</td>
                      <td className="px-3 py-3 text-slate-400">POST (JSON)</td>
                      <td className="px-3 py-3 text-indigo-400 font-bold">Yes</td>
                      <td className="px-4 py-3">The fully qualified website URL to audit (e.g. <code className="font-mono">https://example.com</code>).</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 font-mono font-bold text-slate-200">scanId</td>
                      <td className="px-3 py-3 text-slate-400">GET (Query)</td>
                      <td className="px-3 py-3 text-indigo-400 font-bold">Yes</td>
                      <td className="px-4 py-3">The UUID returned by <code className="font-mono">POST /api/scan</code> to check status and retrieve violations.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Code Examples Tabs */}
            <div className="space-y-2.5">
              <div
                role="tablist"
                aria-label="Code example languages"
                onKeyDown={handleScanTabKeyDown}
                className="flex gap-1.5 p-1 bg-slate-900/50 rounded-xl border border-slate-850/50 w-fit"
              >
                {SCAN_EXAMPLES.map((ex) => (
                  <button
                    key={ex.lang}
                    role="tab"
                    id={`tab-doc-${ex.lang}`}
                    aria-controls={`panel-doc-${ex.lang}`}
                    aria-selected={scanTab === ex.lang}
                    tabIndex={scanTab === ex.lang ? 0 : -1}
                    onClick={() => setScanTab(ex.lang)}
                    className={`px-3 py-1.5 text-3xs font-black rounded-lg transition-all cursor-pointer ${
                      scanTab === ex.lang
                        ? "bg-slate-850 text-slate-50 shadow-xs"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {ex.label}
                  </button>
                ))}
              </div>

              {SCAN_EXAMPLES.map(
                (ex) =>
                  scanTab === ex.lang && (
                    <div
                      key={ex.lang}
                      id={`panel-doc-${ex.lang}`}
                      role="tabpanel"
                      aria-labelledby={`tab-doc-${ex.lang}`}
                      className="relative group animate-fadeIn"
                    >
                      <pre
                        tabIndex={0}
                        aria-label={`${ex.label} code snippet`}
                        className="text-2xs font-mono text-indigo-200 bg-slate-950 border border-slate-850 p-4 rounded-xl overflow-x-auto whitespace-pre leading-relaxed focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                      >
                        <code>{ex.code}</code>
                      </pre>
                      <button
                        onClick={() => handleCopy(ex.code, `scan-${ex.lang}`)}
                        aria-label={`Copy ${ex.label} example code`}
                        className="absolute top-3.5 right-3.5 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 p-2 min-w-[32px] min-h-[32px] rounded-lg hover:bg-slate-900 border border-transparent hover:border-slate-800 text-slate-400 hover:text-slate-50 transition-all shrink-0 cursor-pointer flex items-center justify-center"
                        title="Copy to clipboard"
                      >
                        {copiedText === `scan-${ex.lang}` ? (
                          <span className="text-3xs font-extrabold text-emerald-400 uppercase">Copied!</span>
                        ) : (
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                          </svg>
                        )}
                      </button>
                    </div>
                  )
              )}
            </div>

            <div className="space-y-3">
              <p className="text-xs font-bold text-slate-300">Example POST Response (<code className="font-mono">202 Accepted</code>):</p>
              <pre
                tabIndex={0}
                aria-label="Example POST response JSON"
                className="text-2xs font-mono text-slate-400 bg-slate-950 border border-slate-850 p-4 rounded-xl overflow-x-auto focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
              >
                <code>{`{\n  "scanId": "8f8e02d0-5b5c-4d89-8d76-e17f058022a1",\n  "status": "pending",\n  "message": "Scan queued successfully"\n}`}</code>
              </pre>
            </div>
          </section>

          {/* Section: POST /api/fix-suggestions */}
          <section id="endpoint-fixes" className="scroll-mt-24 space-y-4">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="px-2.5 py-0.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-3xs font-black rounded-md uppercase tracking-wider">
                POST
              </span>
              <h2 className="text-lg font-bold text-slate-50">/api/fix-suggestions</h2>
            </div>
            <p className="text-xs text-slate-400">
              Generates framework-aware AI accessibility remediation code fixes (<code className="font-mono text-indigo-300">html</code>, <code className="font-mono text-indigo-300">react-tailwind</code>, <code className="font-mono text-indigo-300">vue</code>, or <code className="font-mono text-indigo-300">angular</code>) for WCAG issues. Authenticates via either your <code className="font-mono text-indigo-300">x-api-key</code> header or an active browser session cookie.
            </p>

            <div className="space-y-3">
              <p className="text-xs font-bold text-slate-300">Request Specification:</p>
              <pre
                tabIndex={0}
                aria-label="Fix suggestions request specification"
                className="text-2xs font-mono text-indigo-200 bg-slate-950 border border-slate-850 p-4 rounded-xl overflow-x-auto focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
              >
                <code>{FIX_EXAMPLES[0].code}</code>
              </pre>
            </div>
          </section>

          {/* Section: GET /api/badge/[scanId] */}
          <section id="endpoint-badge" className="scroll-mt-24 space-y-4">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="px-2.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-3xs font-black rounded-md uppercase tracking-wider">
                GET
              </span>
              <h2 className="text-lg font-bold text-slate-50">/api/badge/[scanId]</h2>
            </div>
            <p className="text-xs text-slate-400">
              Returns a live, cache-optimized SVG WCAG 2.2 AA compliance shield (<code className="font-mono text-slate-200">image/svg+xml</code>) for embedding in website footers, documentation, or GitHub READMEs. Agency tier scans automatically apply white-label <code className="font-mono text-indigo-300">brand_name</code> and <code className="font-mono text-indigo-300">brand_primary_color</code>. Pair with <code className="font-mono text-slate-200">/report/[scanId]?verify=1</code> for public read-only verification.
            </p>
          </section>

          {/* Section: CI/CD Integration */}
          <section id="cicd" className="scroll-mt-24 space-y-4">
            <h2 className="text-lg font-bold text-slate-50 flex items-center gap-2">
              <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              CI/CD Pipeline Integration
            </h2>
            <p className="text-xs text-slate-400">
              Run automated scans on every deployment and fail builds if critical WCAG violations are introduced (use the interactive <strong>Turnkey CI/CD Quality Gate Builder</strong> in your Dashboard for GitHub Actions, GitLab CI, and custom severity gates):
            </p>
            <div className="relative group">
              <pre
                tabIndex={0}
                aria-label="CI/CD workflow YAML configuration"
                className="text-2xs font-mono text-indigo-200 bg-slate-950 border border-slate-850 p-4 rounded-xl overflow-x-auto leading-relaxed focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
              >
                <code>{CICD_SNIPPET}</code>
              </pre>
              <button
                onClick={() => handleCopy(CICD_SNIPPET, "cicd-code")}
                aria-label="Copy CI/CD workflow snippet"
                className="absolute top-3.5 right-3.5 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 p-1.5 rounded-lg hover:bg-slate-900 border border-transparent hover:border-slate-800 text-slate-400 hover:text-slate-50 transition-all shrink-0 cursor-pointer"
                title="Copy to clipboard"
              >
                {copiedText === "cicd-code" ? (
                  <span className="text-3xs font-extrabold text-emerald-400 uppercase">Copied!</span>
                ) : (
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                  </svg>
                )}
              </button>
            </div>
          </section>

          {/* Section: Compliance Widget */}
          <section id="widget" className="scroll-mt-24 space-y-4">
            <h2 className="text-lg font-bold text-slate-50 flex items-center gap-2">
              <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
              Embeddable Compliance Widget
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Pro and Agency subscribers can embed an accessible WCAG 2.2 AA statement and live compliance badge directly onto their websites with a single lightweight script tag. The widget uses an open Shadow DOM to guarantee total CSS encapsulation without altering your site&apos;s styling.
            </p>

            <div className="relative group bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-3xs font-extrabold uppercase tracking-widest text-slate-500">HTML Embed Snippet</span>
                <button
                  type="button"
                  onClick={() => handleCopy('<script src="https://equivance.app/widget.js" data-scan-id="YOUR_SCAN_ID" data-position="bottom-right" async defer></script>', "widget-embed")}
                  className="text-2xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
                >
                  {copiedText === "widget-embed" ? "Copied!" : "Copy Snippet"}
                </button>
              </div>
              <pre
                tabIndex={0}
                aria-label="Widget HTML embed snippet"
                className="text-2xs font-mono text-cyan-300 overflow-x-auto focus:outline-hidden focus:ring-1 focus:ring-cyan-500"
              >
                {`<script src="https://equivance.app/widget.js" data-scan-id="YOUR_SCAN_ID" data-position="bottom-right" async defer></script>`}
              </pre>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-850/60 bg-slate-950/20">
              <table className="w-full text-left text-2xs border-collapse">
                <thead>
                  <tr className="bg-slate-900/60 border-b border-slate-850">
                    <th className="px-4 py-2.5 font-bold text-slate-400">Attribute</th>
                    <th className="px-3 py-2.5 font-bold text-slate-400">Values</th>
                    <th className="px-4 py-2.5 font-bold text-slate-400">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850/40 text-slate-300">
                  <tr>
                    <td className="px-4 py-2.5 font-mono text-cyan-300 font-bold">data-scan-id</td>
                    <td className="px-3 py-2.5 text-slate-400 font-mono">UUID string</td>
                    <td className="px-4 py-2.5">Required. The unique identifier of your completed scan.</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2.5 font-mono text-cyan-300 font-bold">data-position</td>
                    <td className="px-3 py-2.5 text-slate-400 font-mono">&quot;bottom-right&quot; | &quot;bottom-left&quot;</td>
                    <td className="px-4 py-2.5">Screen corner placement for the floating trigger pill.</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2.5 font-mono text-cyan-300 font-bold">data-theme</td>
                    <td className="px-3 py-2.5 text-slate-400 font-mono">&quot;dark&quot; | &quot;light&quot;</td>
                    <td className="px-4 py-2.5">Visual theme matching your website aesthetics (defaults to dark).</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2.5 font-mono text-cyan-300 font-bold">data-contact</td>
                    <td className="px-3 py-2.5 text-slate-400 font-mono">Email or URL</td>
                    <td className="px-4 py-2.5">Direct barrier reporting destination (e.g. mailto:a11y@example.com).</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2.5 font-mono text-cyan-300 font-bold">data-color</td>
                    <td className="px-3 py-2.5 text-slate-400 font-mono">Hex color code</td>
                    <td className="px-4 py-2.5">Optional override for primary brand accent color.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Section: Errors & Rates */}
          <section id="errors" className="scroll-mt-24 space-y-4">
            <h2 className="text-lg font-bold text-slate-50 flex items-center gap-2">
              <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Error Status Codes
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
                    <td className="px-3 py-3 font-medium">Invalid parameters or SSRF blocked target.</td>
                    <td className="px-4 py-3 text-slate-400">Validate URL schema, payload formatting, and parameters.</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-mono font-bold text-rose-400">401 Unauthorized</td>
                    <td className="px-3 py-3 font-medium">API key is missing or revoked.</td>
                    <td className="px-4 py-3 text-slate-400">Include a valid <code className="font-mono">x-api-key</code> header matching a generated token in your dashboard.</td>
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
    </div>
  )
}

