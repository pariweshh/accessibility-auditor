// Runtime device + accessibility gates. Used to decide whether an animation
// should run at all. All `window`/`navigator` reads are guarded so this is
// safe to import in server components.

import { motionTokens } from "./motion-tokens"

export const motionConfig = {
  isLowEnd(): boolean {
    return (
      typeof navigator !== "undefined" &&
      typeof navigator.hardwareConcurrency === "number" &&
      navigator.hardwareConcurrency <= 4
    )
  },

  prefersReduced(): boolean {
    return (
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
  },

  shouldAnimate({ essential = false }: { essential?: boolean } = {}): boolean {
    if (this.prefersReduced()) return false
    if (!essential && this.isLowEnd()) return false
    return true
  },

  duration(): number {
    return this.isLowEnd() || this.prefersReduced()
      ? motionTokens.duration.instant
      : motionTokens.duration.normal
  },
}
