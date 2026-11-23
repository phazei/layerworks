// SPDX-License-Identifier: GPL-3.0-or-later

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { KC_SAME_AS_BELOW, parseKeycode, type KeyboardData } from '../../device'
import { howHeard, keycodeOfEvent, knobDirections, knobKeycode, positionsSending, usageOf } from '../pressed-keys'
import { connectDemo, disconnect } from '../session'

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

describe('media keys and how keycodes are heard', () => {
  // The keycode tables describe a keyboard only once one is loaded.
  beforeAll(async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    await connectDemo()
  })
  afterAll(() => disconnect())

  it('maps media and browser keys to their keycodes', () => {
    expect(keycodeOfEvent('AudioVolumeUp')).toBe(parseKeycode('KC_VOLU'))
    expect(keycodeOfEvent('VolumeDown')).toBe(parseKeycode('KC_VOLD'))
    expect(keycodeOfEvent('MediaPlayPause')).toBe(parseKeycode('KC_MPLY'))
    expect(keycodeOfEvent('BrowserBack')).toBe(parseKeycode('KC_WBAK'))
    expect(keycodeOfEvent('KeyA')).toBe(KC_A)
    expect(keycodeOfEvent('Fn')).toBeUndefined()
  })

  it('says how the page hears a keycode: as a key, as the wheel, or not at all', () => {
    expect(howHeard(parseKeycode('KC_VOLU')!)).toEqual({ key: parseKeycode('KC_VOLU') })
    expect(howHeard(parseKeycode('LCTL(KC_C)')!)).toEqual({ key: parseKeycode('KC_C') })
    expect(howHeard(parseKeycode('KC_WH_U')!)).toEqual({ wheel: 'up' })
    expect(howHeard(parseKeycode('KC_WH_R')!)).toEqual({ wheel: 'right' })
    expect(howHeard(parseKeycode('MO(1)')!)).toBeNull()
    expect(howHeard(parseKeycode('RGB_TOG')!)).toBeNull()
  })

  it('finds what a knob direction sends, falling through to the base layer', () => {
    const kb = { knobCount: 1, knobIndices: [0], knobs: { '0,0,0': KC_A, '0,0,1': KC_B, '1,0,0': KC_SAME_AS_BELOW, '1,0,1': KC_ESC } } as unknown as KeyboardData
    expect(knobDirections(kb)).toEqual(['0,0', '0,1'])
    expect(knobKeycode(kb, layer(0, 1), '0,0')).toBe(KC_A)
    expect(knobKeycode(kb, layer(0, 1), '0,1')).toBe(KC_ESC)
  })
})