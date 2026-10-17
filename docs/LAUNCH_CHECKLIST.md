# Equivance — Public Launch Checklist

> **Document Status:** Living Pre-Launch Tracker (Editable)  
> **Target Product:** Equivance (`accessibility-auditor`)  
> **How to Use:** Replace `- [ ]` with `- [x]` as each item is completed and verified.

---

## Phase 0: Tier-by-Tier Live Feature & E2E Verification (Free -> Pro -> Agency)
*Rigorous end-to-end verification ensuring all features, gates, models, and quotas operate strictly as intended across Free, Pro, and Agency tiers before cloud deployment.*

- [x] **Pricing Card Parity Alignment ([`components/pricing_section.tsx`](../components/pricing_section.tsx))**
  - Added *"Everything in Free Plan"* bullet to the Pro card, creating uniform parity with the Agency card's *"Everything in Pro Plan"*.
- [x] **Free Tier Live Functional & Lock Verification**
  - [x] Monthly scan quota strictly capped at 5 scans.
  - [x] AI code remediations restricted to `gpt-4o-mini` with `framework="html"` only; advanced frameworks gated.
  - [x] Executive PDF export (`POST /api/reports/pdf`) returns HTTP 403 Forbidden (`tier: "free"`).
  - [x] Dynamic SVG compliance badge (`GET /api/badge/[scanId]`) returns HTTP 403 / "Pro Badge Required".
  - [x] Public embed widget (`GET /api/widget/[scanId]`) returns HTTP 403 Forbidden with upgrade prompt.
  - [x] Scheduled monitors (`/api/monitors`) and API key provisioning (`/api/keys`) return HTTP 403.
  - [x] Team collaboration (`/api/team`) and white-labeling features locked.
- [x] **Pro Tier Live Functional & Gate Verification ($29 AUD/mo)**
  - [x] Monthly scan quota expanded to 150 scans.
  - [x] Premium AI remediation model (`gpt-4o`) unlocked for `HTML`, `React / Tailwind`, `Vue 3`, and `Angular`.
  - [x] Executive PDF report with WCAG 2.2 POUR Matrix successfully generated and downloaded (`application/pdf`).
  - [x] Live SVG compliance badge (`GET /api/badge/[scanId]`) active, returning `WCAG 2.2 AA · Equivance`.
  - [x] Embeddable public widget (`GET /api/widget/[scanId]`) active with public verification link.
  - [x] Scheduled monitors active with allowance up to 3 active production monitors.
  - [x] Developer API keys (`POST /api/keys`) provisioned; CI/CD scan dispatch & polling (`GET /api/scan`) operational.
  - [x] Agency perks locked: team member invites and white-label custom branding return HTTP 403.
- [x] **Agency Tier Live Functional & White-Label Verification ($99 AUD/mo)**
  - [x] Monthly scan quota expanded to 600 pooled scans.
  - [x] Scheduled monitors expanded to 10 pooled active monitors.
  - [x] Team workspace auto-provisioning and 3-seat invitation flow operational (`POST /api/team/invite`).
  - [x] Teammate onboarding via secure token (`POST /api/team/accept`); tier privileges inherited (`resolveEffectiveTier`).
  - [x] Teammate audits tag `scans.team_id` and render with team attribution badge.
  - [x] White-Label Custom Branding Studio (`POST /api/team/branding`): custom logo, hex palette, tagline, footer text.
  - [x] White-label watermark removal: "Powered by Equivance" watermark completely removed across web reports, PDFs, SVG badges, and embed widgets.
- [x] **Automated Multi-Tier Test Suite (`npm run test:tiers`)**
  - Implemented in [`scripts/tier-live-test.mjs`](../scripts/tier-live-test.mjs) with `--tier`, `--live-web`, and `--mock-stripe` flags, generating JSON and Markdown test reports in `test-results/`. Zero regressions across all 28 checks across Free, Pro, and Agency tiers.

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
- [x] **Harden SSRF Against DNS Rebinding, Alternative Encodings & Redirect Bypasses ([`lib/ssrf.ts`](../lib/ssrf.ts) & [`supabase/functions/scan-site/index.ts`](../supabase/functions/scan-site/index.ts))**
  - Full canonical 32-bit IPv4 normalizer handling decimal integers (`http://2130706433/`), octal (`http://0177.0.0.1/`), hex DWORDs (`http://0x7f000001/`), dotted hex (`http://0x7f.0.0.1/`), shorthand (`127.1`), and IPv6-mapped IPv4 (`[::ffff:169.254.169.254]`, `[::ffff:a9fe:a9fe]`).
  - Added DNS resolution (`dns.lookup`) validation in Node, request interception (`page.setRequestInterception(true)`), and redirect inspection (`page.on('response')`) inside `scan-site` to block private/link-local/IMDS requests during navigation. Verified with 41-point security suite.
- [x] **Stripe Webhook Idempotency & Deduplication Table ([`supabase/migrations/20260617000000_stripe_webhook_events.sql`](../supabase/migrations/20260617000000_stripe_webhook_events.sql), [`app/api/billing/webhook/route.ts`](../app/api/billing/webhook/route.ts))**
  - Created `public.stripe_webhook_events` with RLS. The webhook handler inspects `event.id` prior to processing; returns `NextResponse.json({ received: true, deduplicated: true })` on duplicate deliveries and fails open gracefully if table is transiently unreachable.
- [x] **Automated Stuck-Scan Recovery & Slot Deadlock Prevention ([`supabase/functions/scan-site/index.ts`](../supabase/functions/scan-site/index.ts), [`app/api/scan/route.ts`](../app/api/scan/route.ts))**
  - Automated 3-minute cutoff: both the `scan-site` Edge Function and `GET /api/scan` polling endpoint detect scans lingering in `pending` or `processing` for `> 3 minutes`, updating their status to `failed` (`Scan timed out while processing.`) and releasing concurrency slots.
