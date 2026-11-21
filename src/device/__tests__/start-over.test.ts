// SPDX-License-Identifier: GPL-3.0-or-later
// The lock lights, the keymap reset and the restart for a firmware update, on the fake keyboard.

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { backupContents, createBackup } from '../backup'
import { FakeLink, fakeKeyboard, fakeKeyboardConfig, plainDefinition, type FakeKeyboardConfig } from '../fake-keyboard'
import { describePlan, planRestore } from '../restore'
import { createDeviceStore, type DeviceStore } from '../store'

const QK_BOOT = 0x7c00

function newConfig(overrides: Partial<FakeKeyboardConfig> = {}): FakeKeyboardConfig {
  return fakeKeyboardConfig({
    keychron: {
      protocol: 2,
      features: 0x01 | 0x80,
      firmware: 'v1',
      rgb: {
        ledAt: [
          [0, 1, 2],
          [3, 4, 5],
        ],
        colours: Array.from({ length: 6 }, () => [0, 255, 255] as [number, number, number]),
        style: 0,
        regions: [0, 0, 0, 0, 0, 0],
        effects: [[{ effect: 0, hue: 0, sat: 0, speed: 0, time: 0 }]],
        mixedEffect: 25,
      },
    },
    settingDefaults: { 2: [50, 0], 7: [200, 0], 18: [0, 0] },
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

async function connect(c = newConfig(), kind: 'cable' | 'receiver' = 'cable'): Promise<void> {
  config = c
  link = new FakeLink(kind)
  link.responder = fakeKeyboard(config)
  await store.connect(link)
  await loaded(store)
}

const sent = (command: number) => link.requests.filter((r) => r[0] === command).length

beforeEach(async () => {
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  store = createDeviceStore({ decompress: plainDefinition })
  await connect()
})

describe('the lock lights', () => {
  const lights = () => config.keychron!.rgb!.indicators!
  const stateLights = () => store.getState().keychron!.rgb!.osIndicatorConfig!

  it('are read with which lights the keyboard has, and offered when it has one', () => {
    expect(stateLights()).toEqual({ availableMask: 0x02, disableMask: 0, hue: 255, sat: 0, val: 255 })
    expect(store.getState().capabilities!.has('lockLights')).toBe(true)
  })

  it('are not offered without Keychron lighting, or when the keyboard reports no lock light', async () => {
    await connect(fakeKeyboardConfig({ keychron: { protocol: 2, features: 0x01, firmware: 'v1' } }))
    expect(store.getState().capabilities!.check('lockLights')).toMatchObject({ available: false })
    const none = newConfig()
    none.keychron!.rgb!.indicators = { available: 0, disable: 0, hue: 0, sat: 0, val: 255 }
    await connect(none)
    expect(store.getState().capabilities!.has('lockLights')).toBe(false)
  })

  it('change at once, keep the brightness at 128 or more, save after a pause, and undo', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] })
    try {
      expect(await store.setLockLights({ hue: 0, sat: 255 })).toBe(true)
      expect(lights()).toMatchObject({ hue: 0, sat: 255, val: 255, disable: 0 })
      expect(await store.setLockLights({ val: 10 })).toBe(true)
      expect(lights().val).toBe(128)
      expect(stateLights().val).toBe(128)
      expect(config.keychron!.rgb!.saved).toBeUndefined()
      await vi.advanceTimersByTimeAsync(1600)
      expect(config.keychron!.rgb!.saved?.indicators).toMatchObject({ hue: 0, sat: 255, val: 128 })

      expect(await store.setLockLights({ disableMask: 0x02 })).toBe(true)
      expect(lights().disable).toBe(0x02)
      expect(stateLights().availableMask).toBe(0x02)

      // The switch is its own step; the colour changes before it merged into one.
      await store.undo()
      expect(lights().disable).toBe(0)
      expect(lights().val).toBe(128)
      await store.undo()
      expect(lights()).toMatchObject({ hue: 255, sat: 0, val: 255 })
      expect(store.getState().canUndo).toBe(false)
    } finally {
      vi.useRealTimers()
    }
  })

  it('are put back by a restore and named in its plan', async () => {
    const contents = backupContents(JSON.parse(JSON.stringify(createBackup(store.getState(), [], new Date()))))
    expect(contents.lockLights).toEqual({ disableMask: 0, hue: 255, sat: 0, val: 255 })
    config.keychron!.rgb!.indicators = { available: 0x02, disable: 0x02, hue: 85, sat: 255, val: 200 }
    await connect(config)

    const plan = planRestore(contents, store.getState())
    expect(describePlan(plan, []).map((l) => l.text)).toContain('Lock lights: colour and which light up (indicators)')
    const report = await store.restore(plan)
    expect(report.failed).toEqual([])
    expect(report.written).toMatchObject({ lockLights: 1 })
    expect(lights()).toMatchObject({ disable: 0, hue: 255, sat: 0, val: 255 })
    expect(config.keychron!.rgb!.saved?.indicators).toMatchObject({ disable: 0, hue: 255 })
    expect(planRestore(contents, store.getState()).lockLights).toBeNull()
  })
})

