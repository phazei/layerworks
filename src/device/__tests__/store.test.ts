// SPDX-License-Identifier: GPL-3.0-or-later

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { serialize } from '../../vendor/pipette/shared/keycodes/keycodes'
import { keycodeLabel } from '../../vendor/pipette/shared/keycodes/keycodes-utils'
import { createDeviceStore, LOAD_PARTS, type DeviceStore } from '../store'
import { FakeLink, fakeKeyboard, fakeKeyboardConfig, plainDefinition, report } from './fake-keyboard'

const FEATURE_DEFAULT_LAYER = 0x01

function connected(overrides = {}, kind: 'cable' | 'receiver' = 'cable') {
  const config = fakeKeyboardConfig(overrides)
  const link = new FakeLink(kind)
  link.responder = fakeKeyboard(config)
  return { config, link }
}

/** Resolves once the background parts have all been read or given up on. */
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
beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  store = createDeviceStore({ decompress: plainDefinition })
})

describe('connecting', () => {
  it('starts disconnected', () => {
    expect(store.getState()).toMatchObject({ status: 'disconnected', keyboard: null, capabilities: null })
    expect(store.transport).toBeNull()
  })

  it('reads the keyboard and its keymap', async () => {
    const { config, link } = connected()

    await store.connect(link)

    const { status, keyboard, link: info } = store.getState()
    expect(status).toBe('ready')
    expect(info).toEqual({ kind: 'cable', productName: 'Keychron K15 Max', vendorId: 0x3434, productId: 0x0af0 })
    expect(keyboard).toMatchObject({
      name: 'Fake 6',
      uid: '0x0807060504030201',
      viaProtocol: 9,
      vialProtocol: 6,
      layers: 3,
      rows: 2,
      cols: 3,
      knobCount: 1,
      macroCount: 4,
      macroBytes: 40,
      counts: config.counts,
    })
    expect(keyboard?.keymap['0,0,0']).toBe(4)
    expect(keyboard?.keymap['2,1,2']).toBe(config.keymap[2][1][2])
    expect(keyboard?.knobs['1,0,0']).toBe(0x81)
    expect(keyboard?.layout?.keys).toHaveLength(8)
  })

  it('is ready for the keyboard picture before the background parts are in', async () => {
    const { link } = connected()

    await store.connect(link)

    expect(store.getState().loading).toEqual(LOAD_PARTS)
    expect(store.getState().macros).toBeNull()
  })

  it('names the keyboard\'s custom keycodes once connected', async () => {
    const { link } = connected()

    await store.connect(link)

    expect(keycodeLabel(serialize(0x7e00))).toBe('Cst1')
  })

  it('loads through the 2.4 GHz receiver', async () => {
    const { link } = connected({}, 'receiver')

    await store.connect(link)

    expect(store.getState()).toMatchObject({ status: 'ready', link: { kind: 'receiver' } })
    expect(store.getState().keyboard?.keymap['0,0,1']).toBe(5)
  })

  it('reports an error and closes the link when the keyboard does not answer', async () => {
    vi.useFakeTimers()
    const link = new FakeLink()

    const connecting = store.connect(link)
    await vi.advanceTimersByTimeAsync(1000)
    await connecting
    vi.useRealTimers()

    expect(store.getState()).toMatchObject({ status: 'error', keyboard: null })
    expect(store.getState().error).toMatch(/No reply/)
    expect(link.closed).toBe(true)
    expect(store.transport).toBeNull()
  })

  it('notifies subscribers of changes', async () => {
    const { link } = connected()
    const statuses: string[] = []
    store.subscribe(() => statuses.push(store.getState().status))

    await store.connect(link)

    expect(statuses[0]).toBe('connecting')
    expect(statuses).toContain('ready')
  })
})

describe('background loading', () => {
  it('reads macros, entries, settings, lighting and lock state', async () => {
    const { config, link } = connected()

    await store.connect(link)
    await loaded(store)

    const state = store.getState()
    expect(state.loading).toEqual([])
    expect(state.failed).toEqual([])
    expect(state.macros).toEqual(config.macros)
    expect(state.entries?.tapDance.map((e) => e.onTap)).toEqual([1, 2])
    expect(state.entries).toMatchObject({ combo: { length: 1 }, keyOverride: { length: 1 }, altRepeatKey: { length: 1 } })
    expect(Object.keys(state.settings ?? {}).map(Number)).toEqual([2, 7, 18])
    expect(state.settings?.[7][0]).toBe(7)
    expect(state.lighting).toMatchObject({ kind: 'vialrgb', mode: 22, speed: 128, hue: 10, maxBrightness: 200 })
    expect([...(state.lighting?.effects ?? [])].sort((a, b) => a - b)).toEqual([0, 1, 2, 22])
    expect(state.unlock).toEqual({ unlocked: false, inProgress: false, keys: [[0, 0], [1, 2]] })
    expect(state.keychron).toBeNull()
  })

  it('reads Keychron state when the firmware has it', async () => {
    const { link } = connected({ keychron: { protocol: 2, features: FEATURE_DEFAULT_LAYER, firmware: 'v1.1.2' } })

    await store.connect(link)
    await loaded(store)

    expect(store.getState().keychron).toMatchObject({ protocolVersion: 2, firmwareVersion: 'v1.1.2', hasDefaultLayer: true })
  })

  it('marks a part that cannot be read as failed and carries on', async () => {
    const { config, link } = connected()
    const keyboard = fakeKeyboard(config)
    // Tap dance reads report failure (status byte 1).
    link.responder = (request) =>
      request[0] === 0xfe && request[1] === 0x0d && request[2] === 0x01 ? [1] : keyboard(request)

    await store.connect(link)
    await loaded(store)

    const state = store.getState()
    expect(state.failed).toEqual(['entries'])
    expect(state.entries).toBeNull()
    expect(state.settings).not.toBeNull()
    expect(state.loading).toEqual([])
  })
})

