// SPDX-License-Identifier: GPL-3.0-or-later
// How tall the keyboard stage is. It shares the main area under the page title with the page below it, and takes
// at most half of that space, unless half is too little for a legible picture. Left alone it is as tall as the
// picture wants at this width (the picture never grows past its own size), up to that cap; dragged, it keeps the
// chosen share of the space (a fraction, so it follows the window), between a smaller minimum and the cap.

import { PICTURE_KEY_UNIT } from '../ui/KeyboardPicture'
import { clamp } from '../ui/ResizeHandle'

/**
 * What the stage adds around the picture, top to bottom: the card's padding (32, or 24 when the layers are a row
 * above the picture) and the resize handle under it (16); and the gap between the layer row and the picture.
 */
export const STAGE_PADDING = 48
export const NARROW_PADDING = 40
export const STAGE_GAP = 12
/** The smallest picture the handle can make: the layout, if not every label. */
export const MIN_PICTURE = 120
/** A key this tall (1u, in pixels) still has readable labels: the automatic size never goes below it. */
export const LEGIBLE_KEY = 24
/** The largest share of the space the stage may take. */
export const CAP = 0.5

export interface StageMeasures {
  /** The height the stage and the page below it share. */
  space: number
  /** The layer stack's full height. */
  stack: number
  /** The width the picture has. */
  pictureWidth: number
  /** The picture's own size (the widget's drawing size). */
  intrinsic: { width: number; height: number }
  /** The layer stack is a row above the picture rather than a column beside it. */
  narrow: boolean
}

/** The picture's height at this width when nothing else limits it: shrinking with the width, never growing. */
export function naturalPicture(m: StageMeasures): number {
  if (m.intrinsic.width <= 0) return 0
  return Math.min(m.intrinsic.height, (m.pictureWidth * m.intrinsic.height) / m.intrinsic.width)
}

/** The picture's height at which a key is LEGIBLE_KEY pixels: the widget draws 1u at PICTURE_KEY_UNIT. */
export const legiblePicture = (m: StageMeasures): number => (m.intrinsic.height * LEGIBLE_KEY) / PICTURE_KEY_UNIT

export const padding = (m: StageMeasures): number => (m.narrow ? NARROW_PADDING : STAGE_PADDING)

/** The stage's height for a picture of `picture` pixels. */
export function around(m: StageMeasures, picture: number): number {
  return padding(m) + (m.narrow ? m.stack + STAGE_GAP + picture : picture)
}

/** As tall as the picture wants, and beside it the layer stack (which can scroll when the stage is shorter). */
export const naturalHeight = (m: StageMeasures): number =>
  m.narrow ? around(m, naturalPicture(m)) : Math.max(around(m, naturalPicture(m)), padding(m) + m.stack)

export const minHeight = (m: StageMeasures): number => around(m, MIN_PICTURE)

/** What the cap never goes below: room for a legible picture, or the whole picture where the width allows less. */
export const legibleHeight = (m: StageMeasures): number => around(m, Math.min(legiblePicture(m), naturalPicture(m)))

/** Half the shared space, but never less than a legible picture needs, nor than the minimum. */
export const maxHeight = (m: StageMeasures): number => Math.max(minHeight(m), legibleHeight(m), m.space * CAP)

export const toFraction = (pixels: number, space: number): number => (space > 0 ? pixels / space : 0)
export const toPixels = (fraction: number, space: number): number => fraction * space

/** The stage's height: the chosen share of the space (null: automatic), kept between the minimum and the cap. */
export function stageHeight(m: StageMeasures, fraction: number | null): number {
  const wanted = fraction === null ? naturalHeight(m) : toPixels(fraction, m.space)
  return clamp(wanted, minHeight(m), maxHeight(m))
}
