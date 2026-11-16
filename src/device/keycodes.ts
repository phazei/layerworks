// SPDX-License-Identifier: GPL-3.0-or-later
// Keycodes for the rest of the app: names, the palette's groups, and builders for shortcuts, layer keys and the
// tap / hold keys (mod-tap, layer-tap, one-shot modifiers, layer + modifiers). Everything here reads the vendored
// keycode tables, which describe the connected keyboard only after the device store has loaded it.

import * as tables from '../vendor/pipette/shared/keycodes/keycodes'
import {
  buildLMKeycode,
  buildLTKeycode,
  buildModMaskKeycode,
  buildModTapKeycode,
  deserialize,
  extractBasicKey,
  extractLMLayer,
  extractLMMod,
  extractLTLayer,
  extractModMask,
  findKeycode,
  getMacroIndex,
  getTapDanceIndex,
  isLMKeycode,
  isLTKeycode,
  isModMaskKeycode,
  isModTapKeycode,
  isTapDanceKeycode,
  keycodeLabel,
  keycodeTooltip,
  resolve,
  serialize,
} from '../vendor/pipette/shared/keycodes/keycodes-utils'

export const KC_NOTHING = 0x0000
export const KC_SAME_AS_BELOW = 0x0001

/** QMK's name for a keycode, e.g. "KC_A" or "MO(1)". */
export const keycodeId = (code: number): string => serialize(code)

/** The label the tables give a keycode, on one line. */
const tableName = (code: number): string => keycodeLabel(serialize(code)).replace(/\n/g, ' ').trim()

/**
 * The short text shown on a key, on one line: "A", "Ctrl+C", and for keys that do two things the tap and the
 * hold, "Esc / Ctrl", "Space / Layer 4".
 */
export function keycodeName(code: number): string {
  const [first, second] = keycodeCapParts(code)
  return second === undefined ? first : `${first} / ${second}`
}

/**
 * The text for a keycap drawn on its own: like keycodeName, but a key that does two things gets two lines (what a
 * tap sends, then what a hold does), so it reads like the keyboard picture's split keys.
 */
export function keycodeCap(code: number): string {
  return keycodeCapParts(code).join('\n')
}

function keycodeCapParts(code: number): [string] | [string, string] {
  const modTap = readModTap(code)
  if (modTap) return [tableName(modTap.key), modifierShort(modTap.mods)]
  const layerTap = readLayerTap(code)
  if (layerTap) return [layerTap.key ? tableName(layerTap.key) : 'Nothing', `Layer ${layerTap.layer}`]
  const oneShot = readOneShotMod(code)
  if (oneShot) return [modifierShort(oneShot.mods), 'next key']
  const layerMod = readLayerMod(code)
  if (layerMod) return [`Layer ${layerMod.layer}`, `+ ${modifierShort(layerMod.mods)}`]
  if (isModMaskKeycode(code)) {
    // Shifted symbols are Shift + key, but the tables have a label for them: "~".
    const shifted = tables.KEYCODES_SHIFTED.find((k) => deserialize(k.qmkId) === code)
    if (shifted) return [shifted.label.replace(/\n/g, ' ')]
    return [`${modifierShort(extractModMask(code))}+${tableName(extractBasicKey(code))}`]
  }
  return [tableName(code)]
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
  /** A macro or multi-tap key with nothing set up yet: still offered, but drawn as empty. */
  empty?: boolean
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
  /** A link beside the group's title, e.g. to where its keys are set up. */
  link?: { label: string; href: string }
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
  op: 'MO' | 'TT' | 'TG' | 'OSL' | 'TO' | 'DF'
  /** The sentence shown in the app; {layer} is replaced with the layer's name. */
  sentence: string
  hint: string
}

export const LAYER_ACTIONS: LayerAction[] = [
  { op: 'MO', sentence: 'While held, use {layer}', hint: 'Like Fn or Shift: active only while the key is down.' },
  {
    op: 'TT',
    sentence: 'Hold for {layer}, or tap quickly to keep it on',
    hint: 'Like the one above, but a few quick taps (five unless changed) leave the layer on until you tap it again.',
  },
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
  const match = /^(MO|TT|TG|OSL|TO|DF)\((\d+)\)$/.exec(serialize(code))
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
  const tapHold = readTapHold(code)
  if (tapHold) return tapHoldWords(tapHold, (layer) => `layer ${layer}`)
  const oneShot = readOneShotMod(code)
  if (oneShot) return `${modifierWords(oneShot.mods)} for the next key only`
  const layerMod = readLayerMod(code)
  if (layerMod) return `While held, use layer ${layerMod.layer} with ${modifierWords(layerMod.mods)}`
  return keycodeName(code)
}

// --- Tap / hold keys -----------------------------------------------------------------------------------------------
//
// Mod-tap, one-shot modifiers and layer + modifiers carry a 5-bit modifier mask: Ctrl, Shift, Alt and Win in bits
// 0-3 (MODIFIERS) and bit 4 meaning "the right-hand ones" for all of them. QMK can't mix sides in one key.

/** The bit of a 5-bit modifier mask that makes every modifier in it the right-hand one. */
export const RIGHT_HAND = 0x10

