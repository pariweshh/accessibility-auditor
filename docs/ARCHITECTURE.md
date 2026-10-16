# Architecture Documentation

> **Status:** Active / Comprehensive Baseline  
> **Framework:** Next.js 16 (App Router) + Turbopack  
> **Platform Infrastructure:** Vercel (Frontend & Edge) + Supabase Cloud (Postgres, Realtime, Storage, Edge Functions) + Browserless.io (Headless Chrome Cluster)  
> **Last Updated:** October 2026

---

## 01 System Overview

A11ytica Pro is built as an asynchronous, distributed accessibility auditing engine designed to eliminate the timeout constraints of serverless environments while maintaining real-time feedback for users.

### High-Level Topology

```
┌────────────────────────────────────────────────────────────────────────┐
│                              CLIENT TIER                               │
│  Next.js 16 App Router (React 19) · Tailwind CSS v4 · Motion/React     │
│  - Landing & Interactive Sandbox                                       │
│  - Authenticated Analytics Dashboard                                   │
│  - Supabase Realtime WebSocket Listener                                │
└────────────────────┬─────────────────────────────▲─────────────────────┘
                     │                             │
        HTTP POST    │                             │ WebSocket Events
       /api/scan     │                             │ (status updates)
                     ▼                             │
┌──────────────────────────────────────────────────┴─────────────────────┐
│                           APPLICATION TIER                             │
│  Vercel Serverless (Node.js 20+ Runtime)                               │
│  - Route Handlers (/api/scan, /api/fix-suggestions, /api/keys)         │
│  - Session Auth Verification (@supabase/ssr)                           │
│  - API Key Extraction & SHA-256 Hashing                                │
│  - Atomic Quota & Tier Enforcement (lib/quota.ts)                      │
│  - Next.js after() Background Trigger                                  │
└────────────────────┬───────────────────────────────────────────────────┘
                     │
       Async Trigger │ HTTP POST
                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        COMPUTE & SCANNING TIER                         │
│  Supabase Edge Functions (Deno Runtime) · scan-site                    │
│  - Concurrency Limiter (MAX_CONCURRENT_SCANS slot waiting)             │
│  - Remote Browser WebSocket Connection                                 │
└────────────────────┬───────────────────────────────────────────────────┘
                     │
          WSS        │ Connect
                     ▼
┌───────────────────────────────────────────────┐
│              BROWSERLESS.IO                   │
│  Managed Chromium Cloud Cluster               │
│  - Evaluates JavaScript & DOM Hydration       │
│  - Injects & Executes axe-core 4.12           │
│  - Compiles Violations & Incomplete Items     │
└───────────────────────────────────────────────┘
                     │
                     │ Persists Scan Results & State
                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│                             DATA TIER                                  │
│  Supabase PostgreSQL (Multi-AZ)                                        │
│  - Row Level Security (RLS) on all tables                              │
│  - Realtime Publication (supabase_realtime)                            │
│  - Storage Bucket (private 'reports' for generated PDFs)               │
│  - SHA-256 Cache (ai_fix_cache for instant AI remediation)             │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 02 Tech Stack & Service Matrix

| Layer | Technology | Version | Purpose & Rationale |
| :--- | :--- | :--- | :--- |
| **Framework** | Next.js | `16.2.9` | React Server Components (RSC), Turbopack compilation, API Route Handlers. |
| **Runtime** | React | `19.2.7` | Concurrent rendering, leaf client islands, optimized DOM hydration. |
| **Language** | TypeScript | `6.x` | Strict type contracts across scan payloads, database schemas, and AI responses. |
| **Styling** | Tailwind CSS | `4.x` | Utility-first CSS engine using `@tailwindcss/postcss`. |
| **Motion** | Motion / React | `12.40.0` | Declarative spring physics, micro-interactions, layout transitions. |
| **Database** | PostgreSQL (Supabase) | `15+` | Relational storage, JSONB violation trees, Row Level Security (RLS). |
| **Realtime** | Supabase Realtime | `2.x` | WebSockets broadcasting scan lifecycle (`pending` -> `processing` -> `completed`). |
| **Edge Compute** | Supabase Functions | Deno | Long-running headless browser orchestrator bypassing Vercel 10s limits. |
| **Headless Chrome**| Browserless.io | Cloud | Managed Chromium WebSocket cluster (`puppeteer-core`). |
| **Audit Engine** | axe-core | `4.12.0` | Industry-standard WCAG 2.0/2.1/2.2 Level A/AA evaluation engine. |
| **AI Remediation**| OpenAI API | `6.42.0` | GPT-4o-mini (default) & GPT-4o (Pro/Agency) for precise code fixes. |
| **Billing** | Stripe | `22.2.0` | Subscription billing, webhook synchronization, Customer Portal. |
| **Transactional Email**| Resend | `6.12.4` | Magic link authentication and automated audit alert notifications. |
| **Visual Charts** | Recharts | `3.8.1` | Responsive historical compliance trends and severity breakdown graphs. |

### Commercial Tier & Plan Specifications

| Tier | Price | Monthly Scans | Scan History | Team Seats | Scheduled Monitors | Developer API & CI/CD | Compliance, Reports & Branding | AI Engine |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Free** | $0/mo | 5 scans | 1 scan (latest only) | 1 (solo) | Locked | Restricted | Standard Web View | GPT-4o-mini (`HTML` only) |
| **Pro** | $19/mo | 150 scans | Unlimited | 1 (solo) | **3 active monitors** | Full API Keys + CI/CD Builder | Branded Web + Vector PDF (POUR Matrix) + EAA 2025/ADA Kit + Live SVG Badge + Embeddable Widget | GPT-4o (`HTML`, `React/Tailwind`, `Vue 3`, `Angular`) |
| **Agency** | $59/mo | 600 scans (pooled) | Unlimited | 3 seats included | **10 pooled monitors** | Full API Keys + CI/CD Builder | Full White-Label (Custom Logo, Colors, Header/Footer, No Watermark, White-Label Kit, SVG Badge & Widget) | GPT-4o (`HTML`, `React/Tailwind`, `Vue 3`, `Angular`) |

---

## 03 Project Structure

```
accessibility-auditor/
├── app/                                 # Next.js App Router root
│   ├── api/                             # Serverless API routes
│   │   ├── auth/
│   │   │   ├── account/route.ts         # Self-serve GDPR/CCPA account deletion endpoint
│   │   │   └── magic-link/route.ts      # Passwordless authentication endpoint
│   │   ├── badge/[scanId]/route.ts      # Dynamic SVG compliance shield endpoint
│   │   ├── billing/                     # Stripe integration
│   │   │   ├── checkout/route.ts        # Stripe Checkout session creator
│   │   │   ├── portal/route.ts          # Stripe Customer Portal redirect
│   │   │   └── webhook/route.ts         # Stripe event listener & profile updater
│   │   ├── cron/
│   │   │   └── monitors/route.ts        # Vercel Cron worker executing due monitors & alert dispatch
│   │   ├── fix-suggestions/route.ts     # Framework-aware OpenAI remediation endpoint
│   │   ├── keys/route.ts                # API Key creation, listing, revocation
│   │   ├── monitors/                    # Scheduled Accessibility Monitors API
│   │   │   ├── route.ts                 # Monitor listing & provisioning with SSRF check
│   │   │   └── [id]/
│   │   │       ├── route.ts             # Status toggle, threshold update, deletion
│   │   │       └── run/route.ts         # Instant on-demand audit trigger
│   │   ├── reports/pdf/route.ts         # Vector PDF generation (with POUR matrix) & storage
│   │   ├── scan/route.ts                # Core scan dispatcher (POST) & polling endpoint (GET)
│   │   └── team/                        # Agency Team Access API
│   │       ├── route.ts                 # Team lookup & auto-provisioning
│   │       ├── invite/route.ts          # Seat quota check & email dispatch
│   │       ├── member/route.ts          # Member removal & invite revocation
│   │       ├── accept/route.ts          # Secure token-based invitation acceptance
│   │       └── branding/route.ts        # White-label custom branding API
│   ├── auth/
│   │   ├── callback/route.ts            # Supabase OAuth/Magic link callback with safe redirect
│   │   └── join/page.tsx                # Team workspace invitation onboarding with returnTo
│   ├── dashboard/                       # Authenticated user analytics dashboard
│   │   ├── dashboard_client.tsx         # Dashboard shell + Scheduled Monitors + CI/CD Builder
│   │   ├── layout.tsx                   # Auth gate layout with returnTo bounce preservation
│   │   └── page.tsx                     # Dashboard entry
│   ├── docs/                            # In-app interactive developer API & CI/CD documentation
│   ├── legal/                           # In-app Terms of Service, Privacy & Disclaimers
│   ├── login/                           # User login & magic link submission with safe redirect
│   ├── report/[scanId]/page.tsx         # Private & public (?verify=1) web-based audit report view
│   ├── error.tsx                        # Global client runtime error boundary (500)
│   ├── not-found.tsx                    # Accessible custom branded 404 page
│   ├── icon.tsx                         # Dynamic SVG/PNG app icon generator
│   ├── opengraph-image.tsx              # Dynamic OpenGraph social card generator
│   ├── manifest.ts                      # Progressive Web App manifest
│   ├── globals.css                      # Tailwind v4 theme directives & glass tokens
│   ├── home_client.tsx                  # Landing page interactive client island
│   ├── layout.tsx                       # Root HTML shell, fonts, JSON-LD schema, CookieConsent
│   ├── page.tsx                         # Landing page Server Component wrapper
│   ├── robots.ts                        # SEO robots definition
│   └── sitemap.ts                       # Dynamic XML sitemap generator
├── components/                          # React Component Library
│   ├── dashboard/                       # Dashboard widgets (TrendChart, StatsCards, ScanTable)
│   ├── motion/                          # Micro-interaction primitives (AnimatedText, ProgressRing, Shimmer)
│   ├── brand_logo.tsx                   # Universal Beacon identity vector component
│   ├── compliance_kit_modal.tsx         # EAA 2025 / ADA Compliance Statement & SVG Badge generator
│   ├── cookie_consent.tsx               # Floating essential privacy consent notice
│   ├── fix_suggestion.tsx               # AI remediation card with before/after diff
│   ├── incomplete_card.tsx              # axe-core needs review triage cards
│   ├── issue_card.tsx                   # Individual WCAG issue renderer with framework selector
│   ├── manual_checklist.tsx             # WCAG 2.2 criteria requiring human review
│   ├── pricing_section.tsx              # Tier matrix with Stripe checkout buttons
│   ├── results_display.tsx              # Scan overview, severity bar, Compliance Kit trigger & tabs
│   ├── scan_form.tsx                    # URL submission form with SSRF & scope notice
│   ├── scan_progress.tsx                # Realtime animated audit progress stepper
│   └── settings_modal.tsx               # Account settings, default AI framework & GDPR deletion
├── docs/                                # Authoritative engineering documentation
│   ├── PRD.md                           # Product Requirements Document
│   ├── DESIGN_SYSTEM.md                 # Design System & UI/UX Guidelines
│   ├── ARCHITECTURE.md                  # This document
│   ├── DATABASE.md                      # Schema, RLS, Indexes, & Migrations
│   ├── SECURITY.md                      # Security, SSRF defense, & Key safety
│   ├── CODE_STYLE.md                    # Engineering standards & Linting
│   ├── TESTING.md                       # Test strategy & Quality assurance
│   ├── AGENTS.md                        # AI Agent roles & autonomous workflows
│   ├── LAUNCH_CHECKLIST.md              # Master Pre-Launch & Revenue Readiness Checklist
│   └── LEGAL.md                         # Terms, Privacy & Compliance Disclaimers
├── hooks/                               # Custom React Hooks
│   ├── use-focus-trap.ts                # WAI-ARIA modal dialog focus containment & keyboard trapping
│   ├── use-reduced-motion.tsx           # Vestibular disorder motion preference hook
│   └── use-scroll-reveal.tsx            # IntersectionObserver animation hook
├── lib/                                 # Shared business logic and singletons
│   ├── supabase/                        # Database clients
│   │   ├── client.ts                    # Browser client with auth state
│   │   ├── server.ts                    # Cookie-based Server Component client
│   │   └── proxy.ts                     # Auth session refresher proxy
│   ├── safe-redirect.ts                 # Protocol-relative & open redirect defense
│   ├── ssrf.ts                          # DNS-rebinding & private/reserved IPv4/IPv6 SSRF guard
│   ├── ai-fixer.ts                      # Framework-aware OpenAI client & SHA-256 fix cache
│   ├── monitor-alert-email.ts           # Resend degradation alert email template synthesizer
│   ├── constants.ts                     # WCAG standard constants, tier limits, checklists
│   ├── quota.ts                         # Atomic quota deduction & resolveEffectiveTier check
│   ├── report-template.ts               # White-label HTML report & WCAG 2.2 POUR matrix synthesizer
│   ├── scanner.ts                       # Local development Puppeteer launcher
│   ├── site.ts                          # Canonical domain and metadata configuration
│   └── types.ts                         # Core TypeScript interfaces (including ScheduledMonitor)
├── scripts/                             # Automation, Audit & Verification Scripts
│   └── self-a11y-audit.mjs              # Headless Chrome + axe-core dogfooding audit
├── supabase/                            # Supabase cloud config
│   ├── functions/scan-site/index.ts     # Deno Edge Function executing Browserless scans
│   └── migrations/                      # Version-controlled SQL migration scripts
│       ├── 20260613000000_team_access.sql
│       ├── 20260614000000_white_label_branding.sql
│       └── 20260615000000_scheduled_monitors.sql
└── vercel.json                          # Deployment memory, duration & cron definitions
```

---

## 04 Data Flow: End-to-End Audit Lifecycle

```
[User Browser / CI Pipeline]
      │
      │ 1. Submits URL via ScanForm.tsx or POST /api/scan
      ▼
