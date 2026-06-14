"use client"

import { motion, useReducedMotion } from "motion/react"
import { motionTokens } from "@/lib/motion-tokens"

interface ProgressRingProps {
  /** 0–100. */
  progress: number
  size?: number
  strokeWidth?: number
  /** CSS color for the active arc. */
  color?: string
  trackColor?: string
  children?: React.ReactNode
}

/**
 * Circular SVG progress ring animated via strokeDashoffset (stroke offset is
 * GPU-cheap and non-layout). The arc draws from the top, clockwise.
 */
export function ProgressRing({
  progress,
  size = 120,
  strokeWidth = 8,
  color = "#6366f1",
  trackColor = "rgba(148,163,184,0.15)",
  children,
}: ProgressRingProps) {
  const reduce = useReducedMotion()
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const clamped = Math.max(0, Math.min(100, progress))
  const offset = circumference - (clamped / 100) * circumference

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: reduce ? offset : circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={
            reduce
              ? { duration: motionTokens.duration.instant }
              : { duration: motionTokens.duration.slow, ease: motionTokens.easing.smooth }
          }
        />
      </svg>
      {children && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {children}
        </div>
      )}
    </div>
  )
}
