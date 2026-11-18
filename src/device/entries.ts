// SPDX-License-Identifier: GPL-3.0-or-later
// The four kinds of entry Vial keeps besides macros, with their options in plain names: multi-tap keys (tap
// dance), key chords (combos), shortcut replacements (key overrides) and repeat rules (alt repeat). Each kind has a
// fixed number of slots on the keyboard (16 each on the K15 Max); an empty slot does nothing. Field layouts and
// option bits are vial-qmk's (quantum/vial.h); the vendored protocol code reads and writes them.

import type {
  AltRepeatKeyEntry,
  ComboEntry,
  KeyOverrideEntry,
  TapDanceEntry,
} from '../vendor/pipette/shared/types/protocol'
import { keycodeTitle, parseKeycode } from './keycodes'
import { isEmptyEntry, type EntryKind } from './restore'
import { canSend } from './sendable'

export type { AltRepeatKeyEntry, ComboEntry, KeyOverrideEntry, TapDanceEntry }

/** An entry of one kind. */
export type EntryOf<K extends EntryKind> = {
  tapDance: TapDanceEntry
  combo: ComboEntry
  keyOverride: KeyOverrideEntry
  altRepeatKey: AltRepeatKeyEntry
}[K]

export type AnyEntry = EntryOf<EntryKind>

/** QMK's default time that tells a tap from a hold, in ms. */
export const DEFAULT_TAPPING_TERM = 200
export const MAX_TAPPING_TERM = 10000

/** Key override options (vial.h `vial_ko_option_*`); `enabled` is a field of its own. */
export const OVERRIDE_OPTIONS = {
  /** Activates when the key is pressed with the modifiers held. */
  triggerDown: 1 << 0,
  /** Activates when a modifier is pressed while the key is held. */
  requiredModDown: 1 << 1,
  /** Activates when a modifier it must not see is let go. */
  negativeModUp: 1 << 2,
  /** Any one of the trigger modifiers is enough, not all of them. */
  oneMod: 1 << 3,
  /** After the replacement, don't press the original key again while it is still held. */
  noReregister: 1 << 4,
  /** Keep the replacement down when another key is pressed. */
  noUnregisterOnOther: 1 << 5,
} as const
/** QMK's ko_options_default: the three ways to activate. */
export const OVERRIDE_DEFAULT_OPTIONS = 0b111
/** Every layer. */
export const ALL_LAYERS = 0xffff

/** Alt repeat options (vial.h `vial_arep_option_*`); `enabled` is a field of its own. */
export const REPEAT_OPTIONS = {
  /** After any key no rule covers, the repeat key sends this rule's alternate key. */
  defaultToThisAltKey: 1 << 0,
  /** Works both ways: after the alternate key, the repeat key sends the first one. */
  bidirectional: 1 << 1,
  /** Left and right modifiers count as the same. */
  ignoreModHandedness: 1 << 2,
} as const

/**
 * The 8-bit modifier masks key overrides and repeat rules use: left Ctrl, Shift, Alt, Win in bits 0-3, the right
 * ones in bits 4-7. Where both sides of a modifier are set, either one counts.
 */
export const MOD_KEYS = [
  { bit: 0x01, name: 'Left Ctrl' },
  { bit: 0x02, name: 'Left Shift' },
  { bit: 0x04, name: 'Left Alt' },
  { bit: 0x08, name: 'Left Win' },
  { bit: 0x10, name: 'Right Ctrl' },
  { bit: 0x20, name: 'Right Shift' },
  { bit: 0x40, name: 'Right Alt' },
  { bit: 0x80, name: 'Right Win' },
] as const

/** A modifier on either side: both bits. */
export const MOD_PAIRS = [
  { bits: 0x11, name: 'Ctrl' },
  { bits: 0x22, name: 'Shift' },
  { bits: 0x44, name: 'Alt' },
  { bits: 0x88, name: 'Win' },
] as const

/** "Ctrl + Shift", "Left Alt": a pair is named plainly when both sides are set. */
export function modsText(mask: number): string {
  const parts: string[] = []
  for (const pair of MOD_PAIRS) {
    const set = mask & pair.bits
    if (set === pair.bits) parts.push(pair.name)
    else if (set) parts.push(MOD_KEYS.find((m) => m.bit === set)!.name)
  }
  return parts.join(' + ')
}