[POST /api/scan]
      │
      │ 2. Validates URL format; enforces SSRF & DNS-rebinding check (lib/ssrf.ts)
      │ 3. Identifies user (Session Cookie OR 'x-api-key' SHA-256 hash lookup)
      │ 4. Verifies monthly quota limit & active team owner tier (lib/quota.ts)
      │ 5. Inserts new record in 'scans' table (status = 'pending')
      │ 6. Dispatches fire-and-forget fetch to Edge Function inside Next.js after()
      ▼
[Client Browser / CI] <── Returns 202 Accepted { scanId }
      │
      │ 7. Browser opens Supabase Realtime channel (scans:id=eq.${scanId})
      │    OR CI pipeline polls GET /api/scan?scanId=${scanId}
      │ 8. Displays ScanProgress.tsx stepper
      ▼
[Supabase Edge Function: scan-site]
      │
      │ 9. Checks MAX_CONCURRENT_SCANS; queues if slot is unavailable
      │ 10. Updates scans record (status = 'processing') ──> [Realtime triggers step 2 in UI]
      │ 11. Connects to Browserless.io cluster via secure WebSocket (WSS)
      │ 12. Enables request interception (blocks HTTP 302 redirects to internal/private IPs)
      │ 13. Navigates to target URL (domcontentloaded, timeout 30s)
      │ 14. Injects axe-core 4.12 from CDN and executes window.axe.run()
      │ 15. Extracts:
      │       - violations (impact, description, helpUrl, DOM nodes, failureSummary)
      │       - incomplete (checks requiring human review)
      │       - passes count
      │ 16. Calculates summary counts (critical, serious, moderate, minor)
      │ 17. Closes browser tab & disconnects WebSocket
      │ 18. Updates scans record (status = 'completed', result = JSONB) & inserts relational rows into 'violations'
      ▼
