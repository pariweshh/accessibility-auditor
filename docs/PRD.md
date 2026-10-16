# Product Requirements Document (PRD)

> **Document Status:** Active / Authoritative  
> **Product Name:** Equivance (`accessibility-auditor`)  
> **Version:** 2.8.0  
> **Last Updated:** October 2026  
> **Target Standard:** WCAG 2.2 Level AA, Section 508, ADA Title III, European Accessibility Act (EAA 2025)

---

## 01 Product Overview

### Product Identity
* **Product Name:** Equivance
* **Repository:** `pariweshh/accessibility-auditor`
* **Canonical URL:** `https://equivance.app` (configured via `lib/site.ts`)
* **Tagline:** Automated WCAG 2.2 audits with deterministic AI code remediation.
* **Elevator Pitch:** Equivance is an enterprise-grade accessibility auditing platform that combines headless browser automation (Puppeteer + axe-core 4.12) with targeted generative AI (OpenAI GPT-4o / GPT-4o-mini). It evaluates live, fully rendered JavaScript web applications, detects WCAG 2.2 Level A/AA violations, flags criteria requiring manual human review, generates drop-in framework-aware code fixes (`HTML`, `React / JSX + Tailwind`, `Vue 3`, `Angular`), and outputs audit-ready PDF reports, EAA 2025 / ADA Compliance Kits, live SVG badges, and developer APIs for CI/CD pipelines.

### Core Value Proposition
1. **Zero False Promises:** Unlike predatory "accessibility overlay widgets" that inject superficial scripts and frequently attract ADA lawsuits, Equivance focuses on root-cause source code remediation.
2. **Honest Conformance Model:** Explicitly differentiates between automated detection (~30–50% of WCAG criteria) and manual verification checkpoints (focus obscuration, dragging movements, cognitive authentication).
3. **Actionable Developer Feedback:** Instead of opaque error messages, developers receive concrete, before-and-after code diffs tailored to their frontend framework (`HTML`, `React / Tailwind`, `Vue 3`, `Angular`) with confidence scoring and educational rationale.
4. **Frictionless Integration:** Available via Web UI, programmatic REST API (`POST /api/scan` + `GET /api/scan`), and an interactive Turnkey CI/CD Quality Gate Builder (GitHub Actions, GitLab CI, Bash/cURL).

---

## 02 Problem Statement

1. **Catastrophic Legal Exposure:** Over 4,000 web accessibility lawsuits are filed annually under ADA Title III in the United States, amplified by California's Unruh Act and the strict enforcement of the European Accessibility Act (EAA) in June 2025. Non-compliance exposes organizations to statutory penalties, costly settlements ($15k–$100k+), and reputational harm.
2. **Exorbitant Cost of Manual Audits:** Traditional human-only accessibility audits from specialized consultancies cost between $5,000 and $25,000 per application and take 4 to 8 weeks, making routine pre-release testing unaffordable for agile engineering teams.
3. **The "Overlay Fallacy":** Quick-fix JavaScript overlays and widgets do not fix underlying DOM tree barriers for blind users utilizing NVDA/JAWS screen readers, resulting in false security and high-profile class-action litigation against businesses deploying them.
4. **Developer Knowledge Gap:** Most software engineers understand basic semantic tags (`<button>`, `<main>`), but lack deep expertise in complex ARIA patterns (`aria-haspopup`, `aria-expanded`, roving `tabindex`, color luminance ratios against dynamic alpha backgrounds).
5. **Slow, Opaque Tooling:** Existing CLI scanners often produce hundreds of pages of raw JSON logs without context, prioritized severity, or copy-paste code patches.

---

## 03 Product Goals & Objectives

### Strategic Goals
* **Democratize Accessibility:** Provide instant, high-fidelity WCAG 2.2 Level AA diagnostics in under 10 seconds.
* **Automate Remediation:** Cut developer remediation turnaround time by 80% using context-aware AI code fixes.
* **Provide Continuous Compliance:** Enable engineering teams to block non-compliant code in pull requests before deploying to production.
* **Protect Customers Legally:** Deliver clear, transparent, and accurate audit artifacts with explicit boundaries between automated rule detection and human review criteria.

