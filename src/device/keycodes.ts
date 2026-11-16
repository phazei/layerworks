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
  getProtocol,
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
export const keycodeId = (code: number): string => extraByCode(code)?.id ?? serialize(code)

/** The label the tables give a keycode, on one line; the friendly one for the extra groups' keys. */
function tableName(code: number): string {
  const friendly = friendlyKey(code)
  if (friendly) return friendly.label.replace(/\n/g, ' ')
  const family = unnamedFamily(code)
  if (family) return family.short.replace(/\n/g, ' ')
  return keycodeLabel(serialize(code)).replace(/\n/g, ' ').trim()
}

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
  const upper = trimmed.toUpperCase()
  const extra = extraKeys().find((key) => key.id === upper || key.long === upper)
  if (extra) return extra.code
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

// --- The keys of the extra groups ----------------------------------------------------------------------------------
//
// The tables' labels for these are QMK shorthand ("Swap\nCtrl\nCaps", "LS\n("); the palette, the "Now" line and the
// keyboard picture use these instead. Every description is unique: it is the tile's name for screen readers.

/** A key's tile label (up to three short lines) and what it does in words. */
interface Friendly {
  label: string
  description: string
}

const F = (label: string, description: string): Friendly => ({ label, description })

const FRIENDLY: Record<string, Friendly> = {
  // Typing helpers (Caps Word, Grave Escape, Space Cadet, Layer Lock).
  QK_CAPS_WORD_TOGGLE: F('Caps\nWord', 'Capitals for one word (Caps Word)'),
  KC_GESC: F('Esc\n` ~', 'Esc, or ` while Shift or Win is held (Grave Escape)'),
  KC_LSPO: F('LShift\n(', 'Left Shift when held, ( when tapped (Space Cadet)'),
  KC_RSPC: F('RShift\n)', 'Right Shift when held, ) when tapped (Space Cadet)'),
  KC_LCPO: F('LCtrl\n(', 'Left Ctrl when held, ( when tapped (Space Cadet)'),
  KC_RCPC: F('RCtrl\n)', 'Right Ctrl when held, ) when tapped (Space Cadet)'),
  KC_LAPO: F('LAlt\n(', 'Left Alt when held, ( when tapped (Space Cadet)'),
  KC_RAPC: F('RAlt\n)', 'Right Alt when held, ) when tapped (Space Cadet)'),
  KC_SFTENT: F('RShift\nEnter', 'Right Shift when held, Enter when tapped (Space Cadet)'),
  QK_LAYER_LOCK: F('Layer\nLock', 'Keep the held layer on after letting go (Layer Lock)'),
  // Swapped and disabled keys (QMK's Magic keycodes), worded like the Typing feel switches they change.
  MAGIC_SWAP_CONTROL_CAPSLOCK: F('Swap\nCaps Ctrl', 'Swap Caps Lock and left Ctrl'),
  MAGIC_UNSWAP_CONTROL_CAPSLOCK: F('Unswap\nCaps Ctrl', 'Caps Lock and left Ctrl back to normal'),
  MAGIC_CAPSLOCK_TO_CONTROL: F('Caps\nis Ctrl', 'Caps Lock works as Ctrl'),
  MAGIC_UNCAPSLOCK_TO_CONTROL: F('Caps\nis Caps', 'Caps Lock works as Caps Lock again'),
  MAGIC_SWAP_LALT_LGUI: F('Swap\nLAlt LWin', 'Swap left Alt and left Win'),
  MAGIC_UNSWAP_LALT_LGUI: F('Unswap\nLAlt LWin', 'Left Alt and left Win back to normal'),
  MAGIC_SWAP_RALT_RGUI: F('Swap\nRAlt RWin', 'Swap right Alt and right Win'),
  MAGIC_UNSWAP_RALT_RGUI: F('Unswap\nRAlt RWin', 'Right Alt and right Win back to normal'),
  MAGIC_SWAP_ALT_GUI: F('Swap\nAlt Win', 'Swap Alt and Win on both sides'),
  MAGIC_UNSWAP_ALT_GUI: F('Unswap\nAlt Win', 'Alt and Win back to normal on both sides'),
  MAGIC_TOGGLE_ALT_GUI: F('Toggle\nAlt Win', 'Swap Alt and Win on both sides, or back'),
  MAGIC_SWAP_LCTL_LGUI: F('Swap\nLCtrl LWin', 'Swap left Ctrl and left Win'),
  MAGIC_UNSWAP_LCTL_LGUI: F('Unswap\nLCtrl LWin', 'Left Ctrl and left Win back to normal'),
  MAGIC_SWAP_RCTL_RGUI: F('Swap\nRCtrl RWin', 'Swap right Ctrl and right Win'),
  MAGIC_UNSWAP_RCTL_RGUI: F('Unswap\nRCtrl RWin', 'Right Ctrl and right Win back to normal'),
  MAGIC_SWAP_CTL_GUI: F('Swap\nCtrl Win', 'Swap Ctrl and Win on both sides'),
  MAGIC_UNSWAP_CTL_GUI: F('Unswap\nCtrl Win', 'Ctrl and Win back to normal on both sides'),
  MAGIC_TOGGLE_CTL_GUI: F('Toggle\nCtrl Win', 'Swap Ctrl and Win on both sides, or back'),
  MAGIC_NO_GUI: F('Win\nOff', 'Windows keys do nothing'),
  MAGIC_UNNO_GUI: F('Win\nOn', 'Windows keys work again'),
  MAGIC_TOGGLE_GUI: F('Win\nOff / On', 'Windows keys off, or on again'),
  MAGIC_SWAP_GRAVE_ESC: F('Swap\n` Esc', 'Swap ` and Esc'),
  MAGIC_UNSWAP_GRAVE_ESC: F('Unswap\n` Esc', '` and Esc back to normal'),
  MAGIC_SWAP_BACKSLASH_BACKSPACE: F('Swap\n\\ Bksp', 'Swap \\ and Backspace'),
  MAGIC_UNSWAP_BACKSLASH_BACKSPACE: F('Unswap\n\\ Bksp', '\\ and Backspace back to normal'),
  // International keys. The JIS keys share their codes with QMK's KC_INT1 - 5 (their aliases), so those aren't
  // listed twice.
  KC_NONUS_HASH: F('~\n#', 'Key beside Enter on ISO keyboards (# and ~ in the UK)'),
  KC_NONUS_BSLASH: F('|\n\\', 'Key beside left Shift on ISO keyboards (\\ and | in the UK, < and > in Germany)'),
  KC_RO: F('_\n\\', 'Japanese \\ and _ key (Ro)'),
  KC_KANA: F('カナ', 'Japanese Katakana / Hiragana key'),
  KC_JYEN: F('|\n¥', 'Japanese ¥ key (Yen)'),
  KC_HENK: F('変換', 'Japanese Henkan key (convert)'),
  KC_MHEN: F('無変換', 'Japanese Muhenkan key (don’t convert)'),
  KC_LANG1: F('Lang\n1', 'Language 1: Hangul / English (Korean), Kana (Mac)'),
  KC_LANG2: F('Lang\n2', 'Language 2: Hanja (Korean), Eisu (Mac)'),
  KC_LANG3: F('Lang\n3', 'Language 3: Katakana (Japanese)'),
  KC_LANG4: F('Lang\n4', 'Language 4: Hiragana (Japanese)'),
  KC_LANG5: F('Lang\n5', 'Language 5: Zenkaku / Hankaku (Japanese)'),
  // Features on and off.
  KC_ASON: F('Auto\nShift\nOn', 'Capitals by holding: on'),
  KC_ASOFF: F('Auto\nShift\nOff', 'Capitals by holding: off'),
  KC_ASTG: F('Auto\nShift\nOn / Off', 'Capitals by holding: on or off'),
  CMB_ON: F('Chords\nOn', 'Key chords: on'),
  CMB_OFF: F('Chords\nOff', 'Key chords: off'),
  CMB_TOG: F('Chords\nOn / Off', 'Key chords: on or off'),
  QK_KEY_OVERRIDE_ON: F('Replace\nOn', 'Shortcut replacements: on'),
  QK_KEY_OVERRIDE_OFF: F('Replace\nOff', 'Shortcut replacements: off'),
  QK_KEY_OVERRIDE_TOGGLE: F('Replace\nOn / Off', 'Shortcut replacements: on or off'),
  QK_ONE_SHOT_ON: F('One-tap\nOn', 'One-tap modifiers: on'),
  QK_ONE_SHOT_OFF: F('One-tap\nOff', 'One-tap modifiers: off'),
  QK_ONE_SHOT_TOGGLE: F('One-tap\nOn / Off', 'One-tap modifiers: on or off'),
  // Restart and firmware update.
  QK_BOOT: F('Firmware\nupdate', 'Firmware update mode: the keyboard stops typing until it is updated or unplugged (bootloader)'),
  QK_REBOOT: F('Restart', 'Restart the keyboard'),
}

