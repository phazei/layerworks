// SPDX-License-Identifier: GPL-3.0-or-later
// Keycodes for the rest of the app: names, the palette's groups, and builders for shortcuts and layer keys.
// Everything here reads the vendored keycode tables, which describe the connected keyboard only after the device
// store has loaded it.

import * as tables from '../vendor/pipette/shared/keycodes/keycodes'
import {
  buildModMaskKeycode,
  deserialize,
  extractBasicKey,
  extractModMask,
  findKeycode,
  isModMaskKeycode,
  keycodeLabel,
  keycodeTooltip,
  serialize,
} from '../vendor/pipette/shared/keycodes/keycodes-utils'

export const KC_NOTHING = 0x0000
export const KC_SAME_AS_BELOW = 0x0001

/** QMK's name for a keycode, e.g. "KC_A" or "MO(1)". */
export const keycodeId = (code: number): string => serialize(code)

/** The short text shown on a key, on one line. */
export function keycodeName(code: number): string {
  return keycodeLabel(serialize(code)).replace(/\n/g, ' ').trim()
}

/** A longer description where the tables have one, e.g. "Left Control". */
export function keycodeDescription(code: number): string | undefined {
  return keycodeTooltip(serialize(code))
}

/** Reads a QMK name ("KC_A", "LCTL(KC_C)", "MO(2)") or a number ("0x7E10"). null when it is neither. */
export function parseKeycode(text: string): number | null {
  const trimmed = text.trim()
  if (!trimmed) return null
  if (/^(0x[0-9a-f]+|\d+)$/i.test(trimmed)) {
    const code = Number(trimmed)
    return code >= 0 && code <= 0xffff ? code : null
  }
  try {
    const code = deserialize(trimmed.toUpperCase().replace(/\s+/g, ''))
    // The parser returns 0 for names it doesn't know; only KC_NO really is 0.
    if (!Number.isInteger(code) || code < 0 || code > 0xffff) return null
    return code === 0 && !/^(KC_NO|XXXXXXX)$/i.test(trimmed) ? null : code
  } catch {
    return null
  }
}

export interface PaletteKey {
  code: number
  /** QMK's name. */
  id: string
  /** Text for the key tile; may have two lines. */
  label: string
  description?: string
  /** QMK's other names for it ("KC_ESC" for KC_ESCAPE), for searching. */
  aliases?: string[]
}

/** Plain words for keys the tables leave undescribed or describe in jargon. */
const PLAIN: Record<string, string> = {
  KC_ENTER: 'Enter',
  KC_SPACE: 'Space bar',
  KC_BSPACE: 'Backspace',
  KC_ESCAPE: 'Escape',
  KC_DELETE: 'Delete',
  KC_PGUP: 'Page Up',
  KC_PGDOWN: 'Page Down',
  KC_UP: 'Arrow up',
  KC_DOWN: 'Arrow down',
  KC_LEFT: 'Arrow left',
  KC_RIGHT: 'Arrow right',
  KC_CAPSLOCK: 'Caps Lock',
  KC_NUMLOCK: 'Num Lock',
  KC_SCROLLLOCK: 'Scroll Lock',
  KC_PSCREEN: 'Print Screen',
  KC_LSHIFT: 'Left Shift',
  KC_RSHIFT: 'Right Shift',
  KC_LCTRL: 'Left Ctrl',
  KC_RCTRL: 'Right Ctrl',
  KC_LALT: 'Left Alt (Option on a Mac)',
  KC_RALT: 'Right Alt (AltGr)',
  KC_LGUI: 'Left Windows key (Command on a Mac)',
  KC_RGUI: 'Right Windows key (Command on a Mac)',
  KC_APPLICATION: 'Menu key',
  KC_KP_ENTER: 'Number pad Enter',
  KC_MSTP: 'Stop playing',
  KC_WH_U: 'Mouse wheel up',
  KC_WH_D: 'Mouse wheel down',
  KC_WH_L: 'Mouse wheel left',
  KC_WH_R: 'Mouse wheel right',
  RGB_TOG: 'Lights on or off',
  RGB_MOD: 'Next lighting effect',
  RGB_RMOD: 'Previous lighting effect',
  RGB_HUI: 'Lighting colour forward',
  RGB_HUD: 'Lighting colour back',
  RGB_SAI: 'Stronger lighting colour',
  RGB_SAD: 'Paler lighting colour',
  RGB_VAI: 'Lights brighter',
  RGB_VAD: 'Lights dimmer',
  RGB_SPI: 'Lighting effect faster',
  RGB_SPD: 'Lighting effect slower',
  RM_ON: 'Lights on',
  RM_OFF: 'Lights off',
  RM_TOGG: 'Lights on or off',
  RM_NEXT: 'Next lighting effect',
  RM_PREV: 'Previous lighting effect',
  RM_HUEU: 'Lighting colour forward',
  RM_HUED: 'Lighting colour back',
  RM_SATU: 'Stronger lighting colour',
  RM_SATD: 'Paler lighting colour',
  RM_VALU: 'Lights brighter',
  RM_VALD: 'Lights dimmer',
  RM_SPDU: 'Lighting effect faster',
  RM_SPDD: 'Lighting effect slower',
}

