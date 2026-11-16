// SPDX-License-Identifier: GPL-3.0-or-later

import { beforeAll, describe, expect, it } from 'vitest'
import { recreateKeyboardKeycodes } from '../../vendor/pipette/shared/keycodes/keycodes'
import {
  canBeTapped,
  isBasicKey,
  keycodeCap,
  keycodeId,
  keycodeName,
  keycodeTitle,
  keyPalette,
  layerKeycode,
  layerModKeycode,
  layerTapKeycode,
  modifierShort,
  modifierWords,
  modTapKeycode,
  oneShotModKeycode,
  parseKeycode,
  readLayerKey,
  readLayerMod,
  readLayerTap,
  readMacroKey,
  readModTap,
  readOneShotMod,
  readShortcut,
  readTapDanceKey,
  readTapHold,
  RIGHT_HAND,
  shortcutKeycode,
} from '../keycodes'

beforeAll(() => {
  recreateKeyboardKeycodes({
    vialProtocol: 6,
    layers: 5,
    macroCount: 16,
    tapDanceCount: 16,
    customKeycodes: [{ name: 'RP_MODE', title: 'Ripple colour mode', shortName: 'RpMd' }],
    midi: '',
    supportedFeatures: new Set(),
  })
})

describe('names', () => {
  it('names keycodes the QMK way and the short way', () => {
    expect(keycodeId(0x04)).toBe('KC_A')
    expect(keycodeName(0x04)).toBe('A')
    expect(keycodeName(0x7e00)).toBe('RpMd')
  })
})

describe('parseKeycode', () => {
  it('reads QMK names, in any case', () => {
    expect(parseKeycode('KC_A')).toBe(0x04)
    expect(parseKeycode(' kc_esc ')).toBe(0x29)
    expect(parseKeycode('MO(2)')).toBe(layerKeycode('MO', 2))
    expect(parseKeycode('LCTL(KC_C)')).toBe(shortcutKeycode(0x01, 0x06))
    expect(parseKeycode('KC_NO')).toBe(0)
  })

  it('reads numbers', () => {
    expect(parseKeycode('0x7E10')).toBe(0x7e10)
    expect(parseKeycode('41')).toBe(41)
  })

  it('rejects what it cannot read', () => {
    expect(parseKeycode('')).toBeNull()
    expect(parseKeycode('KC_NOPE')).toBeNull()
    expect(parseKeycode('0x10000')).toBeNull()
  })
})

describe('shortcuts and layer keys', () => {
  it('builds and reads a modifier + key', () => {
    const code = shortcutKeycode(0x01 | 0x02, 0x06)
    expect(keycodeId(code)).toBe('C_S(KC_C)')
    expect(readShortcut(code)).toEqual({ mods: 0x03, key: 0x06 })
    expect(readShortcut(0x06)).toBeNull()
  })

  it('builds and reads layer keys', () => {
    expect(keycodeId(layerKeycode('MO', 4))).toBe('MO(4)')
    expect(readLayerKey(layerKeycode('TG', 3))).toEqual({ op: 'TG', layer: 3 })
    expect(readLayerKey(0x04)).toBeNull()
  })

  it('knows which keys can take modifiers', () => {
    expect(isBasicKey(0x04)).toBe(true)
    expect(isBasicKey(0x01)).toBe(false)
    expect(isBasicKey(layerKeycode('MO', 1))).toBe(false)
  })
})

// Every combination of Ctrl, Shift, Alt and Win, on the left and on the right.
const ALL_MODS = Array.from({ length: 15 }, (_, i) => i + 1).flatMap((mods) => [mods, mods | RIGHT_HAND])
const ESC = 0x29
const SPACE = 0x2c

