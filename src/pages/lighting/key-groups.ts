// SPDX-License-Identifier: GPL-3.0-or-later
// Groups of keys to colour at once (letters, numbers, ...), worked out from what the keys type on the base layer,
// and the ready-made colour schemes ("starting points") built on them. Positions are "row,col"; only keys with a
// light are included.

import { matrixKeys, visibleLayoutKeys, type Hsv, type KeyboardData } from '../../device'

export interface KeyGroup {
  id: string
  name: string
  keys: string[]
}

/** Basic keycodes (HID usages) by group. Keys with a modifier or a layer action are matched by their basic key. */
const inRange = (from: number, to: number) => (code: number) => code >= from && code <= to
const GROUPS: { id: string; name: string; has: (code: number) => boolean }[] = [
  { id: 'letters', name: 'Letters', has: inRange(0x04, 0x1d) },
  { id: 'numbers', name: 'Numbers', has: inRange(0x1e, 0x27) },
  { id: 'function', name: 'F-keys', has: (c) => inRange(0x3a, 0x45)(c) || inRange(0x68, 0x73)(c) },
  { id: 'arrows', name: 'Arrows', has: inRange(0x4f, 0x52) },
  { id: 'modifiers', name: 'Shift, Ctrl, Alt, Win', has: inRange(0xe0, 0xe7) },
]

const WASD = [0x1a, 0x04, 0x16, 0x07]

/** The basic key a keycode types: itself up to 0xFF, a modifier + key's key; anything else none. */
function basicKey(code: number): number | null {
  if (code <= 0xff) return code
  // QK_MODS (0x0100 – 0x1FFF): modifiers in the high byte, the key in the low one.
  if (code < 0x2000) return code & 0xff
  return null
}

function keysOf(keyboard: KeyboardData, layer: number, leds: ReadonlyMap<string, number>, has: (code: number) => boolean): string[] {
  return [...leds.keys()].filter((pos) => {
    const code = basicKey(keyboard.keymap[`${layer},${pos}`] ?? 0)
    return code !== null && has(code)
  })
}

/** The groups this keyboard has keys for, then one per row of the key matrix. */
export function keyGroups(keyboard: KeyboardData, layer: number, allLeds: ReadonlyMap<string, number>): KeyGroup[] {
  // Only keys of the chosen layout (device/layout-options.ts): an LED under an unchosen alternative isn't a key.
  const present = new Set(matrixKeys(keyboard))
  const leds = new Map([...allLeds].filter(([pos]) => present.has(pos)))
  const named = GROUPS.map((g) => ({ id: g.id, name: g.name, keys: keysOf(keyboard, layer, leds, g.has) })).filter((g) => g.keys.length > 0)
  const rows = new Map<number, string[]>()
  for (const pos of leds.keys()) {
    const row = Number(pos.split(',')[0])
    rows.set(row, [...(rows.get(row) ?? []), pos])
  }
  const byRow = [...rows.entries()]
    .sort(([a], [b]) => a - b)
    .map(([row, keys], i) => ({ id: `row:${row}`, name: `Row ${i + 1}`, keys }))
  return [...named, ...byRow]
}

/** Every LED set to `colour`, then `paint` applied per key. */
function scheme(count: number, base: Hsv, leds: ReadonlyMap<string, number>, paint: (pos: string) => Hsv | null): Hsv[] {
  const out = Array.from({ length: count }, () => [...base] as Hsv)
  for (const [pos, led] of leds) {
    const colour = paint(pos)
    if (colour) out[led] = colour
  }
  return out
}

export interface StartingPoint {
  id: string
  name: string
  /** The colours for every LED. */
  colours: (keyboard: KeyboardData, layer: number, leds: ReadonlyMap<string, number>, count: number) => Hsv[]
  /** A few colours to show on its button. */
  sample: Hsv[]
}

const FULL = 255

export const STARTING_POINTS: StartingPoint[] = [
  {
    id: 'rainbow',
    name: 'Rainbow across',
    // Hue from the key's place left to right in the picture, red to purple.
    colours: (keyboard, _layer, leds, count) => {
      // The keys of the chosen layout, where the picture draws them (device/layout-options.ts).
      const keys = visibleLayoutKeys(keyboard)
      const xOf = new Map(keys.map((k) => [`${k.row},${k.col}`, k.x + k.width / 2]))
      const xs = [...leds.keys()].map((p) => xOf.get(p) ?? 0)
      const [min, max] = [Math.min(...xs), Math.max(...xs)]
      return scheme(count, [0, FULL, FULL], leds, (pos) => {
        const x = xOf.get(pos) ?? min
        return [Math.round(((x - min) / Math.max(max - min, 1)) * 220), FULL, FULL]
      })
    },
    sample: [0, 40, 85, 140, 200].map((h) => [h, FULL, FULL] as Hsv),
  },
  {
    id: 'wasd',
    name: 'Highlight WASD and arrows',
    colours: (keyboard, layer, leds, count) => {
      const highlight = new Set(keysOf(keyboard, layer, leds, (c) => WASD.includes(c) || inRange(0x4f, 0x52)(c)))
      return scheme(count, [170, 140, FULL], leds, (pos) => (highlight.has(pos) ? [0, FULL, FULL] : null))
    },
    sample: [[170, 140, FULL], [0, FULL, FULL], [170, 140, FULL]],
  },
  {
    id: 'warm',
    name: 'Warm white, coloured modifiers',
    colours: (keyboard, layer, leds, count) => {
      // Everything that isn't a letter, number or space: modifiers, Esc, Enter, Tab, arrows ...
      const plain = new Set(keysOf(keyboard, layer, leds, (c) => inRange(0x04, 0x27)(c) || c === 0x2c))
      return scheme(count, [22, 110, FULL], leds, (pos) => (plain.has(pos) ? null : [128, FULL, FULL]))
    },
    sample: [[22, 110, FULL], [128, FULL, FULL], [22, 110, FULL]],
  },
]