/**
 * Keys vial-qmk has that the vendored tables lack (QMK's keycodes.h, Vial protocol 6), named here so a key holding
 * one isn't shown as a bare number, and offered with the rest of their group.
 */
interface ExtraKey extends Friendly {
  code: number
  /** QMK's short name. */
  id: string
  /** QMK's long name, for searching and typing. */
  long: string
}

const EXTRA_KEYS: ExtraKey[] = [
  { code: 0x7002, id: 'CL_TOGG', long: 'QK_MAGIC_TOGGLE_CONTROL_CAPS_LOCK', ...F('Toggle\nCaps Ctrl', 'Swap Caps Lock and left Ctrl, or back') },
  { code: 0x7010, id: 'BS_TOGG', long: 'QK_MAGIC_TOGGLE_BACKSLASH_BACKSPACE', ...F('Toggle\n\\ Bksp', 'Swap \\ and Backspace, or back') },
  { code: 0x7020, id: 'EC_SWAP', long: 'QK_MAGIC_SWAP_ESCAPE_CAPS_LOCK', ...F('Swap\nEsc Caps', 'Swap Esc and Caps Lock') },
  { code: 0x7021, id: 'EC_NORM', long: 'QK_MAGIC_UNSWAP_ESCAPE_CAPS_LOCK', ...F('Unswap\nEsc Caps', 'Esc and Caps Lock back to normal') },
  { code: 0x7022, id: 'EC_TOGG', long: 'QK_MAGIC_TOGGLE_ESCAPE_CAPS_LOCK', ...F('Toggle\nEsc Caps', 'Swap Esc and Caps Lock, or back') },
  // The tables list these (KEYCODES_BEHAVIOR_MODE) but never register them, so they would read as numbers.
  { code: 0x7011, id: 'NK_ON', long: 'QK_MAGIC_NKRO_ON', ...F('NKRO\nOn', 'Any number of keys at once: on (N-key rollover)') },
  { code: 0x7012, id: 'NK_OFF', long: 'QK_MAGIC_NKRO_OFF', ...F('NKRO\nOff', 'Any number of keys at once: off, six at most') },
  { code: 0x7013, id: 'NK_TOGG', long: 'QK_MAGIC_TOGGLE_NKRO', ...F('NKRO\nOn / Off', 'Any number of keys at once: on or off') },
]

