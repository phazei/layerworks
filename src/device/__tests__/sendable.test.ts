// SPDX-License-Identifier: GPL-3.0-or-later
// Which keys each shortcut's picker offers: what vial-qmk runs there (sendable.ts names the firmware functions).

import { beforeAll, describe, expect, it } from 'vitest'
import { recreateKeyboardKeycodes } from '../../vendor/pipette/shared/keycodes/keycodes'
import { entryProblem, type KeyOverrideEntry } from '../entries'
import { keyPalette, parseKeycode, PALETTE_EXTRA_GROUPS } from '../keycodes'
import { canSend, groupsFor, KEY_USES, paletteFeatures, type KeyUse } from '../sendable'

beforeAll(() => {
  recreateKeyboardKeycodes({
    vialProtocol: 6,
    layers: 5,
    macroCount: 16,
    tapDanceCount: 16,
    customKeycodes: [{ name: 'RP_MODE', title: 'Ripple colour mode', shortName: 'RpMd' }],
    midi: '',
    supportedFeatures: new Set(['caps_word', 'layer_lock', 'repeat_key']),
  })
})

const ids = (use: KeyUse) => groupsFor(use).map((group) => group.id)
const codes = (use: KeyUse) => groupsFor(use).flatMap((group) => group.keys.map((key) => key.code))
const everyday = () => keyPalette().map((group) => group.id)

describe('what each picker offers', () => {
  it('offers every group the firmware runs in a chord, a multi-tap key and a repeat rule, less other shortcuts', () => {
    for (const use of ['chordSends', 'multiTap', 'repeatSends'] as const) {
      expect(ids(use), use).toEqual([...everyday().filter((id) => id !== 'tapDance' && id !== 'repeat'), ...PALETTE_EXTRA_GROUPS])
    }
    expect(codes('chordSends')).toContain(parseKeycode('QK_CAPS_WORD_TOGGLE'))
    expect(codes('chordSends')).toContain(parseKeycode('QK_REBOOT'))
  })

  it('offers a macro’s tap step every group but other shortcuts, and its hold steps the keys that mean something held', () => {
    expect(ids('macroTap')).toEqual([...everyday().filter((id) => !['macros', 'tapDance', 'repeat'].includes(id)), ...PALETTE_EXTRA_GROUPS])
    expect(ids('macroHold')).toEqual([...everyday().filter((id) => !['macros', 'tapDance', 'repeat'].includes(id)), 'helpers', 'international'])
  })

  it('keeps the keys a chord is made of, and the key a repeat rule follows, to the everyday ones', () => {
    for (const use of ['chordKey', 'repeatAfter'] as const) expect(ids(use), use).toEqual(everyday().filter((id) => !['macros', 'tapDance', 'repeat'].includes(id)))
  })

  it('offers a shortcut replacement only ordinary keys, which the firmware registers', () => {
    const offered = ids('overrideSends')
    for (const left of ['lighting', 'keyboard', 'macros', 'helpers', 'magic', 'switches', 'restart']) expect(offered, left).not.toContain(left)
    expect(offered).toEqual(expect.arrayContaining(['letters', 'shifted', 'media', 'mouse', 'numpad', 'international']))
    expect(codes('overrideSends').every((code) => code <= 0x1fff)).toBe(true)
    expect(codes('overrideTrigger').every((code) => code <= 0xff)).toBe(true)
    expect(ids('overrideTrigger')).not.toContain('shifted')
  })

  it('leaves out switches for features the keyboard lacks', () => {
    const none = paletteFeatures({ counts: { combo: 0, keyOverride: 0 } }, {})
    const switches = groupsFor('chordSends', none).find((group) => group.id === 'switches')!.keys.map((key) => key.id)
    expect(switches).toEqual(['QK_ONE_SHOT_ON', 'QK_ONE_SHOT_OFF', 'QK_ONE_SHOT_TOGGLE'])
  })

  it('has one rule for every place', () => {
    expect(Object.keys(KEY_USES).sort()).toEqual(
      ['chordKey', 'chordSends', 'macroHold', 'macroTap', 'multiTap', 'overrideSends', 'overrideTrigger', 'repeatAfter', 'repeatSends'].sort(),
    )
  })
})

describe('a replacement the keyboard can’t send', () => {
  const entry: KeyOverrideEntry = {
    triggerKey: 0x2a,
    replacementKey: 0x4c,
    layers: 0xffff,
    triggerMods: 0x22,
    negativeMods: 0,
    suppressedMods: 0x22,
    options: 0b111,
    enabled: true,
  }

  it('is flagged, with the key in words', () => {
    expect(entryProblem('keyOverride', entry)).toBeNull()
    expect(entryProblem('keyOverride', { ...entry, replacementKey: 0x0106 })).toBeNull() // Ctrl + C
    expect(canSend('overrideSends', parseKeycode('RGB_TOG')!)).toBe(false)
    expect(entryProblem('keyOverride', { ...entry, replacementKey: parseKeycode('RGB_TOG')! })).toMatch(/can’t send Lights on or off as a replacement/)
    expect(entryProblem('keyOverride', { ...entry, replacementKey: parseKeycode('MO(1)')! })).toMatch(/can’t send/)
    expect(entryProblem('keyOverride', { ...entry, triggerKey: parseKeycode('QK_CAPS_WORD_TOGGLE')! })).toMatch(/only replace an ordinary key/)
  })

  it('leaves the other kinds alone', () => {
    expect(entryProblem('combo', { key1: 0x0d, key2: 0x0e, key3: 0, key4: 0, output: parseKeycode('QK_CAPS_WORD_TOGGLE')! })).toBeNull()
  })
})