describe('capabilities', () => {
  it('are built at connect and filled in as parts arrive', async () => {
    const { link } = connected()

    await store.connect(link)
    const early = store.getState().capabilities
    await loaded(store)
    const caps = store.getState().capabilities

    expect(early).toMatchObject({ vialProtocol: 6, layers: 3, knobs: 1, tapDances: 2, macros: { count: 4, bytes: 40 } })
    expect(early?.check('qmkSettings')).toEqual({ available: false, reason: expect.stringMatching(/reading/) })
    expect(caps?.has('qmkSettings')).toBe(true)
    expect(caps?.hasQmkSetting(18)).toBe(true)
    expect(caps?.hasQmkSetting(3)).toBe(false)
    expect(caps?.has('lighting')).toBe(true)
    expect(caps?.has('capsWord')).toBe(true)
    expect(caps?.keychronProtocol).toBeNull()
    expect(caps?.check('battery')).toEqual({ available: false, reason: 'Needs Keychron firmware.' })
    expect(caps?.hasCommand('ripple')).toBe(false)
  })

  it('say what the firmware lacks', async () => {
    const { link } = connected({
      counts: { tapDance: 0, combo: 0, keyOverride: 0, altRepeatKey: 0, featureFlags: 0 },
      keychron: { protocol: 2, features: FEATURE_DEFAULT_LAYER, firmware: 'v1' },
    })

    await store.connect(link)
    await loaded(store)
    const caps = store.getState().capabilities

    expect(caps?.has('tapDance')).toBe(false)
    expect(caps?.has('capsWord')).toBe(false)
    expect(caps?.has('liveLayer')).toBe(true)
    expect(caps?.check('snapClick')).toEqual({ available: false, reason: expect.stringMatching(/firmware/) })
  })
})

describe('live layer', () => {
  const keychron = { protocol: 2, features: FEATURE_DEFAULT_LAYER, firmware: 'v1' }

  it('starts from the layer the keyboard reports', async () => {
    const { link } = connected({ keychron, layer: { base: 2, held: 0 } })

    await store.connect(link)

    expect(store.getState().layer).toEqual({ base: 2, held: 0, active: 2 })
  })

  it('follows layer pushes', async () => {
    const { link } = connected({ keychron, layer: { base: 2, held: 0 } })
    await store.connect(link)
    await loaded(store)

    link.deliver(report(0xa3, 2, 4))
    expect(store.getState().layer).toEqual({ base: 2, held: 4, active: 4 })
    link.deliver(report(0xa3, 2, 0))
    expect(store.getState().layer?.active).toBe(2)
  })

  it('follows layer pushes through the receiver, where they are not encoded', async () => {
    const { link } = connected({ keychron, layer: { base: 2, held: 0 } }, 'receiver')
    await store.connect(link)
    await loaded(store)

    link.deliver(report(0xa3, 2, 3))

    expect(store.getState().layer?.active).toBe(3)
  })

  it('is null when the firmware does not report a layer', async () => {
    const { link } = connected()

    await store.connect(link)

    expect(store.getState().layer).toBeNull()
  })
})

describe('disconnecting', () => {
  it('resets when the keyboard is unplugged', async () => {
    const { link } = connected()
    await store.connect(link)

    link.drop()

    expect(store.getState()).toMatchObject({ status: 'disconnected', keyboard: null, link: null })
    expect(store.transport).toBeNull()
  })

  it('resets and closes the link on disconnect()', async () => {
    const { link } = connected()
    await store.connect(link)

    await store.disconnect()

    expect(store.getState().status).toBe('disconnected')
    expect(link.closed).toBe(true)
  })

  it('drops the first keyboard when a second one connects', async () => {
    const first = connected()
    const second = connected({ name: 'Second' })
    await store.connect(first.link)

    await store.connect(second.link)
    await loaded(store)

    expect(first.link.closed).toBe(true)
    expect(store.getState().keyboard?.name).toBe('Second')
    expect(store.getState().failed).toEqual([])
  })
})