/** The extra keys apply to Vial protocol 6 only: older protocols number QMK's keycodes differently. */
const extraKeys = (): ExtraKey[] => (getProtocol() === 6 ? EXTRA_KEYS : [])
const extraByCode = (code: number): ExtraKey | undefined => extraKeys().find((key) => key.code === code)

/**
 * Keycode families no table names on this keyboard (left out of the palette, or not compiled into the tables:
 * MIDI without the definition asking for it, steno, Unicode …), by their range in vial-qmk's keycodes.h (Vial
 * protocol 6). A key holding one is named by its family rather than shown as a bare number.
 */
const FAMILIES: { from: number; to: number; short: string; title: string }[] = [
  { from: 0x7000, to: 0x70ff, short: 'Magic', title: 'A key that swaps or switches off other keys (Magic)' },
  { from: 0x7100, to: 0x71ff, short: 'MIDI', title: 'A MIDI music key (needs MIDI in the firmware)' },
  { from: 0x7200, to: 0x73ff, short: 'Seq.', title: 'A step sequencer key (needs the sequencer in the firmware)' },
  { from: 0x7400, to: 0x743f, short: 'Joystick', title: 'A joystick button (needs joystick support in the firmware)' },
  { from: 0x7440, to: 0x747f, short: 'Prog.\nbutton', title: 'A programmable button (needs them in the firmware)' },
  { from: 0x7480, to: 0x74bf, short: 'Audio', title: 'A sound key (needs a speaker and audio in the firmware)' },
  { from: 0x74c0, to: 0x74ff, short: 'Steno', title: 'A stenography key (needs steno in the firmware)' },
  { from: 0x7780, to: 0x77bf, short: 'Output', title: 'A connection key: USB or Bluetooth output' },
  { from: 0x77c0, to: 0x77ff, short: 'Module', title: 'A key from a firmware community module' },
  { from: 0x7800, to: 0x78ff, short: 'Light', title: 'A lighting key' },
  { from: 0x7c00, to: 0x7dff, short: 'QMK', title: 'A special QMK key' },
  { from: 0x7e00, to: 0x7fff, short: 'Custom', title: 'A key this keyboard’s firmware defines' },
  { from: 0x8000, to: 0xffff, short: 'Unicode', title: 'Types a Unicode character (needs Unicode in the firmware)' },
]

