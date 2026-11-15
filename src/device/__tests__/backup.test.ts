// SPDX-License-Identifier: GPL-3.0-or-later

import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  BACKUP_FORMAT,
  BackupError,
  backupContents,
  backupFileName,
  backupIdentity,
  backupText,
  createBackup,
  missingParts,
  parseBackup,
} from '../backup'
import { FakeLink, fakeKeyboard, fakeKeyboardConfig, plainDefinition } from '../fake-keyboard'
import { isEmptyPlan, planRestore } from '../restore'
import { createDeviceStore, type DeviceStore } from '../store'

const KEYCHRON = {
  protocol: 2,
  features: 0x01 | 0x04 | 0x20,
  firmware: 'v1.1.2 1970-01-01-00:00:00',
  misc: 0x04 | 0x10,
  lpm: { backlitTime: 600, idleTime: 7200 },
  debounce: { type: 4, time: 5 },
}

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

let store: DeviceStore
beforeEach(async () => {
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  store = createDeviceStore({ decompress: plainDefinition })
  const link = new FakeLink()
  link.responder = fakeKeyboard(fakeKeyboardConfig({ keychron: KEYCHRON }))
  await store.connect(link)
  await loaded(store)
})

const NOW = new Date('2026-11-15T10:30:00Z')

describe('createBackup', () => {
  it('holds the keyboard, everything read from it and the layer names', () => {
    const backup = createBackup(store.getState(), ['', 'My Fn'], NOW)

    expect(backup).toMatchObject({
      format: BACKUP_FORMAT,
      version: 1,
      savedAt: '2026-11-15T10:30:00.000Z',
      keyboard: {
        name: 'Fake 6',
        vendorId: 0x3434,
        productId: 0x0af0,
        uid: '0x0807060504030201',
        rows: 2,
        cols: 3,
        layers: 3,
        knobs: 1,
        firmware: 'v1.1.2 1970-01-01-00:00:00',
      },
      layerNames: ['', 'My Fn', ''],
      layoutOptions: 0,
      lighting: { mode: 22, speed: 128, hue: 10, sat: 255, val: 180 },
      keychron: { wireless: { backlitTime: 600, idleTime: 7200 }, debounce: { type: 4, time: 5 } },
    })
    expect(backup.keymap).toHaveLength(3)
    expect(backup.keymap[1][0]).toEqual([10, 11, 12])
    expect(backup.knobs[2]).toEqual([[0x81, 0x80]])
    expect(backup.macros).toHaveLength(40)
    expect(backup.entries?.tapDance).toHaveLength(2)
    expect(Object.keys(backup.settings ?? {})).toEqual(['2', '7', '18'])
    // Readings that change by themselves are left out.
    expect(backup.keychron?.state).not.toHaveProperty('batteryLevel')
  })

  it('takes the vendor and product from the definition when connected through the receiver', async () => {
    const link = new FakeLink('receiver')
    link.responder = fakeKeyboard(
      fakeKeyboardConfig({
        definition: { name: 'Fake', vendorId: '0x3434', productId: '0x0AF0', matrix: { rows: 2, cols: 3 }, layouts: { keymap: [['0,0']] } },
      }),
    )
    await store.connect(link)
    await loaded(store)

    expect(createBackup(store.getState(), [], NOW).keyboard).toMatchObject({ vendorId: 0x3434, productId: 0x0af0 })
  })

  it('leaves parts that could not be read empty, and says which', async () => {
    const config = fakeKeyboardConfig()
    const keyboard = fakeKeyboard(config)
    const link = new FakeLink()
    link.responder = (r) => (r[0] === 0xfe && r[1] === 0x0d && r[2] === 0x01 ? [1] : keyboard(r))
    await store.connect(link)
    await loaded(store)

    expect(createBackup(store.getState(), [], NOW).entries).toBeNull()
    expect(missingParts(store.getState())).toEqual(['tap dance, combos and the like'])
  })

  it('needs a keyboard', async () => {
    await store.disconnect()
    expect(() => createBackup(store.getState(), [], NOW)).toThrow(/No keyboard/)
  })
})

