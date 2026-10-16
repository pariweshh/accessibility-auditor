# A11ytica Pro

> **The Enterprise-Grade Accessibility Auditing Engine & Compliance Platform**  
> Automated WCAG 2.0, 2.1 & 2.2 Level A/AA audits, real-time streaming scans, OpenAI GPT-4o code remediation, Developer API keys, 3-seat Agency collaboration, and white-label reporting.

![Next.js 16](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)
![React 19](https://img.shields.io/badge/React-19-blue?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-Strict-blue?style=flat-square&logo=typescript)
![Tailwind CSS v4](https://img.shields.io/badge/Tailwind-4.x-38bdf8?style=flat-square&logo=tailwind-css)
![axe-core](https://img.shields.io/badge/axe--core-4.12-orange?style=flat-square)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL%20%2B%20RLS-3ecf8e?style=flat-square&logo=supabase)
![Stripe](https://img.shields.io/badge/Stripe-Subscriptions-635bff?style=flat-square&logo=stripe)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)

---

## Core Features

- **Real Headless Browser Testing** — Executes `axe-core 4.12` inside managed Chromium instances (Browserless.io) with full DOM hydration, JavaScript evaluation, and dynamic settle pauses.
- **Asynchronous Real-Time Pipeline** — Bypasses serverless timeout limits using Next.js `after()` triggers, Deno Edge Functions, and Supabase Realtime WebSocket progress broadcasting.
- **Automated Scheduled Monitoring & Degradation Alerts** — Hourly Vercel Cron worker evaluates active monitor schedules (daily/weekly), verifies quotas, dispatches headless audits, detects compliance regressions ($\ge 5\%$ drop or below threshold), and sends responsive Resend HTML alerts with score diffs and violation breakdowns.
- **Embeddable Public Compliance Widget** — Zero-dependency, lightweight, Shadow-DOM encapsulated compliance trigger and popover (`/widget.js`, `GET /api/widget/[scanId]`) displaying live WCAG score, POUR conformance matrix, barrier reporting, and Agency white-labeling.
- **Zero-Violation Self-Accessibility (Dogfooding)** — Automated CI/CD headless Chrome audit (`npm run test:a11y`) executing axe-core 4.12 across all public and authenticated application routes, guaranteeing 0 violations across 45 WCAG rules, accessible skip navigation, keyboard focus trapping (`hooks/use-focus-trap.ts`), and WAI-ARIA arrow-key tablists.
- **SSRF Defense-in-Depth & DNS-Rebinding Protection** — Strict protocol restriction (`http:`/`https:`), DNS resolution verification (`lib/ssrf.ts`), integer/octal/IPv6-mapped IPv4 normalization, and Puppeteer request interception blocking redirects to internal IPs or cloud metadata (`169.254.169.254`, `metadata.google.internal`).
- **Framework-Aware AI Code Remediation** — OpenAI `gpt-4o` analyzes failing DOM nodes and generates drop-in code patches tailored to **HTML**, **React / JSX + Tailwind**, **Vue 3**, or **Angular** with WCAG 2.2 citations and SHA-256 caching.
- **EAA 2025 & ADA Compliance Kit + Live SVG Badges** — One-click generator for ready-to-publish HTML & Markdown Accessibility Statements (EAA June 2025, ADA Title III, Section 508) paired with dynamic `image/svg+xml` compliance shields (`/api/badge/[scanId]`) and public read-only verification views (`/report/[scanId]?verify=1`).
- **Executive PDF Reports with WCAG 2.2 POUR Matrix** — Vector PDF reports featuring a VPAT/ACR-style 4-Principle (Perceivable, Operable, Understandable, Robust) Conformance Summary Matrix.
- **Developer API & Turnkey CI/CD Quality Gate Builder** — Provision `aud_live_...` API keys, poll scan jobs via `GET /api/scan`, and generate ready-to-commit **GitHub Actions**, **GitLab CI**, and **Bash / cURL** pipeline scripts with custom severity thresholds.
- **Team Workspaces (Agency Tier)** — Pool 600 monthly audits across 3 collaborative team seats with active owner subscription verification (`resolveEffectiveTier`), role-based member management, and shared audit logs.
- **White-Label Custom Branding (Agency Tier)** — Fully customize client web reports, vector PDF exports, compliance statements, and live SVG badges with agency logos, custom primary hex palettes, brand taglines, footer disclaimers, and watermark removal.
- **WCAG 2.2 Manual Review Checklists & Scope Disclaimers** — Prominent in-app transparency notices explaining automated testing boundaries (~40%–57% of WCAG criteria) and comprehensive human review tracking.
- **GDPR/CCPA Privacy & Security Headers** — Self-serve account deletion (`DELETE /api/auth/account`), accessible cookie consent banner, HSTS, `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, and safe redirect validation.
- **Historical Analytics & Trend Graphs** — Track compliance score progress over time with interactive Recharts visualizations.

---

## Commercial Tiers & Plans

| Tier | Price | Monthly Audits | History | Team Seats | Scheduled Monitors | Developer API & CI/CD | Compliance, Reports & Branding | AI Engine |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Free** | $0/mo | 5 audits | Latest scan only | Solo (1 seat) | Locked | Restricted | Standard Web View | GPT-4o-mini (`HTML` only) |
| **Pro** | $19/mo | 150 audits | Unlimited | Solo (1 seat) | **3 active monitors** | Full API + CI/CD Builder | Vector PDF (POUR Matrix) + EAA/ADA Kit + Live SVG Badge + Embeddable Widget | GPT-4o (`HTML`, `React/Tailwind`, `Vue 3`, `Angular`) |
| **Agency** | $59/mo | 600 audits (pooled) | Unlimited | **3 seats included** | **10 pooled monitors** | Full API + CI/CD Builder | **Full White-Label** PDF, Web, Kit, SVG Badge & Embeddable Widget | GPT-4o (`HTML`, `React/Tailwind`, `Vue 3`, `Angular`) |

---

## Architecture & Tech Stack

- **Framework:** Next.js 16.2.9 (App Router, Turbopack)
- **UI & Styling:** React 19.2.7, Tailwind CSS v4, Motion / React (Framer Motion v12)
- **Database & Auth:** Supabase Cloud (PostgreSQL 15+, Row Level Security, Realtime channels, Storage)
- **Headless Chrome:** Puppeteer Core + Browserless.io cloud cluster
- **Audit Engine:** axe-core 4.12.0 (WCAG 2.0 / 2.1 / 2.2 Level A/AA)
- **Scheduled Cron:** Vercel Cron (hourly evaluation with `CRON_SECRET` protection)
- **AI Engine:** OpenAI API (GPT-4o & GPT-4o-mini)
- **Billing:** Stripe (Checkout, Customer Portal, Webhooks)
- **Email:** Resend (Magic link authentication, team invitations & degradation alerts)

---

## Repository Structure

```
accessibility-auditor/
├── app/                                 # Next.js App Router root
│   ├── api/                             # Serverless API routes
│   │   ├── auth/
│   │   │   ├── account/route.ts         # Self-serve GDPR/CCPA account deletion
│   │   │   └── magic-link/route.ts      # Passwordless authentication endpoint
│   │   ├── badge/[scanId]/route.ts      # Dynamic SVG compliance shield endpoint
│   │   ├── billing/                     # Stripe checkout, portal, and webhooks
│   │   ├── cron/
│   │   │   └── monitors/route.ts        # Hourly Vercel Cron monitor execution & degradation worker
│   │   ├── fix-suggestions/route.ts     # Framework-aware OpenAI remediation endpoint
│   │   ├── keys/route.ts                # Developer API key management
│   │   ├── monitors/                    # Scheduled Accessibility Monitors API
│   │   │   ├── route.ts                 # Monitor listing & creation with SSRF check
│   │   │   └── [id]/
│   │   │       ├── route.ts             # Monitor update (status/freq/threshold) & deletion
│   │   │       └── run/route.ts         # On-demand manual monitor audit trigger
│   │   ├── reports/pdf/route.ts         # Vector PDF generator with POUR matrix & branding
│   │   ├── scan/route.ts                # Asynchronous audit dispatcher (POST) & poller (GET)
│   │   ├── team/                        # Team Access & White-Label APIs
│   │   │   ├── route.ts                 # Workspace status & auto-provisioning
│   │   │   ├── invite/route.ts          # Seat quota check & Resend email dispatch
│   │   │   ├── member/route.ts          # Member removal & invite revocation
│   │   │   ├── accept/route.ts          # Token-based team onboarding
│   │   │   └── branding/route.ts        # White-label custom branding API
│   │   ├── widget/[scanId]/route.ts     # Public compliance widget metadata endpoint (CORS)
│   │   └── widget.js/route.ts           # Standalone public compliance widget script server
│   ├── auth/
│   ├── dashboard/                       # Authenticated user analytics dashboard, monitors & CI/CD
│   ├── docs/                            # In-app interactive developer API documentation
│   ├── legal/                           # In-app Terms of Service, Privacy & Disclaimers
│   ├── login/                           # Authentication portal with safe redirect
│   ├── report/[scanId]/page.tsx         # Standalone & public (?verify=1) web audit report
│   ├── error.tsx                        # Global client runtime error boundary (500)
│   ├── not-found.tsx                    # Accessible custom branded 404 page
│   ├── icon.tsx                         # Dynamic SVG/PNG app icon generator
│   ├── opengraph-image.tsx              # Dynamic OpenGraph social card generator
│   ├── manifest.ts                      # Progressive Web App manifest
│   ├── home_client.tsx                  # Landing page interactive client island
│   └── page.tsx                         # Landing page Server Component wrapper
├── components/                          # UI Component Library
│   ├── dashboard/                       # Dashboard widgets (TrendChart, ScanTable, etc.)
│   ├── motion/                          # Micro-interaction primitives
│   ├── brand_logo.tsx                   # Universal Beacon identity vector component
│   ├── compliance_kit_modal.tsx         # EAA 2025 / ADA Compliance Kit & SVG badge modal
│   ├── cookie_consent.tsx               # Floating essential privacy consent notice
│   ├── fix_suggestion.tsx               # AI code diff card with explanation
│   ├── incomplete_card.tsx              # axe-core needs review triage cards
│   ├── issue_card.tsx                   # Individual WCAG issue renderer with framework selector
│   ├── manual_checklist.tsx             # WCAG 2.2 manual audit criteria
│   ├── pricing_section.tsx              # Pricing tier matrix with checkout hooks
│   ├── results_display.tsx              # Scan overview, severity bar, and filter tabs
│   ├── scan_form.tsx                    # URL submission form with SSRF & scope notice
│   ├── scan_progress.tsx                # Realtime animated audit progress stepper
│   └── settings_modal.tsx               # Account settings, AI framework default & GDPR deletion
├── docs/                                # Authoritative Engineering Documentation
│   ├── PRD.md                           # Product Requirements Document
│   ├── ARCHITECTURE.md                  # System architecture, topology & data flows
│   ├── DATABASE.md                      # Schema, RLS policies, indexes & migrations
│   ├── API.md                           # Developer API reference
│   ├── SECURITY.md                      # Security, threat modeling & defense-in-depth
│   ├── CODE_STYLE.md                    # Engineering standards & linting conventions
│   ├── TESTING.md                       # Test suites & quality assurance strategy
│   ├── DESIGN_SYSTEM.md                 # Design system tokens & aesthetic principles
│   ├── SETUP.md                         # Setup & deployment walkthrough
│   ├── AGENTS.md                        # AI agent orchestration guide
│   ├── LAUNCH_CHECKLIST.md              # Master Pre-Launch & Revenue Readiness Checklist
│   └── LEGAL.md                         # Terms, Privacy Policy & Disclaimers
├── hooks/                               # Custom React Hooks
│   └── use-focus-trap.ts                # WAI-ARIA modal dialog focus containment & keyboard trapping
├── lib/                                 # Shared business logic and singletons
│   ├── quota.ts                         # Atomic quota deduction & resolveEffectiveTier pooling
│   ├── safe-redirect.ts                 # Protocol-relative & open redirect defense
│   ├── ssrf.ts                          # DNS-rebinding & private/reserved IPv4/IPv6 SSRF guard
│   ├── ai-fixer.ts                      # Framework-aware OpenAI client & SHA-256 fix cache
│   ├── monitor-alert-email.ts           # Resend degradation alert email template synthesizer
│   ├── report-template.ts               # White-label HTML report & POUR matrix synthesizer
│   ├── scanner.ts                       # Local development Puppeteer launcher
│   ├── site.ts                          # Canonical domain and metadata configuration
│   ├── constants.ts                     # Tier limits, WCAG rules, and checklists
│   └── types.ts                         # Strict TypeScript domain interfaces
├── scripts/                             # Automation, Audit & Verification Scripts
│   └── self-a11y-audit.mjs              # Headless Chrome + axe-core dogfooding audit
├── supabase/                            # Supabase cloud config & migrations
│   ├── functions/scan-site/index.ts     # Deno Edge Function executing Browserless scans
│   └── migrations/                      # Version-controlled SQL migration scripts
└── vercel.json                          # Deployment memory, duration & cron definitions
```

---

## Quick Start

### 1. Installation
```bash
git clone https://github.com/pariweshh/accessibility-auditor.git
cd accessibility-auditor
npm install
```

### 2. Configure Environment
Copy `.env.local` and add your Supabase, OpenAI, Browserless, Resend, and Stripe keys (see [docs/SETUP.md](docs/SETUP.md)).

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the application.

### 4. Quality Verification
```bash
npx tsc --noEmit       # Type check strict mode (0 errors)
npm run lint           # ESLint verification (0 warnings)
npm test               # Unit & integration test suites
npm run test:a11y       # Headless Chrome self-accessibility audit (0 violations)
npm run build          # Next.js production build verification
```

---

## Documentation Directory

For complete architectural specifications, please review the authoritative documents in `docs/`:
- [Product Requirements (PRD.md)](docs/PRD.md)
- [System Architecture (ARCHITECTURE.md)](docs/ARCHITECTURE.md)
- [Database & Migrations (DATABASE.md)](docs/DATABASE.md)
- [Developer API Reference (API.md)](docs/API.md)
- [Security & Threat Model (SECURITY.md)](docs/SECURITY.md)
- [Testing & Quality Assurance (TESTING.md)](docs/TESTING.md)
- [Design System & UI Tokens (DESIGN_SYSTEM.md)](docs/DESIGN_SYSTEM.md)
- [Setup & Deployment Guide (SETUP.md)](docs/SETUP.md)
- [Pre-Launch & Revenue Readiness Checklist (LAUNCH_CHECKLIST.md)](docs/LAUNCH_CHECKLIST.md)
- [Legal, Terms & Privacy (LEGAL.md)](docs/LEGAL.md)

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
