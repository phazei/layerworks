// SPDX-License-Identifier: GPL-3.0-or-later

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import {
  keyPalette,
  layerKeycode,
  layerModKeycode,
  layerTapKeycode,
  modTapKeycode,
  oneShotModKeycode,
  parseKeycode,
  shortcutKeycode,
  type KeyboardData,
} from '../../../device'
import { connectDemo, disconnect } from '../../../shell/session'
import { capLabel, choiceFor, describeKeycode, fallThrough, hasOwnOption } from '../describe'
import { matchesSearch } from '../KeyPalette'

// Connecting the demo keyboard sets up the keycode tables for a K15 Max.
beforeAll(async () => {
  vi.spyOn(console, 'log').mockImplementation(() => {})
  await connectDemo()
})
afterAll(() => disconnect())

const NAMES = ['Mac', 'Mac Fn', 'Windows', 'Windows Fn', 'Fn2']

describe('describeKeycode', () => {
  it('says what a key does in plain words', () => {
    expect(describeKeycode(0x04, NAMES)).toBe('A')
    expect(describeKeycode(0x1e, NAMES)).toBe('1 and !')
    expect(describeKeycode(0x29, NAMES)).toBe('Escape')
    expect(describeKeycode(0x00, NAMES)).toBe('Nothing')
    expect(describeKeycode(0x01, NAMES)).toBe('Same as the layer below')
    expect(describeKeycode(shortcutKeycode(0x01, 0x06), NAMES)).toBe('Ctrl + C')
    expect(describeKeycode(layerKeycode('MO', 4), NAMES)).toBe('While held, use Fn2')
    expect(describeKeycode(layerKeycode('TG', 3), NAMES)).toBe('Turn Windows Fn on or off')
    // QMK's PDF(n): named where a key holds one, not offered (the Mac / Windows switch decides the base at start).
    expect(describeKeycode(parseKeycode('PDF(2)')!, NAMES)).toBe('Make Windows the base layer and remember it')
  })
})

describe('choiceFor', () => {
  const codes = new Set(keyPalette().flatMap((group) => group.keys.map((key) => key.code)))

  it('opens on the choice that makes the keycode', () => {
    expect(choiceFor(0x04, codes)).toEqual({ choice: 'key', more: false })
    expect(choiceFor(shortcutKeycode(0x01, 0x06), codes)).toEqual({ choice: 'shortcut', more: false })
    expect(choiceFor(layerKeycode('OSL', 1), codes)).toEqual({ choice: 'layer', more: false })
  })

  it('treats shifted symbols as keys, not shortcuts', () => {
    const tilde = keyPalette().find((group) => group.id === 'shifted')!.keys.find((key) => key.label === '~')!
    expect(choiceFor(tilde.code, codes)).toEqual({ choice: 'key', more: false })
    expect(describeKeycode(tilde.code, NAMES)).toBe('~')
  })

  it('sends nothing, transparent, one-shot modifiers and unknown codes to More options', () => {
    expect(choiceFor(0x00, codes).more).toBe(true)
    expect(choiceFor(0x01, codes).more).toBe(true)
    expect(choiceFor(oneShotModKeycode(0x02)!, codes).more).toBe(true)
    expect(choiceFor(0x7c00, codes).more).toBe(true) // QK_BOOT
    expect(hasOwnOption(oneShotModKeycode(0x02)!)).toBe(true)
    expect(hasOwnOption(0x7c00)).toBe(false)
  })

  it('opens tap / hold keys on "Tap or hold", and the other layer keys on "Switch layer"', () => {
    expect(choiceFor(0x4104, codes)).toEqual({ choice: 'tapHold', more: false }) // LT(1, KC_A)
    expect(choiceFor(modTapKeycode(0x01, 0x29)!, codes)).toEqual({ choice: 'tapHold', more: false })
    expect(choiceFor(layerKeycode('TT', 1), codes)).toEqual({ choice: 'layer', more: false })
    expect(choiceFor(layerModKeycode(4, 0x01)!, codes)).toEqual({ choice: 'layer', more: false })
  })

  it('names the layer of a tap / hold key, and puts both on its keycap', () => {
    expect(describeKeycode(layerTapKeycode(4, 0x2c)!, NAMES)).toBe('Tap: Space bar · Hold: Fn2')
    expect(describeKeycode(layerModKeycode(4, 0x03)!, NAMES)).toBe('While held, use Fn2 with Ctrl + Shift')
    // The count is said: "tap quickly" alone didn't tell anyone it takes five taps.
    expect(describeKeycode(layerKeycode('TT', 3), NAMES)).toBe('Hold for Windows Fn, or tap it 5 times to keep it on')
    expect(describeKeycode(layerKeycode('TT', 3), NAMES, 3)).toBe('Hold for Windows Fn, or tap it 3 times to keep it on')
    expect(capLabel(layerTapKeycode(4, 0x2c)!, NAMES)).toBe('Space\nFn2')
    expect(capLabel(modTapKeycode(0x01, 0x29)!, NAMES)).toBe('Esc\nCtrl')
  })
})