### Measurable Key Results (OKRs)
* **P95 Scan Latency:** Complete single-page audits within 8.5 seconds via distributed Browserless instances.
* **AI Fix Confidence:** Achieve >85% high-confidence accuracy for common violations (`image-alt`, `label`, `color-contrast`, `button-name`).
* **Cache Efficiency:** Achieve >40% cache hit rate on repetitive violation remediation via SHA-256 database caching.
* **Zero Runtime Serverless Timeouts:** Ensure 100% of scans execute asynchronously via Supabase Edge Functions with Supabase Realtime status feeds.

---

## 04 Target Users & Personas

| Persona | Primary Goal | Key Pain Point | Primary Feature Used |
| :--- | :--- | :--- | :--- |
| **Frontend Engineer** | Fix PR accessibility lints quickly before merge | Doesn't know the exact ARIA markup required for complex components | Single Scan + Framework-Aware AI Fix Suggestions + Code Diff View |
| **QA / Test Automation Lead** | Run automated regression audits on staging builds | Tests take too long or timeout on SPAs with client-side routing | Programmatic REST API (`POST` & `GET /api/scan`) + Turnkey CI/CD Quality Gate Builder |
| **Digital Agency Owner** | Deliver compliance certificates & client reports | Needs branded, professional documentation to justify client deliverables | Executive PDF Reports (with POUR Matrix) + White-Label Branding + Compliance Kit |
| **Product / Compliance Manager** | Track team accessibility posture & publish statements | Needs EAA 2025 / ADA compliance statements and live trust badges | EAA 2025 & ADA Compliance Kit + Live SVG Badge + Dashboard Trend Charts |

---

## 05 Core Feature Matrix & Implementation Status

### Status Legend
* `[Ready]` **Production Ready:** Built, tested, and active in the live codebase.
* `[In Progress]` **In Progress / Polishing:** Feature scaffolding exists; requires enhancement or edge-case handling.
* `[Planned]` **Backlog / Planned:** Defined in roadmap; scheduled for upcoming releases.

### Feature Specifications

