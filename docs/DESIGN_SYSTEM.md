# Design System & UI/UX Guidelines

> **Standard:** A11ytica Pro High-End Engineering Design System  
> **Status:** Active / Production Baseline  
> **Version:** 2.4.0  
> **Skill Directives:** `design-taste-frontend`, `high-end-visual-design`, `impeccable`, `a11y-debugging`

---

## 01 Design Philosophy & Baseline Configuration

A11ytica Pro is a specialized software tool designed for software engineers, QA teams, and accessibility compliance specialists. The interface reflects the precision and gravitas of security and compliance infrastructure.

### Baseline Parameters
* **DESIGN_VARIANCE:** `8` (Asymmetric layout elements, split-screen balance, crisp negative space, offset technical panels; mobile strictly collapses to clean single-column `px-4 py-8`).
* **MOTION_INTENSITY:** `6` (Fluid CSS, Framer/Motion spring physics `{ stiffness: 100, damping: 20 }`, staggered waterfall entries, zero linear transitions).
* **VISUAL_DENSITY:** `4` (Landing & Marketing: airy, spacious, art gallery elegance) / `8` (Dashboard & Report Views: dense, high information throughput, 1px separation lines, monospace numeric displays).

---

## 02 Typography & Font Architecture

```
Display Headlines:  Geist Sans (Variable) · font-display · tracking-tighter leading-none
Body Copy:          Geist Sans (Variable) · font-sans · text-slate-400 · leading-relaxed
Code & Metrics:     Geist Mono · font-mono · tabular-nums
```

### Font Pairing Rules
1. **Ban on Serifs:** Serif typefaces are strictly prohibited across all software, dashboard, and report views.
2. **Display Headlines:** Used for major section titles and hero messages:
   * Class: `text-3xl md:text-5xl lg:text-6xl font-black text-slate-50 tracking-tight font-display`
3. **Subheaders & Section Labels:**
   * Class: `text-[10px] md:text-xs font-black uppercase tracking-widest text-indigo-400`
4. **Body Text:**
   * Class: `text-sm text-slate-400 leading-relaxed max-w-[65ch]`
5. **Numerical Metrics & Code Snippets:**
   * Class: `font-mono tabular-nums text-slate-200`

---

## 03 Color System & Token Palette

A11ytica Pro implements a strict dark-mode-first aesthetic. It complies with the **Anti-Slop Color Directives** (strict prohibition of generic purple glows, neon gradient overlays, or multi-hue noise).

### 1. Foundation Neutrals (Deep Space Slate)

| Token | Hex Value | Usage |
| :--- | :--- | :--- |
| `slate-950` | `#020617` | Canvas background |
| `slate-900` | `#0f172a` | Primary elevated surface (cards, dialogs) |
| `slate-850` | `#172033` | Borders, subtle dividers, inactive tabs |
| `slate-800` | `#1e293b` | Structural borders, input outlines |
| `slate-700` | `#334155` | Secondary text, inactive iconography |
| `slate-400` | `#94a3b8` | Primary body text, labels |
| `slate-200` | `#e2e8f0` | High-contrast subheadings |
| `slate-50` | `#f8fafc` | Primary titles, button labels |

### 2. Primary Brand Accent (Singular Calibrated Indigo)
* **Primary Accent:** `indigo-500` (`#6366f1`)
* **Primary Accent Hover:** `indigo-400` (`#818cf8`)
* **Active Press:** `indigo-600` (`#4f46e5`)
* **Subtle Highlight Tint:** `indigo-500/10` with border `indigo-500/20`
* *Constraint:* Single accent color across the entire application. No secondary cyan or magenta accents.

### 3. Semantic WCAG Severity Tokens (4.5:1 Contrast Compliant)

| Severity | Accent Hex | Dark Mode BG | Text Color | Meaning |
| :--- | :--- | :--- | :--- | :--- |
| **Critical** | `#ef4444` (`rose-500`) | `#450a0a` / `rose-500/10` | `rose-400` | Complete barrier; immediate failure |
| **Serious** | `#f97316` (`orange-500`) | `#431407` / `orange-500/10` | `orange-400` | Significant obstacle for assistive tech |
| **Moderate** | `#f59e0b` (`amber-500`) | `#451a03` / `amber-500/10` | `amber-400` | Usability issue; violates Level AA |
| **Minor** | `#3b82f6` (`blue-500`) | `#082f49` / `blue-500/10` | `blue-400` | Sub-optimal practice or Level AAA |
| **Pass / Success** | `#10b981` (`emerald-500`) | `#064e3b` / `emerald-500/10` | `emerald-400` | Verified compliant with test standard |

