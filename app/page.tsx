"use client"

import { useState } from "react"
import { ScanResult } from "@/lib/types"
import ScanForm from "@/components/scan_form"
import ResultsDisplay from "@/components/results_display"
import Link from "next/link"

export default function Home() {
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)

  const handleScanComplete = (result: ScanResult) => {
    setScanResult(result)
  }

  const handleNewScan = () => {
    setScanResult(null)
  }

  return (
    <main className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="container mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Accessibility Auditor
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Scan any website for accessibility issues and get AI-powered fix
            suggestions. Built with Next.js, Puppeteer, and OpenAI.
          </p>
        </div>

        {/* Main Content */}
        {!scanResult ? (
          <ScanForm onScanComplete={handleScanComplete} />
        ) : (
          <ResultsDisplay result={scanResult} onNewScan={handleNewScan} />
        )}

        {/* Footer */}
        <footer className="mt-16 text-center text-sm text-gray-600">
          <p>
            Powered by{" "}
            <Link
              href="https://www.deque.com/axe/"
              className="text-blue-600 hover:underline"
            >
              axe-core
            </Link>
            ,{" "}
            <Link
              href="https://pptr.dev/"
              className="text-blue-600 hover:underline"
            >
              Puppeteer
            </Link>
            , and{" "}
            <Link
              href="https://openai.com/"
              className="text-blue-600 hover:underline"
            >
              OpenAI
            </Link>
          </p>
        </footer>
      </div>
    </main>
  )
}