[Client Browser]
      │
      │ 19. Receives 'completed' event via WebSocket
      │ 20. Replaces progress stepper with ResultsDisplay.tsx
      │ 21. User selects target framework (HTML / React+Tailwind / Vue 3 / Angular) and clicks "Get AI Fix"
      ▼
[POST /api/fix-suggestions]
      │
      │ 22. Generates keyHash = SHA-256(issueId + ":" + framework + ":" + originalHtml + ":" + model)
      │ 23. Queries ai_fix_cache table
      │       ├── Hit: Returns cached framework fix instantly (0ms token latency)
      │       └── Miss: Invokes OpenAI (GPT-4o / GPT-4o-mini), parses JSON, persists to cache, returns fix
      ▼
[User Browser]
      │
      │ 24. Displays interactive before-and-after code diff with framework badge & explanation
```

---

## 05 Scalability, Performance & Reliability

### 1. Concurrency Management
* Browserless.io concurrent connections are constrained by plan tiers.
* The `scan-site` Edge Function includes an active slot-wait loop (`MAX_CONCURRENT_SCANS`, default `3`). If the concurrent scan ceiling is reached, incoming requests back off and retry every 2,000ms up to 60 seconds before failing open, ensuring the headless cluster is never overwhelmed with memory exhaustion.

### 2. Next.js `after()` Lifecycle Safeguard
* In serverless hosting (Vercel), terminating an HTTP response (`202 Accepted`) immediately freezes the CPU container.
* Un-awaited background tasks (`fetch(edgeFnUrl)`) would be abruptly killed. A11ytica Pro utilizes Next.js's native `after()` callback (`app/api/scan/route.ts`), keeping the container alive until the dispatch request is delivered to Supabase.

### 3. AI Token Optimization & Cost Control
* Accessibility issues are highly repetitive across the web (e.g., standard React button missing text, `<img src="...">` missing `alt`).
* The `ai_fix_cache` database table prevents duplicate OpenAI calls across all users. Once a specific violation node is solved for a given framework (`html`, `react-tailwind`, `vue`, `angular`), future scans referencing the identical HTML node and framework return the cached remediation in `< 80ms` with zero OpenAI API cost.

---

## 06 Team Access & Quota Pooling Architecture

For Agency tier accounts ($59/mo), A11ytica Pro supports up to 3 collaborative team seats pooling a shared monthly allowance of 600 audits.

### 1. Data Model & Hierarchy
* **`teams` Table:** Owned by an Agency subscriber (`owner_id`), tracks custom branding assets and max seat allocation (`max_seats = 3`).
* **`team_members` Table:** Connects invited collaborators by `email` and `user_id`. Lifecycle states: `pending` (invite token issued) -> `accepted` (active collaborator).
* **`scans.team_id` Foreign Key:** Audits executed by any teammate or the owner are tagged with the active `team_id`, making them collectively visible on the shared team dashboard with a `Team` attribution badge.

### 2. Teammate Tier Inheritance & Active Owner Verification (`resolveEffectiveTier`)
```
[User initiates Scan / AI Fix / PDF Export / API Key / Compliance Kit]
                 │
                 ▼
  [Check profiles.subscription_tier & subscription_status]
                 │
        ┌────────┴────────┐
   'agency'/'pro'       'free'
   (active status)        │
        │                 ▼
        ▼        [Check active team_members membership]
   Direct Pass            │
                 ┌────────┴────────┐
               Found            Not Found
                 │                 │
                 ▼                 ▼
     [Verify Team Owner's      Free Tier Rules
      profile is 'agency'      (5 scans/mo limit,
      & status === 'active']   1 history scan,
                 │             HTML AI fixes only)
        ┌────────┴────────┐
      Active          Inactive/Canceled
        │                 │
        ▼                 ▼
   Elevate to Agency   Revert to Free Tier