---

## 04 Materiality, Liquid Glass & Refraction

Generic blurred cards are strictly avoided. All elevated surfaces must use physical refraction mechanics:

### The Liquid Glass Recipe
```css
/* Tailwind Class String */
className="bg-slate-900/60 backdrop-blur-xl border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] rounded-2xl"
```
* **Inner Highlight:** `shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]` simulates light catching the beveled edge of a glass pane.
* **Surface Translucency:** `bg-slate-900/60` preserves legibility while revealing background subtle glow.
* **Border Definition:** `border border-white/10` provides structural separation on pure black or deep slate canvases.

---

## 05 Motion Tokens & Micro-Interactions

### 1. Spring Physics Configuration
All physics-driven motion (`motion/react`) relies on consistent spring parameters:
```typescript
export const SPRING_TRANSITION = {
  type: "spring",
  stiffness: 100,
  damping: 20,
} as const
```

### 2. Micro-Interaction Rules
* **Tactile Feedback:** Every interactive button and card features micro-scale feedback:
  ```css
  className="transition-transform active:scale-[0.98] hover:scale-[1.01]"
  ```
* **Waterfall Stagger:** Lists and issue tables mount via staggered cascades rather than abrupt pop-ins:
  ```typescript
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.06 },
    },
  }
  ```
* **Scroll-Linked Reveals:** Implemented via `useScrollReveal` (`IntersectionObserver`), strictly avoiding `window.addEventListener('scroll')` to prevent main-thread jank.

### 3. Accessible Motion (`prefers-reduced-motion`)
All animations must respect vestibular disorder preferences:
```typescript
import { useReducedMotion } from "@/hooks/use-reduced-motion"

// In components:
const shouldReduce = useReducedMotion()
const animationProps = shouldReduce ? {} : { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } }
```

---

## 06 Accessibility (A11y) Design Mandates

As an accessibility testing product, A11ytica Pro must maintain a flawless self-audit record.

1. **Contrast Ratio Strictness:**
   * Normal text ($\le 18\text{pt}$ / $24\text{px}$): Minimum **$4.5:1$** contrast against background.
   * Large text ($\ge 18\text{pt}$ bold or $24\text{px}$ regular): Minimum **$3:1$** contrast.
   * UI Controls & Graphical Boundaries: Minimum **$3:1$** contrast against adjacent colors.
2. **Focus Visibility:**
   * Standard focus outline:
     ```css
     className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
     ```
   * Never set `outline: none` without providing a distinct `focus-visible` state.
3. **Interactive Target Sizing (WCAG 2.2 SC 2.5.8):**
   * All clickable elements (buttons, links, toggle switches) must have a touch target of at least **$24 \times 24\text{ CSS pixels}$**, with **$44 \times 44\text{ CSS pixels}$** as standard for primary actions on touch viewports.
4. **Anti-Emoji Policy:**
   * Raw Unicode emojis in UI markup, buttons, and alert messages are strictly banned.
   * All iconography must use SVG primitives or approved icon systems (`@phosphor-icons/react` or `@radix-ui/react-icons`) with an explicit `aria-hidden="true"` or accessible `<title>` / `aria-label`.

---

## 07 Component Architecture & Patterns

### 1. Primary Action Button
```tsx
<button
  type="submit"
  disabled={isLoading}
  className="relative inline-flex items-center justify-center gap-2 px-6 py-3 text-xs font-black text-white bg-linear-to-r from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 rounded-xl transition-all shadow-md active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
>
  {isLoading ? <Spinner className="w-4 h-4 animate-spin" /> : "Scan for Accessibility Issues"}
</button>
```

