// SPDX-License-Identifier: GPL-3.0-or-later

import { describe, expect, it } from 'vitest'
import { KC_SAME_AS_BELOW, type KeyboardData } from '../../device'
import { positionsSending, usageOf } from '../pressed-keys'

const KC_A = 0x04
const KC_B = 0x05
const KC_ESC = 0x29

/** Two layers of 1 x 3 keys. */
function keyboard(base: number[], top: number[]): KeyboardData {
  const keymap: Record<string, number> = {}
  base.forEach((code, col) => (keymap[`0,0,${col}`] = code))
  top.forEach((code, col) => (keymap[`1,0,${col}`] = code))
  return { rows: 1, cols: 3, layers: 2, keymap } as unknown as KeyboardData
}

const layer = (base: number, held: number) => ({ base, held, active: Math.max(base, held) })

describe('positionsSending', () => {
  it('finds every key that sends the keycode on the active layer', () => {
    const kb = keyboard([KC_A, KC_B, KC_A], [KC_ESC, KC_ESC, KC_ESC])
    expect(positionsSending(kb, layer(0, 0), KC_A)).toEqual(['0,0', '0,2'])
    expect(positionsSending(kb, layer(0, 0), KC_ESC)).toEqual([])
  })

  it('uses the held layer while one is held', () => {
    const kb = keyboard([KC_A, KC_B, KC_A], [KC_ESC, KC_B, 0])
    expect(positionsSending(kb, layer(0, 1), KC_ESC)).toEqual(['0,0'])
    expect(positionsSending(kb, layer(0, 1), KC_A)).toEqual([])
  })

  it('falls through to the base layer where the held layer has nothing of its own', () => {
    const kb = keyboard([KC_A, KC_B, KC_A], [KC_SAME_AS_BELOW, KC_ESC, KC_SAME_AS_BELOW])
    expect(positionsSending(kb, layer(0, 1), KC_A)).toEqual(['0,0', '0,2'])
    expect(positionsSending(kb, layer(0, 1), KC_B)).toEqual([])
  })
})

describe('usageOf', () => {
  it('maps browser key codes to USB usages', () => {
    expect(usageOf('KeyA')).toBe(0x04)
    expect(usageOf('KeyZ')).toBe(0x1d)
    expect(usageOf('Digit1')).toBe(0x1e)
    expect(usageOf('Digit0')).toBe(0x27)
    expect(usageOf('F12')).toBe(0x45)
    expect(usageOf('Numpad0')).toBe(0x62)
    expect(usageOf('ShiftRight')).toBe(0xe5)
    expect(usageOf('Fn')).toBeUndefined()
  })
})
