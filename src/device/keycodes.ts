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
    out.push({
      code: deserialize(keycode.qmkId),
      id: keycode.qmkId,
      label: keycode.label,
      description: keycode.tooltip,
    })
  }
  return out
}

/** The keys offered in the palette, grouped the way a person would look for them. */
export function keyPalette(): PaletteGroup[] {
  const groups: PaletteGroup[] = [
    { id: 'letters', title: 'Letters', keys: entries(tables.KEYCODES_BASIC_LETTERS) },
    { id: 'numbers', title: 'Numbers and symbols', keys: entries([...tables.KEYCODES_BASIC_NUMBERS, ...tables.KEYCODES_BASIC_SYMBOLS]) },
    { id: 'editing', title: 'Editing and navigation', keys: entries([...tables.KEYCODES_BASIC_EDITING, ...tables.KEYCODES_BASIC_NAV, ...tables.KEYCODES_BASIC_LOCK]) },
    { id: 'modifiers', title: 'Modifiers', keys: entries(tables.KEYCODES_BASIC_MODS) },
    { id: 'function', title: 'Function keys', keys: entries([...tables.KEYCODES_BASIC_FUNCTION, ...tables.KEYCODES_SYSTEM_FKEYS]) },
    { id: 'media', title: 'Media and system', keys: entries([...tables.KEYCODES_SYSTEM_PLAYBACK, ...tables.KEYCODES_SYSTEM_CONTROL, ...tables.KEYCODES_SYSTEM_APP, ...tables.KEYCODES_SYSTEM_BROWSER]) },
    { id: 'numpad', title: 'Number pad', keys: entries(tables.KEYCODES_BASIC_NUMPAD) },
    { id: 'mouse', title: 'Mouse', keys: entries(tables.KEYCODES_SYSTEM_MOUSE) },
    { id: 'lighting', title: 'Lighting controls', keys: entries(tables.KEYCODES_LIGHTING_MATRIX) },
    { id: 'keyboard', title: 'This keyboard', keys: entries(tables.KEYCODES_USER) },
    { id: 'macros', title: 'Macros', keys: entries(tables.KEYCODES_MACRO_M) },
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
