# Equivance — Public Launch Checklist

> **Document Status:** Living Pre-Launch Tracker (Editable)  
> **Target Product:** Equivance (`accessibility-auditor`)  
> **How to Use:** Replace `- [ ]` with `- [x]` as each item is completed and verified.

---

## Phase 1: Critical Codebase & Security Fixes (Discovered in Audit)
*These are concrete gaps between the authoritative documentation (`docs/*.md`) and the live implementation that must be resolved before taking public traffic or payments.*

- [x] **Fix Agency Tier Downgrade Loophole ([`lib/quota.ts`](../lib/quota.ts), [`app/api/reports/pdf/route.ts`](../app/api/reports/pdf/route.ts), [`app/api/keys/route.ts`](../app/api/keys/route.ts), [`app/api/fix-suggestions/route.ts`](../app/api/fix-suggestions/route.ts))**
  - Currently, if a user upgrades to Agency, provisions a row in `public.teams`, and later cancels their subscription (`profiles.subscription_tier` resets to `'free'`), `checkQuota()` and tier checks still see the `teams` / `team_members` row and elevate them to `'agency'` (600 scans/mo + GPT-4o + PDF export) indefinitely.
  - **Fix:** Verify that the team owner's `profiles.subscription_tier === 'agency'` and `subscription_status === 'active'` before granting team quota pooling or Agency perks to the owner or members.
- [x] **Add `GET /api/scan` Polling Endpoint for CI/CD & Developer API ([`app/api/scan/route.ts`](../app/api/scan/route.ts))**
  - `POST /api/scan` returns `202 Accepted { scanId }`. External CI/CD pipelines (GitHub Actions, GitLab CI) authenticating via `x-api-key` have no HTTP `GET /api/scan?scanId=...` endpoint to poll scan status (`pending` → `processing` → `completed`) and retrieve the JSON violation summary or exit code.
- [x] **Support `x-api-key` Auth & Align Payload Schema in `/api/fix-suggestions` ([`app/api/fix-suggestions/route.ts`](../app/api/fix-suggestions/route.ts) & [`docs/API.md`](./API.md))**
  - `/api/fix-suggestions` currently only checks Supabase session cookies (`supabase.auth.getUser()`) and rejects `x-api-key` requests.
  - Align the documented request/response schema in [`docs/API.md`](./API.md) (which shows single-issue `{ issueId, html }`) with the actual route handler (which expects `{ issues: [...], limit, model }`), or support both formats.
- [x] **Implement Self-Serve Account Deletion for GDPR/CCPA Compliance ([`components/settings_modal.tsx`](../components/settings_modal.tsx) & [`docs/LEGAL.md`](./LEGAL.md))**
  - [`docs/LEGAL.md`](./LEGAL.md) (Section 04.4) explicitly states users can delete their account and all associated data via the Settings modal. Add a `DELETE /api/auth/account` endpoint (using `adminSupabase.auth.admin.deleteUser(user.id)` + Stripe subscription cancellation) and wire a confirmation flow into `SettingsModal.tsx`.
- [x] **Standardize Environment Variable Names Across Code & Docs ([`docs/SETUP.md`](./SETUP.md), [`lib/site.ts`](../lib/site.ts), [`app/api/reports/pdf/route.ts`](../app/api/reports/pdf/route.ts), [`app/api/team/invite/route.ts`](../app/api/team/invite/route.ts))**
  - [`docs/SETUP.md`](./SETUP.md) specifies `RESEND_FROM_EMAIL` and `NEXT_PUBLIC_APP_URL`, whereas the codebase reads `EMAIL_FROM` and `NEXT_PUBLIC_SITE_URL` (and `app/api/auth/magic-link/route.ts` should be checked for consistency). Support both via fallback (`process.env.EMAIL_FROM || process.env.RESEND_FROM_EMAIL`) and unify documentation.
- [x] **Harden SSRF Against DNS Rebinding & Redirect Bypasses ([`app/api/scan/route.ts`](../app/api/scan/route.ts) & [`supabase/functions/scan-site/index.ts`](../supabase/functions/scan-site/index.ts))**
  - Hostname string checks in `/api/scan` can be bypassed via wildcard DNS services (`127.0.0.1.nip.io`), decimal/octal IP encoding, IPv6-mapped IPv4 (`[::ffff:169.254.169.254]`), or an HTTP `302` redirect from a public URL to an internal address inside Puppeteer.
  - Add DNS resolution (`dns.lookup`) validation in Node and request interception (`page.setRequestInterception(true)`) inside `scan-site` to block private/link-local IP requests during navigation.
