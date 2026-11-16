// SPDX-License-Identifier: GPL-3.0-or-later
// Where a coach mark's card goes beside what it points at: below, above, right or left, the first side with room
// for the whole card, kept inside the window. With nothing to point at, or no side with room, it is centred.

export interface Box {
  top: number
  left: number
  width: number
  height: number
}

export interface Size {
  width: number
  height: number
}

export type Side = 'below' | 'above' | 'right' | 'left' | 'centre'

export interface Placement {
  top: number
  left: number
  side: Side
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

/**
 * The card's position. `gap` is the space between the target and the card, `margin` the space kept free at the
 * window's edges.
 */
export function placeCard(target: Box | null, card: Size, view: Size, gap = 14, margin = 12): Placement {
  const centre: Placement = {
    top: Math.max(margin, (view.height - card.height) / 2),
    left: Math.max(margin, (view.width - card.width) / 2),
    side: 'centre',
  }
  if (!target || target.width <= 0 || target.height <= 0) return centre

  const maxLeft = Math.max(margin, view.width - card.width - margin)
  const maxTop = Math.max(margin, view.height - card.height - margin)
  const room = {
    below: view.height - margin - (target.top + target.height + gap),
    above: target.top - gap - margin,
    right: view.width - margin - (target.left + target.width + gap),
    left: target.left - gap - margin,
  }
  const alongX = clamp(target.left, margin, maxLeft)
  const alongY = clamp(target.top, margin, maxTop)

  if (room.below >= card.height) return { top: target.top + target.height + gap, left: alongX, side: 'below' }
  if (room.above >= card.height) return { top: target.top - gap - card.height, left: alongX, side: 'above' }
  if (room.right >= card.width) return { top: alongY, left: target.left + target.width + gap, side: 'right' }
  if (room.left >= card.width) return { top: alongY, left: target.left - gap - card.width, side: 'left' }
  // Nowhere outside the target: over its lower right corner, where it covers the least of a big target's start.
  return { top: maxTop, left: maxLeft, side: 'centre' }
}

/** A target's box as seen in the window: only the part inside it, or null when none of it is. */
export function visiblePart(box: Box, view: Size): Box | null {
  const top = Math.max(0, box.top)
  const left = Math.max(0, box.left)
  const bottom = Math.min(view.height, box.top + box.height)
  const right = Math.min(view.width, box.left + box.width)
  if (bottom <= top || right <= left) return null
  return { top, left, width: right - left, height: bottom - top }
}
