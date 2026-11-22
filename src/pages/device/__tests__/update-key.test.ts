// SPDX-License-Identifier: GPL-3.0-or-later
// Compatibility: the key that starts firmware update mode, on keyboards not made by Keychron.

import { describe, expect, it } from 'vitest'
import { updateKeyHint } from '../StartOver'

describe('the key that reaches firmware update mode, by maker', () => {
  it('Keychron: Esc', () => {
    expect(updateKeyHint(0x3434)).toBe('Esc')
  })

  it('other makers: the top-left key, as QMK’s bootmagic checks row 0, column 0 unless the keyboard says otherwise', () => {
    expect(updateKeyHint(0xfeed)).toMatch(/top-left key/)
  })
})
