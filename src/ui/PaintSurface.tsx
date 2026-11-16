// SPDX-License-Identifier: GPL-3.0-or-later
// Painting on the keyboard picture: press on a key and drag across others. Wraps a KeyboardPicture (or anything
// drawing <g data-key-pos="row,col"> keys) and reports each key the pointer goes over once per stroke. The picture
// itself stays read-only, so it draws no hover colour over the paint.

import { useRef, type PointerEvent, type ReactNode } from 'react'
import { cx } from './controls'

interface Props {
  /** A key ("row,col") was painted. `first`: the first key of a stroke (one press and drag). */
  onPaint: (pos: string, first: boolean) => void
  /** The stroke ended (pointer up, cancelled, or left the window). */
  onStrokeEnd?: () => void
  /** What painting does, for screen readers. */
  label: string
  className?: string
  children: ReactNode
}

function keyAt(event: PointerEvent<HTMLDivElement>): string | null {
  // While the pointer is captured (touch, or a held mouse button) events go to the surface, not the key under it.
  const under = typeof document.elementFromPoint === 'function' ? document.elementFromPoint(event.clientX, event.clientY) : null
  const element = (under ?? event.target) as Element | null
  return element?.closest?.('[data-key-pos]')?.getAttribute('data-key-pos') ?? null
}

export function PaintSurface({ onPaint, onStrokeEnd, label, className, children }: Props) {
  const stroke = useRef<Set<string> | null>(null)

  const paint = (event: PointerEvent<HTMLDivElement>) => {
    const pos = keyAt(event)
    if (!pos || !stroke.current || stroke.current.has(pos)) return
    const first = stroke.current.size === 0
    stroke.current.add(pos)
    onPaint(pos, first)
  }

  const end = () => {
    const painted = (stroke.current?.size ?? 0) > 0
    stroke.current = null
    if (painted) onStrokeEnd?.()
  }

  return (
    <div
      role="group"
      aria-label={label}
      className={cx('cursor-crosshair touch-none select-none', className)}
      onPointerDown={(event) => {
        if (event.button !== 0) return
        stroke.current = new Set()
        paint(event)
      }}
      onPointerMove={paint}
      onPointerUp={end}
      onPointerCancel={end}
      onLostPointerCapture={end}
      onPointerLeave={(event) => {
        if (event.buttons === 0) end()
      }}
    >
      {children}
    </div>
  )
}
