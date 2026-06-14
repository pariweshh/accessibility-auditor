"use client"

import { motion, useMotionValue, useTransform, useReducedMotion } from "motion/react"
import { springs } from "@/lib/motion-tokens"

const OFFSET_THRESHOLD = 90
const VELOCITY_THRESHOLD = 500

interface SwipeCardProps {
  children: React.ReactNode
  /** Fired when the user swipes far/fast enough in either direction. */
  onDismiss: () => void
  className?: string
}

/**
 * Horizontal swipe-to-dismiss wrapper. Combines offset + velocity (Rule 3) to
 * decide intent, snaps back with spring physics otherwise, and reveals a red
 * "dismiss" track as the card slides. Works with mouse and touch. Under
 * reduced motion, dragging is disabled and children render statically.
 */
export function SwipeCard({ children, onDismiss, className = "" }: SwipeCardProps) {
  const reduce = useReducedMotion()
  const x = useMotionValue(0)
  const opacity = useTransform(x, [-200, 0, 200], [0, 1, 0])
  const trackOpacity = useTransform(x, [-120, -40, 0, 40, 120], [1, 0.3, 0, 0.3, 1])

  if (reduce) {
    return <div className={className}>{children}</div>
  }

  return (
    <div className="relative">
      {/* Dismiss affordance revealed behind the card */}
      <motion.div
        aria-hidden="true"
        style={{ opacity: trackOpacity }}
        className="absolute inset-0 flex items-center justify-between px-5 rounded-xl bg-rose-500/15 text-rose-300 text-xs font-bold pointer-events-none"
      >
        <span>Dismiss</span>
        <span>Dismiss</span>
      </motion.div>

      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.4}
        style={{ x, opacity }}
        dragTransition={springs.release}
        onDragEnd={(_, info) => {
          const dismiss =
            Math.abs(info.offset.x) > OFFSET_THRESHOLD ||
            Math.abs(info.velocity.x) > VELOCITY_THRESHOLD
          if (dismiss) onDismiss()
        }}
        className={`relative ${className}`}
      >
        {children}
      </motion.div>
    </div>
  )
}
