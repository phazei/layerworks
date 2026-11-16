// SPDX-License-Identifier: GPL-3.0-or-later
// Keychron's typing settings in plain words: the key bounce filter (dynamic debounce) and Snap Click (SOCD), as
// Keychron's firmware implements them (keyboards/keychron/common/debounce/keychron_debounce.c and
// snap_click/snap_click.c in vial-qmk).

import type { SnapClickEntry } from '../vendor/pipette/shared/types/keychron'

export type { SnapClickEntry }

export interface Debounce {
  type: number
  /** Milliseconds, 0 – 255; 0 turns the filter off whatever the type. */
  time: number
}

export interface DebounceType {
  type: number
  name: string
  /** QMK's name for the algorithm. */
  qmkName: string
  hint: string
  /** One of the two offered without "More options". */
  everyday: boolean
}

/** Keychron's numbering (keychron_debounce.h), everyday ones first. */
export const DEBOUNCE_TYPES: readonly DebounceType[] = [
  {
    type: 4,
    name: 'React at once',
    qmkName: 'sym_eager_pk',
    hint: 'Each key counts the moment it goes down, then ignores the flicker that follows. The quickest, and the usual choice.',
    everyday: true,
  },
  {
    type: 2,
    name: 'Wait until steady',
    qmkName: 'sym_defer_pk',
    hint: 'Each key counts only once it has been steady for the whole time. A little slower, but it also ignores stray electrical noise.',
    everyday: true,
  },
  {
    type: 5,
    name: 'React at once, wait on release',
    qmkName: 'asym_eager_defer_pk',
    hint: 'Presses count at once; a key counts as let go only once it has been up for the whole time. At most 127 ms.',
    everyday: false,
  },
  {
    type: 3,
    name: 'React at once, by row',
    qmkName: 'sym_eager_pr',
    hint: 'Like “React at once”, but keys in one row share a timer. Slightly lighter work for the keyboard.',
    everyday: false,
  },
  {
    type: 1,
    name: 'Wait until steady, by row',
    qmkName: 'sym_defer_pr',
    hint: 'Like “Wait until steady”, but keys in one row share a timer.',
    everyday: false,
  },
  {
    type: 0,
    name: 'Wait until the whole keyboard is steady',
    qmkName: 'sym_defer_g',
    hint: 'Nothing counts until no key has changed for the whole time. QMK’s plain default; slow when typing fast.',
    everyday: false,
  },
  {
    type: 6,
    name: 'No filter',
    qmkName: 'none',
    hint: 'Every flicker counts. Keys may type twice; for testing only.',
    everyday: false,
  },
]

export const debounceType = (type: number): DebounceType | undefined => DEBOUNCE_TYPES.find((t) => t.type === type)

/** The asymmetric filter keeps at most 127 ms (keychron_debounce.c). */
export const debounceMax = (type: number): number => (type === 5 ? 127 : 255)

export interface SnapClickRule {
  type: number
  /** What happens with both keys down; `first` and `second` are the pair's key names. */
  name: (first: string, second: string) => string
  hint: string
}

/** Keychron's Snap Click types (snap_click.c), most useful first. 0 is an unused slot. */
export const SNAP_CLICK_RULES: readonly SnapClickRule[] = [
  {
    type: 2,
    name: () => 'The last one pressed wins',
    hint: 'Let it go while still holding the other, and the other comes back. The usual choice for games.',
  },
  {
    type: 1,
    name: () => 'The last one pressed wins, once',
    hint: 'Let it go and neither counts until you press again.',
  },
  {
    type: 5,
    name: () => 'Both down cancel out',
    hint: 'Neither counts while both are down; let one go and the other comes back.',
  },
  {
    type: 3,
    name: (first) => `${first} always wins`,
    hint: 'While both are down only the first key of the pair counts.',
  },
  {
    type: 4,
    name: (_first, second) => `${second} always wins`,
    hint: 'While both are down only the second key of the pair counts.',
  },
]

export const snapClickRule = (type: number): SnapClickRule | undefined => SNAP_CLICK_RULES.find((r) => r.type === type)

/** Ready-made pairs: the usual opposite directions in games. Keycodes are HID usages, as Snap Click stores them. */
export const SNAP_CLICK_PRESETS: readonly { key1: number; key2: number }[] = [
  { key1: 0x04, key2: 0x07 }, // A, D
  { key1: 0x1a, key2: 0x16 }, // W, S
  { key1: 0x50, key2: 0x4f }, // Left, Right
  { key1: 0x52, key2: 0x51 }, // Up, Down
]

/** Snap Click takes plain keys only (8-bit keycodes); 0 is no key. */
export const isSnapClickKey = (code: number): boolean => code > 0x01 && code <= 0xff

/** Why a pair can't be saved as it is, or null. An unused slot (type 0) always can. */
export function snapClickProblem(entry: SnapClickEntry): string | null {
  if (entry.type === 0) return null
  if (!snapClickRule(entry.type)) return 'Pick what happens when both are down.'
  if (!isSnapClickKey(entry.key1) || !isSnapClickKey(entry.key2)) return 'Pick two keys.'
  if (entry.key1 === entry.key2) return 'Pick two different keys.'
  return null
}

export const EMPTY_SNAP_CLICK: SnapClickEntry = { type: 0, key1: 0, key2: 0 }
