# Testing & Quality Assurance Strategy

> **Status:** Active / Production Baseline  
> **Testing Scope:** Unit, Integration, Headless Browser, Self-A11y, and CI/CD Automation  
> **Skill Directives:** `a11y-debugging`, `chrome-devtools`  
> **Last Updated:** October 2026

---

## 01 Testing Philosophy

Equivance is an accessibility testing tool; therefore, our testing standards must be exceptionally rigorous. An undetected bug could lead to false negatives for our customers, creating real-world legal liabilities under ADA Title III or the European Accessibility Act (EAA).

### The Four Pillars of Quality
1. **Zero Type Errors:** The codebase must compile cleanly under TypeScript 6 Strict Mode (`npx tsc --noEmit`).
2. **Scanner Accuracy:** Automated axe-core runs must accurately identify 100% of standard WCAG 2.2 rules on known test suites.
3. **Self-Compliance:** Equivance itself must achieve zero automated violations during self-audits.
4. **Resilient Failure Testing:** All external dependencies (Browserless, OpenAI, Stripe, Supabase) must have tested fallback and error-handling paths.

---

## 02 The Testing Pyramid

```
                ┌───────────────────────────────┐
                │     Self-A11y Audits (a11y)   │  axe-core on Equivance
                ├───────────────────────────────┤
                │      E2E Integration Tests    │  Full Scan Flow & Realtime
                ├───────────────────────────────┤
                │   Engine Integration Tests    │  axe-core / Puppeteer / OpenAI
                ├───────────────────────────────┤
                │     Unit & Logic Tests        │  SSRF / Quota / Hash / Formatting
                ├───────────────────────────────┤
                │   Static Type Checking & Lint │  TypeScript strict & ESLint
                └───────────────────────────────┘
```

---

## 03 Unit & Logic Test Suites

### 1. SSRF, Protocol, DNS-Rebinding & Cloud Metadata Testing (`lib/ssrf.ts` & `app/api/scan/route.ts`)
* **Objective:** Ensure non-web protocols, cloud provider metadata endpoints, IPv6-mapped IPv4 addresses, integer/octal IPs, and DNS-rebinding hostnames are rejected before spawning browser instances.
* **Test Cases:**
  * `file:///etc/passwd` -> **400 Bad Request** (invalid protocol)
  * `ftp://example.com/test` -> **400 Bad Request** (invalid protocol)
  * `http://169.254.169.254/latest/meta-data/` -> **400 Bad Request** (IMDS blocked)
  * `http://[::ffff:169.254.169.254]/` -> **400 Bad Request** (IPv6-mapped IMDS blocked)
  * `http://2130706433/` -> **400 Bad Request** (decimal loopback `127.0.0.1` blocked)
  * `http://metadata.google.internal/computeMetadata/v1/` -> **400 Bad Request** (GCP metadata blocked)
  * `http://fe80::1/` -> **400 Bad Request** (IPv6 link-local blocked)
  * `http://169.254.1.1/` -> **400 Bad Request** (IPv4 link-local blocked)
  * `http://localhost:3000` -> **400 Bad Request** (loopback blocked)
  * `http://127.0.0.1:8080` -> **400 Bad Request** (loopback blocked)
  * `http://192.168.1.1` -> **400 Bad Request** (RFC 1918 private IP blocked in prod)
  * `https://example.com` -> **202 Accepted** (valid target)

### 2. Open Redirect Defense & Deep Link Retention (`lib/safe-redirect.ts`)
* **Objective:** Validate that relative paths are allowed while protocol-relative and external domains are sanitized.
* **Test Cases:**
  * `//evil.com` -> Sanitized to fallback `/`
  * `https://evil.com` -> Sanitized to fallback `/`
  * `/dashboard` -> Preserved as `/dashboard`
  * `/auth/join?token=abc` -> Preserved as `/auth/join?token=abc`
  * `/?checkout=pro#pricing` -> Preserved as `/?checkout=pro#pricing`

