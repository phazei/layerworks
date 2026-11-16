// SPDX-License-Identifier: GPL-3.0-or-later
// Demo mode: a K15 Max that exists only in the page, for trying the app with no keyboard attached. It answers
// the same requests the real one does, and remembers changes until the page is reloaded. The keys of whatever
// keyboard the visitor types on stand in for its switches: holding Esc and Enter holds the demo's unlock keys.

import { FakeLink, fakeKeyboard, fakeKeyboardConfig, report } from '../device/fake-keyboard'
import type { HidLink } from '../device/link'
import { encodeMacro, type MacroStep } from '../device/macros'
import { browserEventFor, usageOf } from '../shell/pressed-keys'
import data from './k15-max.json'

const WINDOWS_LAYER = 2

/** Example macros, so the Shortcuts page has something to show (the keyboard's real buffer is empty). */
const DEMO_MACROS: MacroStep[][] = [
  [{ kind: 'text', text: 'hello@example.com' }],
  // Ctrl+A, then Ctrl+C: copy everything.
  [{ kind: 'tap', key: 0x0104 }, { kind: 'wait', ms: 50 }, { kind: 'tap', key: 0x0106 }],
  // Win+R, wait for the Run box, type notepad, Enter.
  [{ kind: 'tap', key: 0x0815 }, { kind: 'wait', ms: 300 }, { kind: 'text', text: 'notepad' }, { kind: 'tap', key: 0x28 }],
]
const DEMO_MACRO_BYTES = 926

function demoMacros(): number[] {
  const buffer = DEMO_MACROS.flatMap((steps) => [...encodeMacro(steps, 6), 0])
  return [...buffer, ...new Array<number>(DEMO_MACRO_BYTES - buffer.length).fill(0)]
}

/**
 * Vial protocol 6 keycodes put on the demo's keymap so the Shortcuts page shows its examples in use: M0 on Fn + P,
 * TD(0) on Fn + Caps Lock (Windows layers), and the alternate repeat key on Fn2 + Space.
 */
const M0 = 0x7700
const TD0 = 0x5700
const ALT_REPEAT = 0x7c7a
function withMacroKey(keymap: number[][][]): number[][][] {
  keymap[WINDOWS_LAYER + 1][2][11] = M0
  keymap[WINDOWS_LAYER + 1][3][1] = TD0
  keymap[4][5][5] = ALT_REPEAT
  return keymap
}

const le16 = (v: number) => [v & 0xff, v >> 8]
const CTRL = 0x0100
const SHIFT_EITHER = 0x22
const KO_ENABLED = 0x80
const AREP_ENABLED = 0x08

/**
 * Example entries, as the keyboard stores them (vial.h's structs, little-endian), one or two of each kind:
 * multi-tap keys Esc / Caps Lock and copy / paste; key chords J + K → Esc and D + F → Tab; Shift + Backspace →
 * Delete and Shift + Esc → ~; after Ctrl + Z the repeat key sends Ctrl + Y, and after Home, End.
 */
const DEMO_ENTRIES = {
  tapDance: [
    [...le16(0x29), ...le16(0), ...le16(0x39), ...le16(0), ...le16(200)],
    [...le16(CTRL | 0x06), ...le16(CTRL | 0x19), ...le16(0), ...le16(0), ...le16(200)],
  ],
  combo: [
    [...le16(0x0d), ...le16(0x0e), ...le16(0), ...le16(0), ...le16(0x29)],
    [...le16(0x07), ...le16(0x09), ...le16(0), ...le16(0), ...le16(0x2b)],
  ],
  keyOverride: [
    [...le16(0x2a), ...le16(0x4c), ...le16(0xffff), SHIFT_EITHER, 0, SHIFT_EITHER, KO_ENABLED | 0b111],
    [...le16(0x29), ...le16(0x35), ...le16(0xffff), SHIFT_EITHER, 0, 0, KO_ENABLED | 0b111],
  ],
  altRepeatKey: [
    [...le16(CTRL | 0x1d), ...le16(CTRL | 0x1c), 0, AREP_ENABLED],
    [...le16(0x4a), ...le16(0x4d), 0, AREP_ENABLED | 0x02],
  ],
}
/** Unused slots: all zero. */
const demoEntries = () =>
  Object.fromEntries(
    Object.entries(DEMO_ENTRIES).map(([kind, list]) => [
      kind,
      Array.from({ length: 16 }, (_, i) => [...(list[i] ?? new Array<number>(10).fill(0))]),
    ]),
  )

