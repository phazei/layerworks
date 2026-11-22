// SPDX-License-Identifier: GPL-3.0-or-later
// Compatibility: the Device page's texts on keyboards with no knob or several.

import { describe, expect, it } from 'vitest'
import { keysAndKnobs, theKnobs } from '../knob-words'

describe('the knob in Backup and Restore texts', () => {
  it('no knob: not mentioned', () => {
    expect(theKnobs(0)).toBeNull()
    expect(keysAndKnobs(0)).toBe('the keys')
  })

  it('one knob, or several', () => {
    expect(keysAndKnobs(1)).toBe('the keys and the knob')
    expect(keysAndKnobs(3)).toBe('the keys and the knobs')
  })
})