describe('tap / hold keys', () => {
  it('builds and reads mod-tap keys for every modifier combination', () => {
    for (const mods of ALL_MODS) {
      const code = modTapKeycode(mods, ESC)
      expect(code, `mods ${mods}`).not.toBeNull()
      expect(readModTap(code!)).toEqual({ mods, key: ESC })
      expect(readTapHold(code!)).toEqual({ hold: 'mods', mods, key: ESC })
      // QMK names it, so it isn't shown as a bare number.
      expect(keycodeId(code!)).toMatch(/_T\(KC_ESCAPE\)$/)
      expect(parseKeycode(keycodeId(code!))).toBe(code)
    }
    expect(keycodeId(modTapKeycode(0x01, ESC)!)).toBe('LCTL_T(KC_ESCAPE)')
    expect(keycodeId(modTapKeycode(0x04 | RIGHT_HAND, SPACE)!)).toBe('RALT_T(KC_SPACE)')
  })

  it('builds and reads layer-tap keys for every layer it can reach', () => {
    for (let layer = 0; layer <= 15; layer++) {
      const code = layerTapKeycode(layer, SPACE)
      expect(readLayerTap(code!)).toEqual({ layer, key: SPACE })
      expect(readTapHold(code!)).toEqual({ hold: 'layer', layer, key: SPACE })
    }
    expect(keycodeId(layerTapKeycode(4, SPACE)!)).toBe('LT4(KC_SPACE)')
    expect(layerTapKeycode(16, SPACE)).toBeNull()
    expect(layerTapKeycode(-1, SPACE)).toBeNull()
  })

  it('rejects tap keys that are not basic keys, and no modifiers', () => {
    for (const key of [0, 1, shortcutKeycode(0x01, 0x06), layerKeycode('MO', 1), 0x7e00, 0x7700]) {
      expect(canBeTapped(key)).toBe(false)
      expect(modTapKeycode(0x01, key)).toBeNull()
      expect(layerTapKeycode(1, key)).toBeNull()
    }
    expect(modTapKeycode(0, ESC)).toBeNull()
    expect(modTapKeycode(RIGHT_HAND, ESC)).toBeNull()
    expect(canBeTapped(0x04)).toBe(true)
  })

  it('reads nothing else as a tap / hold key', () => {
    for (const code of [0x04, shortcutKeycode(0x01, 0x06), layerKeycode('MO', 1), layerKeycode('TT', 1), 0x7700, 0x5700]) {
      expect(readTapHold(code)).toBeNull()
      expect(readOneShotMod(code)).toBeNull()
      expect(readLayerMod(code)).toBeNull()
    }
  })

  it('builds and reads one-shot modifiers and layer + modifiers', () => {
    for (const mods of ALL_MODS) {
      expect(readOneShotMod(oneShotModKeycode(mods)!)).toEqual({ mods })
      for (let layer = 0; layer <= 15; layer++) expect(readLayerMod(layerModKeycode(layer, mods)!)).toEqual({ layer, mods })
    }
    expect(keycodeId(oneShotModKeycode(0x02)!)).toBe('OSM(MOD_LSFT)')
    expect(keycodeId(layerModKeycode(3, 0x01)!)).toBe('LM3(MOD_LCTL)')
    expect(oneShotModKeycode(0)).toBeNull()
    expect(layerModKeycode(16, 0x01)).toBeNull()
  })

  it('reads the layer key that can be tapped to stay on', () => {
    expect(keycodeId(layerKeycode('TT', 2))).toBe('TT(2)')
    expect(readLayerKey(layerKeycode('TT', 2))).toEqual({ op: 'TT', layer: 2 })
  })

  it('names them in words and on keycaps', () => {
    expect(modifierWords(0x03)).toBe('Ctrl + Shift')
    expect(modifierWords(0x04 | RIGHT_HAND)).toBe('Right Alt')
    expect(modifierShort(0x03)).toBe('Ctrl+Shift')
    expect(keycodeTitle(modTapKeycode(0x01, ESC)!)).toBe('Tap: Escape · Hold: Ctrl')
    expect(keycodeTitle(layerTapKeycode(4, SPACE)!)).toBe('Tap: Space bar · Hold: layer 4')
    expect(keycodeTitle(oneShotModKeycode(0x02)!)).toBe('Shift for the next key only')
    expect(keycodeTitle(layerModKeycode(3, 0x01)!)).toBe('While held, use layer 3 with Ctrl')
    expect(keycodeName(modTapKeycode(0x01, ESC)!)).toBe('Esc / Ctrl')
    expect(keycodeCap(layerTapKeycode(4, SPACE)!)).toBe('Space\nLayer 4')
    expect(keycodeName(shortcutKeycode(0x01, 0x06))).toBe('Ctrl+C')
  })
})

describe('macro and multi-tap keys', () => {
  it('reads which one a keycode is', () => {
    expect(readMacroKey(0x7702)).toBe(2)
    expect(readMacroKey(0x04)).toBeNull()
    expect(readTapDanceKey(0x5703)).toBe(3)
    expect(readTapDanceKey(0x7702)).toBeNull()
  })
})

describe('keyPalette', () => {
  it('groups the keys, with codes that name back to the same key', () => {
    const palette = keyPalette()
    const ids = palette.map((group) => group.id)
    expect(ids).toEqual(expect.arrayContaining(['letters', 'numbers', 'editing', 'modifiers', 'function', 'media', 'keyboard', 'macros']))
    for (const group of palette) {
      for (const key of group.keys) expect(keycodeId(key.code), key.id).toBe(key.id)
    }
    expect(palette.find((group) => group.id === 'letters')?.keys).toHaveLength(26)
    expect(palette.find((group) => group.id === 'keyboard')?.keys[0]).toMatchObject({ label: 'RpMd', code: 0x7e00 })
  })
})
