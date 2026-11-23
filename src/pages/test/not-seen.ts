// SPDX-License-Identifier: GPL-3.0-or-later
// "Not seen yet: F5, Insert and Right Ctrl": the keys the Test page still waits for, by what they do, once most are
// done. Named rather than only shown, so they can be found without telling the picture's colours apart, and read out.

import { KC_NOTHING, KC_SAME_AS_BELOW, keycodeId, keycodeTitle, knobName, type KeyboardData } from '../../device'
import { pictureLabel } from '../../ui/picture-labels'

/** The list appears once no more than this share of the keys is left. */
export const NOT_SEEN_SHARE = 0.25
/** At most this many names; the rest are counted. */
export const NOT_SEEN_NAMES = 20

/**
 * What a key is called: what it does on `layer` (the layer the picture shows), or on the base layer where it does
 * nothing there or passes through, or its place on the board where it does nothing on either.
 */
export function keyNameAt(keyboard: KeyboardData, layer: number, pos: string, layerNames?: readonly string[]): string {
  const [row, col] = pos.split(',').map(Number)
  const empty = (code: number | undefined) => code === undefined || code === KC_NOTHING || code === KC_SAME_AS_BELOW
  const here = keyboard.keymap[`${layer},${row},${col}`]
  const code = empty(here) ? keyboard.keymap[`0,${row},${col}`] : here
  return empty(code) ? `the key at row ${row + 1}, column ${col + 1}` : plainName(code!, layerNames)
}

/** The key's description; where that is only QMK's name (M1, MO(3)), the picture's words ("Macro 1", "Hold Fn2"). */
function plainName(code: number, layerNames?: readonly string[]): string {
  const title = keycodeTitle(code)
  if (title !== keycodeId(code)) return title
  const label = pictureLabel(code, layerNames)
  return label && !label.masked ? label.outer.replace(/\s*\n\s*/g, ' ') : title
}

/** "Knob turned left", or "Knob 2 turned left" where there is more than one knob (by place in order: knobName). */
export function turnWords(position: string, indices: readonly number[]): string {
  const [knob, direction] = position.split(',')
  return `${knobName(indices, Number(knob))} turned ${direction === '1' ? 'right' : 'left'}`
}

/**
 * The line, or null while more than a quarter of the keys are left (or none are). `keys` and `seen` are "row,col";
 * `turns` are the knob directions the page can check and hasn't seen yet ("knob,direction").
 */
export function notSeenLine(
  keyboard: KeyboardData,
  layer: number,
  keys: readonly string[],
  seen: ReadonlySet<string>,
  turns: readonly string[] = [],
  layerNames?: readonly string[],
): string | null {
  const left = keys.filter((key) => !seen.has(key))
  if (keys.length === 0 || left.length > keys.length * NOT_SEEN_SHARE) return null
  const keyNames = left.map((key) => keyNameAt(keyboard, layer, key, layerNames))
  // Two keys that do the same (a split space bar) are told apart by their place.
  const twice = (name: string) => keyNames.filter((other) => other === name).length > 1
  const placed = keyNames.map((name, i) => {
    const [row, col] = left[i].split(',').map(Number)
    return twice(name) ? `${name} (row ${row + 1}, column ${col + 1})` : name
  })
  const names = [...placed, ...turns.map((turn) => turnWords(turn, keyboard.knobIndices))]
  if (names.length === 0) return null
  const shown = names.slice(0, NOT_SEEN_NAMES)
  const more = names.length - shown.length
  const list =
    more > 0
      ? `${shown.join(', ')} and ${more} more`
      : shown.length === 1
        ? shown[0]
        : `${shown.slice(0, -1).join(', ')} and ${shown.at(-1)}`
  return `Not seen yet: ${list}.`
}