/** The lighting keys that work on an RGB matrix keyboard, without the underglow-only effect keys. */
const SHARED_LIGHTING = new Set(['RGB_TOG', 'RGB_MOD', 'RGB_RMOD', 'RGB_HUI', 'RGB_HUD', 'RGB_SAI', 'RGB_SAD', 'RGB_VAI', 'RGB_VAD', 'RGB_SPI', 'RGB_SPD'])

function plainDescription(keycode: tables.Keycode): string | undefined {
  if (PLAIN[keycode.qmkId]) return PLAIN[keycode.qmkId]
  if (keycode.qmkId.startsWith('KC_KP_')) return `Number pad ${keycode.label.replace(/\n/g, ' ')}`
  return keycode.tooltip
}

export interface PaletteGroup {
  id: string
  title: string
  keys: PaletteKey[]
}

function entries(list: readonly tables.Keycode[]): PaletteKey[] {
  const out: PaletteKey[] = []
  for (const keycode of list) {
    if (keycode.hidden || keycode.masked) continue
    const code = deserialize(keycode.qmkId)
    out.push({
      code,
      // Shifted symbols are stored as Shift + key: "~" is LSFT(KC_GRAVE), whatever the table calls it.
      id: serialize(code),
      label: keycode.label,
      description: plainDescription(keycode),
      aliases: keycode.alias,
    })
  }
  return out
}

/** The keys offered in the palette, grouped the way a person would look for them. */
export function keyPalette(): PaletteGroup[] {
  const groups: PaletteGroup[] = [
    { id: 'letters', title: 'Letters', keys: entries(tables.KEYCODES_BASIC_LETTERS) },
    { id: 'numbers', title: 'Numbers and symbols', keys: entries([...tables.KEYCODES_BASIC_NUMBERS, ...tables.KEYCODES_BASIC_SYMBOLS]) },
    { id: 'shifted', title: 'Symbols typed with Shift', keys: entries(tables.KEYCODES_SHIFTED) },
    { id: 'editing', title: 'Editing and navigation', keys: entries([...tables.KEYCODES_BASIC_EDITING, ...tables.KEYCODES_BASIC_NAV, ...tables.KEYCODES_BASIC_LOCK, ...tables.KEYCODES_BASIC_SYSTEM]) },
    { id: 'modifiers', title: 'Modifiers', keys: entries(tables.KEYCODES_BASIC_MODS) },
    { id: 'function', title: 'Function keys', keys: entries([...tables.KEYCODES_BASIC_FUNCTION, ...tables.KEYCODES_SYSTEM_FKEYS]) },
    { id: 'media', title: 'Media and system', keys: entries([...tables.KEYCODES_SYSTEM_PLAYBACK, ...tables.KEYCODES_SYSTEM_CONTROL, ...tables.KEYCODES_SYSTEM_APP, ...tables.KEYCODES_SYSTEM_BROWSER]) },
    { id: 'numpad', title: 'Number pad', keys: entries(tables.KEYCODES_BASIC_NUMPAD) },
    { id: 'mouse', title: 'Mouse', keys: entries(tables.KEYCODES_SYSTEM_MOUSE) },
    // The shared RGB_ codes: Keychron's keymaps use them, and the firmware sends them to the RGB matrix.
    { id: 'lighting', title: 'Lighting controls', keys: entries(tables.KEYCODES_LIGHTING_RGB.filter((k) => SHARED_LIGHTING.has(k.qmkId))) },
    { id: 'keyboard', title: 'This keyboard', keys: entries(tables.KEYCODES_USER) },
    { id: 'macros', title: 'Macros', keys: entries(tables.KEYCODES_MACRO_M) },
    { id: 'tapDance', title: 'Multi-tap keys', keys: entries(tables.KEYCODES_TAP_DANCE) },
    { id: 'repeat', title: 'Repeat keys', keys: entries(tables.KEYCODES_BEHAVIOR_REPEAT) },
  ]
  return groups.filter((group) => group.keys.length > 0)
}

