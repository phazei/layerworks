// SPDX-License-Identifier: GPL-3.0-or-later
// The QMK settings catalogue: every setting the firmware can report has an entry, sizes match, values round-trip.

import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import defs from '../../vendor/pipette/shared/qmk-settings-defs.json'
import {
  decodeSetting,
  encodeSetting,
  fieldsOf,
  flagOn,
  formatSetting,
  SETTING_FIELDS,
  SETTING_GROUP_INFO,
  SETTING_GROUPS,
  SETTING_WIDTHS,
  settingValues,
  withFlag,
  withSettingValue,
} from '../settings'

/**
 * The ids vial-qmk's quantum/qmk_settings.c declares (`protos`) with mouse keys on, as on the K15 Max: 1-7, 9-17,
 * 18-27. Id 8 is the tap-hold bit set of older vial-qmk, which Vial still knows.
 */
const FIRMWARE_QSIDS = [1, 2, 3, 4, 5, 6, 7, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27]

interface DefField {
  type: string
  qsid: number
  width?: number
  bit?: number
}
const DEF_FIELDS = (defs as { tabs: { fields: DefField[] }[] }).tabs.flatMap((tab) => tab.fields)

const SOURCE = fileURLToPath(new URL('../../../../vial_qmk/quantum/qmk_settings.c', import.meta.url))

