// SPDX-License-Identifier: GPL-3.0-or-later
// Demo mode: a K15 Max that exists only in the page, for trying the app with no keyboard attached. It answers
// the same requests the real one does, and remembers changes until the page is reloaded. The keys of whatever
// keyboard the visitor types on stand in for its switches: holding Esc and Enter holds the demo's unlock keys.

import { FakeLink, fakeKeyboard, fakeKeyboardConfig, knobAt, report } from '../device/fake-keyboard'
import type { HidLink } from '../device/link'
import { encodeMacro, type MacroStep } from '../device/macros'
import { browserEventFor, usageOf } from '../shell/pressed-keys'
import data from './k15-max.json'
import { demoKeyboardConfig, type DemoKeyboardFile } from './other-keyboards'

const WINDOWS_LAYER = 2

/**
 * Example macros, so the Shortcuts page has something to show (the keyboard's real buffer is empty). In M1 - M3, so
 * the K15's keys printed M1 - M3 (QMK's M1 - M3, as on a real Keychron) run them; M0 stays empty.
 */
const DEMO_MACROS: MacroStep[][] = [
  [],
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
 * Vial protocol 6 keycodes put on the demo's keymap so the Shortcuts page shows its examples in use (the macros are
 * on the printed M1 - M5 keys already): TD(1) on Fn + Caps Lock (Windows layers), and the alternate repeat key on
 * Fn2 + Space. For the Keys page's tap / hold choice: on Fn2, Caps Lock is "tap: Esc, hold: Ctrl"
 * (LCTL_T(KC_ESCAPE)) and Tab "tap: Tab, hold: Windows Fn" (LT3(KC_TAB)). For the palette's swapped and disabled
 * keys: on Fn2, the left Windows key switches the Windows keys off and on (GU_TOGG), and Esc restarts the keyboard
 * (QK_REBOOT, under "More keys").
 */
const TD1 = 0x5701
const ALT_REPEAT = 0x7c7a
const CTRL_ESC = 0x2129
const WINFN_TAB = 0x432b
const GUI_TOGGLE = 0x700b
const REBOOT = 0x7c01
function withMacroKey(keymap: number[][][]): number[][][] {
  keymap[4][0][1] = REBOOT
  keymap[WINDOWS_LAYER + 1][3][1] = TD1
  keymap[4][5][5] = ALT_REPEAT
  keymap[4][3][1] = CTRL_ESC
  keymap[4][2][1] = WINFN_TAB
  keymap[4][5][2] = GUI_TOGGLE
  return keymap
}

const le16 = (v: number) => [v & 0xff, v >> 8]
const CTRL = 0x0100
const SHIFT_EITHER = 0x22
const KO_ENABLED = 0x80
const AREP_ENABLED = 0x08

/**
 * Example entries, as the keyboard stores them (vial.h's structs, little-endian), one or two of each kind:
 * multi-tap keys Esc / Caps Lock and copy / paste (TD(1) and TD(2): multi-tap keys go by QMK's number, like
 * macros, and TD(0) stays empty); key chords J + K → Esc, D + F → Tab and both Shifts → Caps Word; Shift + Backspace → Delete and Shift + Esc
 * → ~; after Ctrl + Z the repeat key sends Ctrl + Y, and after Home, End.
 */
