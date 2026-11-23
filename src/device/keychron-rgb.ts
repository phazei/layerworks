// SPDX-License-Identifier: GPL-3.0-or-later
// Keychron's own lighting, as its firmware implements it (vial-qmk keyboards/keychron/common/rgb/): a colour for
// each key ("Key by key", Keychron's per-key RGB) and zones of keys each playing their own effects ("Mixed zones",
// mixed RGB). The packets that change them, and the numbers they use. Pure; the device store sends them.
//
// What the firmware does with them (keychron_rgb.c, per_key_rgb.c, mixed_rgb.c):
// - Every write changes the running copy at once and is shown on the next frame; the save command (0xA8 0x02)
//   writes all of it (lock light colour, per-key style and colours, zone map, zone effects) to EEPROM with
//   eeprom_update_block, which skips bytes that haven't changed. So the app writes as the user paints and saves
//   after a pause.
// - A key's colour is hue and saturation only: every per-key style replaces its brightness with the keyboard's
//   brightness setting. The app writes 255 for it.
// - There are EFFECT_LAYERS zones (2 unless a keyboard says otherwise; the info command reports it) and every LED
//   belongs to one. Each zone has EFFECTS_PER_LAYER (5) effect slots, played in turn for `time` ms each with a
//   one-second fade between them; effect 0 is an empty slot. Each slot has its own colour (hue, saturation) and
//   speed; brightness is the keyboard's. Zone effects are numbered as the keyboard's own effect list (QMK's
//   RGB_MATRIX_* order), not as VialRGB: see zoneEffectNumbers.
// - Replies are [0xA8, command, status, ...data]; status 0 is success. A write the firmware refuses (too many in
//   one packet, a zone number or effect out of range) answers status 1 and changes nothing.

import { REPORT_LEN } from './link'

export const KC_RGB = 0xa8
const RGB_SAVE = 0x02
const PER_KEY_SET_TYPE = 0x08
const PER_KEY_SET_COLOR = 0x0a
const MIXED_SET_REGIONS = 0x0d
const MIXED_SET_EFFECT_LIST = 0x0f

/** Packet limits checked by the firmware. */
export const COLOURS_PER_PACKET = 9
export const REGIONS_PER_PACKET = 28
export const EFFECTS_PER_PACKET = 3

/** A key's colour as the keyboard stores it: hue, saturation, value (the last is not used; see above). */
export type Hsv = [number, number, number]

/** The per-key styles (keychron_rgb_type.h, PER_KEY_RGB_*), in the firmware's numbering. */
export const PER_KEY_STYLE_COUNT = 5

/** The rows the vendored Keychron reload asks the LED map for (keychron-protocol.ts, getKeychronLedMatrix). */
const VENDORED_LED_ROWS = 8

/**
 * Compatibility: Keychron boards with more than 8 matrix rows (keyboards/keychron/c100_8k, 10 rows, with Keychron's
 * per-key lighting) have LEDs under keys in rows the vendored reload never asks about, while the firmware answers
 * for any row of its matrix (keyboards/keychron/common/rgb/keychron_rgb.c, `row > MATRIX_ROWS` refused). Where this
 * is true the store reads the LED map again for every row, so every key can be painted.
 */
export function ledRowsMissed(rows: number): boolean {
  return rows > VENDORED_LED_ROWS
}

/** One effect slot of a zone (effect_config_t). `effect` is in the keyboard's own numbering; 0 is empty. */
export interface ZoneEffect {
  effect: number
  hue: number
  sat: number
  speed: number
  /** How long it plays before the next one, in ms. */
  time: number
}

/** The VialRGB id of the per-key and mixed effects in tymon3310/vial-qmk's supported-mode table. */
export const PER_KEY_EFFECT = 48
export const ZONES_EFFECT = 49

function packet(...bytes: number[]): Uint8Array {
  const out = new Uint8Array(REPORT_LEN)
  out.set(bytes.slice(0, REPORT_LEN))
  return out
}

/**
 * The stretches of LED indices to send so that every changed one is covered, each at most `max` long. Unchanged
 * LEDs inside a stretch are sent too (with their current value): fewer packets than skipping them.
 */
