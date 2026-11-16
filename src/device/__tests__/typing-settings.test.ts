// SPDX-License-Identifier: GPL-3.0-or-later
// The store's typing setters on the fake keyboard: QMK settings, their reset, debounce and Snap Click, with undo.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { FakeLink, fakeKeyboard, fakeKeyboardConfig, plainDefinition, type FakeKeyboardConfig } from '../fake-keyboard'
import { createDeviceStore, type DeviceStore } from '../store'

const empty = () => Array.from({ length: 20 }, () => ({ type: 0, key1: 0, key2: 0 }))

function newConfig(overrides: Partial<FakeKeyboardConfig> = {}): FakeKeyboardConfig {
  return fakeKeyboardConfig({
    qsids: [3, 7, 21, 22],
    settingValues: { 3: [0x01], 7: [200, 0], 21: [0, 0, 0, 0], 22: [0] },
    settingDefaults: { 3: [0], 7: [200, 0], 21: [0, 0, 0, 0], 22: [0] },
    keychron: {
      protocol: 2,
      features: 0x01 | 0x20 | 0x40,
      firmware: 'v1',
      misc: 0x04 | 0x08,
      debounce: { type: 4, time: 50 },
      snapClick: empty(),
    },
    ...overrides,
  })
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
let config: FakeKeyboardConfig
let link: FakeLink

async function connect(c = newConfig()): Promise<void> {
  config = c
  link = new FakeLink()
  link.responder = fakeKeyboard(config)
  await store.connect(link)
  await loaded(store)
}

const settingWrites = () => link.requests.filter((r) => r[0] === 0xfe && r[1] === 0x0b)
const value = (qsid: number) => store.getState().settings?.[qsid]

beforeEach(async () => {
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  store = createDeviceStore({ decompress: plainDefinition })
  await connect()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('setSetting', () => {
  it('writes the value little-endian, as wide as the setting, and shows it once the keyboard took it', async () => {
    const written = store.setSetting(7, 300)
    expect(value(7)?.slice(0, 2)).toEqual([200, 0])
    expect(await written).toBe(true)
    expect(config.settingValues?.[7].slice(0, 2)).toEqual([0x2c, 0x01])
    expect(value(7)?.slice(0, 2)).toEqual([0x2c, 0x01])
    expect(store.getState().writing).toBe(0)
  })

  it('writes the bits of a set of switches together', async () => {
    await store.setSetting(21, 0x10 | 0x80)
    expect(config.settingValues?.[21].slice(0, 4)).toEqual([0x90, 0, 0, 0])
  })

  it('sends nothing for a setting the keyboard doesn’t report, or a value too big for it', async () => {
    const before = settingWrites().length
    expect(await store.setSetting(4, 100)).toBe(false)
    expect(await store.setSetting(3, 300)).toBe(false)
    expect(await store.setSetting(7, 200)).toBe(true) // unchanged: nothing to send
    expect(settingWrites()).toHaveLength(before)
  })

  it('reports a refused write and keeps the old value', async () => {
    link.responder = (request) => (request[0] === 0xfe && request[1] === 0x0b ? [1] : fakeKeyboard(config)(request))
    expect(await store.setSetting(7, 250)).toBe(false)
    expect(store.getState().writeError).toMatch(/Failed to set QMK setting 7/)
    expect(value(7)?.slice(0, 2)).toEqual([200, 0])
  })

  it('ends on the last of many quick changes, and undoes them in one step', async () => {
    await Promise.all([210, 220, 230, 240].map((v) => store.setSetting(7, v)))
    expect(config.settingValues?.[7][0]).toBe(240)
    expect(store.getState().canUndo).toBe(true)

    await store.undo()
    expect(config.settingValues?.[7][0]).toBe(200)
    expect(value(7)?.[0]).toBe(200)
    expect(store.getState().canUndo).toBe(false)

    await store.redo()
    expect(config.settingValues?.[7][0]).toBe(240)
  })

  it('keeps changes to different settings, or far apart, as separate steps', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    await store.setSetting(7, 250)
    await store.setSetting(22, 1)
    vi.setSystemTime(Date.now() + 5000)
    await store.setSetting(22, 0)
    await store.undo()
    expect(config.settingValues?.[22][0]).toBe(1)
    await store.undo()
    expect(config.settingValues?.[22][0]).toBe(0)
    await store.undo()
    expect(config.settingValues?.[7][0]).toBe(200)
  })
})

describe('resetSettings', () => {
  it('puts every setting back to the firmware’s defaults and reads them again', async () => {
    await store.setSetting(3, 0x21)
    await store.setSetting(7, 350)
    expect(await store.resetSettings()).toBe(true)
    expect(link.requests.some((r) => r[0] === 0xfe && r[1] === 0x0c)).toBe(true)
    expect(value(3)?.[0]).toBe(0)
    expect(value(7)?.slice(0, 2)).toEqual([200, 0])
  })
})

describe('setDebounce', () => {
  it('writes the type and time, and undo puts them back', async () => {
    expect(await store.setDebounce({ type: 2, time: 20 })).toBe(true)
    expect(config.keychron?.debounce).toEqual({ type: 2, time: 20 })
    expect(store.getState().keychron).toMatchObject({ debounceType: 2, debounceTime: 20 })
    await store.undo()
    expect(config.keychron?.debounce).toEqual({ type: 4, time: 50 })
  })

  it('keeps the asymmetric filter within its 127 ms', async () => {
    await store.setDebounce({ type: 5, time: 200 })
    expect(config.keychron?.debounce).toEqual({ type: 5, time: 127 })
  })

  it('does nothing on a keyboard without it', async () => {
    await connect(newConfig({ keychron: null }))
    expect(await store.setDebounce({ type: 2, time: 20 })).toBe(false)
  })
})

describe('setSnapClick', () => {
  it('sets a pair, saves the table, and undo empties the slot again', async () => {
    expect(store.getState().keychron?.snapClickCount).toBe(20)
    expect(await store.setSnapClick(0, { type: 2, key1: 0x04, key2: 0x07 })).toBe(true)
    expect(config.keychron?.snapClick?.[0]).toEqual({ type: 2, key1: 0x04, key2: 0x07 })
    expect(config.keychron?.snapClickSaved?.[0]).toEqual({ type: 2, key1: 0x04, key2: 0x07 })
    expect(store.getState().keychron?.snapClickEntries[0]).toEqual({ type: 2, key1: 0x04, key2: 0x07 })

    await store.undo()
    expect(config.keychron?.snapClickSaved?.[0]).toEqual({ type: 0, key1: 0, key2: 0 })
  })

  it('sends nothing for a pair that can’t be saved', async () => {
    const before = link.requests.length
    expect(await store.setSnapClick(0, { type: 2, key1: 0x04, key2: 0x04 })).toBe(false)
    expect(await store.setSnapClick(0, { type: 2, key1: 0x04, key2: 0 })).toBe(false)
    expect(await store.setSnapClick(25, { type: 2, key1: 0x04, key2: 0x07 })).toBe(false)
    expect(link.requests.length).toBe(before)
  })
})