```

* **Quota Pooling (`lib/quota.ts`):** When evaluating scan limits, `checkMonthlyQuota()` and `resolveEffectiveTier()` verify both that the user is an owner or active member of a team AND that the team owner's `subscription_tier === 'agency'` with an active subscription status. If the owner downgrades or cancels, the entire workspace immediately reverts to Free tier limits.

---

## 07 White-Label Custom Branding & Compliance Artifacts

Agency subscribers can completely white-label client-facing web audit reports (`/report/[scanId]`), exported vector PDF documents, EAA 2025 / ADA Compliance Statements, and Live SVG Compliance Badges.

### 1. Customization Pipeline
1. **Studio Configuration (`app/dashboard/dashboard_client.tsx`):**
   * Owners configure agency name, custom logo URL, brand primary color (`#HEX`), custom subtitle tagline, footer compliance text, and watermark toggle.
   * Real-time preview renders an interactive simulated document canvas using the exact CSS variables and layout parameters.
2. **Server-Side Branding Injection (`lib/report-template.ts` & `app/api/badge/[scanId]/route.ts`):**
   * Web reports (`app/report/[scanId]/page.tsx`), PDF export route (`app/api/reports/pdf/route.ts`), and SVG badge route (`app/api/badge/[scanId]/route.ts`) query the owner's `teams` record.
   * The template engine swaps default A11ytica Pro styling with the agency's primary color, injects the agency logo, customizes header/footer disclaimers, includes the **WCAG 2.2 4-Principle (POUR) Conformance Summary Matrix**, and removes the "Powered by A11ytica Pro" watermark.
