"use client"

import { useReducedMotion } from "motion/react"

/**
 * Returns SSR-safe initial/animate/exit variants that automatically disable
 * vertical transforms when the user prefers reduced motion (opacity-only fade).
 *
 * @param fullY  The Y-offset to use when motion is allowed (defaults to 16px).
 */
export function useSafeMotion(fullY: number = 16) {
  const reduce = useReducedMotion()
  return {
    initial: { opacity: 0, y: reduce ? 0 : fullY },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: reduce ? 0 : -fullY },
  }
}
