// SPDX-License-Identifier: GPL-3.0-or-later
// The palette's lighting keys follow what the keyboard's definition says it has.

import { beforeAll, describe, expect, it } from 'vitest'
import { recreateKeyboardKeycodes } from '../../vendor/pipette/shared/keycodes/keycodes'
import { keyPalette, lightingKeysFor, type PaletteFeatures } from '../keycodes'

const BASE: PaletteFeatures = { combos: true, keyOverrides: true, autoShift: true }
const lightingIds = (lighting: unknown) =>
  keyPalette({ ...BASE, lighting: lightingKeysFor(lighting) })
    .find((group) => group.id === 'lighting')
    ?.keys.map((key) => key.id) ?? []

beforeAll(() => {
  recreateKeyboardKeycodes({ vialProtocol: 6, layers: 4, macroCount: 4, tapDanceCount: 4, customKeycodes: null, midi: '', supportedFeatures: new Set() })
})

describe('the palette’s lighting keys', () => {
  it('reads the definition’s lighting, also in the list and object forms some definitions use', () => {
    expect(lightingKeysFor('vialrgb')).toEqual({ backlight: false, underglow: false, matrix: true })
    expect(lightingKeysFor({ extends: 'qmk_rgblight' })).toEqual({ backlight: false, underglow: true, matrix: false })
    expect(lightingKeysFor(['qmk_rgblight'])).toEqual({ backlight: false, underglow: true, matrix: false })
    expect(lightingKeysFor({ extends: 'none', keycodes: 'qmk' })).toEqual({ backlight: false, underglow: false, matrix: false })
    expect(lightingKeysFor(undefined)).toEqual({ backlight: false, underglow: false, matrix: false })
    expect(lightingKeysFor('wt_rgb_backlight')).toBeUndefined()
  })

  it('offers the shared RGB keys on an RGB matrix keyboard (VialRGB), as on the K15 Max', () => {
    const ids = lightingIds('vialrgb')
    expect(ids).toContain('RGB_TOG')
    expect(ids.some((id) => id.startsWith('BL_') || id.startsWith('RGB_M_'))).toBe(false)
  })

  it('offers the backlight keys on a keyboard with QMK backlight', () => {
    const ids = lightingIds('qmk_backlight')
    expect(ids).toEqual(expect.arrayContaining(['BL_TOGG', 'BL_INC', 'BL_DEC']))
    expect(ids).not.toContain('RGB_TOG')
  })

  it('offers the underglow keys and their effects on an underglow keyboard, and both on one with both', () => {
    expect(lightingIds('qmk_rgblight')).toEqual(expect.arrayContaining(['RGB_TOG', 'RGB_MOD', 'RGB_M_P', 'RGB_M_B']))
    expect(lightingIds('qmk_backlight_rgblight')).toEqual(expect.arrayContaining(['BL_TOGG', 'RGB_TOG', 'RGB_M_R']))
  })

  it('leaves the group out on a keyboard without lighting', () => {
    expect(keyPalette({ ...BASE, lighting: lightingKeysFor('none') }).map((group) => group.id)).not.toContain('lighting')
  })

  it('keeps the shared keys where it doesn’t know what the keyboard has', () => {
    expect(lightingIds('wt_rgb_backlight')).toContain('RGB_TOG')
    expect(keyPalette().find((group) => group.id === 'lighting')?.keys.map((key) => key.id)).toContain('RGB_TOG')
  })
})