describe('the settings catalogue', () => {
  it('has an entry for every setting the firmware declares', () => {
    const missing = FIRMWARE_QSIDS.filter((qsid) => fieldsOf(qsid).length === 0)
    expect(missing).toEqual([])
  })

  it.skipIf(!existsSync(SOURCE))('knows every id in the firmware source (../vial_qmk, when it is there)', () => {
    const source = readFileSync(SOURCE, 'utf8')
    const declared = [...source.matchAll(/DECLARE_(?:STATIC_)?(?:BIT)?SETTING(?:_NOTIFY)?\((\d+),/g)].map((m) => Number(m[1]))
    expect(declared.sort((a, b) => a - b)).toEqual(FIRMWARE_QSIDS)
  })

  it('has an entry for every setting and switch Vial knows, with the same size', () => {
    for (const def of DEF_FIELDS) {
      expect(SETTING_WIDTHS[def.qsid], `width of ${def.qsid}`).toBe(def.width ?? 1)
      const fields = fieldsOf(def.qsid)
      expect(fields.length, `setting ${def.qsid}`).toBeGreaterThan(0)
      if (def.type === 'boolean' && def.bit !== undefined) {
        const bits = fields.map((f) => (f.control.kind === 'flag' ? f.control.bit : null))
        expect(bits, `setting ${def.qsid} bit ${def.bit}`).toContain(def.bit)
      }
    }
  })

  it('gives every field a unique key, a known group, words, and a range that holds its presets', () => {
    const keys = SETTING_FIELDS.map((f) => f.key)
    expect(new Set(keys).size).toBe(keys.length)
    for (const f of SETTING_FIELDS) {
      expect(SETTING_GROUPS).toContain(f.group)
      expect(f.name.length).toBeGreaterThan(0)
      expect(f.hint.length).toBeGreaterThan(10)
      expect(SETTING_WIDTHS[f.qsid]).toBeDefined()
      if (f.control.kind === 'number') {
        const { min, max } = f.control
        expect(max).toBeLessThanOrEqual(256 ** SETTING_WIDTHS[f.qsid] - 1)
        for (const preset of f.control.presets ?? []) {
          expect(preset.value).toBeGreaterThanOrEqual(min)
          expect(preset.value).toBeLessThanOrEqual(max)
        }
      }
    }
    for (const group of SETTING_GROUPS) {
      expect(SETTING_GROUP_INFO[group].description.length).toBeGreaterThan(10)
      expect(SETTING_FIELDS.some((f) => f.group === group && !f.advanced), `${group} has an everyday setting`).toBe(true)
    }
  })

  it('gives each bit of a setting to one switch only', () => {
    for (const qsid of Object.keys(SETTING_WIDTHS).map(Number)) {
      const bits = fieldsOf(qsid).flatMap((f) => (f.control.kind === 'flag' ? [f.control.bit] : []))
      expect(new Set(bits).size, `setting ${qsid}`).toBe(bits.length)
    }
  })
})

describe('setting values', () => {
  it('decodes and encodes little-endian, as wide as the setting', () => {
    expect(decodeSetting([0x88, 0x13, 7, 7], 2)).toBe(5000)
    expect(decodeSetting([5, 20, 0], 1)).toBe(5) // a byte past the width is the firmware's leftover
    expect(decodeSetting([0x10, 0x02, 0, 0], 4)).toBe(0x210)
    expect(encodeSetting(5000, 2)).toEqual([0x88, 0x13])
    expect(encodeSetting(0x210, 4)).toEqual([0x10, 0x02, 0, 0])
    expect(encodeSetting(1, 1)).toEqual([1])
  })

  it('puts a value in front of the stored bytes and keeps the rest', () => {
    expect(withSettingValue([200, 0, 7, 9], 250, 2)).toEqual([250, 0, 7, 9])
    expect(withSettingValue([], 300, 2)).toEqual([0x2c, 0x01])
  })

  it('switches one bit and leaves the others', () => {
    const noGui = SETTING_FIELDS.find((f) => f.key === 'no-gui')!
    const nkro = SETTING_FIELDS.find((f) => f.key === 'nkro')!
    const swapCtrlGui = SETTING_FIELDS.find((f) => f.key === 'swap-lctl-lgui')!
    expect(withFlag(noGui, 0, true)).toBe(0x10)
    expect(withFlag(noGui, 0x90, false)).toBe(0x80)
    expect(withFlag(swapCtrlGui, 0x10, true)).toBe(0x110)
    expect(flagOn(nkro, 0x90)).toBe(true)
    expect(flagOn(noGui, 0x80)).toBe(false)
    // Switching on what is on changes nothing.
    expect(withFlag(noGui, 0x10, true)).toBe(0x10)
  })

  it('reads a “don’t” bit the right way round', () => {
    const letters = SETTING_FIELDS.find((f) => f.key === 'auto-shift-letters')!
    expect(flagOn(letters, 0)).toBe(true)
    expect(flagOn(letters, 0x10)).toBe(false)
    expect(withFlag(letters, 0x01, false)).toBe(0x11)
    expect(withFlag(letters, 0x11, true)).toBe(0x01)
  })

  it('treats a whole-value switch as 0 or 1', () => {
    const retro = SETTING_FIELDS.find((f) => f.key === 'retro-tapping')!
    expect(withFlag(retro, 0, true)).toBe(1)
    expect(flagOn(retro, 1)).toBe(true)
  })

  it('decodes what the keyboard reported, skipping settings it doesn’t know the size of', () => {
    expect(settingValues({ 7: [200, 0, 7], 5: [5, 5], 99: [1, 2] })).toEqual({ 7: 200, 5: 5 })
    expect(settingValues(null)).toEqual({})
  })

  it('formats values in plain units', () => {
    const term = SETTING_FIELDS.find((f) => f.key === 'tapping-term')!
    const timeout = SETTING_FIELDS.find((f) => f.key === 'one-shot-timeout')!
    const toggle = SETTING_FIELDS.find((f) => f.key === 'one-shot-tap-toggle')!
    expect(formatSetting(term, 200)).toBe('200 ms')
    expect(formatSetting(timeout, 5000)).toBe('5 s')
    expect(formatSetting(timeout, 1500)).toBe('1.5 s')
    expect(formatSetting(timeout, 0)).toBe('Never')
    expect(formatSetting(toggle, 1)).toBe('1 tap')
  })

  it('says what the mouse speeds mean in pixels a second', () => {
    const top = SETTING_FIELDS.find((f) => f.key === 'mouse-max-speed')!
    expect(top.describe?.(20, { 10: 16, 11: 1, 12: 20 })).toBe('About 1,250 pixels a second at top speed.')
  })
})
