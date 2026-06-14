"use client"

import { useEffect } from "react"
import { motion, useAnimationControls, useReducedMotion } from "motion/react"
import { motionTokens } from "@/lib/motion-tokens"

interface PulseDotProps {
  className?: string
}

/**
 * A small infinitely-pulsing status dot. Honours Rule 2 (pauses when the tab
 * is hidden) and accessibility (static under reduced motion). Pass color/size
 * via `className`.
 */
export function PulseDot({
  className = "w-2.5 h-2.5 rounded-full bg-indigo-400",
}: PulseDotProps) {
  const controls = useAnimationControls()
  const reduce = useReducedMotion()

  useEffect(() => {
    if (reduce) return

    const pulse = () =>
      controls.start({
        scale: [1, 1.5, 1],
        opacity: [1, 0.5, 1],
        transition: { repeat: Infinity, duration: motionTokens.duration.crawl },
      })

    const handleVisibility = () => {
      if (document.visibilityState === "hidden") controls.stop()
      else void pulse()
    }

    void pulse()
    document.addEventListener("visibilitychange", handleVisibility)
    return () => {
      controls.stop()
      document.removeEventListener("visibilitychange", handleVisibility)
    }
  }, [controls, reduce])

  return <motion.span className={className} animate={reduce ? undefined : controls} />
}
