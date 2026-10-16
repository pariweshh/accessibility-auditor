"use client"

import { motion, useReducedMotion } from "motion/react"
import { motionTokens, springs } from "@/lib/motion-tokens"

interface AnimatedTextProps {
  /** Plain text; split on whitespace and revealed word by word. */
  text: string
  className?: string
  /** Seconds between each word entering. */
  stagger?: number
}

/**
 * Reveals text word-by-word on mount. Each word is an inline-block span so the
 * Y-transform does not disturb line layout.
 *
 * Accessibility: the full text is exposed once via `aria-label` while the
 * per-word spans are `aria-hidden`. Under `prefers-reduced-motion` the words
 * appear together with an opacity-only fade (no transform, no stagger), per
 * the reduced-motion contract.
 */
export function AnimatedText({ text, className, stagger = 0.06 }: AnimatedTextProps) {
  const reduce = useReducedMotion()
  const words = text.split(" ")

  return (
    <span className={className}>
      <span className="sr-only">{text}</span>
      <motion.span
        aria-hidden="true"
        variants={{
          visible: { transition: { staggerChildren: reduce ? 0 : stagger } },
        }}
        initial="hidden"
        animate="visible"
      >
        {words.map((word, i) => (
          <motion.span
            key={`${word}-${i}`}
            className="inline-block"
            variants={{
              hidden: { opacity: 0, y: reduce ? 0 : 14 },
              visible: {
                opacity: 1,
                y: 0,
                transition: reduce
                  ? { duration: motionTokens.duration.instant }
                  : springs.gentle,
              },
            }}
          >
            {word}
            {i < words.length - 1 ? " " : ""}
          </motion.span>
        ))}
      </motion.span>
    </span>
  )
}
