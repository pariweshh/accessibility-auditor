# Setup & Deployment Guide

> **Status:** Active / Production Baseline  
> **App Name:** Equivance  
> **Framework:** Next.js 16 (App Router) + Turbopack  
> **Database & Auth:** Supabase Cloud (Postgres 15+, RLS, Edge Functions, Realtime, Storage)  
> **Last Updated:** October 2026  

This guide provides step-by-step instructions for local development and cloud production deployment.

---

## Local Development Setup

### 1. Prerequisites
- **Node.js:** `20.x` or higher (`node --version`)
- **Package Manager:** `npm` (comes with Node)
- **Git**
- **Google Chrome** (for local Puppeteer fallback execution)
- **Supabase Cloud Account** ([supabase.com](https://supabase.com))
- **OpenAI API Key** ([platform.openai.com](https://platform.openai.com))
- **Browserless.io Token** ([browserless.io](https://browserless.io))
- **Resend API Key** ([resend.com](https://resend.com))
- **Stripe Account** ([stripe.com](https://stripe.com))

---

### 2. Clone & Install Dependencies

```bash
git clone https://github.com/pariweshh/accessibility-auditor.git
cd accessibility-auditor
npm install
```

---

### 3. Database & Supabase Migrations

1. Create a new Supabase project in your chosen region.
2. In the Supabase Dashboard SQL Editor, you can execute the single consolidated script [`supabase/migrations/combined_pending_migrations.sql`](../supabase/migrations/combined_pending_migrations.sql), which applies all tables, RLS policies, indexes, and security helper functions.
   Alternatively, apply migrations in chronological sequence from `supabase/migrations/`:
   - `20260610000000_init_schema.sql` (Profiles, scans, violations, RLS, user trigger)
   - `20260610000001_billing_updates.sql` (Stripe customer & subscription columns)
   - `20260610000002_async_scans.sql` (Scan status, error messaging, service role policy)
   - `20260612000000_create_reports_bucket.sql` (Private `reports` storage bucket)
   - `20260612000001_api_keys.sql` (API key hashing and indexes)
   - `20260612000002_ai_fix_cache.sql` (Framework-aware AI fix deduplication cache)
   - `20260613000000_team_access.sql` (Teams, team members, pooled scans, seat quota)
   - `20260614000000_white_label_branding.sql` (Agency branding customization fields)
   - `20260615000000_scheduled_monitors.sql` (Scheduled accessibility monitors, alerts, RLS)
   - `20260616000000_fix_rls_recursion.sql` (Security definer functions preventing cyclic RLS)
   - `20260617000000_stripe_webhook_events.sql` (Stripe webhook idempotency log)
3. Ensure the private Storage Bucket named `reports` is created for vector PDF document storage.
4. Execute `supabase/migrations/phase2_cloud_verification.sql` to confirm all 9 public tables have active Row Level Security (RLS).

---

### 4. Configure Environment Variables

Create `.env.local` in the project root:

```env
# ----------------------------------------------------
# 1. Supabase (Database, Auth, Realtime, Storage)
# ----------------------------------------------------
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

# ----------------------------------------------------
# 2. AI Remediation Engine (OpenAI)
# ----------------------------------------------------
OPENAI_API_KEY=your_openai_api_key_here

# ----------------------------------------------------
# 3. Headless Browser Automation (Browserless.io)
# ----------------------------------------------------
BROWSERLESS_TOKEN=your_browserless_api_token_here

# ----------------------------------------------------
# 4. Transactional Email & Invites (Resend)
# ----------------------------------------------------
RESEND_API_KEY=your_resend_api_key_here
EMAIL_FROM=Equivance <notifications@yourdomain.com>
RESEND_FROM_EMAIL=Equivance <notifications@yourdomain.com>

# ----------------------------------------------------
# 5. Billing & Subscriptions (Stripe - AUD Currency)
# ----------------------------------------------------
STRIPE_SECRET_KEY=your_stripe_secret_key_here
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret_here
STRIPE_PRO_PRICE_ID=price_... # $29 AUD/month recurring price ID
STRIPE_AGENCY_PRICE_ID=price_... # $99 AUD/month recurring price ID

# ----------------------------------------------------
# 6. Scheduled Monitors Worker Secret (Vercel Cron)
# ----------------------------------------------------
CRON_SECRET=your-secure-cron-secret-string

# ----------------------------------------------------
# 7. Application URL & Environment
# ----------------------------------------------------
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development

# Optional: Local Chrome executable path (macOS example)
CHROME_EXECUTABLE_PATH=/Applications/Google Chrome.app/Contents/MacOS/Google Chrome
```

---

### 5. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

### 6. Verify Installation & Quality Gates

Run the automated checks:

```bash
# Type check strict mode (must output 0 errors)
npx tsc --noEmit

# Lint check (must output 0 warnings)
npm run lint

# Unit & integration test suites
npm test

# Self-accessibility dogfooding audit (must report 0 violations across all routes)
npm run test:a11y

# Tier-by-tier live functional & E2E verification (28/28 checks across Free, Pro, Agency)
npm run test:tiers

# SSRF and canonical IP security test suite (41/41 passing checks)
node scripts/test-phase1-security.mjs

# Production build verification
npm run build
```

---

## Cloud Production Deployment (Vercel)

### 1. Push to GitHub
```bash
git add .
git commit -m "feat: complete production readiness"
git push origin main
```

### 2. Link Project on Vercel
1. Import repository on [vercel.com/new](https://vercel.com/new).
2. Framework preset: **Next.js**.
3. Add all variables from `.env.local` to **Project Settings → Environment Variables** (set `NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app` and `CRON_SECRET`).
4. Click **Deploy**.

### 3. Configure Stripe Webhook
1. Go to Stripe Dashboard → Developers → Webhooks.
2. Add endpoint: `https://your-domain.vercel.app/api/billing/webhook`.
3. Select events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
4. Copy Signing Secret into Vercel `STRIPE_WEBHOOK_SECRET`.

---

## Edge Function Deployment (Optional - Supabase CLI)

To deploy the asynchronous Browserless audit worker to Supabase Edge:

```bash
supabase functions deploy scan-site --project-ref your-supabase-ref
```
