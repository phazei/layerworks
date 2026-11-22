// SPDX-License-Identifier: GPL-3.0-or-later
// A short label beside a control that shows only an icon: on pointing and on keyboard focus, gone again on leaving,
// on blur and on Esc. It repeats the control's own accessible name for the eyes, so screen readers don't hear it
// (aria-hidden); the control must carry the name itself. The app's stand-in for a `title` tooltip, which the app
// doesn't use (AGENTS.md). Drawn in the window's own layer (fixed, through a portal), so a scrolling or clipping
// parent doesn't cut it off.

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { cx } from './controls'

interface TipProps {
  /** The text shown, the same as the control's accessible name. */
  label: string
  /** Shows nothing while false (the label is on screen already). */
  enabled?: boolean
  children: ReactNode
  className?: string
}

const GAP = 16
const MARGIN = 8

/**
 * Whether the last thing the user did was press with a pointer rather than a key. A click focuses too, and then the
 * pointer already shows the label; focus that follows a key (Tab, or Esc closing something) shows it.
 */
let pointerLast = false
if (typeof window !== 'undefined') {
  window.addEventListener('pointerdown', () => (pointerLast = true), true)
  window.addEventListener('keydown', () => (pointerLast = false), true)
}

/** Hides the label shown now, so the newest one (pointed at, or focused) is the only one on screen. */
let hideShown: (() => void) | null = null

/** Shows `label` at the right of the wrapped control while it is pointed at or focused from the keyboard. */
export function Tip({ label, enabled = true, children, className }: TipProps) {
  const wrapper = useRef<HTMLDivElement>(null)
  const tip = useRef<HTMLDivElement>(null)
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [place, setPlace] = useState<{ top: number; left: number } | null>(null)
  const shown = enabled && (hovered || focused) && !dismissed

  useLayoutEffect(() => {
    if (!shown) {
      setPlace(null)
      return
    }
    const target = wrapper.current?.firstElementChild ?? wrapper.current
    const rect = target?.getBoundingClientRect()
    if (!rect) return
    const height = tip.current?.offsetHeight ?? 0
    const top = Math.max(MARGIN, Math.min(window.innerHeight - height - MARGIN, rect.top + rect.height / 2 - height / 2))
    setPlace({ top, left: rect.right + GAP })
  }, [shown, label])

  // One label at a time: showing this one hides any other, which stays hidden until pointed at or focused again.
  useEffect(() => {
    if (!shown) return
    const hide = () => setDismissed(true)
    if (hideShown !== hide) hideShown?.()
    hideShown = hide
    return () => {
      if (hideShown === hide) hideShown = null
    }
  }, [shown])

  // Esc hides it (it may cover something), until the pointer or focus comes back.
  useEffect(() => {
    if (!shown) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDismissed(true)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [shown])

  return (
    <div
      ref={wrapper}
      className={className}
      onPointerEnter={() => {
        setDismissed(false)
        setHovered(true)
      }}
      onPointerLeave={() => setHovered(false)}
      onFocus={() => {
        setDismissed(false)
        setFocused(!pointerLast)
      }}
      onBlur={() => setFocused(false)}
    >
      {children}
      {shown &&
        createPortal(
          <div
            ref={tip}
            aria-hidden
            data-tip=""
            className={cx(
              'pointer-events-none fixed z-50 rounded-control border border-edge bg-raised px-2.5 py-1 text-[13px] font-medium whitespace-nowrap text-content shadow-pop',
              !place && 'invisible',
            )}
            style={place ?? { top: 0, left: 0 }}
          >
            {label}
          </div>,
          document.body,
        )}
    </div>
  )
}