| Feature | Status | Description & Tech Foundation |
| :--- | :---: | :--- |
| **Asynchronous Scan Engine** | `[Ready]` | Puppeteer Core connected to Browserless.io infrastructure running inside Supabase Edge Function (`scan-site`). Defeats Vercel serverless 10s limits and persists relational `public.violations` records. |
| **WCAG 2.2 AA Rules Engine** | `[Ready]` | Injected axe-core 4.12 evaluating DOM nodes, CSSOM computed styles, color contrast, ARIA landmarks, form labels, and focusable elements. |
| **Zero-Violation Self-Accessibility (Dogfooding)** | `[Ready]` | Automated headless Chrome audit (`npm run test:a11y` via `scripts/self-a11y-audit.mjs`) auditing all public and authenticated routes with 0 violations across 45 WCAG rules, modal focus trapping (`hooks/use-focus-trap.ts`), and WAI-ARIA tablists. |
| **Needs Manual Review Triage** | `[Ready]` | Captures axe-core `incomplete` results (checks requiring human judgment) and displays them distinctly with actionable review guidelines. |
| **WCAG 2.2 Manual Checklist** | `[Ready]` | Built-in interactive checklist for non-automatable criteria (2.4.11 Focus Not Obscured, 2.5.7 Dragging, 2.5.8 Target Size, 3.3.8 Accessible Auth). |
| **Framework-Aware AI Code Fixer** | `[Ready]` | OpenAI GPT-4o-mini (Free) / GPT-4o (Pro & Agency) integration generating corrected code in `HTML`, `React / JSX + Tailwind`, `Vue 3`, or `Angular` with rationale and confidence ratings (`lib/ai-fixer.ts`). |
| **AI Fix SHA-256 Cache** | `[Ready]` | Supabase `ai_fix_cache` table caching previously computed fixes keyed by `SHA-256(issueId + ":" + framework + ":" + originalHtml + ":" + model)` to eliminate duplicate API costs. |
| **Live SVG Compliance Badge & Public Verification** | `[Ready]` | Dynamic vector shield (`GET /api/badge/[scanId]`) with real-time WCAG score, white-label Agency branding support, and public read-only verification view (`/report/[scanId]?verify=1` with masked owner email). |
| **EAA 2025 & ADA Compliance Kit** | `[Ready]` | One-click modal (`components/compliance_kit_modal.tsx`) generating ready-to-publish HTML & Markdown Accessibility Statements (EAA 2025 / ADA Title III / Section 508) and embeddable badge snippets for Pro & Agency tiers. |
| **Turnkey CI/CD Quality Gate Builder** | `[Ready]` | Interactive pipeline generator in the Developer API dashboard (`/dashboard`) and `/docs` producing copy-paste **GitHub Actions**, **GitLab CI**, and **Bash / cURL** workflows with configurable failure thresholds (`critical`, `serious`, `strict`). |
| **Executive PDF Export & POUR Conformance Matrix** | `[Ready]` | Serverless PDF synthesis (`/api/reports/pdf`) rendering HTML templates with a VPAT/ACR-style **WCAG 2.2 4-Principle (POUR) Conformance Summary Matrix** to vector PDF via Browserless print options. |
| **Automated Scheduled Monitors & Degradation Alerts** | `[Ready]` | Background recurring scan engine (`/api/cron/monitors`, `/api/monitors`) running on Vercel Cron. Dispatches automated daily/weekly audits for Pro (up to 3) and Agency (up to 10) tiers, with instant Resend HTML email alerts on score drops or new critical violations. |
| **Embeddable Public Compliance Widget** | `[Ready]` | Lightweight, zero-dependency, Shadow-DOM encapsulated compliance trigger and popover (`/widget.js`, `GET /api/widget/[scanId]`). Displays live WCAG 2.2 AA score, POUR conformance matrix, barrier reporting, verified report link, and Agency white-labeling. |
| **Supabase Realtime Live Feedback** | `[Ready]` | WebSocket subscription (`supabase_realtime` publication) tracking scan status changes from `pending` -> `processing` -> `completed` / `failed`. |
| **Interactive Test Sandbox** | `[Ready]` | Client-side playground allowing users to test bad vs accessible HTML snippets in real-time (`components/interactive_sandbox.tsx`). |
| **Developer API & Key Manager** | `[Ready]` | Secure token issuance (`aud_live_...`), SHA-256 database hashing, key preview, and usage tracking (`/api/keys`, `/api/scan`, `/api/fix-suggestions`, `/app/docs`). |
| **Usage Quotas & Tier Enforcement** | `[Ready]` | Multi-tier scanning caps (Free: 5/mo, Pro: 150/mo, Agency: 600/mo) enforced atomically via `lib/quota.ts` with active owner subscription verification (`resolveEffectiveTier`) preventing downgrade loopholes. |
| **Stripe Billing & Customer Portal** | `[Ready]` | Stripe Checkout, Customer Portal redirects, and secure webhook handler (`/api/billing/webhook`) syncing subscriptions to Supabase `profiles`. |
| **Audit Analytics Dashboard** | `[Ready]` | Historical scan trends, pass rates, severity breakdown charts (Recharts), and searchable scan records (`/app/dashboard`). Free tier restricted to latest scan; full searchable archive and trend analytics unlocked on Pro & Agency. |
| **Team Access (3 Seats)** | `[Ready]` | Shared workspace for Agency tier with 3 multi-user seats (1 Owner + 2 Members), shared 600 monthly scan pool, transactional email invitations, and seat manager. |
| **White-Label Custom Branding** | `[Ready]` | Personalization of PDF exports, web reports, compliance statements, and SVG badges for Agency tier with custom agency logo, hex color palette, document taglines, footer disclaimers, and watermark removal. |
| **GDPR / CCPA Self-Serve Account Deletion** | `[Ready]` | Full right-to-erasure endpoint (`DELETE /api/auth/account`) and Settings Danger Zone UI canceling active Stripe subscriptions, purging Supabase Storage PDFs, and cascading user deletion. |
| **Scope & Limitations Transparency** | `[Ready]` | Front-facing notices on scanner and results view explaining ~40%–57% automated detection boundaries and manual audit needs. |
| **Enterprise SSRF & DNS-Rebinding Defense** | `[Ready]` | Strict scheme validation (`http:`/`https:`), DNS resolution verification (`lib/ssrf.ts`), integer/octal/IPv6-mapped IPv4 normalization, and Puppeteer request interception (`scan-site`) blocking redirects to internal IPs or cloud metadata (`169.254.169.254`, `metadata.google.internal`). |
| **Open Redirect Defense & Deep Link Retention** | `[Ready]` | `lib/safe-redirect.ts` relative path defense preventing external credential phishing while preserving user destination intents. |
| **Production HTTP Security Headers** | `[Ready]` | Automated security headers (HSTS, nosniff, SAMEORIGIN, strict-origin-when-cross-origin, permissions-policy). |
| **Cookie & Privacy Consent Banner** | `[Ready]` | Accessible floating privacy notice disclosing essential authentication and Stripe billing cookies, with `/legal` link and `localStorage` state. |
| **Branded Resilient Error Boundaries** | `[Ready]` | Accessible custom 404 (`app/not-found.tsx`) and 500 error boundary (`app/error.tsx`) matching the Universal Beacon brand system. |
| **Universal Beacon Brand & Favicon Ecosystem** | `[Ready]` | Unified logo design across in-app UI, SVG vector components, social OpenGraph card (`/opengraph-image`), and complete favicon suite. |
| **Multi-URL / Whole-Domain Crawler** | `[Planned]` | Recursive sitemap parser and queue worker for scanning entire domain trees. |
| **Automated Pull Request Bot** | `[Planned]` | GitHub App that comments directly on PRs with accessibility regressions and suggested fixes. |
| **Lighthouse Performance Score Pairing** | `[Planned]` | Dual audit capability combining axe-core rules with Google Lighthouse metrics. |
| **Screen Reader Simulation Player** | `[Planned]` | Web Speech API synthetic reader reading the DOM accessibility tree aloud to preview the audio UX. |

