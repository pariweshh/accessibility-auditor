# API Documentation

> **Status:** Active / Production Baseline  
> **API Version:** v1  
> **Base URL:** `https://accessibility-auditor.vercel.app` (Production) / `http://localhost:3000` (Local)  
> **Last Updated:** October 2026  

Welcome to the A11ytica Pro Developer API reference. The API enables automated accessibility scanning, AI-powered remediation, team workspace collaboration, custom white-label reports, and programmatic API key management.

---

## Authentication & Authorization

All authenticated endpoints accept credentials through one of two mechanisms:

### 1. Developer API Key (Machine-to-Machine & CI/CD)
Pro and Agency tier accounts can provision live API keys from the dashboard.
Pass the key in the `x-api-key` header with every request:

```http
x-api-key: aud_live_a1b2c3d4e5f6...
```

* Keys are generated using high-entropy CSPRNG tokens (`aud_live_` prefix).
* Keys are validated server-side against an indexed SHA-256 hash.
* If a key is compromised, revoke it immediately via `DELETE /api/keys`.

### 2. Supabase Session Cookies (Interactive Dashboard)
Browser client sessions use HTTP-only, secure cookies managed by `@supabase/ssr`.

---

## Commercial Tiers & Rate Limits

| Tier | Monthly Scans | Quota Pooling | Developer API & CI/CD | Compliance & Branding | AI Fix Engine |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Free** | 5 scans / mo | Solo (1 seat) | Restricted (No access) | Standard Web View | GPT-4o-mini (`HTML` only) |
| **Pro** ($19/mo) | 150 scans / mo | Solo (1 seat) | Full API + CI/CD Builder | Vector PDF (POUR Matrix) + EAA/ADA Kit + SVG Badge | GPT-4o (`HTML`, `React/Tailwind`, `Vue 3`, `Angular`) |
| **Agency** ($59/mo) | 600 scans / mo | **Pooled (3 seats)** | Full API + CI/CD Builder | **Full White-Label** PDF, Web, Kit & SVG Badge | GPT-4o (`HTML`, `React/Tailwind`, `Vue 3`, `Angular`) |

Rate limiting is enforced atomically via `lib/quota.ts` against PostgreSQL records. Requests exceeding monthly quotas return `429 Too Many Requests`.

---

## Endpoints Reference

### 1. Auditing & Accessibility Scans

#### `POST /api/scan`
Dispatches an accessibility audit for a target URL using headless Chromium and `axe-core 4.12`.

**Headers:**
```http
Content-Type: application/json
x-api-key: aud_live_... (optional if session cookie present)
```

**Request Body:**
```json
{
  "url": "https://example.com"
}
```

| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `url` | string | Yes | Fully qualified URL (`http://` or `https://` only). Private IP ranges (RFC 1918 in production), cloud provider metadata endpoints (`169.254.169.254`, `metadata.google.internal`), IPv4/IPv6 link-local addresses, integer/octal/IPv6-mapped IPv4 addresses, DNS rebinding targets (`lib/ssrf.ts`), and loopbacks are strictly blocked. |

**Response (202 Accepted - Asynchronous Execution):**
```json
{
  "scanId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "status": "pending",
  "message": "Scan queued successfully"
}
```

*Clients can subscribe to realtime status changes via Supabase Realtime WebSocket on table `scans` filtering by `id=eq.{scanId}`.*

**Synchronous Fallback / Polled Complete Response (200 OK):**
```json
{
  "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "url": "https://example.com",
  "status": "completed",
  "score": 88,
  "violations": [
    {
      "id": "color-contrast",
      "impact": "serious",
      "description": "Ensures the contrast between foreground and background colors meets WCAG 2 AA minimum thresholds",
      "help": "Elements must have sufficient color contrast",
      "helpUrl": "https://dequeuniversity.com/rules/axe/4.12/color-contrast",
      "tags": ["cat.color", "wcag2aa", "wcag143"],
      "nodes": [
        {
          "html": "<button class=\"text-gray-400 bg-white\">Submit</button>",
          "target": ["button.text-gray-400"],
          "failureSummary": "Element has insufficient color contrast of 2.8:1 (expected 4.5:1)"
        }
      ]
    }
  ],
  "incomplete": [],
  "passes": 42,
  "summary": {
    "critical": 0,
    "serious": 1,
    "moderate": 2,
    "minor": 1
  },
  "created_at": "2026-10-15T10:30:00Z"
}
```

