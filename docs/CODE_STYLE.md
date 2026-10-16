# Code Style & Engineering Standards

> **Status:** Active / Production Baseline  
> **Enforced By:** ESLint 10, TypeScript 6 Strict Mode, Next.js 16 Compiler  
> **Skill Directives:** `modern-web-guidance`, `design-taste-frontend`, `impeccable`  
> **Last Updated:** October 2026

---

## 01 Core Principles

1. **Deterministic Quality:** Code must be unambiguous, strictly typed, and self-documenting.
2. **Server-First Architecture:** Maximize React Server Components (RSC); isolate client interactivity strictly to leaf components.
3. **Flawless Accessibility (A11y):** Every component authored must adhere to WCAG 2.2 Level AA guidelines.
4. **Resilient Failure Modes:** External failures (Browserless disconnect, OpenAI rate limit, Supabase downtime) must degrade gracefully with explicit user feedback.

---

## 02 TypeScript Strictness & Type Safety

* `tsconfig.json` enforces `"strict": true`, `"noImplicitAny": true`, and `"skipLibCheck": true`.
* **The `any` Ban:** Using `any` is strictly prohibited in application logic. If third-party libraries lack types, declare an explicit local interface or use `unknown` with runtime type narrowing.
* **Interface vs Type:** Prefer `interface` for data payloads and extensible data structures (`ScanResult`, `AccessibilityIssue`); use `type` for unions, primitives, and mapped types.

```typescript
// INCORRECT: Insecure and untyped
export function processResult(data: any) {
  return data.violations.length
}

// CORRECT: Strictly typed interface
export interface ViolationNode {
  html: string
  target: string[]
  failureSummary: string
}

export interface AccessibilityIssue {
  id: string
  impact: "minor" | "moderate" | "serious" | "critical"
  description: string
  help: string
  helpUrl: string
  tags: string[]
  nodes: ViolationNode[]
}

export function processResult(issue: AccessibilityIssue): number {
  return issue.nodes.length
}
```

---

## 03 Next.js 16 & React 19 Conventions

### 1. Leaf Client Component Isolation
* Keep the page route (`page.tsx`) as a Server Component.
* Place `"use client"` at the very top of interactive leaf components.
* Pass heavy server-rendered content as `children` or explicit props to avoid swelling client JavaScript bundles:

```tsx
// app/page.tsx (Server Component)
import HomeClient from "./home_client"
import LandingFeatures from "@/components/landing_features"

export default function Home() {
  return (
    <main>
      {/* LandingFeatures is rendered server-side and passed into the client island */}
      <HomeClient features={<LandingFeatures />} />
    </main>
  )
}
```

### 2. Background Task Execution via Next.js `after()`
* When performing asynchronous tasks post-response (such as triggering an external Edge Function), use Next.js's native `after()` callback:

```typescript
import { after } from "next/server"

export async function POST(req: Request) {
  // Validate and insert record...
  
  after(async () => {
    // Keeps Vercel serverless container alive until request is dispatched
    await fetch(edgeFunctionUrl, { ... })
  })

  return NextResponse.json({ scanId }, { status: 202 })
}
```

---

## 04 Tailwind CSS v4 & Styling Guidelines

* Tailwind v4 is integrated via `@tailwindcss/postcss`.
* **Viewport Stability:** Never use `h-screen` for full-height containers. Always use `min-h-[100dvh]` to prevent viewport jumping on mobile browsers (iOS Safari toolbar resize).
* **Grid Over Flex-Math:** Never calculate fractional percentages in flexbox (`w-[calc(33%-1rem)]`). Always use CSS Grid (`grid grid-cols-1 md:grid-cols-3 gap-6`).
* **Design Token Adherence:** Never use arbitrary colors (e.g. `text-[#8239df]`). Rely exclusively on the calibrated system tokens (`slate-950`, `slate-900`, `indigo-500`, `rose-400`, `emerald-400`).

---

## 05 Accessibility & Architectural Standards

### 1. Strict Anti-Emoji & Iconography Policy
* **Zero Raw Unicode Glyphs:** Never use raw Unicode emojis or symbols in production markup, UI components, or documentation.
* **Prohibited Glyphs:** Emojis and characters like checkmarks, cross marks, triangles, warning symbols, sparkles, rockets, stars, or info icons are banned from strings.
* **Accessible SVG Icons:** Always use accessible SVGs with `aria-hidden="true"` and an adjacent screen-reader text label (`<span className="sr-only">Label</span>`), or an explicit `aria-label` on the interactive parent button/link.

### 2. Character-Splitting & Motion Accessibility
* Under ARIA 1.2+, putting `aria-label` directly on generic `<span>` tags without an ARIA role triggers `aria-prohibited-attr`.
* When splitting titles into individual animated character spans (e.g. `framer-motion`), always wrap the split animated container in `aria-hidden="true"` and supply an adjacent, non-split accessible label:
```tsx
<span className="sr-only">A11ytica Pro</span>
<span aria-hidden="true">
  {letters.map((char, i) => (
    <motion.span key={i}>{char}</motion.span>
  ))}
</span>
```