- [x] **Populate or Deprecate `public.violations` Relational Table ([`supabase/functions/scan-site/index.ts`](../supabase/functions/scan-site/index.ts) & [`docs/DATABASE.md`](./DATABASE.md))**
  - `scan-site` currently writes violation data into `scans.result` (JSONB) and `scans.summary` (JSONB), leaving the `public.violations` table empty. Either batch-insert normalized rows into `public.violations` on scan completion (for cross-scan analytics) or remove unused table references.
- [x] **Remove Remaining Raw Emojis from Production UI ([`components/settings_modal.tsx`](../components/settings_modal.tsx), [`app/docs/page.tsx`](../app/docs/page.tsx))**
  - Enforce the strict Anti-Emoji Policy from [`docs/DESIGN_SYSTEM.md`](./DESIGN_SYSTEM.md) and [`docs/CODE_STYLE.md`](./CODE_STYLE.md) by replacing raw Unicode emojis (e.g., settings gear, credit card, rocket, waving hand, key, antenna, robot, warning sign) with clean, accessible SVG icons (`aria-hidden="true"`).

---

## Phase 1.5: Pro & Agency Tier Value Expansion (Wave 1)

- [x] **Framework-Aware AI Remediation ([`lib/ai-fixer.ts`](../lib/ai-fixer.ts), [`app/api/fix-suggestions/route.ts`](../app/api/fix-suggestions/route.ts), [`components/issue_card.tsx`](../components/issue_card.tsx), [`components/settings_modal.tsx`](../components/settings_modal.tsx))**
  - Support idiomatic code fixes for `html`, `react-tailwind` (React/Next.js JSX + Tailwind), `vue` (Vue 3 SFC), and `angular` (Angular/Web Components), gated to Pro & Agency tiers with SHA-256 framework-aware caching and 1-click Copy Code.
- [x] **Live SVG Compliance Badge & Public Verification View ([`app/api/badge/[scanId]/route.ts`](../app/api/badge/%5BscanId%5D/route.ts), [`app/report/[scanId]/page.tsx`](../app/report/%5BscanId%5D/page.tsx))**
  - Serve dynamic `image/svg+xml` WCAG 2.2 AA shields (with white-label `brand_name` and `brand_primary_color` on Agency tier) and public read-only verification reports at `/report/[scanId]?verify=1` (masking owner email).
- [x] **EAA 2025 & ADA Compliance Kit Modal ([`components/compliance_kit_modal.tsx`](../components/compliance_kit_modal.tsx), [`components/results_display.tsx`](../components/results_display.tsx), [`components/dashboard/scan_table.tsx`](../components/dashboard/scan_table.tsx))**
  - 1-click Accessibility Conformance Statement generator (EU EAA 2025 / EN 301 549, US ADA Title III & Section 508, and W3C WCAG 2.2 AA) in Semantic HTML & Markdown plus live badge embed snippets.
- [x] **Interactive Turnkey CI/CD Quality Gate Builder ([`app/dashboard/dashboard_client.tsx`](../app/dashboard/dashboard_client.tsx), [`app/docs/page.tsx`](../app/docs/page.tsx))**
  - Interactive workflow generator for GitHub Actions, GitLab CI, and Bash/cURL with configurable failure thresholds (`critical > 0`, `critical + serious > 0`, or zero-violation strict mode).
- [x] **WCAG 2.2 POUR Conformance Matrix & Pricing Showcase ([`lib/report-template.ts`](../lib/report-template.ts), [`components/pricing_section.tsx`](../components/pricing_section.tsx), [`components/landing_features.tsx`](../components/landing_features.tsx))**
  - Add VPAT/ACR-style 4-principle POUR (Perceivable, Operable, Understandable, Robust) Conformance Summary Matrix to web/PDF reports and update pricing/landing pages.

---

## Phase 1.6: Scheduled Accessibility Monitoring & Degradation Alerts (Wave 2)

- [x] **Database Migration & Multi-Tier Quota Rules ([`supabase/migrations/20260615000000_scheduled_monitors.sql`](../supabase/migrations/20260615000000_scheduled_monitors.sql))**
  - `public.monitors` table created with RLS policies, performance indexes, and foreign keys. Free: locked; Pro: max 3 monitors; Agency: max 10 pooled monitors.