**Common Error Codes:**
* `400 Bad Request`: Invalid or malformed URL, or SSRF attempt targeting local/private IP ranges.
* `401 Unauthorized`: No active session or invalid API key.
* `429 Too Many Requests`: Monthly scan quota exhausted for the account or team pool.

#### `GET /api/scan?scanId={scanId}`
Polls the current status and audit results of a previously dispatched scan. Ideal for CI/CD pipelines (GitHub Actions, GitLab CI) authenticating via `x-api-key`.

**Headers:**
```http
x-api-key: aud_live_... (optional if session cookie present)
```

**Response (200 OK - In Progress):**
```json
{
  "scanId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "url": "https://example.com",
  "status": "processing",
  "violations": 0,
  "passes": 0,
  "incomplete": 0,
  "summary": null,
  "result": null,
  "error_message": null,
  "created_at": "2026-10-15T10:30:00Z"
}
```

**Response (200 OK - Completed):**
Returns the full `ScanRecord` including `status: "completed"`, `summary`, and `result` (complete `ScanResult` object).

---

### 2. Framework-Aware AI Code Remediation

#### `POST /api/fix-suggestions`
Generates contextual before/after code patches and technical WCAG explanations using OpenAI. Employs a framework-aware SHA-256 fix cache (`public.ai_fix_cache`) keyed by `SHA-256(issueId + ":" + framework + ":" + originalHtml + ":" + model)` to deliver instant responses for previously resolved code patterns. Supports both session cookie and `x-api-key` authentication, and accepts either a single-issue payload or a batch `{ issues: [...] }` payload.

* **Framework Selection (`framework`):** Accepts `"html"` (default, available on all tiers), `"react-tailwind"`, `"vue"`, or `"angular"` (gated to Pro and Agency tiers; falls back to `"html"` on Free tier).

**Single-Issue Request Body:**
```json
{
  "issueId": "color-contrast",
  "issueDescription": "Elements must have sufficient color contrast",
  "html": "<button class=\"text-gray-400 bg-white\">Submit</button>",
  "failureSummary": "Element has insufficient color contrast of 2.8:1 (expected 4.5:1)",
  "framework": "react-tailwind",
  "model": "gpt-4o"
}
```

**Batch Request Body:**
```json
{
  "issues": [
    {
      "issueId": "color-contrast",
      "issueDescription": "Elements must have sufficient color contrast",
      "issueHelp": "Ensure contrast ratio meets WCAG AA",
      "html": "<button class=\"text-gray-400 bg-white\">Submit</button>",
      "target": ["button.text-gray-400"],
      "failureSummary": "Element has insufficient color contrast of 2.8:1 (expected 4.5:1)"
    }
  ],
  "limit": 1,
  "framework": "react-tailwind",
  "model": "gpt-4o"
}
```

**Response (200 OK):**
```json
{
  "fix": {
    "issueId": "color-contrast",
    "originalHtml": "<button class=\"text-gray-400 bg-white\">Submit</button>",
    "suggestedFix": "<button type=\"button\" className=\"text-gray-700 bg-white font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600\">Submit</button>",
    "explanation": "Converted to JSX (`className`) and updated text color from `text-gray-400` to `text-gray-700` to increase the contrast ratio from 2.8:1 to 5.4:1, exceeding WCAG 2.2 AA requirement 1.4.3.",
    "confidence": "high",
    "framework": "react-tailwind",
    "cached": true
  },
  "suggestions": [
    {
      "issueId": "color-contrast",
      "originalHtml": "<button class=\"text-gray-400 bg-white\">Submit</button>",
      "suggestedFix": "<button type=\"button\" className=\"text-gray-700 bg-white font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600\">Submit</button>",
      "explanation": "Converted to JSX (`className`) and updated text color from `text-gray-400` to `text-gray-700` to increase the contrast ratio from 2.8:1 to 5.4:1, exceeding WCAG 2.2 AA requirement 1.4.3.",
      "confidence": "high",
      "framework": "react-tailwind",
      "cached": true
    }
  ],
  "count": 1,
  "framework": "react-tailwind"
}
```

