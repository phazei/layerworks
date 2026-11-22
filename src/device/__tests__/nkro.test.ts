// SPDX-License-Identifier: GPL-3.0-or-later
// N-key rollover: how the capabilities read Keychron's answer (keychron/common/nkro.c: bit 0 on, bit 1 switchable,
// bit 2 adaptive), what the fake keyboard answers, and the palette's NK_* keys with and without it.

import { beforeAll, describe, expect, it } from 'vitest'
import { recreateKeyboardKeycodes } from '../../vendor/pipette/shared/keycodes/keycodes'
import type { KeychronState } from '../../vendor/pipette/shared/types/keychron'
import { buildCapabilities, nkroMode, type CapabilitySources } from '../capabilities'
import { fakeKeyboard, fakeKeyboardConfig } from '../fake-keyboard'
import { isNkroKey, keycodeTitle, keyPalette, parseKeycode } from '../keycodes'
import { groupsFor, paletteFeatures } from '../sendable'

const base: CapabilitySources = {
  viaProtocol: 12,
  vialProtocol: 6,
  layers: 5,
  knobs: 1,
  counts: { tapDance: 0, combo: 0, keyOverride: 0, altRepeatKey: 0, featureFlags: 0 },
  macroCount: 0,
  macroBytes: 0,
  qmkSettings: new Set([21]),
  lighting: null,
  keychron: null,
}
const keychron = (patch: Partial<KeychronState>) => ({ hasNkro: true, nkroEnabled: false, nkroSupported: false, nkroAdaptive: false, ...patch }) as KeychronState

describe('the N-key rollover capability', () => {
  it('is the setting QMK has where there are no Keychron commands', () => {
    expect(nkroMode(base)).toBe('setting')
    expect(buildCapabilities(base).nkro).toBe('setting')
  })

  it('waits while the Keychron part is being read', () => {
    expect(nkroMode({ ...base, keychronPending: true })).toBe('pending')
  })

  it('is done by the keyboard itself where Keychron’s answer says adaptive', () => {
    expect(nkroMode({ ...base, keychron: keychron({ nkroAdaptive: true }) })).toBe('automatic')
    // Even with the on bit (Magic's bit, which the firmware then never reads).
    expect(nkroMode({ ...base, keychron: keychron({ nkroAdaptive: true, nkroEnabled: true }) })).toBe('automatic')
  })

  it('is the setting where it can be switched, or the firmware doesn’t say', () => {
    expect(nkroMode({ ...base, keychron: keychron({ nkroSupported: true }) })).toBe('setting')
    expect(nkroMode({ ...base, keychron: keychron({ hasNkro: false, nkroAdaptive: true }) })).toBe('setting')
  })
})

describe('whether Home lists N-key rollover as available', () => {
  const nkro = (sources: CapabilitySources) => buildCapabilities(sources).check('nkro')

  it('is, where Keychron’s answer reports it, adaptive or switchable', () => {
    expect(nkro({ ...base, keychron: keychron({ nkroAdaptive: true }) }).available).toBe(true)
    expect(nkro({ ...base, keychron: keychron({ nkroSupported: true }), qmkSettings: new Set() }).available).toBe(true)
  })

  it('is, without Keychron commands, where the keyboard lists QMK’s Magic setting (as Typing feel shows it)', () => {
    expect(nkro(base).available).toBe(true)
    expect(buildCapabilities(base).nkro).toBe('setting')
  })

  it('isn’t, without either, and says the firmware lacks it', () => {
    expect(nkro({ ...base, qmkSettings: new Set([7]) })).toEqual({ available: false, reason: 'This keyboard’s firmware doesn’t include it.' })
    expect(nkro({ ...base, keychron: keychron({ hasNkro: false }), qmkSettings: new Set() }).available).toBe(false)
  })

  it('waits while the Keychron part or the settings are being read', () => {
    expect(nkro({ ...base, keychronPending: true })).toMatchObject({ available: false, reason: 'Still reading this from the keyboard.' })
    expect(nkro({ ...base, qmkSettings: null }).available).toBe(false)
  })
})

describe('the fake keyboard’s answer', () => {
  const answer = (nkro: number | undefined, request: number[]) => {
    const config = fakeKeyboardConfig({ keychron: { protocol: 2, features: 0x0200, firmware: 'v1', misc: 0x80, nkro } })
    return fakeKeyboard(config)(Uint8Array.from([...request, ...new Array(32 - request.length).fill(0)]))
  }

  it('answers 0xA7 0x12 as nkro.c does, and refuses to set an adaptive one', () => {
    expect(Array.from(answer(0x04, [0xa7, 0x12]) ?? []).slice(0, 4)).toEqual([0xa7, 0x12, 0, 0x04])
    expect(Array.from(answer(0x04, [0xa7, 0x13, 1]) ?? []).slice(0, 3)).toEqual([0xa7, 0x13, 1])
    expect(Array.from(answer(0x02, [0xa7, 0x13, 1]) ?? []).slice(0, 3)).toEqual([0xa7, 0x13, 0])
    expect(Array.from(answer(undefined, [0xa7, 0x12]) ?? []).slice(0, 3)).toEqual([0xa7, 0x12, 1])
  })
})

describe('the palette’s N-key rollover keys', () => {
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
  const magic = (nkro: 'setting' | 'automatic' | 'pending') =>
    keyPalette(paletteFeatures({ counts: { combo: 1, keyOverride: 1 } }, {}, nkro))
      .find((group) => group.id === 'magic')!
      .keys.map((key) => key.id)

  it('are offered only where they do something', () => {
    expect(magic('setting')).toEqual(expect.arrayContaining(['NK_ON', 'NK_OFF', 'NK_TOGG']))
    expect(magic('automatic').filter((id) => id.startsWith('NK_'))).toEqual([])
    expect(magic('pending').filter((id) => id.startsWith('NK_'))).toEqual([])
    const chord = groupsFor('chordSends', paletteFeatures(null, null, 'automatic')).flatMap((group) => group.keys.map((key) => key.id))
    expect(chord.filter((id) => id.startsWith('NK_'))).toEqual([])
  })

  it('are still named, and typed by their QMK name', () => {
    const code = parseKeycode('NK_TOGG')!
    expect(isNkroKey(code)).toBe(true)
    expect(isNkroKey(parseKeycode('GU_TOGG')!)).toBe(false)
    expect(keycodeTitle(code)).toBe('Any number of keys at once: on or off')
  })
})