- [x] **Monitor CRUD & On-Demand Execution APIs ([`app/api/monitors/route.ts`](../app/api/monitors/route.ts), [`app/api/monitors/[id]/route.ts`](../app/api/monitors/%5Bid%5D/route.ts), [`app/api/monitors/[id]/run/route.ts`](../app/api/monitors/%5Bid%5D/run/route.ts))**
  - REST endpoints for listing, creating (with SSRF DNS validation), editing (frequency, threshold, email, pause/resume), deleting, and manual on-demand execution.
- [x] **Vercel Cron Worker & Degradation Detection Engine ([`app/api/cron/monitors/route.ts`](../app/api/cron/monitors/route.ts), [`vercel.json`](../vercel.json))**
  - Hourly cron schedule (`0 * * * *`) guarded by `CRON_SECRET` Bearer authentication, quota validation, edge function dispatch, score diffing, and schedule advancement.
- [x] **Degradation Email Synthesis with Agency White-Labeling ([`lib/monitor-alert-email.ts`](../lib/monitor-alert-email.ts))**
  - Responsive HTML email alert featuring score diff badges, failing WCAG criteria list, direct CTA to full report & AI Fixer, and white-label branding inheritance.
- [x] **Dashboard UI Integration ([`app/dashboard/dashboard_client.tsx`](../app/dashboard/dashboard_client.tsx))**
  - Dedicated "Scheduled Monitors" tab with live count badge, quota allocation pill, creation modal with threshold slider, monitor cards, and Free tier teaser.

---

## Phase 1.7: Embeddable Public Compliance Widget (Wave 3)

- [x] **Public Widget Data API ([`app/api/widget/[scanId]/route.ts`](../app/api/widget/%5BscanId%5D/route.ts))**
  - Serves public WCAG 2.2 Level AA score, POUR conformance matrix, barrier reporting, and Agency white-labeling with CORS headers (`Access-Control-Allow-Origin: *`) and active Pro/Agency tier gating (`resolveEffectiveTier`).
- [x] **Zero-Dependency Shadow-DOM Client Script ([`public/widget.js`](../public/widget.js), [`app/widget.js/route.ts`](../app/widget.js/route.ts))**
  - Lightweight ($< 12\text{ KB}$) script providing isolated Shadow DOM styling, accessible trigger button, and WCAG-compliant dialog with focus trapping and `Escape` key dismissal. Safe against script placement in `<head>`.
- [x] **Compliance Kit Modal Live Widget Tab ([`components/compliance_kit_modal.tsx`](../components/compliance_kit_modal.tsx))**
  - Added "Embeddable Widget" tab with position toggle (`bottom-right`, `bottom-left`), theme selector (`dark`, `light`), interactive live preview canvas, zero-overlay guarantee callout, and 1-click script snippet copier.
- [x] **Developer Documentation Showcase ([`app/docs/page.tsx`](../app/docs/page.tsx))**
  - Added dedicated Compliance Widget section to in-app documentation with copyable embed snippet and complete data attribute configuration table.

---

## Phase 2: Database, Storage & Supabase Cloud Configuration

- [ ] **Run All SQL Migrations in Production Supabase Project**
  - [ ] `20260610000000_init_schema.sql`
  - [ ] `20260610000001_billing_updates.sql`
  - [ ] `20260610000002_async_scans.sql`
  - [ ] `20260612000000_create_reports_bucket.sql`
  - [ ] `20260612000001_api_keys.sql`
  - [ ] `20260612000002_ai_fix_cache.sql`
  - [ ] `20260613000000_team_access.sql`
  - [ ] `20260614000000_white_label_branding.sql`
  - [ ] `20260615000000_scheduled_monitors.sql`
- [ ] **Verify Row Level Security (RLS) on Every Public Table**
  - Confirm RLS is enabled on `profiles`, `scans`, `violations`, `api_keys`, `ai_fix_cache`, `teams`, `team_members`, and `monitors` in the Supabase Security Advisor.
- [ ] **Verify `on_auth_user_created` Trigger**
  - Test signing up with a brand-new email address and confirm a matching row in `public.profiles` is immediately created with `subscription_tier = 'free'`.
- [ ] **Verify Supabase Realtime Publication**
  - Confirm `public.scans` is added to the `supabase_realtime` publication so live progress steppers transition without polling.
- [ ] **Verify Private `reports` Storage Bucket**
  - Confirm the `reports` bucket exists, is set to **Private** (`public = false`), and signed URLs (`createSignedUrl`) work for PDF downloads.
- [ ] **Deploy & Configure `scan-site` Edge Function**
  - Deploy via `supabase functions deploy scan-site`.
  - Set Edge Function secrets: `BROWSERLESS_TOKEN`, `MAX_CONCURRENT_SCANS` (match your Browserless plan concurrency limit).
