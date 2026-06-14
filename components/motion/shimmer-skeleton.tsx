"use client"

import { useEffect } from "react"
import { motion, useAnimationControls, useReducedMotion } from "motion/react"
import { motionTokens } from "@/lib/motion-tokens"

interface ShimmerSkeletonProps {
  className?: string
}

/**
 * Placeholder block with a left-to-right shimmer sweep. The infinite animation
 * pauses when the tab is hidden (Rule 2) and is disabled entirely under
 * reduced motion, falling back to a static muted block.
 */
export function ShimmerSkeleton({ className = "" }: ShimmerSkeletonProps) {
  const controls = useAnimationControls()
  const reduce = useReducedMotion()

  useEffect(() => {
    if (reduce) return

    const play = () =>
      controls.start({
        x: ["-100%", "100%"],
        transition: {
          repeat: Infinity,
          duration: motionTokens.duration.crawl,
          ease: motionTokens.easing.linear,
        },
      })

    const handleVisibility = () => {
      if (document.visibilityState === "hidden") controls.stop()
      else void play()
    }

    void play()
    document.addEventListener("visibilitychange", handleVisibility)
    return () => {
      controls.stop()
      document.removeEventListener("visibilitychange", handleVisibility)
    }
  }, [controls, reduce])

  return (
    <div className={`relative overflow-hidden rounded-md bg-slate-800/60 ${className}`}>
      {!reduce && (
        <motion.div
          className="absolute inset-0 bg-linear-to-r from-transparent via-white/10 to-transparent"
          initial={{ x: "-100%" }}
          animate={controls}
        />
      )}
    </div>
  )
}
