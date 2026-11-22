// SPDX-License-Identifier: GPL-3.0-or-later
// Other keyboards the demo can stand in for, chosen with `?demo-keyboard=<name>`: a developer option, so the app can
// be looked at on keyboards that differ from the K15 Max (no knob or several, layout options, another lighting, no
// name …). Each comes from ./keyboards/<name>.json, written by scripts/demo-keyboards.mjs from vial-qmk: the Vial
// definition (vial-qmk's data, GPL-2.0-or-later), the keyboard's USB identity, where its keys are, and what its
// firmware has. The files are loaded only when asked for, so they cost the app nothing otherwise. The keymap is made
// up here: ordinary keys in order on layer 0, Fn (MO 1) on the last key, the rest of the layers transparent.

import type { FakeKeyboardConfig, FakeKeychron } from '../device/fake-keyboard'

/** One file in ./keyboards (scripts/demo-keyboards.mjs). */
export interface DemoKeyboardFile {
  /** What it shows that the K15 Max doesn't. */
  shows: string
  /** Where the definition comes from. */
  source: string
  usb: { vendorId: number; productId: number; productName: string }
  /** Every key's (row, col), once each. */
  keys: [number, number][]
  /** The knobs' indices. */
  knobs: number[]
  firmware: {
    vialProtocol: number
    uid: number[] | null
    layers: number
    unlockKeys: [number, number][]
    insecure: boolean
    knobMap: boolean
    entries: { tapDance: number; combo: number; keyOverride: number; altRepeatKey: number }
    capsWord: boolean
    layerLock: boolean
    qmkSettings: boolean
    vialrgb: boolean
    keychron: boolean
  }
  definition: { name?: string; matrix: { rows: number; cols: number } } & Record<string, unknown>
}

const FILES = import.meta.glob<DemoKeyboardFile>('./keyboards/*.json', { import: 'default' })
const nameOf = (path: string) => path.replace(/^.*\/(.+)\.json$/, '$1')

/** The names `?demo-keyboard=` takes. */
export const DEMO_KEYBOARDS: readonly string[] = Object.keys(FILES).map(nameOf).sort()

/** Loads one of them; null for a name there is none of. */
export async function loadDemoKeyboard(name: string): Promise<DemoKeyboardFile | null> {
  const load = Object.entries(FILES).find(([path]) => nameOf(path) === name)?.[1]
  return load ? load() : null
}

/** Ordinary keys in the order of a US keyboard, handed out to the keys in turn (HID usages, QMK's basic keycodes). */
const KEYS = [
  0x29, 0x1e, 0x1f, 0x20, 0x21, 0x22, 0x23, 0x24, 0x25, 0x26, 0x27, 0x2d, 0x2e, 0x2a,
  0x2b, 0x14, 0x1a, 0x08, 0x15, 0x17, 0x1c, 0x18, 0x0c, 0x12, 0x13, 0x2f, 0x30, 0x31,
  0x39, 0x04, 0x16, 0x07, 0x09, 0x0a, 0x0b, 0x0d, 0x0e, 0x0f, 0x33, 0x34, 0x28,
  0xe1, 0x1d, 0x1b, 0x06, 0x19, 0x05, 0x11, 0x10, 0x36, 0x37, 0x38, 0xe5,
  0xe0, 0xe3, 0xe2, 0x2c, 0xe6, 0xe7, 0x65, 0xe4,
  0x3a, 0x3b, 0x3c, 0x3d, 0x3e, 0x3f, 0x40, 0x41, 0x42, 0x43, 0x44, 0x45,
  0x49, 0x4a, 0x4b, 0x4c, 0x4d, 0x4e, 0x52, 0x50, 0x51, 0x4f,
  0x53, 0x54, 0x55, 0x56, 0x5f, 0x60, 0x61, 0x57, 0x5c, 0x5d, 0x5e, 0x59, 0x5a, 0x5b, 0x58, 0x62, 0x63,
]
const KC_TRNS = 0x01
/** MO(1) in Vial protocol 6 (QK_MOMENTARY), and before it. */
const fnKey = (protocol: number) => (protocol >= 6 ? 0x5221 : 0x5101)
const KC_VOLD = 0xaa
const KC_VOLU = 0xa9