/** The family of a keycode no table names, or null. */
function unnamedFamily(code: number): { short: string; title: string } | null {
  if (getProtocol() !== 6 || !/^0x/.test(serialize(code))) return null
  return FAMILIES.find((family) => code >= family.from && code <= family.to) ?? null
}

/** The friendly tile label and description of a key of the extra groups, or null for any other key. */
export function friendlyKey(code: number): { label: string; description: string } | null {
  const extra = extraByCode(code)
  if (extra) return { label: extra.label, description: extra.description }
  const friendly = FRIENDLY[serialize(code)]
  return friendly ?? null
}

function plainDescription(keycode: tables.Keycode): string | undefined {
  if (FRIENDLY[keycode.qmkId]) return FRIENDLY[keycode.qmkId].description
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
  /** One short sentence under the title: what the keys are for, or what they need. */
  note?: string
  /** Rarely needed: listed under the palette's closed "More keys" fold. */
  more?: boolean
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
      label: FRIENDLY[keycode.qmkId]?.label ?? keycode.label,
      description: plainDescription(keycode),
      // The table's own name too, when it differs from the one shown (KC_LSPO for SC_LSPO …).
      aliases: [...(keycode.alias ?? []), ...(keycode.cExportId ? [keycode.cExportId] : [])],
    })
  }
  return out
}

/** Keys of one table by QMK name, in the order given. */
function pick(list: readonly tables.Keycode[], ids: readonly string[]): tables.Keycode[] {
  return ids.map((id) => list.find((keycode) => keycode.qmkId === id)).filter((keycode): keycode is tables.Keycode => !!keycode)
}

/** The extra keys (EXTRA_KEYS) among `ids`, as palette keys, where the protocol has them. */
function extras(ids: readonly string[]): Map<string, PaletteKey> {
  return new Map(
    extraKeys()
      .filter((key) => ids.includes(key.id))
      .map((key) => [key.id, { code: key.code, id: key.id, label: key.label, description: key.description, aliases: [key.long] }]),
  )
}