3. **Storage & Cache Bypassing:**
   * Generated PDFs are stored in Supabase private bucket `reports/{scanId}.pdf`.
   * When agency branding settings are saved, or when a forced export is requested (`POST /api/reports/pdf` with `{ force: true }`), the server invalidates the cached PDF in Supabase Storage and regenerates a fresh branded document.

---

## 08 Scheduled Monitoring & Degradation Alert Architecture

A11ytica Pro incorporates an automated compliance monitoring pipeline allowing Pro and Agency subscribers to continuously track production URLs, detect regressions, and receive immediate actionable email alerts.

```
┌────────────────────────┐
│      Vercel Cron       │ (Hourly: '0 * * * *')
└───────────┬────────────┘
            │
            │ HTTP GET /api/cron/monitors (Authorization: Bearer CRON_SECRET)
            ▼
┌────────────────────────────────────────────────────────┐
│               CRON DISPATCHER & WORKER                 │
│               app/api/cron/monitors/route.ts           │
│                                                        │
│ 1. Verifies CRON_SECRET bearer token                   │
│ 2. Queries public.monitors (status = 'active' &        │
│    next_run_at <= NOW())                               │
│ 3. Resolves effective tier & subscription status       │
│    (Pro: max 3 monitors; Agency: max 10 monitors)     │
│ 4. Verifies remaining monthly scan quota               │
│ 5. Creates pending scan record in database             │
│ 6. Dispatches scan to Supabase Edge Function           │
│ 7. Computes score delta & degradation condition:       │
│    - Score drop >= 5 points, OR                        │
│    - Score falls below monitor.alert_threshold         │
│ 8. Advances next_run_at (+1 day or +7 days)            │
│ 9. Synthesizes & sends Resend alert email if degraded  │
└───────────┬────────────────────────────────┬───────────┘
            │                                │
            │ Asynchronous Audit Dispatch    │ Resend Email Alert
            ▼                                ▼
┌────────────────────────┐      ┌────────────────────────┐
│  Supabase Edge Fn      │      │     Resend API         │
│  (scan-site)           │      │  (lib/monitor-alert-   │
│  Headless Chromium     │      │   email.ts)            │
└────────────────────────┘      └────────────────────────┘
```

