// SPDX-License-Identifier: GPL-3.0-or-later

import { describe, expect, it } from 'vitest'
import { clamp } from '../../ui/ResizeHandle'
import {
  MIN_PICTURE,
  STAGE_GAP,
  STAGE_PADDING,
  maxHeight,
  minHeight,
  naturalHeight,
  naturalPicture,
  stageHeight,
  toFraction,
  toPixels,
  type StageMeasures,
} from '../stage-size'

// A picture drawn at 1200 × 400; the layer stack 220 high beside it, or 80 high above it.
const wide = (space: number, pictureWidth: number): StageMeasures => ({
  space,
  stack: 220,
  pictureWidth,
  intrinsic: { width: 1200, height: 400 },
  narrow: false,
})
const narrow = (space: number, pictureWidth: number): StageMeasures => ({ ...wide(space, pictureWidth), stack: 80, narrow: true })

describe('the stage’s size', () => {
  it('lets the picture shrink with the width but never grow past its own size', () => {
    expect(naturalPicture(wide(1000, 600))).toBe(200)
    expect(naturalPicture(wide(1000, 2400))).toBe(400)
  })

  it('is as tall as the picture or the layer stack beside it, or both stacked when narrow', () => {
    expect(naturalHeight(wide(1000, 900))).toBe(STAGE_PADDING + 300)
    expect(naturalHeight(wide(1000, 300))).toBe(STAGE_PADDING + 220)
    expect(naturalHeight(narrow(1000, 900))).toBe(STAGE_PADDING + 80 + STAGE_GAP + 300)
  })

  it('takes at most half the shared space, but never less than its minimum', () => {
    expect(stageHeight(wide(500, 2400), null)).toBe(250)
    expect(stageHeight(wide(1600, 2400), null)).toBe(STAGE_PADDING + 400)
    // A tiny window: the minimum wins over the cap.
    expect(maxHeight(narrow(300, 900))).toBe(minHeight(narrow(300, 900)))
    expect(minHeight(narrow(300, 900))).toBe(STAGE_PADDING + 80 + STAGE_GAP + MIN_PICTURE)
  })

  it('keeps a chosen share of the space, within the minimum and the cap', () => {
    expect(stageHeight(wide(1000, 900), 0.3)).toBe(300)
    expect(stageHeight(wide(1000, 900), 0.9)).toBe(500)
    expect(stageHeight(wide(1000, 900), 0.01)).toBe(minHeight(wide(1000, 900)))
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
