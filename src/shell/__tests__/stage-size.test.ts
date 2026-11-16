// SPDX-License-Identifier: GPL-3.0-or-later

import { describe, expect, it } from 'vitest'
import { PICTURE_KEY_UNIT } from '../../ui/KeyboardPicture'
import { clamp } from '../../ui/ResizeHandle'
import {
  LEGIBLE_KEY,
  MIN_PICTURE,
  NARROW_PADDING,
  STAGE_GAP,
  STAGE_PADDING,
  legiblePicture,
  maxHeight,
  minHeight,
  naturalHeight,
  naturalPicture,
  stageHeight,
  toFraction,
  toPixels,
  type StageMeasures,
} from '../stage-size'

// A picture drawn at 1200 × 400; the layer stack 220 high beside it, or a 32-high row above it.
const wide = (space: number, pictureWidth: number): StageMeasures => ({
  space,
  stack: 220,
  pictureWidth,
  intrinsic: { width: 1200, height: 400 },
  narrow: false,
})
const narrow = (space: number, pictureWidth: number): StageMeasures => ({ ...wide(space, pictureWidth), stack: 32, narrow: true })
const LEGIBLE = (400 * LEGIBLE_KEY) / PICTURE_KEY_UNIT

describe('the stage’s size', () => {
  it('lets the picture shrink with the width but never grow past its own size', () => {
    expect(naturalPicture(wide(1000, 600))).toBe(200)
    expect(naturalPicture(wide(1000, 2400))).toBe(400)
  })

  it('knows how tall the picture must be for its keys to be legible', () => {
    expect(legiblePicture(wide(1000, 600))).toBeCloseTo(LEGIBLE)
  })

  it('is as tall as the picture or the layer stack beside it, or both stacked when narrow', () => {
    expect(naturalHeight(wide(1000, 900))).toBe(STAGE_PADDING + 300)
    expect(naturalHeight(wide(1000, 300))).toBe(STAGE_PADDING + 220)
    expect(naturalHeight(narrow(1000, 900))).toBe(NARROW_PADDING + 32 + STAGE_GAP + 300)
  })

  it('takes at most half the shared space, unless a legible picture needs more', () => {
    expect(stageHeight(wide(1600, 2400), null)).toBe(STAGE_PADDING + 400)
    expect(stageHeight(wide(800, 2400), null)).toBe(400)
    // Half of 400 is less than a legible picture needs: the picture keeps its legible height.
    expect(stageHeight(wide(400, 2400), null)).toBeCloseTo(STAGE_PADDING + LEGIBLE)
    // Where the width allows only a smaller picture, that is all it needs.
    expect(stageHeight(narrow(500, 450), null)).toBe(NARROW_PADDING + 32 + STAGE_GAP + 150)
  })

  it('lets the handle go below a legible picture, down to the minimum', () => {
    expect(minHeight(narrow(300, 900))).toBe(NARROW_PADDING + 32 + STAGE_GAP + MIN_PICTURE)
    expect(stageHeight(wide(1000, 900), 0.01)).toBe(minHeight(wide(1000, 900)))
    expect(stageHeight(wide(1000, 900), 0.3)).toBe(300)
    expect(stageHeight(wide(1000, 900), 0.9)).toBe(maxHeight(wide(1000, 900)))
    expect(maxHeight(wide(1000, 900))).toBe(500)
  })

  it('converts between pixels and shares of the space', () => {
    expect(toFraction(250, 1000)).toBe(0.25)
    expect(toPixels(0.25, 800)).toBe(200)
    expect(toFraction(250, 0)).toBe(0)
    expect(clamp(5, 10, 20)).toBe(10)
    expect(clamp(25, 10, 20)).toBe(20)
    expect(clamp(5, 10, 8)).toBe(10)
  })
})