### 1. Security & Quota Enforcement
* **Cron Authentication:** Protected by an environment secret `CRON_SECRET`. All requests must supply `Authorization: Bearer ${CRON_SECRET}`. Unauthenticated triggers return `401 Unauthorized`.
* **Subscription & Tier Check:** Before executing, `resolveEffectiveTier(supabase, monitor.user_id)` confirms the monitor owner maintains an active Pro or Agency subscription. Monitors belonging to downgraded or canceled accounts are automatically transitioned to `status = 'paused'`.
* **Monthly Quota Gate:** Automated runs consume from the user's or team's monthly scan allowance. If the monthly scan quota is exhausted, the monitor is skipped without failing or corrupting data.
* **SSRF Guard:** Monitors can only be registered for validated, public HTTP/HTTPS URLs verified through `validateScanTargetUrl()` at creation time.

### 2. Regression Detection & Actionable Alerting
* **Degradation Formula:** Regression is triggered when `(previous_score - new_score) >= 5` or when `new_score < alert_threshold`.
* **Email Synthesis (`lib/monitor-alert-email.ts`):** Renders a responsive email including:
  * Previous vs. New Compliance Score with color-coded diff badges.
  * Breakdown of newly introduced or failing WCAG violations by severity (Critical, Serious, Moderate, Minor).
  * Direct deep links to the full audit report and 1-click AI Remediation Engine.
  * Agency white-label branding inheritance (custom agency name, primary brand accent color, and custom header/footer) if the monitor belongs to an Agency team.

---

## 09 Embeddable Public Compliance Widget Architecture

A11ytica Pro enables subscribers to embed an interactive, fully accessible compliance widget directly on their external web properties with a single script tag:
```html
<script src="https://a11ytica.com/widget.js" data-scan-id="<scanId>" data-position="bottom-right" async defer></script>
```

