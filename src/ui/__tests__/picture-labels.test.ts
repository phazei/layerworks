// SPDX-License-Identifier: GPL-3.0-or-later

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { layerKeycode, layerTapKeycode, macroKeycode, modTapKeycode, tapDanceKeycode } from '../../device'
import { connectDemo, disconnect } from '../../shell/session'
import { knobPictureText, pictureLabel } from '../picture-labels'

// Connecting the demo keyboard sets up the keycode tables for a K15 Max.
beforeAll(async () => {
  vi.spyOn(console, 'log').mockImplementation(() => {})
  await connectDemo()
})
afterAll(() => disconnect())

describe('pictureLabel', () => {
  it('names macros and multi-tap keys as the palette does, counting from 1', () => {
    expect(pictureLabel(macroKeycode(0)!)).toEqual({ outer: 'Macro\n1', inner: '', masked: false })
    expect(pictureLabel(tapDanceKeycode(2)!)).toEqual({ outer: 'Multi-\ntap 3', inner: '', masked: false })
  })

  it('splits tap / hold keys into the hold above and the tap below', () => {
    expect(pictureLabel(modTapKeycode(0x01, 0x29)!)).toEqual({ outer: 'Ctrl', inner: 'Esc', masked: true })
    expect(pictureLabel(layerTapKeycode(3, 0x2c)!)).toEqual({ outer: 'Layer 3', inner: 'Space', masked: true })
  })

  it('leaves keys the tables already name well alone', () => {
    expect(pictureLabel(0x04)).toBeNull()
    expect(pictureLabel(layerKeycode('MO', 4))).toBeNull()
  })
})

describe('knobPictureText', () => {
  it('puts a tap / hold key on two lines, tap first', () => {
    expect(knobPictureText(modTapKeycode(0x01, 0x29)!)).toBe('Esc\nCtrl')
    expect(knobPictureText(macroKeycode(1)!)).toBe('Macro\n2')
    expect(knobPictureText(0x04)).toBeNull()
  })
})