/** The plain demo's Keychron commands: the default layer only. */
const DEMO_KEYCHRON = { protocol: 2, features: 0x01, firmware: 'demo' }

/**
 * `?demo-wireless`: the K15 Max's Keychron commands as far as the demo answers them: default layer, Bluetooth,
 * 2.4 GHz, layer notices and debounce (`0xA2`), debounce and wireless timers in the misc group (`0xA7 0x01`), with
 * the firmware's default timers, 10 min and 2 h, and a battery level (../docs/research/k15-firmware-capabilities.md
 * section 3). Its version string is the real one's, with the date SKIP_VERSION leaves.
 */
const K15_KEYCHRON = {
  protocol: 2,
  features: 0x01 | 0x02 | 0x04 | 0x10 | 0x20,
  firmware: 'v1.1.2 1970-01-01-00:00:00',
  misc: 0x04 | 0x10,
  lpm: { backlitTime: 600, idleTime: 7200 },
  debounce: { type: 4, time: 5 },
  battery: 76,
}

/**
 * The VialRGB effects the K15 Max's Vial build lists (Off left out): the animations its keyboard.json enables,
 * Solid Color, VialRGB Direct, and Keychron's Per-Key and Mixed RGB (../docs/research/k15-firmware-capabilities.md
 * section 5.2).
 */
const K15_RGB_EFFECTS = [1, 2, 6, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 25, 29, 30, 31, 34, 38, 39, 41, 43, 48, 49]

/** The firmware's defaults after a reset: Solid Splash in indigo (the ripple keymap's config.h). */
const K15_RGB = { mode: 41, speed: 128, hue: 184, sat: 255, val: 255 }

/** The ripple keymap's VIAL_UNLOCK_COMBO_ROWS / _COLS: Esc and Enter. */
const K15_UNLOCK_KEYS: [number, number][] = [
  [0, 1],
  [3, 14],
]

const params = () => new URLSearchParams(typeof location === 'undefined' ? '' : location.search)

/** `?demo-effect=<VialRGB id>` starts the demo on another effect, e.g. for screenshots. */
function startEffect(): number | null {
  const value = Number(params().get('demo-effect') ?? NaN)
  return Number.isInteger(value) && value >= 0 ? value : null
}

/**
 * `?demo-press=0,1;2,3+2,4` presses keys on the demo by itself, for screenshots: from a second after connecting,
 * each step (keys joined by "+" go down together) is held for a moment in turn, and the last stays held.
 */
export function parsePressScript(text: string): string[][] {
  return text
    .split(';')
    // An unescaped "+" arrives as a space.
    .map((step) => step.split(/[+ ]/).filter((key) => /^\d+,\d+$/.test(key)))
    .filter((step) => step.length > 0)
}

const PRESS_START_MS = 1000
const PRESS_STEP_MS = 150

export interface DemoLink extends HidLink {
  /** Pretends a layer key is held (0 for none), the way the keyboard reports it. */
  holdLayer(layer: number): void
  /** Pretends a physical key ("row,col") is down or up. */
  setKey(position: string, down: boolean): void
  /** Pretends the keyboard was unplugged. */
  drop(): void
}