```
┌────────────────────────────────────────────────────────┐
│                    HOST WEBSITE                        │
│                                                        │
│  <script src="https://a11ytica.com/widget.js" ...>    │
└───────────────────────────┬────────────────────────────┘
                            │
                            │ 1. Mounts host container to document.body
                            ▼
┌────────────────────────────────────────────────────────┐
│                   SHADOW DOM ROOT                      │
│                                                        │
│  [ Trigger Pill Button: "WCAG 2.2 AA · 96% Pass" ]     │
│       │                                                │
│       │ 2. Click / Enter key opens accessible dialog   │
│       ▼                                                │
│  [ Modal Dialog (role="dialog", aria-modal="true")     │
│    - Conformance Score & Level                         │
│    - POUR 4-Principle Conformance Grid                 │
│    - Barrier Reporting Link (mailto: / URL)            │
│    - Agency White-Label Branding & Logo                │
│    - Verified Audit Report Link (/report/id?verify=1)  │
│    - Zero-Overlay Scope Disclaimer ]                   │
└───────────────────────────┬────────────────────────────┘
                            │
                            │ 3. Fetches public scan summary & branding
                            ▼
┌────────────────────────────────────────────────────────┐
│            GET /api/widget/[scanId]                    │
│                                                        │
│  - UUID verification                                   │
│  - resolveEffectiveTier(scan.user_id) gate             │
│  - Quotas & completed status check                     │
│  - Agency branding resolution (teams table)            │
│  - PII masking (never exposes owner email)             │
│  - Cache-Control: public, max-age=300                  │
│  - Access-Control-Allow-Origin: *                      │
└────────────────────────────────────────────────────────┘
```

### 1. Zero-Overlay Design Philosophy
Unlike controversial commercial overlays that inject destructive DOM hacks that often interfere with screen readers, A11ytica Pro's widget is strictly an **Accessibility Statement & Conformance Status Badge**. It does not intercept keyboard commands, re-map DOM nodes, or alter host styling.

### 2. Shadow DOM CSS Isolation
The client script (`public/widget.js`, served via `/widget.js`) uses an open **Shadow DOM** (`host.attachShadow({ mode: "open" })`) to ensure:
* Host website CSS (Bootstrap, Tailwind, WordPress stylesheets, CSS resets) cannot leak in or break widget typography, buttons, or dialogs.
* Widget styling cannot bleed out into the host page.

### 3. Accessible Dialog Lifecycle (WCAG 2.2 AA)
* **Trigger Element:** Standard `<button>` with `role="button"`, `aria-haspopup="dialog"`, `aria-expanded="false"`, and accessible label.
* **Dialog Element:** `<div role="dialog" aria-modal="true" aria-labelledby="a11ytica-title">`.
* **Focus Management:** Focus is automatically directed to the dialog close button upon opening; keyboard focus is trapped within the dialog cycling via `Tab` / `Shift+Tab`; pressing `Escape` closes the dialog and restores focus to the trigger button.
* **Motion Preferences:** `@media (prefers-reduced-motion: reduce)` disables slide transitions and transform scaling.

### 4. Cross-Origin Data Delivery & Tier Gating
* `GET /api/widget/[scanId]` provides CORS headers (`Access-Control-Allow-Origin: *`).
* If the scan belongs to a **Free** tier account, the endpoint returns `403 Forbidden` (`tier: "free"`), preventing unauthorized embeds.
* If the scan belongs to an **Agency** account, the endpoint queries `public.teams` and injects the agency's custom brand name, logo URL, and primary hex color, removing all A11ytica Pro watermarks.

---

## 10 Defensive Infrastructure & Trust Disclosures

### 1. SSRF, DNS-Rebinding & Request Interception Architecture (`lib/ssrf.ts` & `scan-site`)
* **Strict URL Scheme Gate:** All incoming scan targets are evaluated for `http:` or `https:`. Non-web schemes (`file:`, `ftp:`, `javascript:`, `data:`, `gopher:`) are rejected immediately with `400 Bad Request`.
* **DNS Resolution & IP Normalization (`lib/ssrf.ts`):** Resolves hostnames via `dns.lookup({ all: true })` before dispatching scans and blocks private/reserved IPv4 and IPv6 ranges, cloud metadata endpoints (`169.254.169.254` IMDS, `metadata.google.internal`), decimal/octal IP encodings (`2130706433`), and IPv6-mapped IPv4 addresses (`[::ffff:169.254.169.254]`).
* **Headless Browser Redirect Interception (`supabase/functions/scan-site/index.ts`):** Enables `page.setRequestInterception(true)` inside Puppeteer to inspect every sub-request and HTTP `302` redirect target during page load, aborting any navigation to internal, loopback, or link-local addresses.

### 2. Open Redirect Defense Architecture (`lib/safe-redirect.ts`)
* Authentication returns, team invitations (`/auth/join`), and session proxy bounces pass through `getSafeRedirectUrl()`. Protocol-relative URLs (`//external.com`) and backslashes are sanitized to prevent credential phishing while safely preserving in-app deep links and checkout intentions.

