"use client"

import { useRef } from "react"
import { useScroll, useTransform, useReducedMotion } from "motion/react"
import { motionTokens } from "@/lib/motion-tokens"

/**
 * Scroll-linked reveal. Attach the returned `ref` to the section and spread
 * `style` onto a `motion` element. Opacity ramps in as the element scrolls
 * into view; vertical travel is suppressed under reduced-motion.
 */
export function useScrollReveal(distance: number = motionTokens.distance.lg) {
  const ref = useRef<HTMLElement>(null)
  const reduce = useReducedMotion()

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  })

  // Reveal during the first quarter of travel, hold visible afterwards.
  const opacity = useTransform(scrollYProgress, [0, 0.25, 1], [0, 1, 1])
  const y = useTransform(scrollYProgress, [0, 0.25], [reduce ? 0 : distance, 0])

  return { ref, style: reduce ? { opacity } : { opacity, y } }
}
