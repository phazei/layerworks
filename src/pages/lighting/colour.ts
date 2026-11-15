// SPDX-License-Identifier: GPL-3.0-or-later
// The keyboard's colours (QMK HSV, each 0-255) as CSS colours and plain names. These are the data being shown
// (the swatch, the slider tracks, the previews), so they are computed here rather than taken from tokens.

/** CSS colour for a QMK hue and saturation, at full brightness unless `value` (0-1) says otherwise. */
export function hsvCss(hue: number, sat: number, value = 1): string {
  return hsvCssAt(((hue / 256) * 360).toFixed(1), sat, value)
}

/** The same with the hue as any CSS angle expression, e.g. `var(--lw-turn)` for a colour that is animated. */
export function hsvCssAt(hue: string, sat: number, value = 1): string {
  const s = sat / 255
  const l = value * (1 - s / 2)
  const sl = l === 0 || l === 1 ? 0 : (value - l) / Math.min(l, 1 - l)
  return `hsl(${hue} ${(sl * 100).toFixed(1)}% ${(l * 100).toFixed(1)}%)`
}

/** The hue slider's track: the whole rainbow. */
export const HUE_TRACK = `linear-gradient(to right, ${[0, 32, 64, 96, 128, 160, 192, 224, 255].map((h) => hsvCss(h, 255)).join(', ')})`

/** The saturation slider's track: white to the chosen colour. */
export const satTrack = (hue: number) => `linear-gradient(to right, ${hsvCss(hue, 0)}, ${hsvCss(hue, 255)})`

const NAMES: [number, string][] = [
  [15, 'Red'],
  [40, 'Orange'],
  [65, 'Yellow'],
  [160, 'Green'],
  [195, 'Turquoise'],
  [250, 'Blue'],
  [285, 'Purple'],
  [335, 'Pink'],
  [360, 'Red'],
]

/** A plain name for the colour: "Blue", "Pale purple", "White". */
export function colourName(hue: number, sat: number): string {
  if (sat < 40) return 'White'
  const degrees = (hue / 256) * 360
  const name = NAMES.find(([upTo]) => degrees < upTo)?.[1] ?? 'Red'
  return sat < 140 ? `Pale ${name.toLowerCase()}` : name
}

/** A 0-255 setting as a percentage of its maximum. */
export const percent = (value: number, max: number) => `${Math.round((value / Math.max(max, 1)) * 100)} %`