- [x] **Sensitive Route Rate Limiting Throttles ([`lib/rate-limit.ts`](../lib/rate-limit.ts), [`app/api/auth/magic-link/route.ts`](../app/api/auth/magic-link/route.ts), [`app/api/team/invite/route.ts`](../app/api/team/invite/route.ts))**
  - In-memory sliding-window rate limiter with automatic sweep (`unref()`). Throttles passwordless magic link requests (max 5 per 10 minutes per IP/email) and team member invitations (max 10 per hour per user, max 20 per hour per IP) with RFC-compliant `Retry-After` headers.
- [x] **Populate or Deprecate `public.violations` Relational Table ([`supabase/functions/scan-site/index.ts`](../supabase/functions/scan-site/index.ts) & [`docs/DATABASE.md`](./DATABASE.md))**
  - `scan-site` batch-inserts normalized rows into `public.violations` on scan completion for cross-scan analytics.
- [x] **Remove Remaining Raw Emojis from Production UI ([`components/settings_modal.tsx`](../components/settings_modal.tsx), [`app/docs/page.tsx`](../app/docs/page.tsx))**
  - Enforce the strict Anti-Emoji Policy from [`docs/DESIGN_SYSTEM.md`](./DESIGN_SYSTEM.md) and [`docs/CODE_STYLE.md`](./CODE_STYLE.md) by replacing raw Unicode emojis with clean, accessible SVG icons (`aria-hidden="true"`).

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

- [x] **Run All SQL Migrations in Supabase Project**
  - [x] `20260610000000_init_schema.sql` (profiles, scans, violations, auth trigger)
  - [x] `20260610000001_billing_updates.sql` (subscription tiers & status)
  - [x] `20260610000002_async_scans.sql` (error messages & summary payloads)
  - [x] `20260612000000_create_reports_bucket.sql` (private reports bucket)
  - [x] `20260612000001_api_keys.sql` (hashed developer keys)
  - [x] `20260612000002_ai_fix_cache.sql` (SHA-256 fix cache)
  - [x] `20260613000000_team_access.sql` (teams & team_members)
  - [x] `20260614000000_white_label_branding.sql` (agency branding studio)
  - [x] `20260615000000_scheduled_monitors.sql` (scheduled compliance monitors)
  - [x] `20260616000000_fix_rls_recursion.sql` (security definer RLS functions)
  - [x] `20260617000000_stripe_webhook_events.sql` (webhook idempotency log)
  - *(All migrations consolidated in [`supabase/migrations/combined_pending_migrations.sql`](../supabase/migrations/combined_pending_migrations.sql) for reproducible 1-click deployment to official production project).*
- [x] **Verify Row Level Security (RLS) on Every Public Table**
  - Confirmed `rls_enabled = true` on all 9 tables: `profiles`, `scans`, `violations`, `api_keys`, `ai_fix_cache`, `teams`, `team_members`, `monitors`, `stripe_webhook_events`.
- [x] **Verify `on_auth_user_created` Trigger**
  - Trigger and security definer function `public.handle_new_user()` active on `auth.users` to provision `subscription_tier = 'free'`.
- [x] **Verify Supabase Realtime Publication**
  - Table `public.scans` added to `supabase_realtime` publication for live progress steppers.
- [x] **Verify Private `reports` Storage Bucket**
  - Bucket `reports` provisioned with `public = false` for signed URL PDF report delivery.
- [x] **Deploy & Configure `scan-site` Edge Function**
  - Deployed to Supabase Cloud with hardened SSRF protection, IPv6-mapped IPv4 decoding, redirect interception, and 3-minute timeout recovery.
- [x] **Automated Stuck-Scan Cleanup / Timeout Recovery**
  - Dual-layer timeout recovery active: enforced in `scan-site` prior to concurrency slot allocation and in `GET /api/scan` polling endpoint (auto-transitions scans older than 3 minutes to `failed`).

---

## Phase 3: Stripe Billing, Subscriptions & Unit Economics

- [ ] **Switch Stripe from Test Mode to Live Mode**
  - Complete Stripe account activation, business details, bank payout routing, and tax configuration (Stripe Tax).
- [ ] **Create Live Products & Recurring Price IDs (AUD)**
  - Create **Pro Plan ($29 AUD/month)** → copy live `STRIPE_PRO_PRICE_ID`.
  - Create **Agency Plan ($99 AUD/month)** → copy live `STRIPE_AGENCY_PRICE_ID`.
- [x] **Configure Code-Level Stripe Enhancements**
  - [x] Enabled `allow_promotion_codes: true` in [`app/api/billing/checkout/route.ts`](../app/api/billing/checkout/route.ts).
  - [x] Configured Customer Portal `return_url` to `${origin}/dashboard` in [`app/api/billing/portal/route.ts`](../app/api/billing/portal/route.ts).
  - [x] Added `invoice.payment_failed` webhook handler in [`app/api/billing/webhook/route.ts`](../app/api/billing/webhook/route.ts) to mark subscription `past_due`.
- [ ] **Configure Stripe Customer Portal (Live Dashboard)**
  - Enable plan switching (Pro ↔ Agency with proration), payment method updates, invoice history downloads, and subscription cancellation.
  - Set default return URL to `https://<your-domain>/dashboard`.
- [ ] **Configure Production Stripe Webhook Endpoint**
  - Endpoint URL: `https://<your-domain>/api/billing/webhook`
  - Subscribed events:
    - `checkout.session.completed`
    - `customer.subscription.created`
    - `customer.subscription.updated`
    - `customer.subscription.deleted`
    - `invoice.payment_failed`
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