describe('reset to defaults', () => {
  async function changeEverything(): Promise<void> {
    await store.assign({ kind: 'key', layer: 1, row: 0, col: 2 }, 0x29)
    await store.assign({ kind: 'knob', layer: 0, knob: 0, direction: 1 }, 0x52)
    await store.setSetting(7, 250)
    const td = { ...store.getState().entries!.tapDance[0], onTap: 0x29, tappingTerm: 300 }
    expect(await store.saveEntry('tapDance', 0, td)).toBe('saved')
  }

  it('puts back the firmware’s keys, knob, settings and entries, keeps the macros, and needs no unlock', async () => {
    const firmwareKeymap = structuredClone(config.keymap)
    const firmwareKnob = structuredClone(config.knob)
    const macros = [...config.macros]
    await changeEverything()
    expect(store.getState().canUndo).toBe(true)
    expect(store.getState().unlock?.unlocked).toBe(false)

    expect(await store.resetKeymap()).toBe(true)

    expect(sent(0x06)).toBe(1)
    expect(sent(0x10)).toBe(0)
    expect(config.keymap).toEqual(firmwareKeymap)
    expect(config.knob).toEqual(firmwareKnob)
    expect(config.macros).toEqual(macros)
    const state = store.getState()
    expect(state.keyboard!.keymap['1,0,2']).toBe(firmwareKeymap[1][0][2])
    expect(state.keyboard!.knobs['0,0,1']).toBe(firmwareKnob[0][1])
    expect(state.settings![7].slice(0, 2)).toEqual([200, 0])
    expect(state.entries!.tapDance[0]).toMatchObject({ onTap: 0, onHold: 0, tappingTerm: 200 })
    expect(state.entries!.keyOverride[0]).toMatchObject({ layers: 0xffff, enabled: false })
    expect(state.macros).toEqual(macros)
    expect(state.loading).toEqual([])
    // Undo can't bring it back.
    expect(state.canUndo).toBe(false)
    expect(state.canRedo).toBe(false)
  })

  it('empties the macros too when asked, locked as well', async () => {
    expect(await store.resetKeymap({ macros: true })).toBe(true)
    expect(sent(0x10)).toBe(1)
    expect(config.macros.every((b) => b === 0)).toBe(true)
    expect(store.getState().macros!.every((b) => b === 0)).toBe(true)
  })

  it('puts back QK_BOOT where the firmware’s keymap has it, while locked', async () => {
    const c = newConfig()
    c.keymap[2][1][2] = QK_BOOT
    await connect(c)
    await store.assign({ kind: 'key', layer: 2, row: 1, col: 2 }, 0x04)
    expect(await store.resetKeymap()).toBe(true)
    expect(store.getState().keyboard!.keymap['2,1,2']).toBe(QK_BOOT)
  })

  it('leaves the lighting and the Keychron settings alone', async () => {
    const before = structuredClone({ rgb: config.rgb, keychron: config.keychron })
    await store.resetKeymap({ macros: true })
    expect({ rgb: config.rgb, keychron: config.keychron }).toEqual(before)
  })
})

describe('restart for a firmware update', () => {
  it('is refused while locked, without sending anything', async () => {
    expect(await store.restartToBootloader()).toBe('locked')
    expect(sent(0x0b)).toBe(0)
    expect(store.getState().status).toBe('ready')
  })

  it('is refused through the receiver', async () => {
    await connect(newConfig({ unlocked: true }), 'receiver')
    expect(await store.restartToBootloader()).toBe('cable-only')
    expect(sent(0x0b)).toBe(0)
  })

  it('restarts the keyboard and ends in the ordinary disconnected state', async () => {
    const jumped = vi.fn()
    await connect(newConfig({ unlocked: true, onBootloaderJump: jumped }))
    await store.setLockLights({ hue: 10 }) // a save waiting for its pause goes out first

    expect(await store.restartToBootloader()).toBe('restarting')

    expect(jumped).toHaveBeenCalledOnce()
    expect(config.keychron!.rgb!.saved?.indicators?.hue).toBe(10)
    expect(store.getState()).toMatchObject({ status: 'disconnected', error: null, keyboard: null, writeError: null })
    expect(link.closed).toBe(true)
    // The keyboard leaving USB afterwards changes nothing.
    link.drop()
    expect(store.getState()).toMatchObject({ status: 'disconnected', error: null })
  })

  it('says so when the firmware has no such command', async () => {
    await connect(newConfig({ unlocked: true, insecure: true }))
    expect(await store.restartToBootloader()).toBe('unsupported')
    expect(store.getState().status).toBe('ready')
  })
})