/** The highest layer a layer-tap or layer + modifiers key can reach: its keycode has 4 bits for the layer. */
export const MAX_TAP_LAYER = 15

/** A 5-bit modifier mask in words: "Ctrl", "Ctrl + Shift", "Right Alt". */
export function modifierWords(mods: number): string {
  const names = MODIFIERS.filter((mod) => mods & mod.bit).map((mod) => (mods & RIGHT_HAND ? `Right ${mod.name}` : mod.name))
  return names.join(' + ')
}

/** The same, short enough for a keycap: "Ctrl", "Ctrl+Shift", "RAlt". */
export function modifierShort(mods: number): string {
  return MODIFIERS.filter((mod) => mods & mod.bit)
    .map((mod) => (mods & RIGHT_HAND ? `R${mod.name}` : mod.name))
    .join('+')
}

const validMods = (mods: number): boolean => Number.isInteger(mods) && mods >= 0 && mods <= 0x1f && (mods & 0x0f) !== 0
const validTapLayer = (layer: number): boolean => Number.isInteger(layer) && layer >= 0 && layer <= MAX_TAP_LAYER

/**
 * True for a key that can be what a tap / hold key sends when tapped. The firmware keeps 8 bits for it, so only
 * basic keys fit: no shortcuts, layer keys, macros or keyboard-specific keys.
 */
export const canBeTapped = (code: number): boolean => isBasicKey(code)

/** "Tap for `key`, hold for `mods`" (QMK's MT, LCTL_T(kc) …). null when the modifiers or the key can't be used. */
export function modTapKeycode(mods: number, key: number): number | null {
  return validMods(mods) && canBeTapped(key) ? buildModTapKeycode(mods, key) : null
}

/** The parts of a mod-tap key, or null when the keycode isn't one. */
export function readModTap(code: number): { mods: number; key: number } | null {
  if (!isModTapKeycode(code)) return null
  const mods = (code >> 8) & 0x1f
  return validMods(mods) ? { mods, key: code & 0xff } : null
}

/** "Tap for `key`, hold for `layer`" (QMK's LT). null for a layer over 15 or a key that can't be tapped. */
export function layerTapKeycode(layer: number, key: number): number | null {
  return validTapLayer(layer) && canBeTapped(key) ? buildLTKeycode(layer, key) : null
}

/** The parts of a layer-tap key, or null when the keycode isn't one. The key is 0 for "hold only". */
export function readLayerTap(code: number): { layer: number; key: number } | null {
  return isLTKeycode(code) ? { layer: extractLTLayer(code), key: code & 0xff } : null
}

export type TapHold = { hold: 'mods'; mods: number; key: number } | { hold: 'layer'; layer: number; key: number }

/** A mod-tap or layer-tap key as one shape, or null. */
export function readTapHold(code: number): TapHold | null {
  const modTap = readModTap(code)
  if (modTap) return { hold: 'mods', ...modTap }
  const layerTap = readLayerTap(code)
  return layerTap ? { hold: 'layer', ...layerTap } : null
}

/** "Tap: Escape · Hold: Ctrl", "Tap: Space · Hold: Fn2" (the layer named by `layerName`). */
export function tapHoldWords(tapHold: TapHold, layerName: (layer: number) => string): string {
  const tap = tapHold.key ? keycodeTitle(tapHold.key) : 'nothing'
  const hold = tapHold.hold === 'mods' ? modifierWords(tapHold.mods) : layerName(tapHold.layer)
  return `Tap: ${tap} · Hold: ${hold}`
}

/** A modifier held for the next key pressed only (QMK's OSM, a "sticky" modifier). null for no modifier. */
export function oneShotModKeycode(mods: number): number | null {
  return validMods(mods) ? resolve('QK_ONE_SHOT_MOD') | mods : null
}

export function readOneShotMod(code: number): { mods: number } | null {
  const base = resolve('QK_ONE_SHOT_MOD')
  const mods = code - base
  return mods >= 0 && mods <= 0x1f && validMods(mods) ? { mods } : null
}

/**
 * While held, a layer and modifiers together (QMK's LM). null when it can't be built, including right-hand
 * modifiers on Vial protocols before 6, whose keycode has no room for them.
 */
export function layerModKeycode(layer: number, mods: number): number | null {
  if (!validTapLayer(layer) || !validMods(mods)) return null
  const code = buildLMKeycode(layer, mods)
  return extractLMMod(code) === mods ? code : null
}

export function readLayerMod(code: number): { layer: number; mods: number } | null {
  if (!isLMKeycode(code)) return null
  const mods = extractLMMod(code)
  return validMods(mods) ? { layer: extractLMLayer(code), mods } : null
}

// --- Macros and multi-tap keys ---------------------------------------------------------------------------------------

/** Which macro a keycode runs (0 for QMK's M0), or null. */
export function readMacroKey(code: number): number | null {
  const index = getMacroIndex(code)
  return index >= 0 ? index : null
}

/** Which multi-tap key (tap dance) a keycode is (0 for TD(0)), or null. */
export const readTapDanceKey = (code: number): number | null => (isTapDanceKeycode(code) ? getTapDanceIndex(code) : null)