/** The Magic keys in a sensible order: Caps Lock and Ctrl, Esc and Caps Lock, Alt and Win, Ctrl and Win, Win, the rest. */
const MAGIC_ORDER = [
  'MAGIC_SWAP_CONTROL_CAPSLOCK', 'MAGIC_UNSWAP_CONTROL_CAPSLOCK', 'CL_TOGG', 'MAGIC_CAPSLOCK_TO_CONTROL', 'MAGIC_UNCAPSLOCK_TO_CONTROL',
  'EC_SWAP', 'EC_NORM', 'EC_TOGG',
  'MAGIC_SWAP_LALT_LGUI', 'MAGIC_UNSWAP_LALT_LGUI', 'MAGIC_SWAP_RALT_RGUI', 'MAGIC_UNSWAP_RALT_RGUI', 'MAGIC_SWAP_ALT_GUI', 'MAGIC_UNSWAP_ALT_GUI', 'MAGIC_TOGGLE_ALT_GUI',
  'MAGIC_SWAP_LCTL_LGUI', 'MAGIC_UNSWAP_LCTL_LGUI', 'MAGIC_SWAP_RCTL_RGUI', 'MAGIC_UNSWAP_RCTL_RGUI', 'MAGIC_SWAP_CTL_GUI', 'MAGIC_UNSWAP_CTL_GUI', 'MAGIC_TOGGLE_CTL_GUI',
  'MAGIC_NO_GUI', 'MAGIC_UNNO_GUI', 'MAGIC_TOGGLE_GUI',
  'MAGIC_SWAP_GRAVE_ESC', 'MAGIC_UNSWAP_GRAVE_ESC', 'MAGIC_SWAP_BACKSLASH_BACKSPACE', 'MAGIC_UNSWAP_BACKSLASH_BACKSPACE', 'BS_TOGG',
  'NK_ON', 'NK_OFF', 'NK_TOGG',
]

/** Table keys and extra keys by QMK name, in the order given; names neither has are left out. */
function ordered(list: readonly tables.Keycode[], ids: readonly string[]): PaletteKey[] {
  const fromTables = new Map(entries(pick(list, ids)).map((key) => [key.id, key]))
  const fromExtras = extras(ids)
  return ids.map((id) => fromTables.get(id) ?? fromExtras.get(id)).filter((key): key is PaletteKey => !!key)
}

/** What the connected keyboard is known to have, for the groups whose keys only work with a feature. */
export interface PaletteFeatures {
  /** Key chords (combos) have slots. */
  combos: boolean
  /** Shortcut replacements (key overrides) have slots. */
  keyOverrides: boolean
  /** The keyboard reports Auto Shift's settings (Vial's QMK settings, id 3). */
  autoShift: boolean
}

/**
 * The groups the Keys page adds after the everyday ones (PALETTE_EXTRA_GROUPS): typing helpers, swapped and disabled
 * keys, international keys, and under "More keys" the switches for features and the restart keys. Keys a firmware
 * feature flag says are missing (Caps Word, Layer Lock) are already hidden by the tables; switches for features the
 * keyboard reports no room for are left out.
 */