/** Keychron's commands as a Keychron board of this kind answers them, on the cable: the K15 Max's set, its LEDs. */
function keychronFor(file: DemoKeyboardFile, vialrgb: boolean): FakeKeychron {
  const { rows, cols } = file.definition.matrix
  const ledAt = Array.from({ length: rows }, () => new Array<number>(cols).fill(0xff))
  file.keys.forEach(([row, col], led) => (ledAt[row][col] = led))
  const leds = file.keys.length
  return {
    protocol: 2,
    features: 0x01 | 0x20 | 0x40 | (vialrgb ? 0x80 : 0) | 0x0200,
    firmware: 'demo',
    misc: 0x04 | 0x08 | 0x80,
    nkro: 0x04,
    debounce: { type: 4, time: 5 },
    snapClick: Array.from({ length: 20 }, () => ({ type: 0, key1: 0, key2: 0 })),
    rgb: vialrgb
      ? {
          ledAt,
          colours: Array.from({ length: leds }, () => [170, 255, 255] as [number, number, number]),
          style: 0,
          regions: new Array<number>(leds).fill(0),
          effects: [0, 1].map(() => Array.from({ length: 5 }, () => ({ effect: 0, hue: 0, sat: 0, speed: 0, time: 0 }))),
          mixedEffect: 25,
        }
      : undefined,
  }
}

/**
 * The fake keyboard's settings for one of these keyboards. `settings` are the QMK settings to report where its
 * firmware has them (the demo's own), with their values.
 */
export function demoKeyboardConfig(file: DemoKeyboardFile, settings: Record<number, number[]>): Partial<FakeKeyboardConfig> {
  const fw = file.firmware
  const { rows, cols } = file.definition.matrix
  const keymap = Array.from({ length: fw.layers }, (_, layer) =>
    Array.from({ length: rows }, () => new Array<number>(cols).fill(layer === 0 ? 0 : KC_TRNS)),
  )
  file.keys.forEach(([row, col], i) => (keymap[0][row][col] = KEYS[i % KEYS.length]))
  if (fw.layers > 1 && file.keys.length > 1) {
    const [row, col] = file.keys[file.keys.length - 1]
    keymap[0][row][col] = fnKey(fw.vialProtocol)
  }
  const knobCount = file.knobs.length ? Math.max(...file.knobs) + 1 : 0
  const knobs = Array.from({ length: fw.layers }, (_, layer) =>
    Array.from({ length: knobCount }, () => (layer === 0 ? [KC_VOLD, KC_VOLU] : [KC_TRNS, KC_TRNS]) as [number, number]),
  )
  const qsids = fw.qmkSettings ? Object.keys(settings).map(Number) : []
  return {
    definition: file.definition,
    uid: fw.uid ?? [1, 2, 3, 4, 5, 6, 7, 8],
    vialProtocol: fw.vialProtocol,
    layers: fw.layers,
    rows,
    cols,
    keymap,
    knob: knobs.map((layer) => layer[0] ?? [KC_TRNS, KC_TRNS]),
    knobs,
    knobMap: fw.knobMap,
    insecure: fw.insecure,
    counts: { ...fw.entries, featureFlags: (fw.capsWord ? 0x01 : 0) | (fw.layerLock ? 0x02 : 0) },
    macroCount: 16,
    macros: new Array<number>(512).fill(0),
    qsids,
    settingValues: structuredClone(Object.fromEntries(qsids.map((id) => [id, settings[id]]))),
    settingDefaults: Object.fromEntries(qsids.map((id) => [id, settings[id]])),
    keychron: fw.keychron ? keychronFor(file, fw.vialrgb) : null,
    layer: { base: 0, held: 0 },
    rgb: { mode: 6, speed: 128, hue: 170, sat: 255, val: 200 },
    unlockKeys: fw.insecure ? [] : fw.unlockKeys,
    unlocked: fw.insecure,
  }
}