export function createDemoLink(): DemoLink {
  // `?demo-wireless`: the demo is reached through the 2.4 GHz receiver and reports its battery, as the real one
  // does only when wireless.
  const wireless = params().has('demo-wireless')
  const config = fakeKeyboardConfig({
    name: `${data.definition.name} (demo)`,
    definition: data.definition,
    layers: data.keymap.length,
    rows: data.definition.matrix.rows,
    cols: data.definition.matrix.cols,
    keymap: withMacroKey(structuredClone(data.keymap)),
    knob: structuredClone(data.knob) as [number, number][],
    counts: { tapDance: 16, combo: 16, keyOverride: 16, altRepeatKey: 16, featureFlags: 0x03 },
    entryBytes: demoEntries(),
    macroCount: 16,
    macros: demoMacros(),
    // A copy: the fake keyboard keeps what is written in it.
    keychron: { ...(wireless ? K15_KEYCHRON : DEMO_KEYCHRON) },
    layer: { base: WINDOWS_LAYER, held: 0 },
    rgb: { ...K15_RGB, mode: startEffect() ?? K15_RGB.mode },
    rgbEffects: K15_RGB_EFFECTS,
    rgbMaxBrightness: 255,
    unlockKeys: K15_UNLOCK_KEYS,
    // `?demo-unlocked` starts the demo unlocked, e.g. for screenshots of the Test page reading every key.
    unlocked: params().has('demo-unlocked'),
  })
  const link = new FakeLink(wireless ? 'receiver' : 'cable')
  link.responder = fakeKeyboard(config)

  const setKey = (position: string, down: boolean) => {
    if (down) config.held.add(position)
    else config.held.delete(position)
  }

  /** The physical key that types a browser key code: the first one sending it on the base layer, else layer 0. */
  const positionOf = (code: string): string | null => {
    const usage = usageOf(code)
    if (usage === undefined) return null
    for (const layer of [config.layer.base, 0]) {
      for (let row = 0; row < config.rows; row++) {
        const col = config.keymap[layer][row].indexOf(usage)
        if (col >= 0) return `${row},${col}`
      }
    }
    return null
  }

  const cleanups: (() => void)[] = []
  if (typeof window !== 'undefined') {
    const fromCode = new Map<string, string>()
    const down = (event: KeyboardEvent) => {
      const position = positionOf(event.code)
      if (!position) return
      fromCode.set(event.code, position)
      setKey(position, true)
    }
    const up = (event: KeyboardEvent) => {
      const position = fromCode.get(event.code)
      if (!position) return
      fromCode.delete(event.code)
      setKey(position, false)
    }
    const releaseAll = () => {
      for (const position of fromCode.values()) setKey(position, false)
      fromCode.clear()
    }
    // Capture phase, so the demo's switches move even when a page stops the event.
    window.addEventListener('keydown', down, true)
    window.addEventListener('keyup', up, true)
    window.addEventListener('blur', releaseAll)
    cleanups.push(() => {
      window.removeEventListener('keydown', down, true)
      window.removeEventListener('keyup', up, true)
      window.removeEventListener('blur', releaseAll)
    })

    // `?demo-turn=1;0` turns the demo's knob by itself (1 clockwise, 0 counter-clockwise), one step at a time
    // after the presses' start: the page gets what the knob sends on the base layer, as the browser would deliver
    // it (a volume key or the mouse wheel). For screenshots of the Test page.
    const turns = (params().get('demo-turn') ?? '').split(';').filter((step) => step === '0' || step === '1')
    turns.forEach((direction, i) => {
      const turn = setTimeout(() => {
        const event = browserEventFor(config.knob[config.layer.base][Number(direction)])
        if (event) window.dispatchEvent(event)
      }, PRESS_START_MS + i * PRESS_STEP_MS)
      cleanups.push(() => clearTimeout(turn))
    })

    const script = parsePressScript(params().get('demo-press') ?? '')
    script.forEach((step, i) => {
      const at = PRESS_START_MS + i * PRESS_STEP_MS
      const press = setTimeout(() => step.forEach((key) => setKey(key, true)), at)
      const release = i < script.length - 1 && setTimeout(() => step.forEach((key) => setKey(key, false)), at + PRESS_STEP_MS - 30)
      cleanups.push(() => {
        clearTimeout(press)
        if (release) clearTimeout(release)
      })
    })
  }
  link.onClose(() => cleanups.splice(0).forEach((cleanup) => cleanup()))

  return Object.assign(link, {
    holdLayer(layer: number) {
      config.layer.held = layer
      link.deliver(report(0xa3, config.layer.base, layer))
    },
    setKey,
  })
}
