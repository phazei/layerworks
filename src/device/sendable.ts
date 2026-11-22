// SPDX-License-Identifier: GPL-3.0-or-later
// What the keyboard will actually run in each place a shortcut sends or waits for a key, read from vial-qmk
// (quantum/, Vial protocol 6). The Shortcuts page's key pickers offer these and nothing else, and validation
// (entries.ts) names what a saved entry holds that the firmware won't send.
//
//   Key chord sends     process_combo.c apply_combo: the output becomes the record's keycode and goes through the
//                       whole key processing (action_tapping_process). Any keycode.
//   Multi-tap key       vial.c vial_keycode_down / _up / _tap: up to QK_MODS_MAX through register_code16, anything
//                       above through action_exec on Vial's magic matrix position, so the whole processing. Any keycode.
//   Macro step          dynamic_keymap.c dynamic_keymap_macro_send: two-byte keycodes (VIAL_MACRO_EXT_TAP / DOWN / UP)
//                       go to the same vial_keycode_tap / down / up. Any keycode (on Vial protocol 2 and later).
//   Repeat rule sends   repeat_key.c alt_repeat_key_invoke: the alternate keycode goes through process_record. Any keycode.
//   Replacement sends   process_key_override.c try_activating_override: the replacement is stripped of its modifiers
//                       and registered with add_key / register_code(uint8_t). Only ordinary keys (up to 0xFF) with
//                       modifiers; a larger code would be cut to its low byte, a different key.
//   Replacement trigger The same file compares the trigger with the pressed key's keycode and re-registers it with
//                       register_code(uint8_t): ordinary keys only; its modifiers are a field of their own.
//
// Groups left out where the firmware would run them anyway are about sense, not ability: a shortcut that sends a
// multi-tap or repeat key, or a macro step that runs another macro.

import type { NkroMode } from './capabilities'
import { keyPalette, type PaletteFeatures, type PaletteGroup, type PaletteKey } from './keycodes'

/** The places a shortcut holds a key, as the pickers ask for them. */
export type KeyUse =
  | 'chordSends'
  | 'chordKey'
  | 'multiTap'
  | 'macroTap'
  | 'macroHold'
  | 'repeatAfter'
  | 'repeatSends'
  | 'overrideTrigger'
  | 'overrideSends'

interface UseRule {
  /** Offer the Keys page's extra groups (typing helpers, swapped keys …); `true` all, or the ids of some. */
  extra: boolean | readonly string[]
  /** Palette groups left out, for sense rather than ability. */
  without: readonly string[]
  /** The largest keycode the firmware runs here; keys above it are left out and flagged. */
  max?: number
}

const RUNS_OTHER_SHORTCUTS = ['tapDance', 'repeat'] as const
const RUNS_ANY_SHORTCUT = ['macros', 'tapDance', 'repeat'] as const

/** A plain key, up to 0xFF: what register_code takes. */
export const ORDINARY_KEY_MAX = 0xff
/** A plain key with modifiers (QK_MODS_MAX): what a shortcut replacement can send. */
export const KEY_WITH_MODS_MAX = 0x1fff

export const KEY_USES: Record<KeyUse, UseRule> = {
  chordSends: { extra: true, without: RUNS_OTHER_SHORTCUTS },
  // The keys of a chord: what keys on the keyboard send, so the everyday ones.
  chordKey: { extra: false, without: RUNS_ANY_SHORTCUT },
  multiTap: { extra: true, without: RUNS_OTHER_SHORTCUTS },
  macroTap: { extra: true, without: RUNS_ANY_SHORTCUT },
  // Held down and let go: keys that mean something while held. A swap or a restart held down does what a tap does.
  macroHold: { extra: ['helpers', 'international'], without: RUNS_ANY_SHORTCUT },
  repeatAfter: { extra: false, without: RUNS_ANY_SHORTCUT },
  repeatSends: { extra: true, without: RUNS_OTHER_SHORTCUTS },
  overrideTrigger: { extra: true, without: RUNS_ANY_SHORTCUT, max: ORDINARY_KEY_MAX },
  // The picker adds the modifiers to an ordinary key; a shifted symbol is one already.
  overrideSends: { extra: true, without: RUNS_ANY_SHORTCUT, max: KEY_WITH_MODS_MAX },
}

/** Vial's QMK setting id for Auto Shift on or off: reported only by firmware with Auto Shift. */
const AUTO_SHIFT_QSID = 3

/**
 * What the connected keyboard is known to have, for the palette's feature switches. `nkro` is the capabilities'
 * mode: the N-key rollover keys are offered only where they do something ('setting'); without it, as QMK has them.
 */
export function paletteFeatures(
  keyboard: { counts: { combo: number; keyOverride: number } } | null,
  settings: Readonly<Record<number, unknown>> | null,
  nkro: NkroMode = 'setting',
): PaletteFeatures {
  return {
    combos: (keyboard?.counts.combo ?? 0) > 0,
    keyOverrides: (keyboard?.counts.keyOverride ?? 0) > 0,
    autoShift: settings?.[AUTO_SHIFT_QSID] !== undefined,
    nkro: nkro === 'setting',
  }
}

/** Everything the Keys page offers, so every group a rule can pick from is there. */
const ALL_FEATURES: PaletteFeatures = { combos: true, keyOverrides: true, autoShift: true }

/**
 * The palette groups a picker offers for `use`. `features` is what the keyboard is known to have (as on the Keys
 * page); without, every feature switch is offered.
 */
export function groupsFor(use: KeyUse, features: PaletteFeatures = ALL_FEATURES): PaletteGroup[] {
  const rule = KEY_USES[use]
  const everyday = new Set(keyPalette().map((group) => group.id))
  const fits = (key: PaletteKey) => rule.max === undefined || key.code <= rule.max
  return keyPalette(features)
    .filter((group) => !rule.without.includes(group.id))
    .filter((group) => everyday.has(group.id) || rule.extra === true || (Array.isArray(rule.extra) && rule.extra.includes(group.id)))
    .map((group) => ({ ...group, keys: group.keys.filter(fits) }))
    .filter((group) => group.keys.length > 0)
}

/** Whether the firmware sends `code` in this place. Only the replacement's keys have a limit. */
export function canSend(use: KeyUse, code: number): boolean {
  const max = KEY_USES[use].max
  return max === undefined || code <= max
}
