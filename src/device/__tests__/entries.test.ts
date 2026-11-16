// SPDX-License-Identifier: GPL-3.0-or-later

import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  ALL_LAYERS,
  chordKeys,
  emptyEntry,
  entriesMatch,
  entryIsEmpty,
  entryProblem,
  modsText,
  OVERRIDE_DEFAULT_OPTIONS,
  withChordKeys,
  type AnyEntry,
  type EntryOf,
} from '../entries'
import { keyPalette } from '../keycodes'
import { FakeLink, fakeKeyboard, fakeKeyboardConfig, plainDefinition, type FakeKeyboardConfig } from '../fake-keyboard'
import { ENTRY_KINDS, type EntryKind } from '../restore'
import { createDeviceStore, ENTRY_UNDO_LOCKED, type DeviceStore } from '../store'

const QK_BOOT = 0x7c00

const SAMPLES: { [K in EntryKind]: EntryOf<K> } = {
  tapDance: { onTap: 0x29, onHold: 0x0104, onDoubleTap: 0x39, onTapHold: 0x7700, tappingTerm: 250 },
  combo: { key1: 0x0d, key2: 0x0e, key3: 0x0f, key4: 0, output: 0x0106 },
  keyOverride: {
    triggerKey: 0x2a,
    replacementKey: 0x4c,
    layers: 0b10101,
    triggerMods: 0x22,
    negativeMods: 0x01,
    suppressedMods: 0x22,
    options: OVERRIDE_DEFAULT_OPTIONS | 0x10,
    enabled: false,
  },
  altRepeatKey: { lastKey: 0x011d, altKey: 0x011c, allowedMods: 0x02, options: 0b111, enabled: true },
}

describe('the entry models', () => {
  it('start empty, with the defaults', () => {
    for (const kind of ENTRY_KINDS) expect(entryIsEmpty(kind, emptyEntry(kind))).toBe(true)
    expect(emptyEntry('tapDance').tappingTerm).toBe(200)
    expect(emptyEntry('keyOverride')).toMatchObject({ layers: ALL_LAYERS, options: OVERRIDE_DEFAULT_OPTIONS, enabled: true })
  })

  it('treat two empty entries as the same, whatever their other fields', () => {
    const read = { onTap: 0, onHold: 0, onDoubleTap: 0, onTapHold: 0, tappingTerm: 0 }
    expect(entriesMatch('tapDance', read, emptyEntry('tapDance'))).toBe(true)
    expect(entriesMatch('tapDance', SAMPLES.tapDance, emptyEntry('tapDance'))).toBe(false)
  })

  it('say what is missing', () => {
    for (const kind of ENTRY_KINDS) expect(entryProblem(kind, SAMPLES[kind] as AnyEntry)).toBeNull()
    expect(entryProblem('combo', { key1: 0x0d, key2: 0, key3: 0, key4: 0, output: 0x29 })).toMatch(/at least two/)
    expect(entryProblem('combo', { key1: 0x0d, key2: 0x0d, key3: 0, key4: 0, output: 0x29 })).toMatch(/twice/)
    expect(entryProblem('combo', { key1: 0x0d, key2: 0, key3: 0x0e, key4: 0, output: 0x29 })).toMatch(/gap/)
    expect(entryProblem('combo', { key1: 0x0d, key2: 0x0e, key3: 0, key4: 0, output: 0 })).toMatch(/what the chord does/)
    expect(entryProblem('tapDance', { ...SAMPLES.tapDance, tappingTerm: 0 })).toMatch(/between 1 and/)
    expect(entryProblem('keyOverride', { ...SAMPLES.keyOverride, replacementKey: 0 })).toMatch(/sent instead/)
    expect(entryProblem('keyOverride', { ...SAMPLES.keyOverride, layers: 0 })).toMatch(/layer/)
    expect(entryProblem('keyOverride', { ...SAMPLES.keyOverride, options: 0 })).toMatch(/way it starts/)
    expect(entryProblem('altRepeatKey', { ...SAMPLES.altRepeatKey, altKey: 0 })).toMatch(/repeat key sends/)
    // An empty entry clears the slot: always fine.
    expect(entryProblem('combo', emptyEntry('combo'))).toBeNull()
  })

  it('pack a chord’s keys to the front', () => {
    expect(withChordKeys(emptyEntry('combo'), [7, 9])).toMatchObject({ key1: 7, key2: 9, key3: 0, key4: 0 })
    expect(chordKeys(SAMPLES.combo)).toEqual([0x0d, 0x0e, 0x0f])
  })

  it('name modifiers plainly, a side only when one is set', () => {
    expect(modsText(0x22)).toBe('Shift')
    expect(modsText(0x11 | 0x04)).toBe('Ctrl + Left Alt')
    expect(modsText(0x80)).toBe('Right Win')
    expect(modsText(0)).toBe('')
  })
})

