// SPDX-License-Identifier: GPL-3.0-or-later
// The lighting effects in plain words, keyed by VialRGB effect id, with what each one does with the colour and
// speed settings.
//
// Which settings an effect uses is read from the firmware, not guessed: the effect functions in
// vial-qmk quantum/rgb_matrix/animations/ (and their runners in animations/runners/), the VialRGB id list in
// vial-qmk quantum/vialrgb_effects.inc, and Keychron's per-key and mixed effects in
// vial-qmk keyboards/keychron/common/rgb/. Notes on the less obvious ones:
// - Every effect uses brightness (the value of the configured colour) except Direct Control, which is left out.
// - The "rainbow" effects set the hue from the key's position and the time, or add a large position-dependent
//   offset to it, so the chosen colour only shifts where the rainbow starts: treated as not using it.
// - The reactive effects (Solid Reactive Simple, Solid Reactive, Wide, Cross, Nexus) use the chosen colour. Only
//   firmware built with RGB_MATRIX_SOLID_REACTIVE_GRADIENT_MODE takes the hue from the timer instead; that is a
//   build option the app can't see, and Keychron's keyboards don't set it. Splash and Solid Splash use the colour.
// - Typing Heatmap picks its own hue but keeps the chosen saturation; Jellybean Raindrops, Pixel Rain and Digital
//   Rain pick their own colours entirely.
// - Gradients and Alphas Mods use the speed setting for something other than motion (spread, second colour).

import { VIALRGB_EFFECTS } from '../../device/api'

export type EffectGroup = 'still' | 'moving' | 'rain' | 'typing' | 'custom'

export const EFFECT_GROUPS: { id: EffectGroup; title: string }[] = [
  { id: 'still', title: 'Steady' },
  { id: 'moving', title: 'Moving' },
  { id: 'rain', title: 'Rain and sparkles' },
  { id: 'typing', title: 'Reacts to typing' },
  { id: 'custom', title: 'Set per key or zone' },
]

/**
 * How a tile hints at the effect. Drawn by EffectPreview, which also notes for each one which way it moves on the
 * keyboard and the firmware file that was worked out from.
 */
export type PreviewKind =
  | 'solid'
  | 'two'
  | 'gradient-v'
  | 'gradient-h'
  | 'breathe'
  | 'band-sat'
  | 'band-val'
  | 'pinwheel-sat'
  | 'pinwheel-val'
  | 'spiral-sat'
  | 'spiral-val'
  | 'rainbow-all'
  | 'rainbow-h'
  | 'rainbow-v'
  | 'chevron'
  | 'rainbow-rings'
  | 'rainbow-rings-dual'
  | 'rainbow-pinwheel'
  | 'rainbow-spiral'
  | 'beacon'
  | 'rainbow-beacon'
  | 'rainbow-pinwheels'
  | 'hue-breathe'
  | 'hue-pendulum'
  | 'hue-wave'
  | 'rain'
  | 'rain-random'
  | 'matrix'
  | 'heat'
  | 'react'
  | 'react-shift'
  | 'glow'
  | 'cross'
  | 'nexus'
  | 'splash'
  | 'splash-colours'
  | 'per-key'
  | 'zones'

/** `true` when the effect uses the setting, otherwise the reason it doesn't, in plain words. */
export type Use = true | string

export interface EffectInfo {
  /** VialRGB effect id, as the keyboard reports and stores it. */
  id: number
  /** The friendly name shown on the tile. */
  name: string
  /** What QMK and Vial call it. */
  qmkName: string
  description: string
  group: EffectGroup
  preview: PreviewKind
  hue: Use
  sat: Use
  speed: Use
  /** What the speed setting does, when it isn't how fast the effect moves. */
  speedHint?: string
  /** A typing effect that answers every key pressed, not only the last: the preview shows two keys. */
  many?: boolean
}

const CYCLES = 'This effect cycles through all colours by itself.'
const RAINBOW = 'This effect shows the whole rainbow at once.'
const OWN_COLOURS = 'This effect picks its own colours.'
const STILL = 'This effect doesn’t move.'
const OWN_PACE = 'This effect runs at its own pace.'
const PER_KEY = 'Each key keeps the colour set for it.'
const ZONES = 'Each zone has its own colour and speed.'

