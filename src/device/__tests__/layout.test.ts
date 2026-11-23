// SPDX-License-Identifier: GPL-3.0-or-later
// Key legends that follow the computer's layout, with layout maps as Chrome gives them for German QWERTZ and
// French AZERTY (samples for the tests only; the app reads the real one from the browser).

import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { recreateKeyboardKeycodes } from '../../vendor/pipette/shared/keycodes/keycodes'
import { matchesSearch } from '../../pages/keys/KeyPalette'
import { pictureLabel } from '../../ui/picture-labels'
import { keycodeCap, keycodeId, keycodeName, keycodeTitle, keyPalette, modTapKeycode, parseKeycode, shortcutKeycode } from '../keycodes'
import { layoutActive, legendsFromLayoutMap, setLayoutLegends } from '../layout'

/** The 48 writing keys, as getLayoutMap() reports them, from a template of "code=char" overrides on US. */
function layout(overrides: Record<string, string>): Map<string, string> {
  const map = new Map<string, string>()
  for (let i = 0; i < 26; i++) map.set(`Key${String.fromCharCode(65 + i)}`, String.fromCharCode(97 + i))
  for (let i = 0; i <= 9; i++) map.set(`Digit${i}`, String(i))
  const symbols: Record<string, string> = {
    Minus: '-', Equal: '=', BracketLeft: '[', BracketRight: ']', Backslash: '\\', Semicolon: ';', Quote: "'",
    Backquote: '`', Comma: ',', Period: '.', Slash: '/', IntlBackslash: '\\',
  }
  for (const [code, char] of Object.entries({ ...symbols, ...overrides })) map.set(code, char)
  return map
}

const US = layout({})
const GERMAN = layout({
  KeyY: 'z', KeyZ: 'y', Minus: 'ß', Equal: '´', BracketLeft: 'ü', BracketRight: '+', Backslash: '#', Semicolon: 'ö',
  Quote: 'ä', Backquote: '^', Slash: '-', IntlBackslash: '<',
})
const FRENCH = layout({
  KeyQ: 'a', KeyA: 'q', KeyW: 'z', KeyZ: 'w', KeyM: ',', Semicolon: 'm', Digit1: '&', Digit2: 'é', Digit3: '"',
  Digit4: "'", Digit5: '(', Digit6: '-', Digit7: 'è', Digit8: '_', Digit9: 'ç', Digit0: 'à', Minus: ')', Comma: ';',
  Period: ':', Slash: '!', Quote: 'ù', BracketLeft: '^', BracketRight: '$', Backslash: '*', Backquote: '²',
  IntlBackslash: '<',
})

const KC_Y = 0x1c
const KC_Z = 0x1d
const KC_1 = 0x1e
const KC_Q = 0x14
const KC_SCOLON = 0x33
const use = (map: Map<string, string>) => setLayoutLegends(legendsFromLayoutMap(map))

beforeAll(() => {
  recreateKeyboardKeycodes({
    vialProtocol: 6,
    layers: 5,
    macroCount: 16,
    tapDanceCount: 16,
    customKeycodes: [],
    midi: '',
    supportedFeatures: new Set(),
  })
})
afterEach(() => setLayoutLegends(null))

describe('legends from a layout map', () => {
  it('changes nothing for a US layout', () => {
    expect(legendsFromLayoutMap(US)).toBeNull()
    use(US)
    expect(layoutActive()).toBe(false)
    expect(keycodeName(KC_1)).toBe('! 1')
    expect(keycodeTitle(shortcutKeycode(0x02, KC_1))).toBe('!')
  })

  it('names keys by what a German layout types, letters as capitals', () => {
    use(GERMAN)
    expect(keycodeName(KC_Y)).toBe('Z')
    expect(keycodeName(KC_Z)).toBe('Y')
    expect(keycodeTitle(KC_SCOLON)).toBe('Ö')
    // ß has no single capital: shown as it is, not as SS.
    expect(keycodeName(0x2d)).toBe('ß')
    expect(keycodeTitle(shortcutKeycode(0x01, KC_Z))).toBe('Ctrl + Y')
    expect(keycodeTitle(modTapKeycode(0x01, KC_Y)!)).toBe('Tap: Z · Hold: Ctrl')
    // The QMK name is a position: it never changes.
    expect(keycodeId(KC_Y)).toBe('KC_Y')
    // Keys the browser says nothing about keep their names.
    expect(keycodeTitle(0x29)).toBe('Escape')
  })

  it('shows only the unshifted character, and QMK’s shifted symbols as Shift + that key', () => {
    use(GERMAN)
    expect(keycodeTitle(KC_1)).toBe('1')
    const exclamation = parseKeycode('KC_EXLM')!
    expect(keycodeTitle(exclamation)).toBe('Shift + 1')
    expect(keycodeCap(exclamation)).toBe('Shift+1')
    expect(keycodeTitle(shortcutKeycode(0x03, KC_1))).toBe('Ctrl + Shift + 1')
  })

  it('follows French AZERTY, digits included', () => {
    use(FRENCH)
    expect(keycodeName(KC_Q)).toBe('A')
    expect(keycodeName(KC_1)).toBe('&')
    expect(keycodeName(KC_SCOLON)).toBe('M')
  })

  it('names the palette’s tiles that way', () => {
    use(GERMAN)
    const letters = keyPalette().find((group) => group.id === 'letters')!.keys
    expect(letters.find((key) => key.id === 'KC_Y')).toMatchObject({ label: 'Z', description: 'Z' })
    const shifted = keyPalette().find((group) => group.id === 'shifted')!.keys.find((key) => key.id === 'LSFT(KC_1)')!
    expect(shifted.label).toBe('Shift\n1')
  })

  it('German: "y" finds only the key shown as Y, not the one shown as Z through its US name', () => {
    use(GERMAN)
    const letters = keyPalette().find((group) => group.id === 'letters')!.keys
    const found = letters.filter((key) => matchesSearch(key, 'y')).map((key) => key.id)
    expect(found).toEqual(['KC_Z'])
    expect(letters.filter((key) => matchesSearch(key, 'z')).map((key) => key.id)).toEqual(['KC_Y'])
    // The QMK name stays findable by whoever types it.
    expect(letters.filter((key) => matchesSearch(key, 'kc_y')).map((key) => key.id)).toEqual(['KC_Y'])
  })

  it('French: "!" doesn’t find "Shift + 1", which isn’t ! there', () => {
    use(FRENCH)
    const all = keyPalette().flatMap((group) => group.keys)
    // The key that types ! there, and Shift + it (shown "Shift !"); not the US "!" (Shift + 1).
    expect(all.filter((key) => matchesSearch(key, '!')).map((key) => key.id)).toEqual(['KC_SLASH', 'LSFT(KC_SLASH)'])
    // US: "!" finds the shifted 1, as before.
    setLayoutLegends(null)
    expect(keyPalette().flatMap((group) => group.keys).filter((key) => matchesSearch(key, '!')).map((key) => key.id)).toContain('LSFT(KC_1)')
  })

  it('draws the picture’s keys that way, the tap of a tap-or-hold key too', () => {
    use(GERMAN)
    expect(pictureLabel(KC_Y)).toEqual({ outer: 'Z', inner: '', masked: false })
    expect(pictureLabel(modTapKeycode(0x01, KC_Y)!)).toMatchObject({ inner: 'Z', masked: true })
    setLayoutLegends(null)
    expect(pictureLabel(KC_Y)).toBeNull()
  })
})
