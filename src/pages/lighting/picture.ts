// SPDX-License-Identifier: GPL-3.0-or-later
// The still picture of the lighting under the effect grid: a colour for every key that hints at what the effect
// does, not an animation. Effects that use the chosen colour tint every key with it; rainbow effects (and the
// others that pick their own colours) show a fixed rainbow laid out the way the effect runs, from the keys' real
// positions; lights off is dark keys. Brightness and vividness apply as on the keyboard. What each effect does with
// colour comes from effects.ts (its `hue` and `preview`), so there is one table, not two.

import { hsvCss, isLightColour } from '../../ui/colour'
import type { EffectInfo, PreviewKind } from './effects'

/** How a still picture lays out an effect's colours. */
export type PictureLayout =
  /** Every key in the chosen colour. */
  | { kind: 'tint' }
  /** A rainbow across the keys: left to right, top to bottom, rings from the middle (of each half), or round it. */
  | { kind: 'rainbow'; direction: 'across' | 'down' | 'rings' | 'rings-two' | 'around' | 'around-two' }
  /** Keys in colours of their own, scattered (raindrops in random colours). */
  | { kind: 'scattered' }
  /** One colour the effect picks itself (QMK hue), e.g. Digital rain's green. */
  | { kind: 'fixed'; hue: number }
  | { kind: 'off' }

/** Rainbow previews, by which way their colours run on the keyboard (EffectPreview notes the firmware files). */
const RAINBOWS: Partial<Record<PreviewKind, Extract<PictureLayout, { kind: 'rainbow' }>['direction']>> = {
  'rainbow-h': 'across',
  chevron: 'across',
  'rainbow-v': 'down',
  'rainbow-rings': 'rings',
  'rainbow-rings-dual': 'rings-two',
  'rainbow-pinwheel': 'around',
  'rainbow-spiral': 'around',
  'rainbow-beacon': 'around',
  'rainbow-pinwheels': 'around-two',
}

/**
 * Effects that pick one colour of their own: Digital rain is green (digital_rain_anim.h); the Typing heat map starts
 * keys at blue, hue 170, and warms them towards red as they are typed (typing_heatmap_anim.h).
 */
const FIXED: Partial<Record<PreviewKind, number>> = { matrix: 85, heat: 170 }

/** What the picture shows for `effect`; `on` false is lights off. */
export function pictureLayout(effect: EffectInfo, on: boolean): PictureLayout {
  if (!on) return { kind: 'off' }
  if (effect.hue === true) return { kind: 'tint' }
  const direction = RAINBOWS[effect.preview]
  if (direction) return { kind: 'rainbow', direction }
  const fixed = FIXED[effect.preview]
  if (fixed !== undefined) return { kind: 'fixed', hue: fixed }
  if (effect.preview === 'rain-random') return { kind: 'scattered' }
  // The rest that ignore the colour cycle through the rainbow over time (all keys together, or keys as they are
  // pressed): a rainbow left to right stands for "every colour" without claiming a direction of its own.
  if (effect.preview === 'per-key' || effect.preview === 'zones') return { kind: 'tint' }
  return { kind: 'rainbow', direction: 'across' }
}

/** A key's place on the picture, in key units: its centre. */
export interface KeyPlace {
  pos: string
  x: number
  y: number
}

export interface KeyFill {
  colour: string
  light: boolean
}

const TURN = 256

/** Where a key falls in the rainbow, 0 – 1, for the layout's direction. */
function rainbowPlace(direction: Extract<PictureLayout, { kind: 'rainbow' }>['direction'], key: KeyPlace, box: Box): number {
  const width = Math.max(box.right - box.left, 1e-6)
  const height = Math.max(box.bottom - box.top, 1e-6)
  const midX = (box.left + box.right) / 2
  const midY = (box.top + box.bottom) / 2
  // The centre the colours run from: the middle, or the middle of the key's half.
  const two = direction === 'rings-two' || direction === 'around-two'
  const cx = two ? (key.x < midX ? box.left + width / 4 : box.right - width / 4) : midX
  const reach = Math.hypot(two ? width / 4 : width / 2, height / 2)
  switch (direction) {
    case 'across':
      return (key.x - box.left) / width
    case 'down':
      return (key.y - box.top) / height
    case 'rings':
    case 'rings-two':
      return Math.min(1, Math.hypot(key.x - cx, key.y - midY) / reach)
    case 'around':
    case 'around-two':
      return (Math.atan2(key.y - midY, key.x - cx) / (2 * Math.PI) + 1) % 1
  }
}

interface Box {
  left: number
  right: number
  top: number
  bottom: number
}

/** A stable, spread-out hue per key (the same key keeps its colour from one render to the next). */
function scatteredHue(pos: string): number {
  let h = 2166136261
  for (let i = 0; i < pos.length; i++) h = Math.imul(h ^ pos.charCodeAt(i), 16777619)
  return (h >>> 0) % TURN
}

/**
 * A colour per key ("row,col") for the layout, in the chosen hue, vividness and brightness (QMK's 0 – 255 each).
 * Brightness dims the keys as the keyboard does; off is black.
 */
export function pictureFills(
  keys: readonly KeyPlace[],
  layout: PictureLayout,
  colour: { hue: number; sat: number; val: number },
): Map<string, KeyFill> {
  const out = new Map<string, KeyFill>()
  if (keys.length === 0) return out
  const box: Box = {
    left: Math.min(...keys.map((k) => k.x)),
    right: Math.max(...keys.map((k) => k.x)),
    top: Math.min(...keys.map((k) => k.y)),
    bottom: Math.max(...keys.map((k) => k.y)),
  }
  const value = layout.kind === 'off' ? 0 : Math.max(0, Math.min(1, colour.val / 255))
  for (const key of keys) {
    let hue = colour.hue
    if (layout.kind === 'rainbow') hue = Math.round(rainbowPlace(layout.direction, key, box) * (TURN - 1))
    else if (layout.kind === 'fixed') hue = layout.hue
    else if (layout.kind === 'scattered') hue = scatteredHue(key.pos)
    out.set(key.pos, { colour: hsvCss(hue, colour.sat, value), light: isLightColour(hue, colour.sat, value) })
  }
  return out
}
