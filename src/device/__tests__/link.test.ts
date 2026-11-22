// SPDX-License-Identifier: GPL-3.0-or-later

import { describe, expect, it } from 'vitest'
import { receiverName } from '../link'

describe('the receiver in words', () => {
  it('uses the name its USB descriptor gives, and a plain one where that says nothing', () => {
    expect(receiverName('Keychron Link')).toBe('the Keychron Link receiver')
    expect(receiverName('2.4G Receiver')).toBe('the 2.4G Receiver')
    expect(receiverName('  ')).toBe('the 2.4 GHz receiver')
  })
})