function extraGroups(features: PaletteFeatures): PaletteGroup[] {
  const switches = [
    ...(features.autoShift ? ['KC_ASON', 'KC_ASOFF', 'KC_ASTG'] : []),
    ...(features.combos ? ['CMB_ON', 'CMB_OFF', 'CMB_TOG'] : []),
    ...(features.keyOverrides ? ['QK_KEY_OVERRIDE_ON', 'QK_KEY_OVERRIDE_OFF', 'QK_KEY_OVERRIDE_TOGGLE'] : []),
    'QK_ONE_SHOT_ON',
    'QK_ONE_SHOT_OFF',
    'QK_ONE_SHOT_TOGGLE',
  ]
  return [
    {
      id: 'helpers',
      title: 'Typing helpers',
      keys: [
        ...entries(tables.KEYCODES_BEHAVIOR_CAPS_WORD),
        ...entries(pick(tables.KEYCODES_MOD_SPECIAL, ['KC_GESC', 'KC_LSPO', 'KC_RSPC', 'KC_LCPO', 'KC_RCPC', 'KC_LAPO', 'KC_RAPC', 'KC_SFTENT'])),
        ...entries(pick(tables.KEYCODES_LAYERS_SPECIAL, ['QK_LAYER_LOCK'])),
      ],
    },
    {
      id: 'magic',
      title: 'Swapped and disabled keys',
      note: 'Each press changes a switch the keyboard remembers; the same switches are on the Typing feel page.',
      link: { label: 'Typing feel', href: '#/typing/magic' },
      keys: ordered(tables.KEYCODES_BEHAVIOR_MAGIC, MAGIC_ORDER),
    },
    {
      id: 'international',
      title: 'International keys',
      note: 'Keys of ISO, Japanese and Korean keyboards. What they type depends on the computer’s keyboard layout.',
      keys: entries([...tables.KEYCODES_ISO, ...tables.KEYCODES_JIS, ...tables.KEYCODES_LANGUAGE]),
    },
    {
      id: 'switches',
      title: 'Features on and off',
      // vial-qmk: combos, key overrides and Auto Shift switch a flag in memory; one-shot keys save theirs (oneshot_set).
      note: 'Chords, replacements and Capitals by holding are back on after a restart; the one-tap switch is kept. Capitals by holding also needs its Typing feel switch on.',
      more: true,
      keys: ordered([...tables.KEYCODES_BEHAVIOR_AUTOSHIFT, ...tables.KEYCODES_BEHAVIOR_COMBO, ...tables.KEYCODES_BEHAVIOR_KEY_OVERRIDE, ...tables.KEYCODES_MOD_ONESHOT_CTRL], switches),
    },
    {
      id: 'restart',
      title: 'Restart and firmware update',
      note: 'Putting the firmware update key on a key needs the keyboard unlocked.',
      more: true,
      keys: entries(pick(tables.KEYCODES_BOOT, ['QK_BOOT', 'QK_REBOOT'])),
    },
  ]
}

/** The ids of the groups only the Keys page offers (keyPalette with `features`). */
export const PALETTE_EXTRA_GROUPS = ['helpers', 'magic', 'international', 'switches', 'restart'] as const

/** A list of slots 0, 1, 2 … as 1, 2 … 0 (see numberedSlots). */
const zeroLast = <T>(list: T[]): T[] => (list.length > 1 ? [...list.slice(1), list[0]] : list)

// --- Numbering of macros and multi-tap keys ----------------------------------------------------------------------
//
// Macros and multi-tap keys (tap dances) are numbered as QMK numbers them: "Macro 1" is M1, "Multi-tap key 0" is
// TD(0). Keychron prints M1 - M5 on keys mapped to QMK's M1 - M5, so the key printed "M1" runs Macro 1. Slot 0 is
// shown and offered last: lists run 1, 2 … then 0, and a new one takes the lowest free number from 1, slot 0 only
// when every other is taken. Don't "fix" this to count from 1 = slot 0; the tests pin it.

/** The slots of a numbered kind in the order they are shown: 1, 2 … count - 1, then 0. */
export function numberedSlots(count: number): number[] {
  if (count <= 0) return []
  return [...Array.from({ length: count - 1 }, (_, i) => i + 1), 0]
}

/** The slot a new one takes: the lowest free number from 1, 0 only when every other is taken; null when none is free. */
export function firstFreeSlot(count: number, isFree: (index: number) => boolean): number | null {
  return numberedSlots(count).find(isFree) ?? null
}

/** "Macro 3" for M3 (a macro without a name of its own). */
export const macroTitle = (index: number): string => `Macro ${index}`

/** "Multi-tap key 3" for TD(3). */
export const tapDanceTitle = (index: number): string => `Multi-tap key ${index}`

/**
 * The keys offered in the palette, grouped the way a person would look for them. With `features` (the Keys page),
 * the extra groups follow the everyday ones (extraGroups); without (the Shortcuts page's pickers, where a macro step
 * or a replacement can't run most of them), the everyday groups only.
 */
