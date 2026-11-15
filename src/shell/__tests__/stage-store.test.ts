// SPDX-License-Identifier: GPL-3.0-or-later

import { beforeEach, describe, expect, it } from 'vitest'
import { shownLayer, stage, toSlot } from '../stage-store'

const live = (base: number, held: number) => ({ base, held, active: Math.max(base, held) })

beforeEach(() => stage.reset())

describe('stage store', () => {
  it('starts following the keyboard with nothing selected', () => {
    expect(stage.get()).toEqual({ follow: true, layer: 0, selection: null })
  })

  it('showing a layer stops following; following again starts from the live layer', () => {
    stage.showLayer(3)
    expect(stage.get()).toMatchObject({ follow: false, layer: 3 })
    stage.setFollow(true, 2)
    expect(stage.get()).toMatchObject({ follow: true, layer: 2 })
  })

  it('keeps the selection while the layer changes, and reset clears it', () => {
    stage.select({ kind: 'key', row: 1, col: 2 })
    stage.showLayer(1)
    expect(stage.get().selection).toEqual({ kind: 'key', row: 1, col: 2 })
    stage.reset()
    expect(stage.get().selection).toBeNull()
  })

  it('hands out a new state object on every change, so React sees it', () => {
    const before = stage.get()
    stage.select({ kind: 'knob', knob: 0, direction: 1 })
    expect(stage.get()).not.toBe(before)
  })
})

describe('shownLayer', () => {
  it('follows the active layer when following', () => {
    expect(shownLayer({ follow: true, layer: 0, selection: null }, live(2, 4), 5)).toBe(4)
  })

  it('shows the chosen layer when not following, or when the keyboard reports none', () => {
    expect(shownLayer({ follow: false, layer: 1, selection: null }, live(2, 0), 5)).toBe(1)
    expect(shownLayer({ follow: true, layer: 3, selection: null }, null, 5)).toBe(3)
  })

  it('never goes past the last layer', () => {
    expect(shownLayer({ follow: false, layer: 7, selection: null }, null, 5)).toBe(4)
    expect(shownLayer({ follow: false, layer: 2, selection: null }, null, 0)).toBe(0)
  })
})

describe('toSlot', () => {
  it('puts the layer into a key or knob selection', () => {
    expect(toSlot({ kind: 'key', row: 1, col: 2 }, 3)).toEqual({ kind: 'key', layer: 3, row: 1, col: 2 })
    expect(toSlot({ kind: 'knob', knob: 0, direction: 1 }, 4)).toEqual({ kind: 'knob', layer: 4, knob: 0, direction: 1 })
  })
})
