// @vitest-environment jsdom
// SPDX-License-Identifier: GPL-3.0-or-later
// Browser storage holding damaged or hostile values under the app's names (every phazei.github.io page shares it).

import { beforeEach, describe, expect, it } from 'vitest'
import { clearPrefs, getPref } from '../prefs'

beforeEach(() => {
  clearPrefs()
})

function stored(key: string, raw: string): void {
  clearPrefs()
  localStorage.setItem(`layerworks:${key}`, raw)
}

describe('a stored value of the wrong shape is treated as absent', () => {
  it.each(['null', '[1,2]', '{"0":"x"}', '"str"', '{"length":1e9}', 'not json'])('layer names stored as %s', (raw) => {
    stored('layer-names:0xABC', raw)
    expect(getPref<string[]>('layer-names:0xABC', [])).toEqual([])
  })

  it('keeps a value of the right shape', () => {
    stored('layer-names:0xABC', '["", "Fn"]')
    expect(getPref<string[]>('layer-names:0xABC', [])).toEqual(['', 'Fn'])
  })

  it('checks colours and the kind of everything else', () => {
    stored('key-colours-recent', '[{"hue":1,"sat":2},"x"]')
    expect(getPref('key-colours-recent', [])).toEqual([])
    stored('key-colour', '{"hue":300,"sat":2}')
    expect(getPref('key-colour', { hue: 1, sat: 1 })).toEqual({ hue: 1, sat: 1 })
    stored('open:x', '"yes"')
    expect(getPref('open:x', false)).toBe(false)
    stored('stage-size', '{"a":1}')
    expect(getPref<number | null>('stage-size', null)).toBeNull()
    stored('stage-size', '0.4')
    expect(getPref<number | null>('stage-size', null)).toBe(0.4)
  })
})
