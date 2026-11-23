// SPDX-License-Identifier: GPL-3.0-or-later

import { describe, expect, it } from 'vitest'
import { parseKeycode } from '../keycodes'
import { keymapRisks } from '../risks'
import type { KeyboardData } from '../store'

const TAB = 0x2b
const ENTER = 0x28
const ESC = 0x29
const A = 0x04

const kb = { layers: 2, definition: {} } as unknown as Pick<KeyboardData, 'layers' | 'definition'>
const name = (layer: number) => `Layer ${layer}`
const risks = (before: Record<string, number>, after: Record<string, number>) =>
  keymapRisks(kb, before, after, [], name).filter((risk) => risk.kind === 'navigation')

/** A base layer with one Tab, one Enter and one Esc. */
const base = { '0,0,0': ESC, '0,1,0': TAB, '0,2,0': ENTER, '0,3,0': A }

describe('the base layer losing its last Tab, Enter or Esc', () => {
  it('warns when the only Esc goes', () => {
    expect(risks(base, { ...base, '0,0,0': A }).map((risk) => risk.text)).toEqual([
      'Layer 0 would have no Esc key left, which you need to use this app and most of a computer without a mouse.',
    ])
  })

  it('names every one that goes in one warning', () => {
    const after = { ...base, '0,1,0': A, '0,2,0': A }
    expect(risks(base, after).map((risk) => risk.text)).toEqual([
      'Layer 0 would have no Tab or Enter key left, which you need to use this app and most of a computer without a mouse.',
    ])
  })

  it('says nothing while another one of them stays on the base layer', () => {
    const two = { ...base, '0,4,0': TAB }
    expect(risks(two, { ...two, '0,1,0': A })).toEqual([])
  })

  it('counts a tap-or-hold key whose tap is Enter as an Enter', () => {
    const withLt = { ...base, '0,4,0': parseKeycode('LT(1,KC_ENTER)')! }
    expect(risks(withLt, { ...withLt, '0,2,0': A })).toEqual([])
    const withMt = { ...base, '0,4,0': parseKeycode('LCTL_T(KC_ENTER)')! }
    expect(risks(withMt, { ...withMt, '0,2,0': A })).toEqual([])
  })

  it('says nothing about a layer above the base, or a base that had none to begin with', () => {
    expect(risks({ ...base, '1,0,0': ESC }, { ...base, '1,0,0': A })).toEqual([])
    const noTab = { '0,0,0': ESC, '0,2,0': ENTER }
    expect(risks(noTab, { ...noTab, '0,3,0': A })).toEqual([])
  })
})