---

### 3. Developer API Keys

#### `GET /api/keys`
Lists all active API keys associated with the authenticated account.

**Response (200 OK):**
```json
{
  "keys": [
    {
      "id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
      "key_prefix": "aud_live_a1b2c3d4",
      "name": "GitHub Actions CI",
      "created_at": "2026-10-15T08:00:00Z",
      "last_used_at": "2026-10-15T09:15:22Z"
    }
  ]
}
```

#### `POST /api/keys`
Provisions a new API key. **The full plaintext secret is returned only once in this response.**

**Request Body:**
```json
{
  "name": "Production Deploy Bot"
}
```

**Response (201 Created):**
```json
{
  "key": "aud_live_e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  "name": "Production Deploy Bot",
  "key_prefix": "aud_live_e3b0c442",
  "id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d"
}
```

#### `DELETE /api/keys`
Revokes an API key immediately.

**Request Query or JSON Body:**
`DELETE /api/keys?id=9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d`

**Response (200 OK):**
```json
{
  "success": true,
  "message": "API key revoked successfully"
}
```

---

### 4. Team Collaboration (Agency Tier)

#### `GET /api/team`
Returns the active workspace status, total seat allocation, and current roster.

**Response (200 OK):**
```json
{
  "team": {
    "id": "d3b07384-d113-494b-9c8e-0b0c61141e8c",
    "name": "Acme Agency Workspace",
    "isOwner": true,
    "maxSeats": 3,
    "usedSeats": 2,
    "availableSeats": 1
  },
  "members": [
    {
      "id": "11111111-2222-3333-4444-555555555555",
      "user_id": "owner-user-id",
      "email": "owner@acme.com",
      "role": "owner",
      "status": "active",
      "created_at": "2026-10-10T00:00:00Z"
    },
    {
      "id": "66666666-7777-8888-9999-000000000000",
      "user_id": null,
      "email": "designer@acme.com",
      "role": "member",
      "status": "pending",
      "created_at": "2026-10-15T12:00:00Z",
      "invite_token": "a4f8... (only visible to team owner)"
    }
  ]
}
```

#### `POST /api/team/invite`
Invites a team collaborator by email. Strictly enforces the 3-seat workspace ceiling and dispatches an invitation link via Resend.

**Request Body:**
```json
{
  "email": "auditor@acme.com"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Invitation sent successfully to auditor@acme.com",
  "inviteToken": "e7c2a1...",
  "joinUrl": "https://accessibility-auditor.vercel.app/auth/join?token=e7c2a1..."
}
```

#### `POST /api/team/accept`
Validates an invitation token and adds the authenticated user to the team workspace.

**Request Body:**
```json
{
  "token": "e7c2a1..."
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Successfully joined the team workspace",
  "teamId": "d3b07384-d113-494b-9c8e-0b0c61141e8c"
}
```

#### `DELETE /api/team/member`
Removes an active collaborator or revokes an outstanding invitation. Owners cannot remove themselves.