const FADE = 'Here speed sets how quickly a lit key fades.'
const SPREAD = 'Here speed sets how quickly the light spreads and fades.'
const SHRINK = 'Here speed sets how quickly the light shrinks back and fades.'

type Row = Omit<EffectInfo, 'id' | 'qmkName'>

const EFFECTS: Record<number, Row> = {
  2: { name: 'One colour', group: 'still', preview: 'solid', description: 'Every key in the same colour.', hue: true, sat: true, speed: STILL },
  3: {
    name: 'Letters and modifiers',
    group: 'still',
    preview: 'two',
    description: 'Letter keys in your colour; Shift, Ctrl and the like in a second one.',
    hue: true,
    sat: true,
    speed: true,
    speedHint: 'Here speed sets how different the second colour is.',
  },
  4: {
    name: 'Colour fade, top to bottom',
    group: 'still',
    preview: 'gradient-v',
    description: 'Colours blend from the top row to the bottom row.',
    hue: true,
    sat: true,
    speed: true,
    speedHint: 'Here speed sets how far the colours spread.',
  },
  5: {
    name: 'Colour fade, left to right',
    group: 'still',
    preview: 'gradient-h',
    description: 'Colours blend from the left side to the right.',
    hue: true,
    sat: true,
    speed: true,
    speedHint: 'Here speed sets how far the colours spread.',
  },
  6: { name: 'Breathing', group: 'moving', preview: 'breathe', description: 'All keys slowly glow brighter and dimmer.', hue: true, sat: true, speed: true },
  7: { name: 'Colour band', group: 'moving', preview: 'band-sat', description: 'A band of your colour sweeps from left to right across white keys.', hue: true, sat: true, speed: true },
  8: { name: 'Bright band', group: 'moving', preview: 'band-val', description: 'A band of light sweeps from left to right; the other keys stay dark.', hue: true, sat: true, speed: true },
  9: { name: 'Pale pinwheel', group: 'moving', preview: 'pinwheel-sat', description: 'Three blades fading from your colour to white turn anticlockwise.', hue: true, sat: true, speed: true },
  10: { name: 'Bright pinwheel', group: 'moving', preview: 'pinwheel-val', description: 'Three blades fading from bright to dark turn anticlockwise.', hue: true, sat: true, speed: true },
  11: { name: 'Pale spiral', group: 'moving', preview: 'spiral-sat', description: 'A spiral fading from your colour to white turns anticlockwise.', hue: true, sat: true, speed: true },
  12: { name: 'Bright spiral', group: 'moving', preview: 'spiral-val', description: 'A spiral fading from bright to dark turns anticlockwise around the middle.', hue: true, sat: true, speed: true },
  13: { name: 'Rainbow, all keys', group: 'moving', preview: 'rainbow-all', description: 'All keys change colour together, round the rainbow.', hue: CYCLES, sat: true, speed: true },
  14: { name: 'Rainbow wave, left to right', group: 'moving', preview: 'rainbow-h', description: 'A rainbow scrolls across from left to right.', hue: RAINBOW, sat: true, speed: true },
  15: { name: 'Rainbow wave, top to bottom', group: 'moving', preview: 'rainbow-v', description: 'A rainbow scrolls from the top row down to the bottom row.', hue: RAINBOW, sat: true, speed: true },
  16: { name: 'Rainbow arrows', group: 'moving', preview: 'chevron', description: 'Rainbow stripes bent into arrows move to the right.', hue: RAINBOW, sat: true, speed: true },
  17: { name: 'Rainbow rings', group: 'moving', preview: 'rainbow-rings', description: 'Rainbow rings flow in towards the middle.', hue: RAINBOW, sat: true, speed: true },
  18: { name: 'Rainbow rings, two centres', group: 'moving', preview: 'rainbow-rings-dual', description: 'Rainbow rings flow in towards the middle of each half.', hue: RAINBOW, sat: true, speed: true },
  19: { name: 'Rainbow pinwheel', group: 'moving', preview: 'rainbow-pinwheel', description: 'A rainbow with straight blades turns anticlockwise.', hue: RAINBOW, sat: true, speed: true },
  20: { name: 'Rainbow spiral', group: 'moving', preview: 'rainbow-spiral', description: 'A rainbow with curved blades turns anticlockwise.', hue: RAINBOW, sat: true, speed: true },
  21: { name: 'Turning colours', group: 'moving', preview: 'beacon', description: 'Colours on either side of yours sweep clockwise around the middle like a lighthouse beam.', hue: true, sat: true, speed: true },
  22: { name: 'Rainbow lighthouse', group: 'moving', preview: 'rainbow-beacon', description: 'Rainbow stripes sweep clockwise around the middle like a lighthouse beam.', hue: RAINBOW, sat: true, speed: true },
  23: { name: 'Rainbow pinwheels', group: 'moving', preview: 'rainbow-pinwheels', description: 'Rainbow stripes turn in each half of the keyboard, the two halves in opposite directions.', hue: RAINBOW, sat: true, speed: true },
  24: { name: 'Raindrops', group: 'rain', preview: 'rain', description: 'Keys light up one by one in your colour and its neighbours.', hue: true, sat: true, speed: true },
  25: { name: 'Jellybeans', group: 'rain', preview: 'rain-random', description: 'Keys light up one by one in random colours.', hue: OWN_COLOURS, sat: OWN_COLOURS, speed: true },
  26: { name: 'Colour breathing', group: 'moving', preview: 'hue-breathe', description: 'Your colour gently shifts back and forth.', hue: true, sat: true, speed: true },
  27: { name: 'Colour pendulum', group: 'moving', preview: 'hue-pendulum', description: 'A gentle shift of your colour swings from side to side.', hue: true, sat: true, speed: true },
  28: { name: 'Colour wave', group: 'moving', preview: 'hue-wave', description: 'A gentle shift of your colour washes across from left to right.', hue: true, sat: true, speed: true },
  29: {
    name: 'Typing heat map',
    group: 'typing',
    preview: 'heat',
    description: 'Keys you type glow from blue to red: the more you type them, the hotter.',
    hue: OWN_COLOURS,
    sat: true,
    speed: OWN_PACE,
  },
  30: { name: 'Digital rain', group: 'rain', preview: 'matrix', description: 'Green drops trickle down the keyboard, like in The Matrix.', hue: OWN_COLOURS, sat: OWN_COLOURS, speed: OWN_PACE },
  31: {
    name: 'Light up on press',
    group: 'typing',
    preview: 'react',
    description: 'Each key lights up in your colour when pressed and fades out; the rest stay dark.',
    hue: true,
    sat: true,
    speed: true,
    speedHint: FADE,
  },
  32: {
    name: 'Change colour on press',
    group: 'typing',
    preview: 'react-shift',
    description: 'All keys show your colour; a pressed key shifts to a neighbouring colour, then drifts back.',
    hue: true,
    sat: true,
    speed: true,
    speedHint: FADE,
  },
  33: { name: 'Glow around the key', group: 'typing', preview: 'glow', description: 'A glow lights the keys around the one you press, then shrinks back into it.', hue: true, sat: true, speed: true, speedHint: SHRINK },
  34: { name: 'Glow around each key', group: 'typing', preview: 'glow', many: true, description: 'A glow lights the keys around every key you press, then shrinks back.', hue: true, sat: true, speed: true, speedHint: SHRINK },
  35: { name: 'Cross from the key', group: 'typing', preview: 'cross', description: 'The row and column of the key you press light up, then shrink back into it.', hue: true, sat: true, speed: true, speedHint: SHRINK },
  36: { name: 'Cross from each key', group: 'typing', preview: 'cross', many: true, description: 'The row and column of every key you press light up, then shrink back.', hue: true, sat: true, speed: true, speedHint: SHRINK },
  37: { name: 'Sparks from the key', group: 'typing', preview: 'nexus', description: 'Sparks run out along the row and column of the key you press.', hue: true, sat: true, speed: true, speedHint: SPREAD },
  38: { name: 'Sparks from each key', group: 'typing', preview: 'nexus', many: true, description: 'Sparks run out along the row and column of every key you press.', hue: true, sat: true, speed: true, speedHint: SPREAD },
  39: { name: 'Colour splash', group: 'typing', preview: 'splash-colours', description: 'A ring spreads from the key you press, changing colour as it goes.', hue: true, sat: true, speed: true, speedHint: SPREAD },
  40: { name: 'Colour splashes', group: 'typing', preview: 'splash-colours', many: true, description: 'A ring spreads from every key you press, changing colour as it goes.', hue: true, sat: true, speed: true, speedHint: SPREAD },
  41: { name: 'One-colour splash', group: 'typing', preview: 'splash', description: 'A ring in your colour spreads from the key you press.', hue: true, sat: true, speed: true, speedHint: SPREAD },
  42: { name: 'One-colour splashes', group: 'typing', preview: 'splash', many: true, description: 'A ring in your colour spreads from every key you press.', hue: true, sat: true, speed: true, speedHint: SPREAD },
  43: { name: 'Pixel rain', group: 'rain', preview: 'rain-random', description: 'Random keys light up in random colours, then go dark.', hue: OWN_COLOURS, sat: OWN_COLOURS, speed: true },
  44: { name: 'Pixel mirror', group: 'rain', preview: 'rain', description: 'Lights flow outwards from the middle in a mirrored pattern.', hue: true, sat: true, speed: true },
  48: {
    name: 'Key by key',
    group: 'custom',
    preview: 'per-key',
    description: 'Every key shows a colour of its own; paint them below.',
    hue: PER_KEY,
    sat: PER_KEY,
    speed: true,
    speedHint: 'Speed applies when the per-key colours breathe or react to typing.',
  },
  49: {
    name: 'Mixed zones',
    group: 'custom',
    preview: 'zones',
    description: 'Parts of the keyboard play different effects; set the zones up below.',
    hue: ZONES,
    sat: ZONES,
    speed: ZONES,
  },
}

