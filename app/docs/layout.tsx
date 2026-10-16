import type { Metadata } from "next"
import { SITE } from "@/lib/site"

export const metadata: Metadata = {
  title: "API Documentation — Scan & AI Fix Endpoints",
  description:
    "Developer reference for the Equivance API: queue WCAG accessibility scans, fetch AI-powered fixes, and wire compliance checks into your CI/CD pipeline.",
  alternates: { canonical: "/docs" },
  openGraph: {
    type: "article",
    title: "Equivance API Documentation",
    description:
      "Programmatic access to accessibility scans and AI-powered WCAG fixes.",
    url: `${SITE.url}/docs`,
  },
}

const BREADCRUMB_DATA = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    {
      "@type": "ListItem",
      position: 1,
      name: "Home",
      item: SITE.url,
    },
    {
      "@type": "ListItem",
      position: 2,
      name: "API Documentation",
      item: `${SITE.url}/docs`,
    },
  ],
}

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(BREADCRUMB_DATA) }}
      />
      {children}
    </>
  )
}