/** The modifiers a shortcut key can hold, as bits of a modifier mask. */
export const MODIFIERS = [
  { bit: 0x01, name: 'Ctrl' },
  { bit: 0x02, name: 'Shift' },
  { bit: 0x04, name: 'Alt' },
  { bit: 0x08, name: 'Win' },
] as const

/** One key that presses `key` (a basic key) together with the modifiers in `mods`. */
export const shortcutKeycode = (mods: number, key: number): number => buildModMaskKeycode(mods, key)

/** The parts of a shortcut keycode, or null when the keycode isn't a modifier + key. */
export function readShortcut(code: number): { mods: number; key: number } | null {
  if (!isModMaskKeycode(code)) return null
  return { mods: extractModMask(code) & 0x0f, key: extractBasicKey(code) }
}

/** True for a plain key that can be combined with modifiers. */
export const isBasicKey = (code: number): boolean => code > KC_SAME_AS_BELOW && code <= 0xff

export interface LayerAction {
  /** QMK's function name. */
  op: 'MO' | 'TG' | 'OSL' | 'TO' | 'DF'
  /** The sentence shown in the app; {layer} is replaced with the layer's name. */
  sentence: string
  hint: string
}

export const LAYER_ACTIONS: LayerAction[] = [
  { op: 'MO', sentence: 'While held, use {layer}', hint: 'Like Fn or Shift: active only while the key is down.' },
  { op: 'TG', sentence: 'Turn {layer} on or off', hint: 'Press once to switch it on, again to switch it off.' },
  { op: 'OSL', sentence: 'Use {layer} for the next key only', hint: 'Tap it, then the next key you press comes from that layer.' },
  { op: 'TO', sentence: 'Switch to {layer} and stay there', hint: 'Turns every other layer off. Make sure that layer has a way back.' },
  { op: 'DF', sentence: 'Make {layer} the base layer', hint: 'Changes which layer the keyboard rests on until it restarts.' },
]

export function layerKeycode(op: LayerAction['op'], layer: number): number {
  return deserialize(`${op}(${layer})`)
}

/** The parts of a layer key, or null when the keycode isn't one of LAYER_ACTIONS. */
export function readLayerKey(code: number): { op: LayerAction['op']; layer: number } | null {
  const match = /^(MO|TG|OSL|TO|DF)\((\d+)\)$/.exec(serialize(code))
  return match ? { op: match[1] as LayerAction['op'], layer: Number(match[2]) } : null
}

/** True when the tables know this keycode by name (it is not shown as a bare number). */
export const isKnownKeycode = (code: number): boolean => findKeycode(serialize(code)) !== undefined

/** True for a key a shortcut can be built on: a typing key, not media, mouse or a modifier itself. */
export const canTakeModifiers = (code: number): boolean => isBasicKey(code) && code < 0xa5

/** What a keycode does, in plain words: "Volume Up", "Left Ctrl", "1 and !", "Ctrl + C". */
export function keycodeTitle(code: number): string {
  if (code === KC_NOTHING) return 'Nothing'
  if (code === KC_SAME_AS_BELOW) return 'Same as the layer below'
  const id = serialize(code)
  const keycode = id.includes('(') ? tables.KEYCODES_SHIFTED.find((k) => deserialize(k.qmkId) === code) : findKeycode(id)
  if (keycode) {
    const plain = plainDescription(keycode)
    if (plain) return plain
    const lines = keycode.label.split('\n')
    // Number and symbol keys are labelled "!\n1": shifted above, plain below.
    if (lines.length === 2 && lines.every((line) => [...line].length === 1)) return `${lines[1]} and ${lines[0]}`
    return lines.join(' ')
  }
  const shortcut = readShortcut(code)
  if (shortcut) {
    const mods = MODIFIERS.filter((mod) => shortcut.mods & mod.bit).map((mod) => mod.name)
    return [...mods, shortcut.key ? keycodeTitle(shortcut.key) : '…'].join(' + ')
  }
  return keycodeName(code)
}