### 3. Quota & Subscription Tier Enforcement (`lib/quota.ts`)
* **Objective:** Ensure users cannot exceed their tier allocations.
* **Test Cases:**
  * Free tier user with 4 scans -> Allowed.
  * Free tier user with 5 scans -> **429 Quota Exceeded**.
  * Pro tier user with 50 scans -> Allowed (limit: 150).
  * Failed scans (`status = 'failed'`) -> Must NOT count toward monthly consumption.

### 4. Framework-Aware AI Fix SHA-256 Cache Key Determinism (`lib/ai-fixer.ts`)
* **Objective:** Verify identical violation snippets and target frameworks produce deterministic cache keys while keeping `html`, `react-tailwind`, `vue`, and `angular` fixes isolated.
* **Test Cases:**
  * Key generation formula: `SHA-256(issueId + ":" + framework + ":" + originalCode + ":" + model)`.
  * Verifying database hit returns cached record in `< 50ms` without invoking OpenAI.

### 5. Team Quota Pooling & 3-Seat Ceiling (`lib/quota.ts` & `app/api/team/invite/route.ts`)
* **Objective:** Verify pooled monthly allowance of 600 scans and strict 3-seat workspace limit.
* **Test Cases:**
  * Owner (1) + 2 active members -> 3 seats used. Inviting 4th member returns **400 Bad Request: Team seat limit reached**.
  * Member A runs 250 scans, Member B runs 250 scans, Owner runs 99 scans (total 599 scans) -> Next scan allowed.
  * 600 pooled scans reached -> Next scan across any team member returns **429 Quota Exceeded**.
  * Revoked member or canceled team owner subscription (`resolveEffectiveTier`) immediately reverts members to personal Free tier quota (5 scans/mo).

### 6. Teammate Tier Inheritance (`app/api/reports/pdf/route.ts`, `app/api/keys/route.ts`, `app/api/badge/[scanId]/route.ts`)
* **Objective:** Verify that accepted agency teammates receive Agency permissions when the team owner's subscription is active, despite the member's personal `profiles.subscription_tier` being `'free'`.
* **Test Cases:**
  * Invited teammate calls `POST /api/keys` -> API key generated successfully (not blocked by Free tier check).
  * Invited teammate requests vector PDF `/api/reports/pdf` -> Returns vector PDF with agency branding and WCAG 2.2 POUR matrix (not blocked).
  * Invited teammate requests AI fix with `framework: "react-tailwind"` -> Evaluated with `gpt-4o` and returns JSX + Tailwind fix.

### 7. White-Label Validation & Cache Busting (`app/api/team/branding/route.ts`, `lib/report-template.ts`)
* **Objective:** Verify brand assets are sanitized against XSS and PDF cache is properly busted.
* **Test Cases:**
  * Hex color `#0ea5e9` -> Accepted; `#invalid` or `red; background:url(...)` -> **400 Bad Request**.
  * Brand logo `javascript:alert(1)` -> **400 Bad Request**; `https://cdn.example.com/logo.png` -> Accepted.
  * PDF export with `force: true` -> Purges previous Supabase storage object and regenerates PDF with updated branding.

### 8. Runtime Error Boundary Recovery (`app/error.tsx`)
* **Objective:** Verify that client component rendering exceptions are contained without crashing the entire app shell.
* **Test Cases:**
  * Component throw -> Catches exception, displays branded 500 error boundary with incident digest.
  * Clicking "Try Again" triggers `reset()` handler.

### 9. Scheduled Monitor Lifecycle & Tier Limits (`app/api/monitors/route.ts`, `app/api/monitors/[id]/route.ts`)
* **Objective:** Verify monitor provisioning, tier ceiling enforcement, and status toggles.
* **Test Cases:**
  * Free tier user `POST /api/monitors` -> Returns **403 Forbidden** (requires Pro or Agency).
  * Pro user with 3 active monitors `POST /api/monitors` -> Returns **403 Forbidden: Monitor limit reached (max 3 for Pro)**.
  * Agency user with 10 active monitors -> Returns **403 Forbidden: Monitor limit reached (max 10 for Agency)**.
  * Target URL `http://169.254.169.254` -> Returns **400 Bad Request: Target URL resolved to an unsafe address**.
  * `PATCH /api/monitors/[id]` with `{ status: "paused" }` -> Successfully pauses monitor; `next_run_at` remains unchanged.
  * `DELETE /api/monitors/[id]` -> Deletes monitor; verifies subsequent `GET /api/monitors` does not return deleted item.