### 3. Modal Dialog Focus Containment (`useFocusTrap`)
* Every interactive modal dialog (`SettingsModal`, `ComplianceKitModal`, `CreateMonitorModal`) must implement strict focus trapping using `hooks/use-focus-trap.ts`.
* Modals must automatically focus the first interactive element or close button upon mounting.
* `Tab` and `Shift+Tab` keystrokes must strictly cycle within the modal container.
* Pressing `Escape` or clicking the backdrop must close the modal and restore focus to the triggering element.

### 4. WAI-ARIA Multi-Tab Interfaces
* All tab switchers (e.g. `manual_checklist.tsx`, `results_display.tsx`) must implement full WAI-ARIA tab semantics:
  - Container element declared as `role="tablist"` with an `aria-label`.
  - Individual tabs declared as `<button role="tab" aria-selected={isActive} id="tab-..." aria-controls="panel-...">`.
  - Content containers declared as `<div role="tabpanel" id="panel-..." aria-labelledby="tab-...">`.
  - Arrow key navigation (`ArrowRight`, `ArrowLeft`, `Home`, `End`) must shift active tabs and move keyboard focus seamlessly.

### 5. Scrollable Container Keyboard Operability (WCAG 2.1 SC 2.1.1)
* Preformatted code blocks (`<pre>`) or horizontal overflow containers (`overflow-x-auto`) must declare `tabIndex={0}` and an accessible label (`aria-label="..."`) so keyboard-only users can scroll through content using arrow keys.

### 6. Mockup Landmark Architecture
* Interactive marketing mockups or preview cards (e.g. `components/dashboard_mockup.tsx`) must never render top-level landmark elements (`<main>`, `<header>`, `<aside>`, `<footer>`) without explicit labels or isolation, preventing duplicate top-level landmark violations in automated scanners.

---

## 06 Anti-Patterns & AI Tells

To preserve high-end engineering quality, developers and AI agents must avoid the following patterns:

1. **The "Lila Ban" (No Generic AI Purple):**
   * Do not apply multi-color purple-to-pink gradient backgrounds or neon button glows.
   * Stick to absolute Slate/Zinc dark neutrals with singular Indigo accent highlights.
2. **No Generic Spinners:**
   * Avoid full-page circular loading spinners.
   * Provide layout-accurate shimmer skeletons (`components/motion/shimmer-skeleton.tsx`) that mirror the target component dimensions.
3. **No Unbounded Scroll Listeners:**
   * Never attach `window.addEventListener('scroll')` to track visibility or scroll positions.
   * Use `IntersectionObserver` or Framer/Motion's `useScroll` hook outside the React render cycle.

---

## 07 Naming & Structural Conventions

| Entity | Pattern | Example |
| :--- | :--- | :--- |
| **Component Files** | `snake_case.tsx` | `scan_form.tsx`, `results_display.tsx`, `issue_card.tsx` |
| **Utility / Lib Files** | `kebab-case.ts` | `ai-fixer.ts`, `report-template.ts`, `site.ts` |
| **Hooks** | `use-kebab-case.ts` | `use-focus-trap.ts` |
| **Component Names** | `PascalCase` | `ScanForm`, `ResultsDisplay`, `SeverityBadge` |
| **Functions & Hooks** | `camelCase` | `generateBatchFixes`, `checkQuota`, `useFocusTrap` |
| **Constants & Enums** | `UPPER_SNAKE_CASE` | `SCAN_LIMITS`, `WCAG_STANDARD`, `BADGE_STYLES` |
| **Database Fields** | `snake_case` | `user_id`, `stripe_customer_id`, `key_hash` |
| **API Endpoints** | `kebab-case` routes | `/api/fix-suggestions`, `/api/billing/checkout` |

---

## 08 Error Handling & API Responses

All API endpoints must return structured JSON errors with appropriate HTTP status codes:

```typescript
// 400 Bad Request
return NextResponse.json({ error: "Invalid URL format" }, { status: 400 })

// 401 Unauthorized
return NextResponse.json({ error: "Unauthorized: Missing or invalid API key" }, { status: 401 })

// 429 Quota Exceeded
return NextResponse.json({
  error: "quota_exceeded",
  message: `You've used all ${quota.limit} scans for this month on the ${quota.tier} plan.`,
  quota,
}, { status: 429 })

// 500 Internal Error
return NextResponse.json({
  error: error instanceof Error ? error.message : "Internal Server Error"
}, { status: 500 })
```

---

## 09 Git & Commit Standards

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

* `feat:` A new user-facing feature (e.g. `feat(scanner): add support for basic auth headers`).
* `fix:` A bug fix (e.g. `fix(reports): resolve SVG font rendering in generated PDF`).
* `docs:` Documentation updates (e.g. `docs(architecture): document Deno Edge Function`).
* `refactor:` Code restructuring without functional alterations.
* `test:` Adding or adjusting unit/integration/e2e tests.
* `chore:` Build scripts, package updates, configuration adjustments.
