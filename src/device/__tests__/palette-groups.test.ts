// SPDX-License-Identifier: GPL-3.0-or-later
// The palette's extra groups (typing helpers, swapped and disabled keys, international keys, and under "More keys"
// the feature switches and restart keys), and the names of keycodes from the families the palette leaves out.

import { describe, expect, it } from 'vitest'
import { recreateKeyboardKeycodes } from '../../vendor/pipette/shared/keycodes/keycodes'
import {
  friendlyKey,
  keycodeCap,
  keycodeId,
  keycodeName,
  keycodeTitle,
  keyPalette,
  parseKeycode,
  PALETTE_EXTRA_GROUPS,
  type PaletteFeatures,
} from '../keycodes'

const ALL: PaletteFeatures = { combos: true, keyOverrides: true, autoShift: true }

/** The tables as a K15 Max with Vial protocol 6 sets them up; `supported` as the store reads Vial's feature flags. */
function connect(supported: string[] = ['caps_word', 'layer_lock', 'repeat_key']): void {
  recreateKeyboardKeycodes({
    vialProtocol: 6,
    layers: 5,
    macroCount: 16,
    tapDanceCount: 16,
    customKeycodes: [{ name: 'RP_MODE', title: 'Ripple colour mode', shortName: 'RpMd' }],
    midi: '',
    supportedFeatures: new Set(supported),
  })
}

const ids = (features?: PaletteFeatures) => keyPalette(features).map((group) => group.id)
const group = (id: string, features = ALL) => keyPalette(features).find((g) => g.id === id)!

describe('the extra groups', () => {
  it('follow the everyday groups, which keep their order, and only on the Keys page', () => {
    connect()
    const everyday = ids()
    expect(everyday).toEqual(['letters', 'numbers', 'shifted', 'editing', 'modifiers', 'function', 'media', 'numpad', 'mouse', 'lighting', 'keyboard', 'macros', 'tapDance', 'repeat'])
    expect(ids(ALL)).toEqual([...everyday, ...PALETTE_EXTRA_GROUPS])
    expect(keyPalette(ALL).filter((g) => g.more).map((g) => g.id)).toEqual(['switches', 'restart'])
  })

  it('give every key a description and a label, with no two keys named alike', () => {
    connect()
    const all = keyPalette(ALL).flatMap((g) => g.keys)
    for (const id of PALETTE_EXTRA_GROUPS) {
      for (const key of group(id).keys) {
        expect(key.description, key.id).toBeTruthy()
        expect(key.label.trim(), key.id).not.toBe('')
        // Every key names back to itself, also the ones the vendored tables lack.
        expect(keycodeId(key.code), key.id).toBe(key.id)
        expect(parseKeycode(key.id), key.id).toBe(key.code)
      }
    }
    // (Multi-tap tiles are named per slot by the Keys page, from the keyboard's entries.)
    const name = (key: (typeof all)[number]) => (key.description ?? key.label).toLowerCase()
    const extra = PALETTE_EXTRA_GROUPS.flatMap((id) => group(id).keys).map(name)
    const everywhere = all.map(name)
    for (const word of extra) expect(everywhere.filter((other) => other === word), word).toHaveLength(1)
  })

  it('offers the typing helpers, hiding the ones the keyboard says it lacks', () => {
    connect()
    expect(group('helpers').keys.map((k) => k.id)).toEqual([
      'QK_CAPS_WORD_TOGGLE', 'KC_GESC', 'KC_LSPO', 'KC_RSPC', 'KC_LCPO', 'KC_RCPC', 'KC_LAPO', 'KC_RAPC', 'KC_SFTENT', 'QK_LAYER_LOCK',
    ])
    connect([])
    expect(group('helpers').keys.map((k) => k.id)).not.toContain('QK_CAPS_WORD_TOGGLE')
    expect(group('helpers').keys.map((k) => k.id)).not.toContain('QK_LAYER_LOCK')
  })

  it('offers the swap and switch-off keys in plain words, the ones the tables lack included', () => {
    connect()
    const magic = group('magic')
    expect(magic.title).toBe('Swapped and disabled keys')
    expect(magic.link?.href).toBe('#/typing/magic')
    const byId = new Map(magic.keys.map((k) => [k.id, k]))
    expect(byId.get('MAGIC_NO_GUI')?.description).toBe('Windows keys do nothing')
    expect(byId.get('CL_TOGG')?.code).toBe(0x7002)
    expect(byId.get('EC_SWAP')?.description).toBe('Swap Esc and Caps Lock')
    expect(byId.get('NK_TOGG')?.code).toBe(0x7013)
    // Split keyboards only: left out.
    expect(byId.has('MAGIC_EE_HANDS_LEFT')).toBe(false)
  })

  it('leaves out switches for features the keyboard has no room for', () => {
    connect()
    const switches = (features: PaletteFeatures) => group('switches', features).keys.map((k) => k.id)
    expect(switches(ALL)).toEqual(expect.arrayContaining(['KC_ASTG', 'CMB_TOG', 'QK_KEY_OVERRIDE_TOGGLE', 'QK_ONE_SHOT_TOGGLE']))
    const none = switches({ combos: false, keyOverrides: false, autoShift: false })
    expect(none).toEqual(['QK_ONE_SHOT_ON', 'QK_ONE_SHOT_OFF', 'QK_ONE_SHOT_TOGGLE'])
  })

  it('lists each international key once (the JIS keys are QMK’s KC_INT1 – 5)', () => {
    connect()
    const keys = group('international').keys
    expect(new Set(keys.map((k) => k.code)).size).toBe(keys.length)
    expect(keys.find((k) => k.code === 0x87)?.aliases).toContain('KC_INT1')
  })

  it('names the keys the same way on the keycap and in words', () => {
    connect()
    expect(keycodeTitle(0x7002)).toBe('Swap Caps Lock and left Ctrl, or back')
    expect(keycodeName(0x7002)).toBe('Toggle Caps Ctrl')
    expect(keycodeTitle(parseKeycode('MAGIC_NO_GUI')!)).toBe('Windows keys do nothing')
    expect(keycodeCap(parseKeycode('KC_GESC')!)).toBe('Esc ` ~')
    expect(friendlyKey(0x04)).toBeNull()
  })
})