### 10. Automated Cron Worker & Degradation Alerts (`app/api/cron/monitors/route.ts`, `lib/monitor-alert-email.ts`)
* **Objective:** Verify Vercel Cron worker authorization, execution gating, score diffing, and email delivery.
* **Test Cases:**
  * Request without `CRON_SECRET` Bearer header -> Returns **401 Unauthorized**.
  * Due monitor belonging to downgraded Free user -> Monitor automatically transitioned to `status = 'paused'`, scan skipped.
  * Due monitor with exhausted monthly scan quota -> Scan skipped without failing, preserving database consistency.
  * Score drops from 92 to 85 (delta $\ge 5$ points) -> Dispatches Resend degradation alert email with score diff badge and failing violations list.
  * Score remains 90 (delta $< 5$ points and $\ge$ threshold) -> Updates `last_run_at` and `next_run_at`, no degradation email dispatched.
  * Agency monitor regression -> Alert email sent with agency's custom brand name, logo, and brand primary accent color.

### 11. Embeddable Public Compliance Widget API (`app/api/widget/[scanId]/route.ts`)
* **Objective:** Verify CORS, tier-gating, and zero-PII serialization for widget data delivery.
* **Test Cases:**
  * Valid completed Pro scan ID -> Returns 200 with score, POUR breakdown, standards, and CORS headers.
  * Free tier scan ID -> Returns **403 Forbidden: Widget embedding requires an active Pro or Agency subscription**.
  * Invalid UUID format -> Returns **400 Bad Request**.
  * Completed Agency scan -> Returns 200 with custom agency `name`, `logo`, and `color` (`whiteLabel: true`).
  * Response verification -> Verifies user email, user id, and sensitive tokens are strictly absent from payload.

### 12. Client Widget Script & Shadow DOM Accessibility (`public/widget.js`, `app/widget.js/route.ts`)
* **Objective:** Verify isolated Shadow DOM rendering, keyboard focus trapping, and WCAG 2.2 conformance.
* **Test Cases:**
  * Script loaded without `defer` in document `<head>` -> Safely defers mounting until `DOMContentLoaded` without crashing.
  * Trigger click -> Opens modal dialog with `aria-modal="true"` and `role="dialog"`.
  * Keyboard `Tab` navigation -> Focus traps strictly inside the dialog between close button and action links.
  * Pressing `Escape` key -> Closes dialog and restores keyboard focus to the trigger button.
  * `prefers-reduced-motion: reduce` -> Disables CSS transitions and transform animations.

---

## 04 Browser Engine & Benchmark Test Matrix

Automated scanning must be validated against three distinct tiers of external websites:

| Test Target | URL | Expected Result | Testing Purpose |
| :--- | :--- | :--- | :--- |
| **Clean Baseline** | `https://example.com` | $\ge 95\%$ Pass Rate, 0 Critical | Verifies minimal static DOM parsing speed ($\le 3\text{s}$). |
| **W3C Inaccessible Demo** | `https://www.w3.org/WAI/demos/bad/` | $\ge 20$ Violations (Critical/Serious) | Validates that image alt, label, and contrast violations are reliably detected. |
| **Modern Rich SPA** | `https://developer.mozilla.org/` | Zero fatal runtime errors | Validates JavaScript hydration, dynamic DOM settle pause (1.5s), and viewport scaling. |

---

## 05 Self-Accessibility Auditing (Dogfooding)

Equivance runs an automated regression test suite via `npm run test:a11y` ([`scripts/self-a11y-audit.mjs`](../scripts/self-a11y-audit.mjs)) against its own routes using local headless Chrome and `axe-core 4.12`.