---

## 06 Success Metrics & Key Performance Indicators (KPIs)

1. **System Health & Reliability:**
   * Scan Success Rate: $\ge 98.5\%$ of valid HTTP/HTTPS URLs.
   * Median Cold Scan Duration: $\le 6.5$ seconds.
   * Supabase Realtime Latency: $\le 250\text{ ms}$ state propagation.
2. **AI Remediation Efficacy:**
   * High-Confidence Fix Ratio: $\ge 85\%$ of generated recommendations.
   * AI Cache Hit Rate: $\ge 35\%$ across all active organizational workspaces.
   * Fix Generation Duration: $\le 2.0$ seconds on cached hits, $\le 3.5$ seconds on OpenAI generation.
3. **Product & Business Viability:**
   * Free-to-Paid Conversion Rate: Target $4.5\%$ of active users exceeding 5 scans.
   * Monthly API Key Adoption: $\ge 30\%$ of Pro/Agency accounts generating at least 1 key for CI/CD.
   * Report Export Engagement: $\ge 50\%$ of completed scans resulting in PDF generation or public report sharing.

---

## 07 Roadmap & Prioritized Backlog

### Phase 1: Engine & Reliability Hardening (Completed)
* [x] Migrate browser execution from Vercel Next.js routes to Supabase Edge Function to bypass serverless execution caps.
* [x] Implement SHA-256 caching for AI remediation to minimize OpenAI token consumption.
* [x] Implement database-backed API key management with key hashing and polling (`GET /api/scan`).
* [x] Implement WCAG 2.2 Manual Review checklist and axe-core `incomplete` item rendering.
* [x] Harden SSRF protection with DNS-rebinding checks (`lib/ssrf.ts`) and Puppeteer request interception.
* [x] Implement GDPR/CCPA self-serve account deletion (`DELETE /api/auth/account`).
* [ ] Add automated retry mechanism with exponential backoff for transient Browserless connection drops.
* [ ] Support HTTP Basic Authentication and custom request headers for scanning staging environments behind firewalls.