describe('what pointing at an everyday key says', () => {
  const key = (groupId: string, id: string) => group(groupId).keys.find((k) => k.id === id)!

  it('names number and symbol keys as the inspector does: “1 and !”', () => {
    connect()
    expect(key('numbers', 'KC_1').description).toBe('1 and !')
    expect(key('numbers', 'KC_MINUS').description).toBe('- and _')
    expect(keycodeTitle(parseKeycode('KC_1')!)).toBe('1 and !')
    // Letters keep their legend: the tile says it all.
    expect(key('letters', 'KC_A').description).toBeUndefined()
  })

  it('says what the keys that mislead by their name really do', () => {
    connect()
    expect(key('media', 'KC_UNDO').description).toBe('Undo key: most computers ignore it (Linux uses it); for undo, use the shortcut Ctrl + Z')
    expect(key('mouse', 'KC_BTN1').description).toBe('Left click (mouse button 1)')
    expect(key('mouse', 'KC_ACL0').description).toMatch(/while held/)
    expect(key('repeat', 'QK_ALT_REPEAT_KEY').description).toMatch(/opposite/)
  })

  it('notes that the keyboard’s own keys are named by the keyboard', () => {
    connect()
    expect(group('keyboard').note).toMatch(/names come from the keyboard/)
  })
})

describe('keys from the families the palette leaves out', () => {
  it('are named by their family rather than as a bare number', () => {
    connect()
    // MIDI without the definition asking for it, steno, Unicode: no table names them.
    expect(keycodeName(0x7103)).toBe('MIDI')
    expect(keycodeTitle(0x7103)).toMatch(/MIDI/)
    expect(keycodeName(0x74c0)).toBe('Steno')
    expect(keycodeTitle(0x8041)).toMatch(/Unicode/)
    // Joystick and programmable buttons have table names.
    expect(keycodeTitle(parseKeycode('JS_0')!)).toBe('Joystick button 0')
    expect(keycodeTitle(parseKeycode('PB_1')!)).toBe('Programmable button 1')
    // Their QMK name, where there is one, stays as it is (backups and Vial files use it).
    expect(keycodeId(parseKeycode('PB_1')!)).toBe('PB_1')
  })
})
