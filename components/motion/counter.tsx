"use client"

import { useRef, useEffect, useState } from "react"
import { animate, useReducedMotion } from "motion/react"
import { motionTokens } from "@/lib/motion-tokens"

interface CounterProps {
  to: number
  /** Optional formatter, e.g. value => value.toLocaleString(). */
  format?: (value: number) => string
  className?: string
}

/**
 * Animated number that counts up from 0 to `to` on mount. Writes directly to
 * the DOM node via onUpdate to avoid a re-render every frame. Under reduced
 * motion it renders the final value immediately.
 */
export function Counter({ to, format, className }: CounterProps) {
  const nodeRef = useRef<HTMLSpanElement>(null)
  const reduce = useReducedMotion()
  const render = (v: number) => (format ? format(v) : Math.round(v).toString())

  // SSR-safe initial: render the final value on the server so there is no
  // hydration mismatch; the count-up replaces it after mount.
  const [initial] = useState(() => render(to))

  useEffect(() => {
    const node = nodeRef.current
    if (!node) return

    if (reduce) {
      node.textContent = render(to)
      return
    }

    const controls = animate(0, to, {
      duration: motionTokens.duration.slow,
      ease: motionTokens.easing.smooth,
      onUpdate: (v) => {
        node.textContent = render(v)
      },
    })
    return controls.stop // Rule 7: cleanup
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [to, reduce])

  return (
    <span ref={nodeRef} className={className}>
      {initial}
    </span>
  )
}