export function runs(changed: readonly number[], max: number): { start: number; count: number }[] {
  const sorted = [...new Set(changed)].sort((a, b) => a - b)
  const out: { start: number; count: number }[] = []
  for (const index of sorted) {
    const last = out.at(-1)
    if (last && index < last.start + max) last.count = index - last.start + 1
    else out.push({ start: index, count: 1 })
  }
  return out
}

const differing = <T>(before: readonly T[], after: readonly T[], same: (a: T, b: T) => boolean) =>
  after.flatMap((value, i) => (before[i] !== undefined && same(before[i], value) ? [] : [i]))

const sameHsv = (a: Hsv, b: Hsv) => a[0] === b[0] && a[1] === b[1] && a[2] === b[2]

/** `[0xA8, 0x0A, start, count, h, s, v, ...]` for every stretch of keys whose colour changes. */
export function colourPackets(before: readonly Hsv[], after: readonly Hsv[]): Uint8Array[] {
  return runs(differing(before, after, sameHsv), COLOURS_PER_PACKET).map(({ start, count }) =>
    packet(KC_RGB, PER_KEY_SET_COLOR, start, count, ...after.slice(start, start + count).flat()),
  )
}

/** `[0xA8, 0x0D, start, count, zone, ...]` for every stretch of LEDs whose zone changes. */
export function regionPackets(before: readonly number[], after: readonly number[]): Uint8Array[] {
  return runs(differing(before, after, (a, b) => a === b), REGIONS_PER_PACKET).map(({ start, count }) =>
    packet(KC_RGB, MIXED_SET_REGIONS, start, count, ...after.slice(start, start + count)),
  )
}

/** `[0xA8, 0x0F, zone, start, count, 8-byte records]`: every slot of a zone, three to a packet. */
export function effectPackets(zone: number, effects: readonly ZoneEffect[]): Uint8Array[] {
  const out: Uint8Array[] = []
  for (let start = 0; start < effects.length; start += EFFECTS_PER_PACKET) {
    const slice = effects.slice(start, start + EFFECTS_PER_PACKET)
    const records = slice.flatMap((e) => {
      const time = Math.max(0, Math.min(0xffffffff, Math.round(e.time)))
      return [e.effect, e.hue, e.sat, e.speed, time & 0xff, (time >>> 8) & 0xff, (time >>> 16) & 0xff, (time >>> 24) & 0xff]
    })
    out.push(packet(KC_RGB, MIXED_SET_EFFECT_LIST, zone, start, slice.length, ...records))
  }
  return out
}

/**
 * The lock lights (keychron_rgb.c, os_indicator_config_t): one colour for every lock light the keyboard has, and
 * an off bit per light. `GET_INDICATORS_CONFIG` (0x03) answers `[0xA8, 0x03, status, available, disabled, h, s,
 * v]`; `SET_INDICATORS_CONFIG` (0x04) takes `[disabled, h, s, v]`, shows it at once (led_update_kb) and raises a
 * brightness under 128 to 128. Saved with the rest by 0xA8 0x02. Default: all on, white (h 255, s 0, v 255).
 * Whether a light uses the brightness is the keymap's business: the K15 Max's ripple keymap strobes Caps Lock with
 * the hue and saturation at full brightness and honours the off bit; stock Keychron firmware uses all three.
 */
export interface LockLights {
  /** A set bit turns that light off (keychron_rgb_type.h, os_led_t). */
  disableMask: number
  hue: number
  sat: number
  val: number
}

/** The lock lights in os_led_t's bit order, with the names printed on the keys. */
export const LOCK_LIGHTS: readonly { bit: number; name: string }[] = [
  { bit: 0x01, name: 'Num Lock' },
  { bit: 0x02, name: 'Caps Lock' },
  { bit: 0x04, name: 'Scroll Lock' },
  { bit: 0x08, name: 'Compose' },
  { bit: 0x10, name: 'Kana' },
]

/** The firmware keeps the lock lights' brightness at this or more. */
export const LOCK_LIGHT_MIN_VAL = 128

