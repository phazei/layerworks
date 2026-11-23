// SPDX-License-Identifier: GPL-3.0-or-later
// The keyboard picture from the keyboard: the keys and knob directions that can be picked, where each one is (the
// middle of the key as drawn, rotation and the chosen layout options included), which one an arrow key moves to, and
// what each is called for a screen reader.

import { KC_NOTHING, KC_SAME_AS_BELOW, keycodeId, keycodeTitle, knobName, visibleLayoutKeys, type KeyboardData } from '../device/api'
import { keyCenter } from '../vendor/pipette/renderer/components/keyboard/key-geometry'
import { KEY_UNIT } from '../vendor/pipette/renderer/components/keyboard/constants'
import type { PictureSelection } from './KeyboardPicture'
import { pictureLabel } from './picture-labels'

export interface PictureTarget {
  /** "key:2,3" or "knob:0,1" (knob, direction). */
  id: string
  selection: PictureSelection
  /** The middle of the key in the picture's own units. */
  x: number
  y: number
}

export type Direction = 'left' | 'right' | 'up' | 'down'

export const targetId = (selection: PictureSelection): string =>
  selection.kind === 'key' ? `key:${selection.row},${selection.col}` : `knob:${selection.knob},${selection.direction}`

/**
 * The keys of the chosen layout, and the knob directions when `knobs` (knobs the app can change), in reading order:
 * top to bottom by row of keys, left to right within one.
 */
export function pictureTargets(keyboard: KeyboardData, knobs: boolean): PictureTarget[] {
  const targets: PictureTarget[] = []
  const seen = new Set<string>()
  for (const key of visibleLayoutKeys(keyboard)) {
    let selection: PictureSelection
    if (key.encoderIdx >= 0) {
      if (!knobs) continue
      selection = { kind: 'knob', knob: key.encoderIdx, direction: key.encoderDir === 1 ? 1 : 0 }
    } else if (key.row >= 0 && key.col >= 0) {
      selection = { kind: 'key', row: key.row, col: key.col }
    } else continue
    const id = targetId(selection)
    if (seen.has(id)) continue
    seen.add(id)
    const { x, y } = keyCenter(key, 1)
    targets.push({ id, selection, x, y })
  }
  // Rows of keys are about a key apart; within half a key counts as the same row.
  const row = (t: PictureTarget) => Math.round(t.y / (KEY_UNIT * 0.5))
  return targets.sort((a, b) => row(a) - row(b) || a.x - b.x)
}

const VECTORS: Record<Direction, [number, number]> = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] }

/**
 * The target an arrow key moves to from `from`: the nearest one that lies that way, preferring one straight ahead to
 * one off to the side (being off to the side counts twice as much as distance ahead). On a staggered, split or
 * rotated layout that is the key a person would point to. Null at the edge.
 */
export function nextTarget(targets: readonly PictureTarget[], from: string, direction: Direction): string | null {
  const start = targets.find((t) => t.id === from)
  if (!start) return targets[0]?.id ?? null
  const [dx, dy] = VECTORS[direction]
  let best: { id: string; score: number } | null = null
  for (const t of targets) {
    if (t.id === from) continue
    const along = (t.x - start.x) * dx + (t.y - start.y) * dy
    const across = Math.abs((t.x - start.x) * dy - (t.y - start.y) * dx)
    // Ahead by at least 0.4 of a key, so the next key of a slanted row isn't "up" or "down".
    if (along < KEY_UNIT * 0.4) continue
    const score = along + 2 * across
    if (!best || score < best.score) best = { id: t.id, score }
  }
  return best?.id ?? null
}

/** "Knob turned left", with the knob's place in order where there is more than one (device knobName). */
function knobWords(keyboard: KeyboardData, knob: number, direction: 0 | 1): string {
  return `${knobName(keyboard.knobIndices, knob)} turned ${direction === 1 ? 'right' : 'left'}`
}

/**
 * What a screen reader says for a target: what it does on `layer`, then where it is ("Escape, row 1, column 2";
 * "Knob turned left: Volume Down"). `extra` adds a note ("red"), after a comma.
 */
export function targetName(keyboard: KeyboardData, layer: number, target: PictureTarget, extra?: string, layerNames?: readonly string[]): string {
  const s = target.selection
  const does = (code: number | undefined) => {
    if (code === undefined || code === KC_NOTHING) return 'Nothing'
    if (code === KC_SAME_AS_BELOW) return 'Same as the layer below'
    const title = keycodeTitle(code)
    // Where the description is only QMK's name (M1, MO(3)), the picture's own words ("Macro 1", "Hold Fn2").
    const label = title === keycodeId(code) ? pictureLabel(code, layerNames) : null
    return label && !label.masked ? label.outer.replace(/\s*\n\s*/g, ' ') : title
  }
  const name =
    s.kind === 'key'
      ? `${does(keyboard.keymap[`${layer},${s.row},${s.col}`])}, row ${s.row + 1}, column ${s.col + 1}`
      : `${knobWords(keyboard, s.knob, s.direction)}: ${does(keyboard.knobs[`${layer},${s.knob},${s.direction}`])}`
  return extra ? `${name}, ${extra}` : name
}