export function emptyEntry<K extends EntryKind>(kind: K): EntryOf<K> {
  const entries: { [P in EntryKind]: EntryOf<P> } = {
    tapDance: { onTap: 0, onHold: 0, onDoubleTap: 0, onTapHold: 0, tappingTerm: DEFAULT_TAPPING_TERM },
    combo: { key1: 0, key2: 0, key3: 0, key4: 0, output: 0 },
    keyOverride: {
      triggerKey: 0,
      replacementKey: 0,
      layers: ALL_LAYERS,
      triggerMods: 0,
      negativeMods: 0,
      suppressedMods: 0,
      options: OVERRIDE_DEFAULT_OPTIONS,
      enabled: true,
    },
    altRepeatKey: { lastKey: 0, altKey: 0, allowedMods: 0, options: 0, enabled: true },
  }
  return entries[kind]
}

/** Whether the entry does nothing (all its keys empty): a free slot. */
export const entryIsEmpty = (kind: EntryKind, entry: AnyEntry): boolean => isEmptyEntry(kind, entry)

export function sameEntry(a: AnyEntry, b: AnyEntry): boolean {
  const ra = a as unknown as Record<string, unknown>
  const rb = b as unknown as Record<string, unknown>
  return [...new Set([...Object.keys(ra), ...Object.keys(rb)])].every((k) => ra[k] === rb[k])
}

/** The same entry, or both empty (an empty slot's other fields, such as an unset tapping term, don't count). */
export const entriesMatch = (kind: EntryKind, a: AnyEntry, b: AnyEntry): boolean =>
  sameEntry(a, b) || (entryIsEmpty(kind, a) && entryIsEmpty(kind, b))

/** The trigger keys of a chord, in order, without the empty ones. */
export const chordKeys = (c: ComboEntry): number[] => [c.key1, c.key2, c.key3, c.key4].filter((k) => k !== 0)

/** A chord with these trigger keys (up to four). */
export function withChordKeys(c: ComboEntry, keys: number[]): ComboEntry {
  const [key1 = 0, key2 = 0, key3 = 0, key4 = 0] = keys
  return { ...c, key1, key2, key3, key4 }
}

/** Why an entry can't be saved as it is, in words; null when it can. An empty entry can always be saved (clears). */
export function entryProblem(kind: EntryKind, entry: AnyEntry): string | null {
  if (entryIsEmpty(kind, entry)) return null
  switch (kind) {
    case 'tapDance': {
      const e = entry as TapDanceEntry
      if (!e.onTap && !e.onHold && !e.onDoubleTap && !e.onTapHold) return 'Pick what at least one of them does.'
      if (!Number.isInteger(e.tappingTerm) || e.tappingTerm < 1 || e.tappingTerm > MAX_TAPPING_TERM) {
        return `The time for a hold must be between 1 and ${MAX_TAPPING_TERM} ms.`
      }
      return null
    }
    case 'combo': {
      const e = entry as ComboEntry
      const keys = chordKeys(e)
      if (keys.length < 2) return 'A chord needs at least two keys.'
      if (new Set(keys).size !== keys.length) return 'The same key is in the chord twice.'
      // The firmware stops at the first empty key, so the keys must come first.
      const all = [e.key1, e.key2, e.key3, e.key4]
      if (all.slice(all.indexOf(0) + 1).some((k) => k !== 0) && all.includes(0)) {
        return 'Leave no gap between the chord’s keys.'
      }
      if (!e.output) return 'Pick what the chord does.'
      return null
    }
    case 'keyOverride': {
      const e = entry as KeyOverrideEntry
      if (!e.triggerKey) return 'Pick the key that is replaced.'
      if (!e.replacementKey) return 'Pick what is sent instead.'
      // process_key_override.c sends ordinary keys only (sendable.ts).
      if (!canSend('overrideSends', e.replacementKey)) {
        return `The keyboard can’t send ${keycodeTitle(e.replacementKey)} as a replacement: only ordinary keys, with modifiers if you like. Pick another.`
      }
      if (!canSend('overrideTrigger', e.triggerKey)) {
        return `The keyboard can only replace an ordinary key, not ${keycodeTitle(e.triggerKey)}. Pick another, and the modifiers above.`
      }
      if (!e.layers) return 'Pick at least one layer it works on.'
      if (!(e.options & 0b111)) return 'Pick at least one way it starts (under More options).'
      return null
    }
    case 'altRepeatKey': {
      const e = entry as AltRepeatKeyEntry
      if (!e.lastKey) return 'Pick the key that comes first.'
      if (!e.altKey) return 'Pick what the repeat key sends after it.'
      return null
    }
  }
}

/** The keycode that runs multi-tap key `index` (QMK's TD(n)), for the connected keyboard's protocol. */
export const tapDanceKeycode = (index: number): number | null => parseKeycode(`TD(${index})`)

/** The alternate repeat key (QK_ALT_REPEAT_KEY), which repeat rules need on the keyboard. */
export const altRepeatKeycode = (): number | null => parseKeycode('QK_ALT_REPEAT_KEY')