const SET_INDICATORS = 0x04

/** The values as the keyboard will keep them: bytes, the brightness raised to the firmware's minimum. */
export function normaliseLockLights(c: LockLights): LockLights {
  const b = (v: number) => Math.max(0, Math.min(255, Math.round(v)))
  return { disableMask: b(c.disableMask), hue: b(c.hue), sat: b(c.sat), val: Math.max(LOCK_LIGHT_MIN_VAL, b(c.val)) }
}

export const lockLightsPacket = (c: LockLights): Uint8Array => {
  const n = normaliseLockLights(c)
  return packet(KC_RGB, SET_INDICATORS, n.disableMask, n.hue, n.sat, n.val)
}

export const stylePacket = (style: number): Uint8Array => packet(KC_RGB, PER_KEY_SET_TYPE, style)
export const savePacket = (): Uint8Array => packet(KC_RGB, RGB_SAVE)

/** Whether the keyboard took a 0xA8 write. */
export const accepted = (reply: Uint8Array): boolean => reply[0] === KC_RGB && reply[2] === 0

/**
 * The LED behind each key, "row,col" → LED index, for the keys this keyboard has. The protocol's map is read for
 * up to 8 rows whatever the matrix; rows past the matrix are left out (the firmware's answer there isn't a key).
 */
export function keyLeds(ledMatrix: ReadonlyMap<string, number>, rows: number, cols: number, ledCount: number): Map<string, number> {
  const out = new Map<string, number>()
  for (const [pos, led] of ledMatrix) {
    const [row, col] = pos.split(',').map(Number)
    if (row < rows && col < cols && led < ledCount) out.set(pos, led)
  }
  return out
}

/**
 * Zone effects use the keyboard's own effect numbers (QMK's RGB_MATRIX_* enum: the enabled effects in the order of
 * quantum/rgb_matrix/animations/rgb_matrix_effects.inc, from 1, then the keyboard's own: VialRGB Direct, per-key,
 * mixed), the app uses VialRGB ids. This is that file's order as VialRGB ids; numbering the effects the keyboard
 * lists in this order gives the keyboard's numbers. Effects with no VialRGB id (Flower Blooming, Pixel Flow, the
 * Starlights, Riverflow) can't be seen in the keyboard's list: a firmware enabling one of them would shift the
 * numbers after it. The K15 Max enables none (vial-qmk keyboards/keychron/k15_max/ansi_encoder/rgb/keyboard.json,
 * in the order of quantum/rgb_matrix/animations/rgb_matrix_effects.inc: Solid Color 1 ... Solid Splash 22, Direct 23,
 * per-key 24, mixed 25).
 */
const QMK_ORDER = [
  2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23,
  // flower blooming (none)
  24, 25, 26, 27, 28,
  43, // pixel rain
  // pixel flow (none)
  44, // pixel fractal
  29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42,
  // starlight smooth, starlight, starlight dual sat, starlight dual hue, riverflow (none)
  1, // VialRGB Direct
  PER_KEY_EFFECT,
  ZONES_EFFECT,
]

export interface ZoneNumbers {
  /** VialRGB id → the keyboard's number */
  toZone: ReadonlyMap<number, number>
  /** the keyboard's number → VialRGB id */
  fromZone: ReadonlyMap<number, number>
}

export function zoneEffectNumbers(vialIds: Iterable<number>): ZoneNumbers {
  const listed = new Set(vialIds)
  const toZone = new Map<number, number>()
  const fromZone = new Map<number, number>()
  let n = 0
  for (const id of QMK_ORDER) {
    if (!listed.has(id)) continue
    n++
    toZone.set(id, n)
    fromZone.set(n, id)
  }
  return { toZone, fromZone }
}

/** The VialRGB ids a zone can play: what the keyboard numbers below the mixed effect, minus Direct (host-drawn). */
export function zoneEffectChoices(numbers: ZoneNumbers): number[] {
  const mixed = numbers.toZone.get(ZONES_EFFECT) ?? Infinity
  return [...numbers.toZone.entries()].filter(([id, n]) => n < mixed && id !== 1).map(([id]) => id)
}
