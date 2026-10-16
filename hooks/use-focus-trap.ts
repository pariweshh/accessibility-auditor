"use client"

import { useEffect, useRef } from "react"

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(", ")

interface UseFocusTrapOptions {
  isOpen: boolean
  onClose: () => void
  containerRef: React.RefObject<HTMLElement | null>
  initialFocusRef?: React.RefObject<HTMLElement | null>
  autoFocus?: boolean
}

/**
 * Custom React hook implementing WAI-ARIA Dialog (Modal) Focus Management (WCAG 2.1.2 & 2.4.3).
 * - Focuses initial element or first focusable element on open
 * - Constrains Tab & Shift+Tab cycling within container
 * - Listens for Escape key to trigger onClose
 * - Automatically returns focus to the invoking element on close
 */
export function useFocusTrap({
  isOpen,
  onClose,
  containerRef,
  initialFocusRef,
  autoFocus = true,
}: UseFocusTrapOptions) {
  const previousActiveElementRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!isOpen) return

    // Save invoking trigger element
    if (typeof document !== "undefined" && document.activeElement instanceof HTMLElement) {
      previousActiveElementRef.current = document.activeElement
    }

    const container = containerRef.current
    if (!container) return

    // Move initial focus
    if (autoFocus) {
      const rafId = requestAnimationFrame(() => {
        if (initialFocusRef?.current) {
          initialFocusRef.current.focus()
        } else {
          const focusables = getVisibleFocusables(container)
          if (focusables.length > 0) {
            focusables[0].focus()
          } else {
            container.setAttribute("tabindex", "-1")
            container.focus()
          }
        }
      })

      return () => cancelAnimationFrame(rafId)
    }
  }, [isOpen, autoFocus, containerRef, initialFocusRef])

  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation()
        onClose()
        return
      }

      if (e.key === "Tab") {
        const container = containerRef.current
        if (!container) return

        const focusables = getVisibleFocusables(container)
        if (focusables.length === 0) {
          e.preventDefault()
          return
        }

        const first = focusables[0]
        const last = focusables[focusables.length - 1]
        const currentActive = document.activeElement

        // If focus escaped container, reset to first
        if (!container.contains(currentActive)) {
          e.preventDefault()
          first.focus()
          return
        }

        if (e.shiftKey) {
          if (currentActive === first) {
            e.preventDefault()
            last.focus()
          }
        } else {
          if (currentActive === last) {
            e.preventDefault()
            first.focus()
          }
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [isOpen, onClose, containerRef])

  // Restore focus to trigger on close / unmount
  useEffect(() => {
    return () => {
      if (previousActiveElementRef.current && typeof previousActiveElementRef.current.focus === "function") {
        previousActiveElementRef.current.focus()
      }
    }
  }, [])

  // Also restore when transitioning from open to closed
  const wasOpenRef = useRef(isOpen)
  useEffect(() => {
    if (wasOpenRef.current && !isOpen) {
      if (previousActiveElementRef.current && typeof previousActiveElementRef.current.focus === "function") {
        previousActiveElementRef.current.focus()
      }
    }
    wasOpenRef.current = isOpen
  }, [isOpen])
}

function getVisibleFocusables(container: HTMLElement): HTMLElement[] {
  const elements = Array.from(
    container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
  )

  return elements.filter((el) => {
    if (el.getAttribute("aria-hidden") === "true") return false
    if (el.hasAttribute("disabled")) return false
    // Filter out display: none or disconnected elements
    return el.offsetParent !== null || el.getClientRects().length > 0
  })
}