const DEMO_ENTRIES = {
  tapDance: [
    new Array<number>(10).fill(0),
    [...le16(0x29), ...le16(0), ...le16(0x39), ...le16(0), ...le16(200)],
    [...le16(CTRL | 0x06), ...le16(CTRL | 0x19), ...le16(0), ...le16(0), ...le16(200)],
  ],
  combo: [
    [...le16(0x0d), ...le16(0x0e), ...le16(0), ...le16(0), ...le16(0x29)],
    [...le16(0x07), ...le16(0x09), ...le16(0), ...le16(0), ...le16(0x2b)],
    // Both Shifts together: Caps Word, one of the palette's less common keys.
    [...le16(0xe1), ...le16(0xe5), ...le16(0), ...le16(0), ...le16(0x7c73)],
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

/**
 * The K15 Max's Snap Click table: 20 empty slots (snap_click/eeconfig_snap_click.h), here with one example pair,
 * A and D, the last one pressed winning.
 */
const demoSnapClick = () => [
  { type: 2, key1: 0x04, key2: 0x07 },
  ...Array.from({ length: 19 }, () => ({ type: 0, key1: 0, key2: 0 })),
]

/**
 * The K15 Max's Keychron lighting as its firmware starts out (vial-qmk keyboards/keychron/k15_max/ansi_encoder/rgb/
 * rgb.c and common/rgb/keychron_rgb.c's reset): the LED under each key (g_led_config), the default per-key colours
 * (Esc and Enter red, the letter block blue, the keys around it yellow), the default zones (W, A, S, D in zone 2)
 * and the zones' default effects (zone 1: a rainbow wave, number 5; zone 2: red breathing, number 2). `__` is no LED.
 */
const __ = 0xff
const K15_LED_AT = [
  [__, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14],
  [15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30],
  [31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46],
  [47, 48, 49, 50, 51, 52, __, 53, 54, 55, 56, 57, 58, 59, 60, 61],
  [62, 63, __, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76],
  [77, 78, 79, 80, __, 81, __, 82, __, 83, 84, 85, __, 86, 87, 88],
]
const HSV = { R: [0, 255, 255], Y: [43, 255, 255], B: [170, 255, 255] } as const
const K15_KEY_COLOURS = ['RYYYYYYYYYYYYYY', 'YBBBBBBBBBBBBBYY', 'YYBBBBBBBBBBBBYY', 'YYBBBBBBBBBBBRY', 'YYBBBBBBBBBBBYY', 'YYYYBYBYYYYY']
  .join('')
  .split('')
  .map((c) => [...HSV[c as keyof typeof HSV]] as [number, number, number])
const K15_ZONES = Array.from({ length: 89 }, (_, led) => ([34, 49, 50, 51].includes(led) ? 1 : 0))
const zoneSlots = (first: { effect: number; hue: number; sat: number; speed: number; time: number }) => [
  first,
  ...Array.from({ length: 4 }, () => ({ effect: 0, hue: 0, sat: 0, speed: 0, time: 0 })),
]
const k15Rgb = () => ({
  ledAt: K15_LED_AT,
  colours: K15_KEY_COLOURS.map((c) => [...c] as [number, number, number]),
  style: 0,
  regions: [...K15_ZONES],
  effects: [
    zoneSlots({ effect: 5, hue: 0, sat: 255, speed: 127, time: 5000 }),
    zoneSlots({ effect: 2, hue: 0, sat: 255, speed: 127, time: 5000 }),
  ],
  mixedEffect: 25,
})

/**
 * The K15 Max's N-key rollover, as its firmware answers `0xA7 0x12`: adaptive (bit 2), not switchable, off in Magic's
 * bit (keychron/common/nkro.c with APDAPTIVE_NKRO_ENABLE; feature bit 0x0200 and misc bit 0x80 announce it).
 */
const K15_NKRO = 0x04

/** The K15 Max's key bounce filter as read from the real keyboard: react at once, 50 ms (its info.json default). */
const K15_DEBOUNCE = { type: 4, time: 50 }

/**
 * The plain demo's Keychron commands: the default layer, the typing settings the Typing feel page shows (key
 * bounce filter and Snap Click, `0xA2` bits 0x20 and 0x40, misc bits 0x04 and 0x08), and Keychron's lighting (bit
 * 0x80: key colours and zones). No wireless features.
 */
const DEMO_KEYCHRON = {
  protocol: 2,
  features: 0x01 | 0x20 | 0x40 | 0x80 | 0x0200,
  firmware: 'demo',
  misc: 0x04 | 0x08 | 0x80,
  nkro: K15_NKRO,
  debounce: K15_DEBOUNCE,
  snapClick: demoSnapClick(),
  rgb: k15Rgb(),
}

/**
 * `?demo-wireless`: the K15 Max's Keychron commands as far as the demo answers them: default layer, Bluetooth,
 * 2.4 GHz, layer notices, debounce and Snap Click (`0xA2`), debounce, Snap Click and wireless timers in the misc
 * group (`0xA7 0x01`), with the firmware's default timers, 10 min and 2 h, and a battery level
 * (../docs/research/k15-firmware-capabilities.md section 3). Its version string is the real one's, with the date
 * SKIP_VERSION leaves.
 */
const K15_KEYCHRON = {
  protocol: 2,
  features: 0x01 | 0x02 | 0x04 | 0x10 | 0x20 | 0x40 | 0x80 | 0x0200,
  firmware: 'v1.1.2 1970-01-01-00:00:00',
  misc: 0x04 | 0x08 | 0x10 | 0x80,
  nkro: K15_NKRO,
  lpm: { backlitTime: 600, idleTime: 7200 },
  debounce: K15_DEBOUNCE,
  snapClick: demoSnapClick(),
  battery: 76,
  rgb: k15Rgb(),
}

/**
 * The QMK settings the K15 Max's Vial build reports (vial-qmk quantum/qmk_settings.c: 1-7, 9-17 with mouse keys
 * on, 18-27; 26 in all) with the values read from the real keyboard, which are its firmware defaults: QMK's timings
 * (tapping term 200 ms, combo 50 ms, Auto Shift 175 ms, one-shot 5 s and 5 taps) and the ripple keymap's mouse keys
 * (config.h). Also what the settings reset puts back.
 */
const le = (width: number, value: number) => Array.from({ length: width }, (_, i) => (value >> (8 * i)) & 0xff)
const K15_SETTINGS: Record<number, number[]> = {
  1: le(1, 0), 2: le(2, 50), 3: le(1, 0), 4: le(2, 175), 5: le(1, 5), 6: le(2, 5000), 7: le(2, 200),
  9: le(2, 100), 10: le(2, 16), 11: le(2, 1), 12: le(2, 20), 13: le(2, 75),
  14: le(2, 10), 15: le(2, 80), 16: le(2, 8), 17: le(2, 40),
  18: le(2, 0), 19: le(2, 80), 20: le(1, 5), 21: le(4, 0),
  22: le(1, 0), 23: le(1, 0), 24: le(1, 0), 25: le(2, 200), 26: le(1, 0), 27: le(2, 0),
}
const K15_QSIDS = Object.keys(K15_SETTINGS).map(Number)

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

/**
 * The demo keyboard: the K15 Max, or with `other` one of the keyboards in ./keyboards (`?demo-keyboard=`,
 * other-keyboards.ts), on the cable, with its own USB identity and a made-up keymap.
 */
export function createDemoLink(other: DemoKeyboardFile | null = null): DemoLink {
  // `?demo-wireless`: the demo is reached through the 2.4 GHz receiver and reports its battery, as the real one
  // does only when wireless. The K15 Max only.
  const wireless = !other && params().has('demo-wireless')
  const k15 = {
    name: `${data.definition.name} (demo)`,
    definition: data.definition,
    layers: data.keymap.length,
    rows: data.definition.matrix.rows,
    cols: data.definition.matrix.cols,
    keymap: withMacroKey(structuredClone(data.keymap)),
    knob: structuredClone(data.knob) as [number, number][],
    // What "Reset to defaults" puts back: the keymap without the demo's examples (the real firmware's own keymap
    // isn't readable over USB; the saved one stands in for it).
    firmwareKeymap: structuredClone(data.keymap),
    firmwareKnob: structuredClone(data.knob) as [number, number][],
    counts: { tapDance: 16, combo: 16, keyOverride: 16, altRepeatKey: 16, featureFlags: 0x03 },
    entryBytes: demoEntries(),
    macroCount: 16,
    macros: demoMacros(),
    // Copies: the fake keyboard keeps what is written in them.
    keychron: structuredClone(wireless ? K15_KEYCHRON : DEMO_KEYCHRON),
    qsids: K15_QSIDS,
    settingValues: structuredClone(K15_SETTINGS),
    settingDefaults: K15_SETTINGS,
    layer: { base: WINDOWS_LAYER, held: 0 },
    rgb: { ...K15_RGB, mode: startEffect() ?? K15_RGB.mode },
    rgbEffects: K15_RGB_EFFECTS,
    rgbMaxBrightness: 255,
    unlockKeys: K15_UNLOCK_KEYS,
  }
  const config = fakeKeyboardConfig({
    ...(other ? demoKeyboardConfig(other, K15_SETTINGS) : k15),
    // `?demo-unlocked` starts the demo unlocked, e.g. for screenshots of the Test page reading every key.
    ...(params().has('demo-unlocked') ? { unlocked: true } : {}),
    // Restarting for a firmware update: the real keyboard answers, waits 100 ms and leaves USB.
    onBootloaderJump: () => setTimeout(() => link.drop(), 100),
  })
  const link = new FakeLink(wireless ? 'receiver' : 'cable', other?.usb)
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
        const event = browserEventFor(knobAt(config, config.layer.base, 0)?.[Number(direction)] ?? 0)
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