### 2. Issue Severity Badge
```tsx
const BADGE_STYLES = {
  critical: "bg-rose-500/10 text-rose-400 border-rose-500/20",
  serious:  "bg-orange-500/10 text-orange-400 border-orange-500/20",
  moderate: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  minor:    "bg-blue-500/10 text-blue-400 border-blue-500/20",
}

export function SeverityBadge({ impact }: { impact: "critical" | "serious" | "moderate" | "minor" }) {
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-3xs font-extrabold uppercase tracking-wider border ${BADGE_STYLES[impact]}`}>
      {impact}
    </span>
  )
}
```

### 3. Shimmer Skeleton Loading State
* Circular spinners for page-level loading are forbidden.
* Layout-accurate shimmer skeletons (`components/motion/shimmer-skeleton.tsx`) must mirror the layout dimensions of the loaded data cards.

---

## 08 Universal Beacon Brand System & Iconography

### 1. Logo Philosophy & Geometry
The **Universal Beacon** is the unifying brand mark for A11ytica Pro across the web application, favicon ecosystem, Apple touch icons, and OpenGraph social cards:
* **Squircle Foundation:** Deep slate gradient squircle (`#0f172a` to `#020617`) with a 1.5px subtle border stroke (`rgba(255,255,255,0.12)`).
* **The 'A' Human Legs / Wings:** A clean, dual-pillar architectural 'A' stroke with gradient (`#38bdf8` -> `#6366f1` -> `#8b5cf6`), signifying structural strength and universal web standards.
* **The Welcoming Open-Arms Crossbar:** An upward arc (`#0ea5e9` -> `#6366f1` -> `#a855f7`) evoking universal human embrace and accessibility for all individuals.
* **The Radiant Focal Beacon:** An illuminated beacon head (`#38bdf8` with Gaussian glow filter and pure white `#ffffff` center core), representing clarity, guidance, and vigilance.

### 2. Component Usage (`components/brand_logo.tsx`)
```tsx
import { BrandLogo } from "@/components/brand_logo"

// Standalone icon:
<BrandLogo size={32} />

// Full wordmark lockup:
<BrandLogo size={32} showWordmark={true} subtitle="Enterprise Engine" />
```

### 3. Unified Iconography Assets
* `public/favicon.ico`: 32x32 multi-resolution icon.
* `public/favicon-16x16.png` & `public/favicon-32x32.png`: Standard browser tab icons.
* `public/apple-touch-icon.png`: 180x180 iOS home screen icon.
* `public/android-chrome-192x192.png` & `512x512.png`: PWA manifest icons.
* `app/icon.tsx`: Dynamic Next.js SVG/PNG vector icon route.
* `app/opengraph-image.tsx`: Dynamic 1200x630 social preview card.

---

## 09 Dialogs, Menus & Trust Transparency Patterns

### 1. Accessible Modal Dialogs (`WCAG 2.1.2 & 4.1.2`)
* Dialog elements (e.g., `SettingsModal.tsx`) must implement:
  * `role="dialog"` and `aria-modal="true"`.
  * `aria-labelledby` referencing the dialog title ID.
  * An active keyboard listener for the `Escape` key dismissing the modal.
  * Explicit close button with `aria-label="Close settings dialog"`.

### 2. Accessible Dropdown Navigation Menus (`WCAG 2.4.7 & 4.1.2`)
* Dropdown triggers (e.g., `UserMenu.tsx`) must specify:
  * `aria-haspopup="menu"` and `aria-expanded={isOpen}`.
  * Menu wrapper container with `role="menu"` and `aria-orientation="vertical"`.
  * Menu items with `role="menuitem"`.
  * `Escape` key listener that closes the open menu and restores focus to the trigger.

### 3. Automated Testing Scope Notice (`ScanForm.tsx` & `ResultsDisplay.tsx`)
* Sets realistic stakeholder expectations:
  * Direct disclaimer explaining that axe-core automated rules catch ~40%–57% of WCAG criteria.
  * Clear visual badges directing users to `/legal` and manual review checklists for complete ADA Title III / EAA coverage.

### 4. Floating Cookie Consent Notice (`components/cookie_consent.tsx`)
* Floating, non-blocking toast positioned at the bottom viewport on initial visit.
* Explicitly discloses essential-only session and billing cookies.
* `localStorage` persistence under `a11ytica_consent_acknowledged`.
* Strict compliance with Anti-Emoji policy (SVG shield icon).
