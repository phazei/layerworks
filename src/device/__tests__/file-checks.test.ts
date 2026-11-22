// SPDX-License-Identifier: GPL-3.0-or-later
// Damaged, hostile or foreign files: refused, or their bad parts left out, before anything is written; and what a
// restore would cause that needs saying first.

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { backupText, createBackup, parseBackup } from '../backup'
import { FakeLink, fakeKeyboard, fakeKeyboardConfig, plainDefinition, type FakeKeyboardConfig } from '../fake-keyboard'
import { readKeyboardFile } from '../keyboard-file'
import { parseKeycode } from '../keycodes'
import { encodeMacro } from '../macros'
import { checkFit, planItems, planRestore, planRisks, type KeyboardContents } from '../restore'
import { createDeviceStore, type DeviceStore } from '../store'
import { exportVil } from '../vil'

let store: DeviceStore
let config: FakeKeyboardConfig

beforeEach(async () => {
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  store = createDeviceStore({ decompress: plainDefinition })
  config = fakeKeyboardConfig({ unlocked: true })
  const link = new FakeLink()
  link.responder = fakeKeyboard(config)
  await store.connect(link)
  await new Promise<void>((resolve) => {
    const done = () => store.getState().loading.length === 0
    if (done()) return resolve()
    const off = store.subscribe(() => done() && (off(), resolve()))
  })
})

const name = (layer: number) => `Layer ${layer}`
const vilWith = (change: (v: Record<string, unknown> & { layout: unknown[][][] }) => void) => {
  const text = exportVil(store.getState())
  // Edit the parsed file, but keep the uid as written (it is bigger than a JavaScript number).
  const v = JSON.parse(text)
  change(v)
  return JSON.stringify(v).replace(/"uid":\s*[\d.e+]+/, text.match(/"uid":\s*\d+/)![0])
}

describe('Vial file values', () => {
  it.each([
    ['a keycode over 16 bits', 70000],
    ['a negative keycode', -5],
    ['a fraction', 4.7],
    ['an object', { a: 1 }],
  ])('refuses %s before anything is written, saying where', (_, value) => {
    expect(() => readKeyboardFile(vilWith((v) => (v.layout[0][0][0] = value as never)), 6)).toThrow(/layer 0, row 1, column 1/)
  })

  it('refuses a tapping term past 16 bits, and settings that aren’t numbers', () => {
    expect(() => readKeyboardFile(vilWith((v) => (v.tap_dance = [['KC_A', 'KC_B', 'KC_NO', 'KC_NO', 1e9]])), 6)).toThrow(/tapping term/)
    expect(() => readKeyboardFile(vilWith((v) => (v.settings = { 7: 'abc' })), 6)).toThrow(/typing setting 7/)
    expect(() => readKeyboardFile(vilWith((v) => (v.layout_options = 'abc')), 6)).toThrow(/layout options/)
  })

  it('leaves alone, and says so, keys named by names this keyboard doesn’t know', () => {
    const file = readKeyboardFile(vilWith((v) => (v.layout[1][0][0] = 'KC_BANANA')), 6)
    const plan = planRestore(file.contents, store.getState(), [])

    expect(plan.keys.some((k) => k.slot.kind === 'key' && k.slot.layer === 1 && k.slot.row === 0 && k.slot.col === 0)).toBe(false)
    expect(plan.ignored.join(' ')).toMatch(/KC_BANANA/)
  })
})

describe('backup values', () => {
  it('refuses lighting values past a byte', () => {
    const backup = JSON.parse(backupText(createBackup(store.getState(), [], new Date())))
    backup.lighting = { mode: 22, speed: 999, hue: 0, sat: 0, val: 0 }
    expect(() => parseBackup(JSON.stringify(backup))).toThrow(/lighting/)
  })

  it('leaves out a setting far outside what it takes (a 65-second tapping term), saying which', () => {
    // QMK setting 7 is the tapping term (ms).
    const plan = planRestore({ settings: { 7: [0xff, 0xff] } }, store.getState(), [])
    expect(plan.settings).toEqual([])
    expect(plan.ignored.join(' ')).toMatch(/65535 ms is far outside/)
  })
})

describe('what a restore would cause', () => {
  it('names the firmware update key and the memory-wiping key', () => {
    const contents: KeyboardContents = {
      keymap: { '0,0,0': parseKeycode('QK_BOOT')!, '0,0,1': parseKeycode('QK_CLEAR_EEPROM')! },
    }
    const risks = planRisks(planRestore(contents, store.getState(), []), store.getState(), name)
    expect(risks.map((r) => r.kind)).toEqual(['boot', 'wipe'])
  })

  it('says when a layer would no longer be reached', () => {
    // Layer 0 reaches layer 1 through MO(1) on one key; the file takes it away.
    config.keymap[0][1][0] = parseKeycode('MO(1)')!
    const state = store.getState()
    const kb = { ...state.keyboard!, keymap: { ...state.keyboard!.keymap, '0,1,0': parseKeycode('MO(1)')! } }
    const withMo = { ...state, keyboard: kb }
    const risks = planRisks(planRestore({ keymap: { '0,1,0': 0x04 } }, withMo, []), withMo, name)
    expect(risks.map((r) => r.text)).toContain('No key on Layer 0 would reach Layer 1 any more.')
  })

  it('lists every key and macro that changes, for the review', () => {
    const contents: KeyboardContents = {
      keymap: { '1,0,2': 0x29 },
      macros: [...encodeMacro([{ kind: 'text', text: 'hi' }], 6), 0, ...new Array<number>(37).fill(0)],
    }
    const items = planItems(planRestore(contents, store.getState(), []), store.getState(), name)
    expect(items.find((p) => p.part === 'keys')?.items).toEqual([expect.stringMatching(/^Layer 1, row 1, column 3: .+ → Esc/)])
    expect(items.find((p) => p.part === 'macros')?.items[0]).toMatch(/^Macro 0: “hi”/)
  })
})

describe('macro memory from a file', () => {
  it('is not restored when a macro runs another macro (a macro running itself locks the keyboard up)', () => {
    const selfCalling = encodeMacro([{ kind: 'tap', key: parseKeycode('QK_MACRO_0') ?? parseKeycode('M0')! }], 6)
    const plan = planRestore({ macros: [...selfCalling, 0] }, store.getState(), [])
    expect(plan.macros).toBeNull()
    expect(plan.ignored.join(' ')).toMatch(/Macro 0 runs another macro/)
  })
})