export function keyPalette(features?: PaletteFeatures): PaletteGroup[] {
  const groups = everydayGroups()
  return [...groups, ...(features ? extraGroups(features) : [])].filter((group) => group.keys.length > 0)
}

function everydayGroups(): PaletteGroup[] {
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
    // In QMK's numbers, slot 0 last (numberedSlots).
    { id: 'macros', title: 'Macros', keys: zeroLast(entries(tables.KEYCODES_MACRO_M)) },
    { id: 'tapDance', title: 'Multi-tap keys', keys: zeroLast(entries(tables.KEYCODES_TAP_DANCE)) },
    { id: 'repeat', title: 'Repeat keys', keys: entries(tables.KEYCODES_BEHAVIOR_REPEAT) },
  ]
  return groups
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
  /**
   * The sentence shown in the app; {layer} is replaced with the layer's name, {taps} with how many taps keep a
   * layer on (QMK's tapping toggle).
   */
  sentence: string
  hint: string
  /** One or two words above the layer's name on a key in the keyboard picture: "Hold" over "Fn2". */
  short: string
}

export const LAYER_ACTIONS: LayerAction[] = [
  { op: 'MO', sentence: 'While held, use {layer}', hint: 'Like Fn or Shift: active only while the key is down.', short: 'Hold' },
  {
    op: 'TT',
    sentence: 'Hold for {layer}, or tap it {taps} times to keep it on',
    hint: 'Held, like the one above. Tapped that many times in quick succession, the layer stays on until you do it again.',
    short: 'Hold/tap',
  },
  { op: 'TG', sentence: 'Turn {layer} on or off', hint: 'Press once to switch it on, again to switch it off.', short: 'Toggle' },
  { op: 'OSL', sentence: 'Use {layer} for the next key only', hint: 'Tap it, then the next key you press comes from that layer.', short: 'Next key' },
  { op: 'TO', sentence: 'Switch to {layer} and stay there', hint: 'Turns every other layer off. Make sure that layer has a way back.', short: 'Switch to' },
  { op: 'DF', sentence: 'Make {layer} the base layer', hint: 'Changes which layer the keyboard rests on until it restarts.', short: 'Base' },
]

/** QMK's tapping toggle when the keyboard doesn't report it: TAPPING_TOGGLE in vial-qmk's action_tapping.h. */
export const DEFAULT_TAPPING_TOGGLE = 5

/** A layer action's sentence with the layer's name and the number of taps filled in. */
export function layerActionSentence(action: LayerAction, layerName: string, taps = DEFAULT_TAPPING_TOGGLE): string {
  return action.sentence.replace('{layer}', layerName).replace('{taps}', String(taps))
}

export function layerKeycode(op: LayerAction['op'], layer: number): number {
  return deserialize(`${op}(${layer})`)
}

/** The parts of a layer key, or null when the keycode isn't one of LAYER_ACTIONS. */
export function readLayerKey(code: number): { op: LayerAction['op']; layer: number } | null {
  const match = /^(MO|TT|TG|OSL|TO|DF)\((\d+)\)$/.exec(serialize(code))
  return match ? { op: match[1] as LayerAction['op'], layer: Number(match[2]) } : null
}

/** True when the tables know this keycode by name (it is not shown as a bare number). */
export const isKnownKeycode = (code: number): boolean => findKeycode(serialize(code)) !== undefined || extraByCode(code) !== undefined

/** True for a key a shortcut can be built on: a typing key, not media, mouse or a modifier itself. */
export const canTakeModifiers = (code: number): boolean => isBasicKey(code) && code < 0xa5

/** What a keycode does, in plain words: "Volume Up", "Left Ctrl", "1 and !", "Ctrl + C". */
export function keycodeTitle(code: number): string {
  if (code === KC_NOTHING) return 'Nothing'
  if (code === KC_SAME_AS_BELOW) return 'Same as the layer below'
  const extra = extraByCode(code)
  if (extra) return extra.description
  const family = unnamedFamily(code)
  if (family) return family.title
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