- [ ] **Automated Stuck-Scan Cleanup / Timeout Recovery**
  - Add a `pg_cron` job or fallback check that marks scans stuck in `pending` or `processing` for `> 3 minutes` as `failed` (`error_message = 'Scan timed out'`) so they do not permanently block `MAX_CONCURRENT_SCANS` slots or consume user quota.

---

## Phase 3: Stripe Billing, Subscriptions & Unit Economics

- [ ] **Switch Stripe from Test Mode to Live Mode**
  - Complete Stripe account activation, business details, bank payout routing, and tax configuration (Stripe Tax).
- [ ] **Create Live Products & Recurring Price IDs**
  - Create **Pro Plan ($19/month)** → copy live `STRIPE_PRO_PRICE_ID`.
  - Create **Agency Plan ($59/month)** → copy live `STRIPE_AGENCY_PRICE_ID`.
- [ ] **Configure Stripe Customer Portal (Live Mode)**
  - Enable plan switching (Pro ↔ Agency with proration), payment method updates, invoice history downloads, and subscription cancellation.
  - Configure the portal return URL to `https://<your-domain>/dashboard`.
- [ ] **Configure Production Stripe Webhook Endpoint**
  - Endpoint URL: `https://<your-domain>/api/billing/webhook`
  - Subscribed events:
    - `checkout.session.completed`
    - `customer.subscription.created`
    - `customer.subscription.updated`
    - `customer.subscription.deleted`
    - `invoice.payment_failed` *(Recommended: handle failed renewals gracefully)*
  - Store live signing secret in `STRIPE_WEBHOOK_SECRET`.
- [ ] **End-to-End Live Payment Smoke Test**
  - Run a real card transaction (with a 100% off coupon or refund test) for both Pro and Agency tiers, verify database tier elevation, test Customer Portal redirect, and verify cancellation downgrade.

---

## Phase 4: Authentication, Transactional Email & Domain Setup

- [ ] **Custom Production Domain & SSL**
  - Attach custom domain in Vercel, verify DNS (`A` / `CNAME` records), and confirm automatic TLS certificate provisioning.
- [ ] **Supabase Auth URL Configuration**
  - Set **Site URL** in Supabase Auth settings to `https://<your-domain>`.
  - Add Redirect URLs:
    - `https://<your-domain>/auth/callback`
    - `https://<your-domain>/auth/join`
    - `https://<your-domain>/**`
- [ ] **Resend Domain Verification (SPF, DKIM, DMARC)**
  - Verify your sending domain in Resend so Magic Links, Team Invitations, and PDF Report emails land in the primary inbox instead of spam.
  - Set `EMAIL_FROM` / `RESEND_FROM_EMAIL` to your verified domain (removing `@yourdomain.com` fallbacks).
- [ ] **Configure Custom SMTP in Supabase Auth**
  - Connect Resend SMTP in Supabase Auth settings to bypass Supabase's default 2-emails/hour built-in auth rate limit.
- [ ] **Rate Limit `/api/auth/magic-link` & `/api/team/invite`**
  - Add IP/email rate limiting (e.g., Upstash Redis or Supabase rate tracking) to prevent email bombing and Resend quota exhaustion.

---

## Phase 5: Self-Accessibility (Dogfooding), UI/UX & Design Polish
*As an accessibility compliance platform, Equivance will be immediately audited by skeptical accessibility engineers and competitors on launch day.*

- [x] **Zero-Violation Self-Audit across All Public & Authenticated Routes**
  - Run `axe-core` and Lighthouse Accessibility audits (`a11y-debugging` skill) on:
    - [x] Landing Page (`/`) — Verified: 0 violations across 45 rules.
    - [x] Login Page (`/login`) — Verified: 0 violations across 40 rules.
    - [x] Developer API Docs (`/docs`) — Verified: 0 violations across 44 rules.
    - [x] Legal & Privacy Page (`/legal`) — Verified: 0 violations across 39 rules.
    - [x] Dashboard & Tabs (`/dashboard`) — WAI-ARIA tablist arrow-navigation & dialog focus-trapped.
    - [x] Public/Shared Audit Report (`/report/[scanId]`) — Isolated iframe architecture eliminates nested HTML landmarks.
    - [x] Team Join Page (`/auth/join`) — Clean semantic form structure and focusable controls.
    - [x] 404 & Error Pages (`/not-found`) — Verified: 0 violations across 38 rules.
  - Automated regression suite added: `npm run test:a11y` (`scripts/self-a11y-audit.mjs`).
