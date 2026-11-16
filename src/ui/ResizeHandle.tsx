// SPDX-License-Identifier: GPL-3.0-or-later
// A handle on the bottom edge of a box, dragged up or down to make the box shorter or taller. Works with the mouse,
// touch and the keyboard (a focusable separator: arrows, Home / End, Enter to go back to the automatic size).

import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { cx } from './controls'

export const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), Math.max(min, max))

interface Props {
  /** What is being resized, for screen readers, e.g. "Height of the keyboard picture". */
  label: string
  /** The box's height now, in pixels. */
  value: number
  min: number
  max: number
  /** Pixels per arrow key press; Page Up / Down move four times as far. */
  step?: number
  /** The value in words for screen readers, e.g. "40 % of the space". */
  valueText?: string
  /** A new height: `done` is false while dragging and true when the drag ends or for a key press. */
  onResize: (height: number, done: boolean) => void
  /** Back to the automatic size: double-click or Enter. */
  onReset: () => void
  className?: string
}

export function ResizeHandle({ label, value, min, max, step = 16, valueText, onResize, onReset, className }: Props) {
  const drag = useRef<{ y: number; from: number; last: number } | null>(null)
  const [dragging, setDragging] = useState(false)

  const down = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return
    // No text selection and no scrolling while dragging; the pointer stays ours even off the handle.
    event.preventDefault()
    event.currentTarget.setPointerCapture?.(event.pointerId)
    drag.current = { y: event.clientY, from: value, last: value }
    setDragging(true)
  }
  const move = (event: PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return
    const next = clamp(drag.current.from + event.clientY - drag.current.y, min, max)
    if (next === drag.current.last) return
    drag.current.last = next
    onResize(next, false)
  }
  const up = (event: PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return
    const { from, last } = drag.current
    drag.current = null
    setDragging(false)
    event.currentTarget.releasePointerCapture?.(event.pointerId)
    if (last !== from) onResize(last, true)
  }
  const key = (event: KeyboardEvent<HTMLDivElement>) => {
    const to: Record<string, number> = {
      ArrowUp: value - step,
      ArrowDown: value + step,
      PageUp: value - step * 4,
      PageDown: value + step * 4,
      Home: min,
      End: max,
    }
    if (event.key === 'Enter') {
      event.preventDefault()
      onReset()
    } else if (event.key in to) {
      event.preventDefault()
      onResize(clamp(to[event.key], min, max), true)
    }
  }

  return (
    <div
      role="separator"
      aria-orientation="horizontal"
      aria-label={label}
      aria-valuenow={Math.round(value)}
      aria-valuemin={Math.round(min)}
      aria-valuemax={Math.round(Math.max(min, max))}
      aria-valuetext={valueText}
      tabIndex={0}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
      onDoubleClick={onReset}
      onKeyDown={key}
      className={cx('group flex h-4 cursor-row-resize touch-none items-center justify-center select-none focus-visible:outline-none', className)}
    >
      <span
        aria-hidden
        className={cx(
          'h-1 w-12 rounded-pill transition-colors duration-(--motion-fast)',
          'group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-accent',
          dragging ? 'bg-accent' : 'bg-edge group-hover:bg-edge-strong group-focus-visible:bg-edge-strong',
        )}
      />
    </div>
  )
}