**Request Query or JSON Body:**
`DELETE /api/team/member?memberId=66666666-7777-8888-9999-000000000000`

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Team member removed successfully"
}
```

---

### 5. White-Label Branding (Agency Tier)

#### `GET /api/team/branding`
Retrieves the white-label custom branding configuration for the current team workspace.

**Response (200 OK):**
```json
{
  "hasAccess": true,
  "isOwner": true,
  "branding": {
    "brand_name": "NexusFlow Digital",
    "brand_logo_url": "https://nexusflow.agency/logo.png",
    "brand_primary_color": "#0ea5e9",
    "brand_tagline": "Enterprise Accessibility Auditing & Compliance",
    "brand_footer_text": "Confidential audit prepared by NexusFlow Digital for client review.",
    "brand_hide_watermark": true
  }
}
```

#### `POST /api/team/branding`
Updates custom branding assets applied to web reports and PDF exports. Input fields are strictly validated (Hex color regex, URL protocol safety, and HTML escaping).

**Request Body:**
```json
{
  "brand_name": "NexusFlow Digital",
  "brand_logo_url": "https://nexusflow.agency/logo.png",
  "brand_primary_color": "#0ea5e9",
  "brand_tagline": "Enterprise Accessibility Auditing & Compliance",
  "brand_footer_text": "Confidential audit prepared by NexusFlow Digital for client review.",
  "brand_hide_watermark": true
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "branding": { ... }
}
```

---

### 6. PDF Reports & Live SVG Compliance Badges

#### `GET /api/reports/pdf?scanId={scanId}`
#### `POST /api/reports/pdf`
Generates or retrieves a vector-grade compliance audit PDF (including the VPAT/ACR-style **WCAG 2.2 4-Principle POUR Conformance Summary Matrix**). Agency tier documents dynamically inject the team's white-label branding. Pass `force: true` to invalidate previous PDF caches.

**POST Request Body:**
```json
{
  "scanId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "force": true
}
```

**Response Headers:**
```http
Content-Type: application/pdf
Content-Disposition: attachment; filename="accessibility-report-example-com.pdf"
```

#### `GET /api/badge/[scanId]`
Returns a live, cache-optimized `image/svg+xml` compliance shield for completed scans owned by Pro or Agency subscribers.
* **Pro Tier:** Displays `WCAG 2.2 AA · A11ytica` on the left segment and `{score}% · {Pass|Review}` on the right segment.
* **Agency Tier:** Automatically white-labels the left segment using the workspace's `brand_name` (`WCAG 2.2 · {brand_name}`) and custom `brand_primary_color` when configured.
* **Public Verification Link (`/report/[scanId]?verify=1`):** Embedding the badge alongside `<a href="https://.../report/{scanId}?verify=1">` opens a read-only public verification view of the audit report with the scan owner's email address masked for privacy.

**Response Headers:**
```http
Content-Type: image/svg+xml; charset=utf-8
Cache-Control: public, max-age=300, s-maxage=300, stale-while-revalidate=600
```

---

### 7. Billing & Subscriptions

#### `POST /api/billing/checkout`
Creates a Stripe Checkout Session for subscription upgrades.

**Request Body:**
```json
{
  "tier": "pro" // or "agency"
}
```

**Response (200 OK):**
```json
{
  "url": "https://checkout.stripe.com/c/pay/cs_live_..."
}
```

#### `POST /api/billing/portal`
Generates a Stripe Customer Portal redirect URL for managing billing details, credit cards, or subscription cancellations.

**Response (200 OK):**
```json
{
  "url": "https://billing.stripe.com/p/session/..."
}
```

---

### 8. Account & Data Privacy (GDPR / CCPA)

#### `DELETE /api/auth/account`
Permanently deletes the authenticated user's account, cancels any active Stripe subscription, removes stored PDF reports from Supabase Storage (`reports/{userId}/*`), and cascades deletion across `profiles`, `scans`, `violations`, `api_keys`, `teams`, and `team_members`.

**Request Body:**
```json
{
  "confirm": "DELETE"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Your account and all associated data have been permanently deleted."
}
```

---

### 9. Scheduled Accessibility Monitors & Degradation Alerts

Automated continuous monitoring for Pro (up to 3 active monitors) and Agency (up to 10 active monitors) subscribers.

#### `GET /api/monitors`
Lists all active and paused scheduled monitors for the authenticated user or team workspace.

**Response (200 OK):**
```json
{
  "monitors": [
    {
      "id": "e830f368-2c26-4b82-bc10-2394a4c58be2",
      "user_id": "user-uuid",
      "team_id": null,
      "url": "https://example.com/checkout",
      "frequency": "daily",
      "status": "active",
      "alert_email": "alerts@example.com",
      "alert_on_degradation": true,
      "min_score_threshold": 90,
      "last_run_at": "2026-10-16T08:00:00Z",
      "last_score": 94,
      "last_scan_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "next_run_at": "2026-10-17T08:00:00Z",
      "created_at": "2026-10-15T00:00:00Z"
    }
  ],
  "tier": "pro",
  "usedCount": 1,
  "maxMonitors": 3,
  "hasAccess": true
}
```

#### `POST /api/monitors`
Provisions a new automated recurring monitor. Target URL is strictly validated against private IP ranges and DNS-rebinding (`lib/ssrf.ts`).

**Request Body:**
```json
{
  "url": "https://example.com/checkout",
  "frequency": "daily", // "daily" | "weekly"
  "alertEmail": "alerts@example.com",
  "minScoreThreshold": 90,
  "alertOnDegradation": true
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Scheduled monitor created successfully",
  "monitor": { ... }
}
```

#### `PATCH /api/monitors/[id]`
Updates monitor frequency, pause/active status, alert email, or degradation alert settings.

**Request Body:**
```json
{
  "status": "paused" // or "active"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Monitor updated successfully",
  "monitor": { ... }
}
```

#### `DELETE /api/monitors/[id]`
Permanently removes a scheduled monitor.

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Monitor deleted successfully"
}
```

#### `POST /api/monitors/[id]/run`
Triggers an immediate on-demand audit for the specified monitor and updates its `last_score` and `last_run_at`.

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Monitor audit dispatched successfully",
  "scanId": "3fa85f64-5717-4562-b3fc-2c963f66afa6"
}
```

#### `GET /api/cron/monitors`
Invoked hourly by Vercel Cron. Requires `Authorization: Bearer <CRON_SECRET>` header. Fetches due monitors (`status = 'active' AND next_run_at <= now()`), checks monthly quotas, dispatches scans, and sends Resend email alerts if a score degrades.

**Response (200 OK):**
```json
{
  "success": true,
  "processedCount": 2,
  "results": [
    {
      "monitorId": "e830f368-2c26-4b82-bc10-2394a4c58be2",
      "url": "https://example.com/checkout",
      "status": "dispatched",
      "scanId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "alertSent": false
    }
  ]
}
```

---

### 10. Embeddable Public Compliance Widget

#### `GET /widget.js`
Serves the standalone, zero-dependency client widget script with CORS headers (`Access-Control-Allow-Origin: *`). Encapsulated in an open Shadow DOM to isolate styles from host page CSS.

**Response Headers:**
```http
Content-Type: application/javascript; charset=utf-8
Access-Control-Allow-Origin: *
Cache-Control: public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400
```

#### `GET /api/widget/[scanId]`
Returns public WCAG 2.2 AA conformance metadata, POUR principle status, and white-label branding for the embeddable widget. Strictly tier-gated to Pro and Agency subscribers.

**CORS Headers:**
* `Access-Control-Allow-Origin: *`
* `Access-Control-Allow-Methods: GET, OPTIONS`

**Response (200 OK):**
```json
{
  "scanId": "8f8e02d0-5b5c-4d89-8d76-e17f058022a1",
  "url": "https://example.com",
  "score": 96,
  "auditDate": "2026-10-16T12:00:00Z",
  "conformance": "Substantially Conformant",
  "summary": {
    "critical": 0,
    "serious": 0,
    "moderate": 1,
    "minor": 2
  },
  "passesCount": 42,
  "standards": [
    "WCAG 2.2 Level AA",
    "European Accessibility Act (EAA 2025)",
    "ADA Title III"
  ],
  "pour": {
    "perceivable": { "name": "Perceivable", "description": "...", "violations": 0, "status": "Pass" },
    "operable": { "name": "Operable", "description": "...", "violations": 0, "status": "Pass" },
    "understandable": { "name": "Understandable", "description": "...", "violations": 1, "status": "Needs Review" },
    "robust": { "name": "Robust", "description": "...", "violations": 2, "status": "Needs Review" }
  },
  "branding": {
    "name": "Acme Agency",
    "logo": "https://...",
    "color": "#0ea5e9",
    "tagline": "WCAG 2.2 Level AA Verified",
    "footerText": "Compliance verified quarterly.",
    "whiteLabel": true
  },
  "verifyUrl": "https://a11ytica.com/report/8f8e02d0-5b5c-4d89-8d76-e17f058022a1?verify=1"
}
```

**Response (403 Forbidden - Free Tier):**
```json
{
  "error": "Widget embedding requires an active Pro or Agency subscription",
  "tier": "free",
  "upgradeUrl": "https://a11ytica.com/#pricing"
}
```