- [x] **Keyboard Navigation & Focus Trap Audit**
  - Zero-dependency focus trap hook implemented (`hooks/use-focus-trap.ts`) across all modals:
    - `components/settings_modal.tsx`
    - `components/compliance_kit_modal.tsx`
    - `app/dashboard/dashboard_client.tsx` (Create Monitor Modal)
  - WAI-ARIA tablist arrow-key navigation implemented across all tab sets (Settings tabs, Compliance Kit tabs, Dashboard tabs, Documentation code tabs, Login tabs).
  - Visible-on-focus skip navigation link implemented (`<a href="#main-content">Skip to main content</a>`).
- [x] **WCAG 2.2 Target Size (SC 2.5.8) & Contrast (SC 1.4.3) Verification**
  - Minimum touch targets ($\ge 32\text{ px}$ to $44\text{ px}$) established across close buttons, copy icons, and tab triggers.
  - Micro-label color contrast elevated to `text-slate-400` across all dark backgrounds ($\ge 4.5:1$ contrast ratio).
  - Strict anti-emoji policy enforced: 100% of raw unicode glyphs (checkmarks, cross marks, triangles, warning symbols, sparkles, info badges) replaced with semantic SVG icons and screen-reader status regions.
- [x] **Reduced Motion & Cross-Device Responsiveness**
  - `components/motion/animated-text.tsx` converted to clean visual animation with `<span className="sr-only">` fallback (fixing prohibited ARIA attribute).
  - Scrollable code regions equipped with `tabIndex={0}` and accessible ARIA labels for keyboard scrolling.

---

## Phase 6: Legal, Privacy & Compliance Readiness

- [ ] **Update Contact Emails & Business Entity Details in Legal Docs**
  - Verify `legal@equivance.app` and `security@equivance.app` (or your actual production domain emails) have active mailboxes or forwarding rules.
  - Update the registered business entity name, governing jurisdiction, and physical mailing address in [`docs/LEGAL.md`](./LEGAL.md) and [`app/legal/page.tsx`](../app/legal/page.tsx).
- [ ] **Verify Automated Testing Scope Disclaimers**
  - Confirm the ~30%–50% automated detection disclaimer is visible on the landing scanner, scan results view, shared web reports (`/report/[scanId]`), and exported PDF reports (`lib/report-template.ts`).
- [ ] **Verify Cookie Consent Banner**
  - Confirm `CookieConsent` banner renders on first visit, links to `/legal`, is keyboard-accessible, and persists acknowledgment in `localStorage`.

---

## Phase 7: Infrastructure, Observability & Cost Guardrails

- [ ] **Set OpenAI & Browserless Spend Caps**
  - Configure hard monthly dollar budget limits and billing alerts in OpenAI Platform and Browserless.io so a traffic spike or abuse cannot cause a surprise cloud bill.
- [ ] **Verify Vercel Function Configuration (`vercel.json`)**
  - Confirm `maxDuration` settings in `vercel.json` and route handlers (`/api/reports/pdf` has `maxDuration = 60`, which requires Vercel Pro plan; Vercel Hobby caps serverless functions at 10s–60s depending on runtime).
- [ ] **Error Monitoring & Uptime Alerts**
  - Connect error tracking (e.g., Sentry or Vercel Log Drains) and configure an uptime monitor on `/` and `/api/scan`.
- [ ] **Clean Up Temporary & Scratch Files**
  - Remove or `.gitignore` local scratch scripts (`scratch/test-resend.js`, `scratch/og-check/`, `nexusflow-full.jpeg` in root if unused) before tagging the production release.
- [ ] **Final Build & Type Verification Gate**
  - [ ] `npx tsc --noEmit` passes with 0 errors.
  - [ ] `npm run lint` passes with 0 warnings/errors.
  - [ ] `npm run build` succeeds cleanly.

---

## Phase 8: SEO, Social Metadata & Launch Day Checks

- [ ] **Verify Production SEO & Social Previews**
  - Set `NEXT_PUBLIC_SITE_URL` in Vercel production environment variables.
  - Verify `/robots.txt`, `/sitemap.xml`, `/manifest.webmanifest`, `/icon`, and `/opengraph-image` render with the production domain.
  - Test OpenGraph card preview on X/Twitter, LinkedIn, and Slack.
- [ ] **Prepare Launch Assets**
  - Record a 45-second product demo video showing: Live URL scan → Realtime progress → WCAG 2.2 results + Manual review triage → 1-click GPT-4o code fix diff → White-label PDF report export.