function loaded(store: DeviceStore): Promise<void> {
  return new Promise((resolve) => {
    const done = () => store.getState().status !== 'ready' || store.getState().loading.length === 0
    if (done()) return resolve()
    const off = store.subscribe(() => {
      if (!done()) return
      off()
      resolve()
    })
  })
}

describe('saving an entry on the fake keyboard', () => {
  let store: DeviceStore
  let config: FakeKeyboardConfig
  let link: FakeLink

  async function connect(): Promise<void> {
    link = new FakeLink()
    link.responder = fakeKeyboard(config)
    await store.connect(link)
    await loaded(store)
  }
  const entryWrites = () => link.requests.filter((r) => r[0] === 0xfe && r[1] === 0x0d && r[2] % 2 === 0 && r[2] > 0)

  beforeEach(async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    store = createDeviceStore({ decompress: plainDefinition })
    config = fakeKeyboardConfig({ counts: { tapDance: 2, combo: 2, keyOverride: 2, altRepeatKey: 2, featureFlags: 3 } })
    await connect()
  })

  it.each(ENTRY_KINDS)('round-trips a %s entry through the keyboard, the others untouched', async (kind) => {
    const others = structuredClone(store.getState().entries!)

    expect(await store.saveEntry(kind, 1, SAMPLES[kind])).toBe('saved')
    expect(store.getState().entries![kind][1]).toEqual(SAMPLES[kind])

    await connect()
    const read = store.getState().entries!
    expect(read[kind][1]).toEqual(SAMPLES[kind])
    expect(read[kind][0]).toEqual(others[kind][0])
    for (const other of ENTRY_KINDS.filter((k) => k !== kind)) expect(read[other]).toEqual(others[other])
  })

  it('offers the multi-tap keys and the repeat keys in the key palette', () => {
    const groups = keyPalette()
    expect(groups.find((g) => g.id === 'tapDance')?.keys.map((k) => k.id)).toEqual(['TD(0)', 'TD(1)'])
    expect(groups.find((g) => g.id === 'repeat')?.keys.map((k) => k.id)).toEqual(['QK_REPEAT_KEY', 'QK_ALT_REPEAT_KEY'])
  })

  it('needs no unlock for ordinary keys', async () => {
    expect(config.unlocked).toBe(false)
    expect(await store.saveEntry('combo', 0, SAMPLES.combo)).toBe('saved')
  })

  it('is not attempted while locked when it holds the firmware-update key, where vial.c checks', async () => {
    link.requests.length = 0
    expect(await store.saveEntry('combo', 0, { ...SAMPLES.combo, output: QK_BOOT })).toBe('locked')
    expect(await store.saveEntry('tapDance', 0, { ...SAMPLES.tapDance, onHold: QK_BOOT })).toBe('locked')
    expect(entryWrites()).toHaveLength(0)
    // A combo's trigger keys aren't checked by the firmware, so they don't need unlocking.
    expect(entryProblem('combo', { ...SAMPLES.combo, key3: QK_BOOT })).toBeNull()
    expect(await store.saveEntry('combo', 0, { ...SAMPLES.combo, key3: QK_BOOT })).toBe('saved')
  })

  it('writes the firmware-update key once unlocked', async () => {
    config.unlocked = true
    await connect()
    expect(await store.saveEntry('combo', 0, { ...SAMPLES.combo, output: QK_BOOT })).toBe('saved')
    await connect()
    expect(store.getState().entries!.combo[0].output).toBe(QK_BOOT)
  })

  it('says when there is nothing to save, or something is missing', async () => {
    const now = store.getState().entries!.combo[0]
    expect(await store.saveEntry('combo', 0, now)).toBe('unchanged')
    expect(await store.saveEntry('combo', 0, { ...SAMPLES.combo, output: 0 })).toBe('invalid')
    expect(await store.saveEntry('combo', 99, SAMPLES.combo)).toBe('invalid')
  })

  it('is one undo step', async () => {
    const before = store.getState().entries!.keyOverride[0]
    await store.saveEntry('keyOverride', 0, SAMPLES.keyOverride)

    await store.undo()
    expect(store.getState().entries!.keyOverride[0]).toEqual(before)
    expect(store.getState()).toMatchObject({ canUndo: false, canRedo: true })
    await store.redo()
    expect(store.getState().entries!.keyOverride[0]).toEqual(SAMPLES.keyOverride)
  })

  it('won’t undo into the firmware-update key while locked', async () => {
    config.unlocked = true
    await connect()
    await store.saveEntry('combo', 0, { ...SAMPLES.combo, output: QK_BOOT })
    await store.saveEntry('combo', 0, SAMPLES.combo)
    await store.lock()

    await store.undo()

    expect(store.getState().writeError).toBe(ENTRY_UNDO_LOCKED)
    expect(store.getState().entries!.combo[0]).toEqual(SAMPLES.combo)
  })
})