describe('parseBackup', () => {
  it('reads back what createBackup wrote', () => {
    const backup = createBackup(store.getState(), ['Base'], NOW)

    expect(parseBackup(backupText(backup))).toEqual(backup)
  })

  it('gives contents that already match the keyboard they came from', () => {
    const backup = parseBackup(backupText(createBackup(store.getState(), [], NOW)))

    const plan = planRestore(backupContents(backup), store.getState(), [])

    expect(isEmptyPlan(plan)).toBe(true)
    expect(plan.ignored).toEqual([])
  })

  it('says who the backup is for', () => {
    const backup = createBackup(store.getState(), [], NOW)
    expect(backupIdentity(backup)).toEqual({
      name: 'Fake 6',
      vendorId: 0x3434,
      productId: 0x0af0,
      uid: '0x0807060504030201',
      rows: 2,
      cols: 3,
    })
  })

  const valid = () => JSON.parse(backupText(createBackup(store.getState(), [], NOW))) as Record<string, unknown>
  const error = (data: unknown) => {
    try {
      parseBackup(typeof data === 'string' ? data : JSON.stringify(data))
    } catch (e) {
      expect(e).toBeInstanceOf(BackupError)
      return (e as Error).message
    }
    throw new Error('parsed')
  }

  it('refuses a file that is not JSON', () => {
    expect(error('not { json')).toMatch(/isn’t a Layerworks backup/)
  })

  it('refuses other JSON', () => {
    expect(error({ layout: [] })).toBe('This file isn’t a Layerworks backup.')
  })

  it('refuses a backup from a newer version of the app', () => {
    expect(error({ ...valid(), version: 2 })).toMatch(/newer version of Layerworks \(format 2\)/)
  })

  it('refuses a backup without its version', () => {
    expect(error({ ...valid(), version: 'one' })).toMatch(/damaged: its version/)
  })

  it('refuses a backup that does not say which keyboard it is for', () => {
    expect(error({ ...valid(), keyboard: undefined })).toMatch(/doesn’t say which keyboard/)
  })

  it('says where the keymap is damaged', () => {
    const data = valid()
    ;(data.keymap as unknown[][][])[1][0][2] = 'KC_A'
    expect(error(data)).toBe('The backup file is damaged: layer 1, row 0 of the keymap.')
  })

  it('refuses keycodes out of range', () => {
    const data = valid()
    ;(data.keymap as number[][][])[0][1][0] = 0x10000
    expect(error(data)).toMatch(/layer 0, row 1/)
  })

  it('refuses damaged entries, settings, lighting and timers', () => {
    const entries = valid()
    ;(entries.entries as { combo: object[] }).combo[0] = { key1: 1 }
    expect(error(entries)).toMatch(/combo 0/)

    expect(error({ ...valid(), settings: { 2: [300] } })).toMatch(/typing setting 2/)
    expect(error({ ...valid(), lighting: { mode: 1 } })).toMatch(/the lighting/)
    expect(error({ ...valid(), keychron: { wireless: { backlitTime: -1, idleTime: 60 } } })).toMatch(/wireless timers/)
    expect(error({ ...valid(), macros: [1, 2, 256] })).toMatch(/the macros/)
  })

  it('accepts parts that could not be read', () => {
    const backup = parseBackup(JSON.stringify({ ...valid(), macros: null, entries: null, settings: null, lighting: null, keychron: null }))

    expect(backup).toMatchObject({ macros: null, entries: null, settings: null, lighting: null, keychron: null })
    expect(backupContents(backup)).not.toHaveProperty('macros')
  })
})

describe('backupFileName', () => {
  it('is the keyboard name and the date', () => {
    expect(backupFileName('Keychron K15 Max ANSI Knob RGB (ripple)', new Date(2026, 10, 5))).toBe(
      'keychron-k15-max-ansi-knob-rgb-2026-11-05.layerworks.json',
    )
    expect(backupFileName('???', new Date(2026, 0, 1), '.vil')).toBe('keyboard-2026-01-01.vil')
  })
})
