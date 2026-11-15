// SPDX-License-Identifier: GPL-3.0-or-later

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { backupText, createBackup } from '../backup'
import { FakeLink, fakeKeyboard, fakeKeyboardConfig, plainDefinition } from '../fake-keyboard'
import { readKeyboardFile } from '../keyboard-file'
import { checkFit, isEmptyPlan, planRestore } from '../restore'
import { createDeviceStore, type DeviceStore } from '../store'
import { exportVil, parseVil, VilError } from '../vil'

/** A real Vial save (a Bento Max), from Pipette's test fixtures. */
const BENTO = readFileSync(join(__dirname, '../../vendor/pipette/renderer/hooks/__tests__/fixtures/bento-max.vil'), 'utf8')

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
  // A macro buffer the way keyboards keep it: the macros, then zeros.
  link.responder = fakeKeyboard(fakeKeyboardConfig({ macros: [0x61, 0x62, 0, 0x63, 0, ...new Array<number>(35).fill(0)] }))
  await store.connect(link)
  await loaded(store)
})

describe('exportVil', () => {
  it('writes what Vial reads: keys by name, knob, macros as actions, settings as numbers', () => {
    const data = JSON.parse(exportVil(store.getState())) as Record<string, unknown>

    expect(data).toMatchObject({ version: 1, vial_protocol: 6, via_protocol: 9, layout_options: 0 })
    expect((data.layout as unknown[][][])[0][0]).toEqual(['KC_A', 'KC_B', 'KC_C'])
    expect(data.encoder_layout).toHaveLength(3)
    expect((data.macro as unknown[][]).slice(0, 3)).toEqual([[['text', 'ab']], [['text', 'c']], []])
    expect(data.macro).toHaveLength(4)
    expect(data.settings).toEqual({ 2: 2, 7: 7, 18: 18 })
    expect((data.tap_dance as unknown[][])[0]).toEqual(['KC_TRNS', 'KC_NO', 'KC_NO', 'KC_NO', 0])
  })

  it('keeps the uid as a number, as Vial writes it', () => {
    expect(exportVil(store.getState())).toMatch(/"uid": 578437695752307201,/)
  })
})

describe('parseVil', () => {
  it('reads back what exportVil wrote, matching the keyboard', () => {
    const { identity, contents } = parseVil(exportVil(store.getState()), 6)

    expect(identity).toMatchObject({ uid: '0x807060504030201', rows: 2, cols: 3 })
    expect(checkFit(identity, store.getState())).toEqual({ fits: true, warnings: [] })
    const plan = planRestore(contents, store.getState(), [])
    expect(isEmptyPlan(plan)).toBe(true)
    expect(plan.ignored).toEqual([])
  })

  it('reads a real Vial file', () => {
    const { identity, contents } = parseVil(BENTO, 6)

    expect(identity).toMatchObject({ uid: '0xFBD8239B8804FAEA', rows: 7, cols: 10 })
    expect(contents.keymap?.['0,0,0']).toBe(0x4f) // KC_RIGHT
    expect(contents.keymap?.['0,4,1']).toBe(0x0157) // LCTL(KC_KP_PLUS)
    expect(contents.keymap).not.toHaveProperty('0,0,4') // -1: no key there
    expect(contents.knobs?.['0,0,0']).toBe(0xaa) // KC_VOLD
    expect(contents.entries?.tapDance).toHaveLength(32)
    expect(contents.settings?.[6]).toEqual([0x88, 0x13]) // 5000
  })

  it('is refused on a keyboard wired differently', () => {
    const { identity } = parseVil(BENTO, 6)
    expect(checkFit(identity, store.getState())).toMatchObject({ fits: false })
  })

  it('says what is wrong with a file that is not a Vial file', () => {
    expect(() => parseVil('{', 6)).toThrow(VilError)
    expect(() => parseVil('{"layout": []}', 6)).toThrow('This file isn’t a Vial file.')
    expect(() => parseVil('{"version": 1, "layout": [1]}', 6)).toThrow(/damaged: its keymap/)
    expect(() => parseVil('{"version": 1, "layout": [[[]]], "macro": [[["beep"]]]}', 6)).toThrow(/macro 0/)
  })
})

describe('readKeyboardFile', () => {
  it('tells a backup from a Vial file', () => {
    const backup = readKeyboardFile(backupText(createBackup(store.getState(), [], new Date(0))), 6)
    const vil = readKeyboardFile(BENTO, 6)

    expect(backup).toMatchObject({ kind: 'backup', savedAt: '1970-01-01T00:00:00.000Z', identity: { name: 'Fake 6' } })
    expect(vil).toMatchObject({ kind: 'vil', savedAt: null, identity: { rows: 7 } })
  })

  it('refuses anything else', () => {
    expect(() => readKeyboardFile('hello', 6)).toThrow(/neither a Layerworks backup nor a Vial file/)
    expect(() => readKeyboardFile('{"a": 1}', 6)).toThrow('This file is neither a Layerworks backup nor a Vial file.')
    expect(() => readKeyboardFile('{"format": "layerworks-backup", "version": 9}', 6)).toThrow(/newer version/)
  })
})
