// SPDX-License-Identifier: GPL-3.0-or-later
// A box of controls that opens beside the button it belongs to (`PopoverButton`): on a click, or Enter / Space on
// the button. It isn't modal: the rest of the app stays usable and nothing is edited in it. It closes on Esc (the
// focus goes back to the button), on a click outside it, when the focus moves out of it, and when the button is
// pressed again. The focus moves into it when it opens, so Tab goes through its controls next.
//
// It sits right after its button in the page's order (so Tab order is natural) but is placed fixed in the window,
// beside the button, so a scrolling or clipping parent doesn't cut it off.

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { cx } from './controls'

const GAP = 16
const MARGIN = 8

interface PopoverButtonProps {
  /** The button's accessible name. */
  label: string
  /** What the button shows; usually icons. */
  button: (open: boolean) => ReactNode
  /** The box's content. `close` closes it and puts the focus back on the button. */
  children: (close: () => void) => ReactNode
  /** Classes for the button; it gets the focus ring of every control. */
  buttonClassName?: string
  /** Classes for the box (its width). */
  className?: string
  /** Anything else on the button (a `data-tour` marker). */
  buttonProps?: Record<`data-${string}`, string>
  /** Told when it opens or closes. */
  onOpenChange?: (open: boolean) => void
}

/** A button that opens a box of controls at its right. */
export function PopoverButton({ label, button, children, buttonClassName, className, buttonProps, onOpenChange }: PopoverButtonProps) {
  const [open, setOpen] = useState(false)
  const trigger = useRef<HTMLButtonElement>(null)
  const box = useRef<HTMLDivElement>(null)
  const id = useId()
  const [place, setPlace] = useState<{ top: number; left: number } | null>(null)

  const close = useCallback((focusButton: boolean) => {
    setOpen(false)
    if (focusButton) trigger.current?.focus()
  }, [])

  // Beside the button, top edges level, kept inside the window; again when the window changes.
  useLayoutEffect(() => {
    if (!open) {
      setPlace(null)
      return
    }
    const measure = () => {
      const rect = trigger.current?.getBoundingClientRect()
      if (!rect) return
      const height = box.current?.offsetHeight ?? 0
      const top = Math.max(MARGIN, Math.min(window.innerHeight - height - MARGIN, rect.top))
      setPlace((now) => (now && now.top === top && now.left === rect.right + GAP ? now : { top, left: rect.right + GAP }))
    }
    measure()
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    return () => {
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure, true)
    }
  }, [open])

  // The focus goes in when it opens.
  const opened = useRef(false)
  useEffect(() => {
    if (open && !opened.current) box.current?.focus()
    opened.current = open
    onOpenChange?.(open)
    // Told about changes of `open` only, not of the callback.
  }, [open])

  // A press outside closes it; the focus stays where the press put it.
  useEffect(() => {
    if (!open) return
    const onDown = (event: PointerEvent) => {
      const target = event.target as Node | null
      if (target && (box.current?.contains(target) || trigger.current?.contains(target))) return
      close(false)
    }
    document.addEventListener('pointerdown', onDown, true)
    return () => document.removeEventListener('pointerdown', onDown, true)
  }, [open, close])

  return (
    <>
      <button
        ref={trigger}
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={() => setOpen(!open)}
        onKeyDown={(event) => {
          if (event.key !== 'Escape' || !open) return
          event.stopPropagation()
          close(true)
        }}
        className={cx('cursor-pointer', buttonClassName)}
        {...buttonProps}
      >
        {button(open)}
      </button>
      {open && (
        <div
          ref={box}
          id={id}
          tabIndex={-1}
          onKeyDown={(event) => {
            if (event.key !== 'Escape') return
            event.stopPropagation()
            close(true)
          }}
          onBlur={(event) => {
            const next = event.relatedTarget as Node | null
            if (next && !box.current?.contains(next) && !trigger.current?.contains(next)) close(false)
          }}
          className={cx(
            'fixed z-40 rounded-card border border-edge bg-card text-content shadow-pop outline-none',
            !place && 'invisible',
            className,
          )}
          style={place ?? { top: 0, left: 0 }}
        >
          {children(() => close(true))}
        </div>
      )}
    </>
  )
}
