// SPDX-License-Identifier: GPL-3.0-or-later

import { describe, expect, it } from 'vitest'
import { placeCard, visiblePart } from '../coach-placement'

const view = { width: 1280, height: 800 }
const card = { width: 320, height: 200 }

describe('placeCard', () => {
  it('goes below a target with room under it, lined up with its left edge', () => {
    expect(placeCard({ top: 60, left: 260, width: 990, height: 280 }, card, view)).toEqual({ top: 354, left: 260, side: 'below' })
  })

  it('goes above a target at the bottom', () => {
    expect(placeCard({ top: 752, left: 240, width: 1040, height: 48 }, card, view)).toEqual({ top: 538, left: 240, side: 'above' })
  })

  it('goes beside a tall target', () => {
    expect(placeCard({ top: 0, left: 0, width: 240, height: 800 }, card, view)).toMatchObject({ left: 254, side: 'right' })
  })

  it('stays inside the window', () => {
    const spot = placeCard({ top: 100, left: 1200, width: 40, height: 30 }, card, view)
    expect(spot.left + card.width).toBeLessThanOrEqual(view.width - 12)
  })

  it('is centred with nothing to point at', () => {
    expect(placeCard(null, card, view)).toEqual({ top: 300, left: 480, side: 'centre' })
    expect(placeCard({ top: 0, left: 0, width: 0, height: 0 }, card, view).side).toBe('centre')
  })

  it('sits over the corner when no side has room', () => {
    expect(placeCard({ top: 0, left: 0, width: 1280, height: 800 }, card, view)).toEqual({ top: 588, left: 948, side: 'centre' })
  })
})

describe('visiblePart', () => {
  it('cuts a box to the window, or gives null when it is outside', () => {
    expect(visiblePart({ top: -50, left: 10, width: 100, height: 100 }, view)).toEqual({ top: 0, left: 10, width: 100, height: 50 })
    expect(visiblePart({ top: 900, left: 10, width: 100, height: 100 }, view)).toBeNull()
  })
})
