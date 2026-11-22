// SPDX-License-Identifier: GPL-3.0-or-later
// Compatibility: keyboards name one, two or up to 15 unlock keys (vial.c VIAL_UNLOCK_COMBO_ROWS).

import { describe, expect, it } from 'vitest'
import { holdUnlockKeys } from '../UnlockDialog'

describe('the unlock dialog for the number of unlock keys', () => {
  it('one key: hold it, no "together"', () => {
    expect(holdUnlockKeys('A', 1)).toEqual({ hold: 'Hold A', again: 'The count started again: keep holding the key down.' })
  })

  it('two keys: together, both keys', () => {
    expect(holdUnlockKeys('Esc and Enter', 2)).toEqual({
      hold: 'Hold Esc and Enter together',
      again: 'The count started again: hold both keys at the same time.',
    })
  })

  it('three or more: together, all of them', () => {
    expect(holdUnlockKeys('A, B and C', 3).again).toBe('The count started again: hold all of them at the same time.')
  })
})