### Audited Routes & Current Status
| Route | Standard Rules Tested | Axe-Core Violations | Conformance Status |
| :--- | :---: | :---: | :--- |
| **Landing & Audit Console (`/`)** | 45 | **0** | **PASSED** (WCAG 2.1 & 2.2 AA) |
| **Authentication Portal (`/login`)** | 40 | **0** | **PASSED** (WCAG 2.1 & 2.2 AA) |
| **Developer API Documentation (`/docs`)** | 44 | **0** | **PASSED** (WCAG 2.1 & 2.2 AA) |
| **Legal Terms & Disclaimers (`/legal`)** | 39 | **0** | **PASSED** (WCAG 2.1 & 2.2 AA) |
| **404 Not Found Page (`/_not-found`)** | 38 | **0** | **PASSED** (WCAG 2.1 & 2.2 AA) |

### Self-Audit Test Criteria
1. **Color Contrast:** All text meets a minimum $4.5:1$ ratio on `slate-950` dark backgrounds (`text-slate-400` micro-labels achieve $\ge 5.4:1$).
2. **Keyboard Navigation & Modal Focus:**
   * Tab index progression follows logical reading order with visible-on-focus `<a href="#main-content">Skip to main content</a>`.
   * Modals (`SettingsModal.tsx`, `ComplianceKitModal.tsx`, `CreateMonitorModal`) implement `hooks/use-focus-trap.ts` with `role="dialog"`, `aria-modal="true"`, trapping focus within boundary and closing on `Escape` with trigger focus restoration.
   * Multi-tab interfaces implement WAI-ARIA `role="tablist"` with arrow-key switching (`ArrowLeft` / `ArrowRight`) and `tabIndex={active ? 0 : -1}`.
   * Horizontally scrollable code `<pre>` blocks have `tabIndex={0}` and accessible ARIA labels.
3. **Screen Reader Semantics:**
   * `<header>`, `<main id="main-content">`, `<nav>`, and `<footer>` are explicitly defined at the top-level landmark layer.
   * All iconography uses SVG primitives with `aria-hidden="true"` accompanied by `<span className="sr-only">` text (zero raw Unicode emojis in the UI).
   * Asynchronous actions use `role="status"` and `aria-live="polite"`.
4. **Reduced Motion Verification:**
   * `components/motion/animated-text.tsx` separates animated characters from clean `<span className="sr-only">` text, respecting `prefers-reduced-motion: reduce`.

---

## 06 Automated Test Execution & CI/CD Pipeline

### Local Testing Commands

```bash
# 1. Type Check (Strict mode)
npx tsc --noEmit

# 2. Linting
npm run lint

# 3. Unit & Integration Test Suites
npm test

# 4. Production Build Verification
npm run build

# 5. Automated Dogfooding Accessibility Audit (axe-core on Chrome)
npm run test:a11y
```

### GitHub Actions CI Workflow (`.github/workflows/ci.yml`)

```yaml
name: CI & Quality Gate

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: "npm"

      - name: Install Dependencies
        run: npm ci

      - name: Type Check
        run: npx tsc --noEmit

      - name: Lint
        run: npm run lint

      - name: Unit Tests
        run: npm test

      - name: Self-Accessibility Audit
        run: npm run test:a11y

      - name: Production Build
        run: npm run build
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
          BROWSERLESS_TOKEN: ${{ secrets.BROWSERLESS_TOKEN }}
```

---

## 07 Pre-Deployment QA Checklist

Before merging a release branch to `main`:

- [x] `npx tsc --noEmit` passes with 0 errors.
- [x] `npm run build` generates all static and dynamic routes cleanly.
- [x] SSRF guardrails block cloud metadata (`169.254.169.254`, `metadata.google.internal`), link-local IPs, and invalid protocols (`file:`, `ftp:`).
- [x] Safe redirect utility prevents protocol-relative open redirects (`//evil.com`) across `/auth/callback`, `/login`, and `/auth/join`.
- [x] Production HTTP security headers active in `next.config.ts` (HSTS, nosniff, SAMEORIGIN, Referrer-Policy).
- [x] Self-accessibility checks pass for modal dialogs, account menus, and progress bar semantics.
- [x] Edge Function `scan-site` passes local invocation tests with Browserless token.
- [x] Supabase database migrations run idempotently without modifying existing records.
- [x] Stripe webhook endpoint successfully parses test payloads with HMAC signature and handles out-of-order deliveries.
- [x] PDF generation `/api/reports/pdf` outputs valid, non-corrupted vector documents.
