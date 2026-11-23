// @vitest-environment jsdom
// SPDX-License-Identifier: GPL-3.0-or-later
// Summaries name keys as the picture and palette show them, following the layout chosen for key names.

import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { legendsFromLayoutMap, setLayoutLegends } from '../../../device/layout'
import { connectDemo, disconnect } from '../../../shell/session'
import { KINDS, summarizeEntry } from '../describe'

// The key names belong to the connected keyboard (the store builds the tables as it loads one).
beforeAll(async () => {
  vi.spyOn(console, 'log').mockImplementation(() => {})
  await connectDemo()
})
afterAll(() => disconnect())
afterEach(() => setLayoutLegends(null))

const chord = { key1: 0x0d, key2: 0x1d, key3: 0, key4: 0, output: 0x35 } // J + Z → `

describe('summaries', () => {
  it('use the short names of the picture, the plain legend of a two-legend key', () => {
    expect(summarizeEntry('combo', chord)).toBe('J + Z together → `')
  })

  it('follow the layout chosen for key names (German: the US Z key reads Y)', () => {
    setLayoutLegends(legendsFromLayoutMap(new Map([['KeyY', 'z'], ['KeyZ', 'y'], ['Backquote', '^']])))
    expect(summarizeEntry('combo', chord)).toBe('J + Y together → ^')
  })

  it('editor headers name one of a kind in the singular', () => {
    expect(Object.values(KINDS).map((k) => k.qmkOne)).toEqual(['Tap dance', 'Combo', 'Key override', 'Alt repeat'])
  })
})
