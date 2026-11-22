// SPDX-License-Identifier: GPL-3.0-or-later
// Restore end to end on the fake keyboard: back up, change the keyboard, plan, restore, compare.

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { backupContents, backupText, createBackup, parseBackup } from '../backup'
import { FakeLink, fakeKeyboard, fakeKeyboardConfig, plainDefinition, type FakeKeyboardConfig } from '../fake-keyboard'
import { parseKeycode } from '../keycodes'
import {
  bootKeycode,
  checkFit,
  describePlan,
  isEmptyPlan,
  keyboardIdentity,
  planRestore,
  unlockNeeded,
  type KeyboardContents,
} from '../restore'
import { createDeviceStore, type DeviceStore } from '../store'

const FEATURES = 0x01 | 0x04 | 0x20 // default layer, 2.4 GHz, debounce
const MISC = 0x04 | 0x10 // debounce, wireless timers

function newConfig(overrides: Partial<FakeKeyboardConfig> = {}): FakeKeyboardConfig {
  return fakeKeyboardConfig({
    macros: [0x61, 0x62, 0, 0x63, 0, ...new Array<number>(35).fill(0)],
    keychron: {
      protocol: 2,
      features: FEATURES,
      firmware: 'v1',
      misc: MISC,
      lpm: { backlitTime: 600, idleTime: 7200 },
      debounce: { type: 4, time: 5 },
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

async function connect(c: FakeKeyboardConfig): Promise<void> {
  config = c
  link = new FakeLink()
  link.responder = fakeKeyboard(config)
  await store.connect(link)
  await loaded(store)
}

beforeEach(async () => {
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  store = createDeviceStore({ decompress: plainDefinition })
  await connect(newConfig())
})

/** What the fake keyboard holds, for comparing before and after. */
const snapshot = (c: FakeKeyboardConfig) =>
  structuredClone({
    keymap: c.keymap,
    knob: c.knob,
    macros: c.macros,
    entryBytes: c.entryBytes ?? {},
    settingValues: c.settingValues ?? {},
    rgb: c.rgb,
    lpm: c.keychron?.lpm,
    debounce: c.keychron?.debounce,
    layoutOptions: c.layoutOptions ?? 0,
  })

/** Changes the keyboard behind the store's back, the way another app would, and reads it again. */
async function changeEverything(): Promise<void> {
  config.keymap[0][0][1] = 0x29
  config.keymap[1][1][2] = 0x2a
  config.keymap[2][0][0] = 0x2b
  config.knob[1] = [0x52, 0x51]
  config.macros.splice(0, 3, 0x78, 0x79, 0x7a)
  config.entryBytes = { tapDance: [[0x04, 0, 0x05, 0, 0, 0, 0, 0, 200, 0]], combo: [[1, 0, 2, 0, 0, 0, 0, 0, 3, 0]] }
  config.settingValues = { 7: [99, 0, 0, 0] }
  config.rgb = { ...config.rgb, mode: 13, hue: 40 }
  config.layoutOptions = 1
  if (config.keychron) {
    config.keychron.lpm = { backlitTime: 30, idleTime: 600 }
    config.keychron.debounce = { type: 4, time: 20 }
  }
  await connect(config)
}

const writes = (command: number, sub?: number) =>
  link.requests.filter((r) => r[0] === command && (sub === undefined || r[1] === sub)).length

describe('planning', () => {
  it('lists only what differs, in words', async () => {
    const backup = createBackup(store.getState(), ['', 'Fn'], new Date())
    await changeEverything()

    const plan = planRestore(backupContents(backup), store.getState(), [])
    const lines = describePlan(plan, ['Base', 'Fn', 'Extra'])

    expect(plan.keys).toHaveLength(5)
    expect(lines.map((l) => l.text)).toEqual([
      '3 keys on Base, Fn and Extra',
      '2 knob turns on Fn',
      'Layout options',
      'Macros (all of them are replaced)',
      '1 multi-tap key (tap dance)',
      '1 key chord (combos)',
      '1 typing setting (QMK settings)',
      'Lighting: effect, speed, colour and brightness',
      'Wireless timers: lights off after 10 min, sleep after 2 h',
      'Key bounce filter: 5 ms (debounce)',
      'Layer names (kept in this browser)',
    ])
    expect(lines.find((l) => l.part === 'macros')?.needsUnlock).toBe(true)
    expect(unlockNeeded(plan)).toBe(1)
  })

  it('is empty when the keyboard already matches', () => {
    const backup = createBackup(store.getState(), [], new Date())
    expect(isEmptyPlan(planRestore(backupContents(backup), store.getState(), []))).toBe(true)
  })

  it('names what the keyboard cannot take', () => {
    const contents: KeyboardContents = {
      keymap: { '5,0,0': 4, '0,9,9': 4 },
      entries: { tapDance: [{ onTap: 1, onHold: 0, onDoubleTap: 0, onTapHold: 0, tappingTerm: 200 }, ...Array(2).fill({ onTap: 4, onHold: 0, onDoubleTap: 0, onTapHold: 0, tappingTerm: 200 })] },
      settings: { 2: [2, 0, 0, 0], 99: [1] },
      lighting: { mode: 40, speed: 0, hue: 0, sat: 0, val: 0 },
      wireless: { backlitTime: 2, idleTime: 600 },
    }

    const plan = planRestore(contents, store.getState(), [])

    expect(plan.ignored).toEqual([
      '1 layer beyond the 3 this keyboard has.',
      '1 key this keyboard doesn’t have.',
      '1 multi-tap key (tap dance) beyond the 2 this keyboard has.',
      '1 typing setting (QMK settings) this keyboard doesn’t have.',
      'Lighting: this keyboard doesn’t have the saved effect.',
      'Wireless timers: The lights need at least 5 seconds.',
    ])
  })

  it('compares settings by value, whatever their width in the file', () => {
    // Setting 7 (QS_tapping_term) is 2 bytes wide; a Vial file stores 7 as [7].
    expect(planRestore({ settings: { 7: [7] } }, store.getState(), []).settings).toEqual([])
  })
})

describe('checkFit', () => {
  const identity = () => keyboardIdentity(store.getState())!

  it('accepts a file from this keyboard', () => {
    expect(checkFit(identity(), store.getState())).toEqual({ fits: true, warnings: [] })
  })

  it('refuses a file from another keyboard', () => {
    expect(checkFit({ ...identity(), name: 'Q1', productId: 0x0100 }, store.getState())).toEqual({
      fits: false,
      reason: 'This file was made for “Q1”, a different keyboard from this one.',
    })
  })

  it('refuses a file whose keys are wired differently', () => {
    const fit = checkFit({ ...identity(), vendorId: null, productId: null, rows: 7, cols: 10 }, store.getState())
    expect(fit).toMatchObject({ fits: false, reason: expect.stringMatching(/7 × 10 instead of 2 × 3/) })
  })

  it('warns about the same model on other firmware', () => {
    const fit = checkFit({ ...identity(), uid: '0x1' }, store.getState())
    expect(fit).toMatchObject({ fits: true, warnings: [expect.stringMatching(/different firmware/)] })
  })
})

describe('restoring', () => {
  it('puts the keyboard back as it was, writing only what differs', async () => {
    const before = snapshot(config)
    const backup = parseBackup(backupText(createBackup(store.getState(), [], new Date())))
    config.unlocked = true
    await changeEverything()
    link.requests.length = 0
    const progress: number[] = []

    const plan = planRestore(backupContents(backup), store.getState(), [])
    const report = await store.restore(plan, (p) => progress.push(p.done))

    expect(report).toMatchObject({
      written: { keys: 3, knob: 2, layoutOptions: 1, macros: 1, tapDance: 1, combo: 1, settings: 1, lighting: 1, wireless: 1, debounce: 1 },
      failed: [],
      skipped: [],
      stopped: false,
      undoable: true,
    })
    expect(snapshot(config)).toEqual({
      ...before,
      // The fake keeps written entries and settings as bytes; compare what the keyboard reads back instead.
      entryBytes: expect.anything(),
      settingValues: expect.anything(),
    })
    expect(writes(0x05)).toBe(3)
    expect(writes(0xfe, 0x04)).toBe(2)
    expect(writes(0xfe, 0x0b)).toBe(1)
    expect(progress.at(-1)).toBe(13)

    // Read it all again: nothing left to restore.
    await connect(config)
    expect(isEmptyPlan(planRestore(backupContents(backup), store.getState(), []))).toBe(true)
  })

  it('keeps the store in step with what it wrote', async () => {
    const backup = createBackup(store.getState(), [], new Date())
    config.unlocked = true
    await changeEverything()

    await store.restore(planRestore(backupContents(backup), store.getState(), []))

    expect(isEmptyPlan(planRestore(backupContents(backup), store.getState(), []))).toBe(true)
    expect(store.getState()).toMatchObject({ writing: 0, writeError: null, canUndo: true })
  })

  it('skips what needs unlocking while locked, and says so', async () => {
    const backup = createBackup(store.getState(), [], new Date())
    const boot = bootKeycode()!
    expect(boot).toBe(parseKeycode('0x7C00'))
    await changeEverything()
    const contents = backupContents(backup)
    contents.knobs = { ...contents.knobs, '0,0,1': boot }
    link.requests.length = 0

    const plan = planRestore(contents, store.getState(), [])
    expect(unlockNeeded(plan)).toBe(2)
    const report = await store.restore(plan)

    expect(report.skipped).toEqual([
      { part: 'knob', what: 'layer 0, knob 0 right' },
      { part: 'macros', what: 'macro memory' },
    ])
    expect(report.written).toMatchObject({ keys: 3, knob: 2, tapDance: 1 })
    expect(writes(0x0f)).toBe(0)
    expect(config.knob[0][1]).toBe(0x80)
    expect(config.macros.slice(0, 3)).toEqual([0x78, 0x79, 0x7a])
  })

  it('writes the firmware-update key once unlocked', async () => {
    config.unlocked = true
    await connect(config)
    const boot = bootKeycode()!

    const report = await store.restore(planRestore({ knobs: { '0,0,1': boot } }, store.getState(), []))

    expect(report.written).toEqual({ knob: 1 })
    expect(config.knob[0][1]).toBe(boot)
  })

  it('reports a write that fails and carries on with the rest', async () => {
    const backup = createBackup(store.getState(), [], new Date())
    config.unlocked = true
    await changeEverything()
    const keyboard = fakeKeyboard(config)
    // The keyboard refuses QMK setting 7.
    link.responder = (r) => (r[0] === 0xfe && r[1] === 0x0b && r[2] === 7 ? [1] : keyboard(r))

    const report = await store.restore(planRestore(backupContents(backup), store.getState(), []))

    expect(report.failed).toEqual([{ part: 'settings', what: 'setting 7', error: 'Failed to set QMK setting 7' }])
    expect(report.written).toMatchObject({ lighting: 1, wireless: 1, debounce: 1 })
    expect(store.getState().writeError).toBeNull()
  })

  it('stops when the keyboard goes away', async () => {
    const backup = createBackup(store.getState(), [], new Date())
    await changeEverything()
    const keyboard = fakeKeyboard(config)
    let keys = 0
    link.responder = (r) => {
      if (r[0] === 0x05 && ++keys === 2) {
        queueMicrotask(() => link.drop())
        return null
      }
      return keyboard(r)
    }

    const report = await store.restore(planRestore(backupContents(backup), store.getState(), []))

    expect(report.stopped).toBe(true)
    expect(report.written).toEqual({ keys: 1 })
  })

  it('takes the key and knob changes back in one undo', async () => {
    const backup = createBackup(store.getState(), [], new Date())
    await changeEverything()
    const changed = snapshot(config)

    await store.restore(planRestore(backupContents(backup), store.getState(), []))
    await store.undo()

    expect(config.keymap).toEqual(changed.keymap)
    expect(config.knob).toEqual(changed.knob)
    expect(store.getState()).toMatchObject({ canUndo: false, canRedo: true })
    // Lighting is not part of undo.
    expect(config.rgb.mode).toBe(22)
  })

  it('leaves the keyboard running the lighting the store shows', async () => {
    // A backup taken on effect 39 at half speed.
    await store.setLighting({ mode: 39, speed: 128, hue: 20 })
    const backup = createBackup(store.getState(), [], new Date())
    // Then effect 13 at full speed, saved on the keyboard.
    await store.setLighting({ mode: 13, speed: 255, hue: 200 })
    config.rgbSaved = { ...config.rgb }

    await store.restore(planRestore(backupContents(backup), store.getState(), []))
    const rgb = () => {
      const { mode, speed, hue, sat, val } = store.getState().lighting!
      return { mode, speed, hue, sat, val }
    }
    expect(config.rgb).toEqual(rgb())
    expect(config.rgbSaved).toEqual(rgb())

    // Back to effect 13: it runs at the speed shown, not the one saved before the restore.
    await store.setLighting({ mode: 13 })
    expect(config.rgb).toEqual(rgb())
    expect(config.rgb).toMatchObject({ mode: 13, speed: 128, hue: 20 })
  })

  it('sets the wireless timers on their own', async () => {
    await store.setWirelessTimers({ backlitTime: 120, idleTime: 1800 })

    expect(config.keychron?.lpm).toEqual({ backlitTime: 120, idleTime: 1800 })
    expect(store.getState().keychron).toMatchObject({ wirelessBacklitTime: 120, wirelessIdleTime: 1800 })
  })

  it('refuses wireless timers the keyboard would refuse', async () => {
    await store.setWirelessTimers({ backlitTime: 3600, idleTime: 600 })

    expect(config.keychron?.lpm).toEqual({ backlitTime: 600, idleTime: 7200 })
    expect(store.getState().writeError).toMatch(/before the keyboard sleeps/)
  })
})