describe('fallThrough', () => {
  // One key, five layers: A on Mac, B on Windows, Windows Fn has F1, Fn2 and Mac Fn are transparent.
  const keyboard = (codes: number[]) =>
    ({ keymap: Object.fromEntries(codes.map((code, layer) => [`${layer},0,0`, code])), knobs: {} }) as unknown as KeyboardData
  const at = (layer: number) => ({ kind: 'key', layer, row: 0, col: 0 }) as const

  it('falls from a layer above the base to the base layer, skipping the layers in between', () => {
    // Windows Fn (3) has F1 of its own, but with Fn2 held over Windows it isn't on: Fn2 falls to Windows.
    const kb = keyboard([0x04, 0x01, 0x05, 0x3a, 0x01])
    expect(fallThrough(kb, at(4), 2)).toEqual({ layer: 2, code: 0x05 })
    expect(fallThrough(kb, at(3), 2)).toBeNull()
    expect(fallThrough(keyboard([0x04, 0x01, 0x05, 0x01, 0x01]), at(3), 2)).toEqual({ layer: 2, code: 0x05 })
  })

  it('falls from a layer at or under the base straight to layer 0', () => {
    // Mac Fn while on Windows: Mac Fn isn't stacked on Windows, so it falls to Mac.
    const kb = keyboard([0x04, 0x01, 0x01, 0x01, 0x01])
    expect(fallThrough(kb, at(1), 2)).toEqual({ layer: 0, code: 0x04 })
    expect(fallThrough(kb, at(2), 2)).toEqual({ layer: 0, code: 0x04 })
    // On the Mac pair, Mac Fn falls to Mac.
    expect(fallThrough(kb, at(1), 0)).toEqual({ layer: 0, code: 0x04 })
  })

  it('goes on to layer 0 when the base layer has nothing either', () => {
    const kb = keyboard([0x04, 0x07, 0x01, 0x01, 0x01])
    expect(fallThrough(kb, at(4), 2)).toEqual({ layer: 0, code: 0x04 })
    expect(fallThrough(kb, at(3), 2)).toEqual({ layer: 0, code: 0x04 })
  })

  it('is null when nothing it falls to has an assignment', () => {
    expect(fallThrough(keyboard([0x01, 0x01, 0x01, 0x01, 0x01]), at(4), 2)).toBeNull()
  })

  it('is null for keys with their own assignment, and on the bottom layer', () => {
    const kb = keyboard([0x01, 0x01, 0x05])
    expect(fallThrough(kb, at(2), 2)).toBeNull()
    expect(fallThrough(kb, at(0), 2)).toBeNull()
    expect(fallThrough(kb, at(1), 2)).toBeNull()
  })
})

describe('matchesSearch', () => {
  const esc = { code: 0x29, id: 'KC_ESCAPE', label: 'Esc', description: 'Escape', aliases: ['KC_ESCAPE', 'KC_ESC'] }

  it('matches label, description and QMK names, every word', () => {
    expect(matchesSearch(esc, 'esc')).toBe(true)
    expect(matchesSearch(esc, 'KC_ESC')).toBe(true)
    expect(matchesSearch(esc, 'escape key')).toBe(false)
    expect(matchesSearch(esc, '')).toBe(true)
  })

  it('matches a single character to a label only', () => {
    expect(matchesSearch(esc, 'e')).toBe(false)
    expect(matchesSearch({ code: 0x1e, id: 'KC_1', label: '!\n1' }, '!')).toBe(true)
  })
})