/** Keychron's own effects: VialRGB has no names for them. */
const EXTRA_QMK_NAMES: Record<number, string> = { 48: 'Per-Key RGB', 49: 'Mixed RGB' }

/** Effects the grid never offers: Off has its own switch, Direct Control is for programs that draw on the keys. */
export const HIDDEN_EFFECTS: ReadonlySet<number> = new Set([0, 1])

export const OFF = 0

function qmkName(id: number): string {
  return VIALRGB_EFFECTS.find((e) => e.index === id)?.name ?? EXTRA_QMK_NAMES[id] ?? `Effect ${id}`
}

/** A plugin's own name for an effect, e.g. firmware that puts its own effect in a standard slot. */
export interface EffectRename {
  name: string
  description?: string
}

/** What the app knows about one effect, with any plugin's renaming applied. Unknown ids get a plain fallback. */
export function effectInfo(id: number, renames: Readonly<Record<number, EffectRename>> = {}): EffectInfo {
  const row: Row = EFFECTS[id] ?? {
    name: id === 1 ? 'Drawn by a program' : qmkName(id),
    group: 'custom',
    preview: 'per-key',
    description: id === 1 ? 'A program on the computer draws on the keys directly.' : 'An effect this app has no description for.',
    hue: true,
    sat: true,
    speed: true,
  }
  return { ...row, ...renames[id], id, qmkName: qmkName(id) }
}

/** The effects to offer, from the ids the keyboard reports, in groups (empty groups left out), in id order. */
export function effectGroups(
  ids: Iterable<number>,
  renames: Readonly<Record<number, EffectRename>> = {},
): { id: EffectGroup; title: string; effects: EffectInfo[] }[] {
  const effects = [...ids]
    .filter((id) => !HIDDEN_EFFECTS.has(id))
    .sort((a, b) => a - b)
    .map((id) => effectInfo(id, renames))
  return EFFECT_GROUPS.map((group) => ({ ...group, effects: effects.filter((e) => e.group === group.id) })).filter(
    (group) => group.effects.length > 0,
  )
}
