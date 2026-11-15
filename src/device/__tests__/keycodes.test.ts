// SPDX-License-Identifier: GPL-3.0-or-later

import { beforeAll, describe, expect, it } from 'vitest'
import { recreateKeyboardKeycodes } from '../../vendor/pipette/shared/keycodes/keycodes'
import {
  isBasicKey,
  keycodeId,
  keycodeName,
  keyPalette,
  layerKeycode,
  parseKeycode,
  readLayerKey,
  readShortcut,
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
