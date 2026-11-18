// SPDX-License-Identifier: GPL-3.0-or-later

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import {
  keycodeTitle,
  layerKeycode,
  layerModKeycode,
  layerTapKeycode,
  macroKeycode,
  modTapKeycode,
  parseKeycode,
  tapDanceKeycode,
} from '../../device'
import { connectDemo, disconnect } from '../../shell/session'
import { knobPictureText, pictureLabel } from '../picture-labels'

// Connecting the demo keyboard sets up the keycode tables for a K15 Max.
beforeAll(async () => {
  vi.spyOn(console, 'log').mockImplementation(() => {})
  await connectDemo()
})
afterAll(() => disconnect())

const NAMES = ['Mac', 'Mac Fn', 'Windows', 'Windows Fn', 'Fn2']

describe('pictureLabel', () => {
  // QMK's own number, as everywhere: the key printed M1 runs Macro 1.
  it('names macros and multi-tap keys as the palette does, by QMK’s number', () => {
    expect(pictureLabel(macroKeycode(1)!)).toEqual({ outer: 'Macro\n1', inner: '', masked: false })
    expect(pictureLabel(macroKeycode(0)!)).toEqual({ outer: 'Macro\n0', inner: '', masked: false })
    expect(pictureLabel(tapDanceKeycode(2)!)).toEqual({ outer: 'Multi-\ntap 2', inner: '', masked: false })
  })

  it('splits tap / hold keys into the hold above and the tap below, with the layer by name', () => {
    expect(pictureLabel(modTapKeycode(0x01, 0x29)!)).toEqual({ outer: 'Ctrl', inner: 'Esc', masked: true })
    expect(pictureLabel(layerTapKeycode(3, 0x2c)!)).toEqual({ outer: 'Layer 3', inner: 'Space', masked: true })
    expect(pictureLabel(layerTapKeycode(4, 0x2c)!, NAMES)).toEqual({ outer: 'Fn2', inner: 'Space', masked: true })
  })

  it('says what a layer key does to which layer, in the Switch layer words', () => {
    expect(pictureLabel(layerKeycode('MO', 4), NAMES)?.outer).toBe('Hold\nFn2')
    expect(pictureLabel(layerKeycode('MO', 3), NAMES)?.outer).toBe('Hold\nWindows\nFn')
    expect(pictureLabel(layerKeycode('TG', 1), NAMES)?.outer).toBe('Toggle\nMac Fn')
    expect(pictureLabel(layerKeycode('OSL', 4), NAMES)?.outer).toBe('Next key\nFn2')
    expect(pictureLabel(layerKeycode('TO', 0), NAMES)?.outer).toBe('Switch to\nMac')
    expect(pictureLabel(layerKeycode('DF', 2), NAMES)?.outer).toBe('Base\nWindows')
    expect(pictureLabel(layerKeycode('TT', 4), NAMES)?.outer).toBe('Hold/tap\nFn2')
    expect(pictureLabel(layerModKeycode(4, 0x01)!, NAMES)?.outer).toBe('Hold +Ctrl\nFn2')
    // Without names: "Layer 4".
    expect(pictureLabel(layerKeycode('MO', 4))?.outer).toBe('Hold\nLayer 4')
  })

  it('labels the palette’s extra keys as their tiles, and unnamed families by family', () => {
    expect(pictureLabel(0x7002)).toEqual({ outer: 'Toggle\nCaps Ctrl', inner: '', masked: false })
    expect(pictureLabel(0x7103)?.outer).toBe('MIDI')
  })

  it('names a key that makes a layer the base layer and remembers it', () => {
    const pdf = parseKeycode('PDF(2)')!
    expect(pictureLabel(pdf, NAMES)?.outer).toBe('Base, kept\nWindows')
    expect(keycodeTitle(pdf)).toBe('Make layer 2 the base layer and remember it')
  })

  it('leaves keys the tables already name well alone', () => {
    expect(pictureLabel(0x04)).toBeNull()
  })
})

describe('knobPictureText', () => {
  it('puts a tap / hold key on two lines, tap first', () => {
    expect(knobPictureText(modTapKeycode(0x01, 0x29)!)).toBe('Esc\nCtrl')
    expect(knobPictureText(macroKeycode(1)!)).toBe('Macro\n1')
    expect(knobPictureText(0x04)).toBeNull()
  })
})
