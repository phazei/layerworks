// SPDX-License-Identifier: GPL-3.0-or-later
// Friendly, short labels for the keyboard picture where the keycode tables only have QMK's names: macros ("M0"),
// multi-tap keys ("TD(0)") and keys that do one thing tapped and another held ("LCTL_T" over "Esc", "LT 3"). The
// words match the Keys page's palette and inspector; they are kept short enough for a 1u key.

import { keycodeLabel } from '../vendor/pipette/shared/keycodes/keycodes-utils'
import { keycodeId, modifierShort, readLayerTap, readMacroKey, readModTap, readTapDanceKey } from '../device/api'

/** A key's label in the widget's own shape: a split key (`masked`) has the hold above and the tap below. */
export interface PictureLabel {
  outer: string
  inner: string
  masked: boolean
}

/** The tables' label for a plain key, as the widget would draw it ("Caps\nLock"). */
const plainLabel = (code: number): string => keycodeLabel(keycodeId(code))

/** The friendly label for a keycode, or null where the tables' own label is already friendly. */
export function pictureLabel(code: number): PictureLabel | null {
  const macro = readMacroKey(code)
  if (macro !== null) return { outer: `Macro\n${macro + 1}`, inner: '', masked: false }
  const tapDance = readTapDanceKey(code)
  if (tapDance !== null) return { outer: `Multi-\ntap ${tapDance + 1}`, inner: '', masked: false }
  const modTap = readModTap(code)
  if (modTap) return { outer: modifierShort(modTap.mods), inner: plainLabel(modTap.key), masked: true }
  const layerTap = readLayerTap(code)
  if (layerTap) return { outer: `Layer ${layerTap.layer}`, inner: layerTap.key ? plainLabel(layerTap.key) : '', masked: true }
  return null
}

/**
 * The same for a knob direction, as the text the widget is given instead of the keycode: a knob has no split
 * drawing for friendly labels, so a tap / hold key reads as two lines, tap above hold.
 */
export function knobPictureText(code: number): string | null {
  const label = pictureLabel(code)
  if (!label) return null
  if (!label.masked) return label.outer
  return `${label.inner.split('\n').join(' ') || 'Nothing'}\n${label.outer}`
}