### Phase 2: Commercial Value Expansion & Collaboration (Completed)
* [x] Agency Team Access (3 Multi-User Seats) with shared quota pool (600 scans/mo), transactional invitation dispatch, and seat manager.
* [x] White-Label custom PDF and web report branding for Agency tier (custom logo, hex palette, custom taglines, footer disclaimers, watermark removal).
* [x] Framework-Aware AI Remediation (`HTML`, `React / Tailwind`, `Vue 3`, `Angular`) for Pro & Agency tiers.
* [x] Live SVG Compliance Badge (`GET /api/badge/[scanId]`) & Public Verification View (`/report/[scanId]?verify=1`).
* [x] EAA 2025 & ADA Compliance Kit Modal (`components/compliance_kit_modal.tsx`) with HTML/Markdown statement generator.
* [x] Interactive Turnkey CI/CD Quality Gate Builder (GitHub Actions, GitLab CI, Bash/cURL) and WCAG 2.2 POUR Conformance Matrix in PDF reports.
* [x] Scheduled recurring monitors (daily or weekly automated scans on critical domain routes with email alerts on score degradation).
* [x] Embeddable Public Compliance Widget (zero-dependency Shadow-DOM accessibility statement & live score trigger).
* [ ] Webhook outbound notifications (send scan summaries directly to Slack, Microsoft Teams, or custom endpoints).

### Phase 3: Self-Accessibility, Keyboard Operability & Dogfooding (Completed)
* [x] Automated axe-core regression audit test suite (`scripts/self-a11y-audit.mjs` via `npm run test:a11y`) evaluating all public and authenticated routes.
* [x] Zero-violation verification across 45 rules on `/`, `/login`, `/docs`, `/legal`, and `/_not-found`.
* [x] Zero-dependency modal focus trapping hook (`hooks/use-focus-trap.ts`) enforcing `Tab`/`Shift+Tab` containment, `Escape` key dismissal, and trigger focus restoration.
* [x] WAI-ARIA tablist arrow-navigation patterns (`ArrowLeft`/`ArrowRight`, `tabIndex`, `aria-selected`, `aria-controls`) across all tab interfaces.
* [x] Full landmark architecture with visible-on-focus skip links (`<a href="#main-content">Skip to main content</a>`) and dedicated `<main id="main-content" tabIndex={-1}>` elements.
* [x] Standalone report iframe encapsulation (`app/report/[scanId]/page.tsx`) eliminating nested `<html>`/`<body>` document structures.
* [x] Strict Anti-Emoji policy enforcement: 100% of raw unicode glyphs and emojis replaced with accessible SVGs and screen-reader status regions.
* [x] Accessible text alternative data tables for Recharts visual graphs (`components/dashboard/trend_chart.tsx`).

### Phase 4: Developer Ecosystem (Future)
* [ ] Official `@equivance/cli` NPM package for local pre-commit hooks and zero-dependency terminal runs.
* [ ] Official GitHub Action (`equivance/action`) with PR status checks and branch gate rules.
* [ ] Chrome/Brave Browser Extension enabling one-click DOM audits directly inside developer DevTools.
* [ ] Multi-page recursive crawler parsing `sitemap.xml` with parallel workers.