### 3. Automated Testing Scope & Front-Facing Disclaimers
* Transparently discloses the technical boundary of automated testing directly on `ScanForm.tsx` and `ResultsDisplay.tsx`.
* Clarifies that axe-core algorithms detect ~40%–57% of WCAG criteria (color contrast, alt tags, ARIA attributes, semantic structure) and directs users to `/legal` for full compliance terms and manual audit guidance.

### 4. Resilient Error Containment Architecture
* Custom `app/not-found.tsx` provides accessible, branded navigation recovery.
* Global client error boundary `app/error.tsx` catches React rendering exceptions with an incident digest, `role="alert"`, and recovery retry trigger (`reset()`).

---

## 11 Self-Accessibility (Dogfooding) & Zero-Violation Architecture

As an accessibility testing and compliance product, A11ytica Pro dogfoods its own platform with zero-violation standards across all public and authenticated surfaces.

### 1. Zero-Dependency Focus Trapping (`hooks/use-focus-trap.ts`)
* Modal dialogs must trap keyboard focus so screen readers and keyboard users cannot inadvertently tab into background page elements behind backdrops.
* Instead of introducing third-party bundle bloat, `useFocusTrap` is implemented using native React DOM APIs:
  * Selects all focusable descendants (`a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])`).
  * Auto-focuses the first interactive element (or modal container) upon open.
  * Intercepts `Tab` and `Shift+Tab` to wrap focus within the boundary.
  * Listens for `Escape` to trigger immediate dismissal.
  * Preserves `document.activeElement` before open and restores focus to the invoking trigger button upon dismissal.
* Deployed across `SettingsModal`, `ComplianceKitModal`, and `CreateMonitorModal`.

### 2. Landmark Architecture & Visible-on-Focus Skip Navigation
* **Skip Navigation Link:** `app/layout.tsx` renders `<a href="#main-content" className="sr-only focus:not-sr-only ...">Skip to main content</a>`, enabling keyboard users to bypass persistent headers and navigation bars.
* **Semantic Landmarks:** Every route explicitly renders a dedicated `<main id="main-content" tabIndex={-1}>` landmark, eliminating generic layout wrappers and conflicting landmarks.
* **Top-Level Isolation:** Navigation `<header>` and `<footer>` elements are positioned outside `<main>`, ensuring clean HTML5 / WAI-ARIA document landmark trees.

### 3. Standalone Report Iframe Isolation (`app/report/[scanId]/page.tsx`)
* The PDF and HTML reporting engine (`lib/report-template.ts`) synthesizes a complete standalone HTML5 document (`<!DOCTYPE html><html lang="en">...</html>`).
* Direct hydration via `dangerouslySetInnerHTML` inside Next.js layout creates invalid nested `<html>`/`<body>` structures that fail axe-core audits.
* Solved by isolating report rendering within `<iframe title="WCAG 2.2 Level AA Accessibility Audit Report" srcDoc={html} className="w-full min-h-screen border-none block" />`, providing total encapsulation and native print/zoom capabilities.

### 4. WAI-ARIA Tablist Pattern with Arrow-Key Roving Focus
* Every multi-tab interface (`role="tablist"`) implements keyboard arrow-key navigation (`ArrowLeft` / `ArrowRight` / `Home` / `End`).
* Active tabs receive `tabIndex={0}` and `aria-selected="true"`; inactive tabs receive `tabIndex={-1}` and `aria-selected="false"`.
* Each tab references its corresponding panel via `aria-controls`, and each panel has `role="tabpanel"` and `aria-labelledby`.

### 5. Accessible Data Alternatives
* Visual SVG line charts (Recharts) in `components/dashboard/trend_chart.tsx` are complemented by a visually hidden `<table className="sr-only">` data alternative with structured `<caption>`, `<th scope="col">`, and tabular cell values, ensuring complete screen-reader accessibility.

---

## 12 Future Architectural Roadmap

1. **Multi-Region Headless Worker Queues:** Migrate concurrency control from database polling to a dedicated BullMQ / Redis stream with distributed workers across North America, Europe, and Asia-Pacific.
2. **Streaming AI Responses:** Stream OpenAI remediation tokens directly to the frontend using Server-Sent Events (SSE) for perceived zero-latency code generation.
3. **Headless Lighthouse Sidecar:** Integrate Lighthouse audit scripts into the Edge Function container to output Core Web Vitals (LCP, INP, CLS) alongside WCAG compliance data.
