// SPDX-License-Identifier: GPL-3.0-or-later
// Friendly, short labels for the keyboard picture where the keycode tables only have QMK's names: macros ("M1"),
// multi-tap keys ("TD(1)"), layer keys ("MO(4)") and keys that do one thing tapped and another held ("LCTL_T" over
// "Esc", "LT 3"). The words match the Keys page's palette, inspector and Switch layer sentences; they are kept short
// enough for a 1u key. Macros and multi-tap keys carry QMK's own number (M1 is "Macro 1"), as everywhere in the app.

import { keycodeLabel } from '../vendor/pipette/shared/keycodes/keycodes-utils'
import {
  friendlyKey,
  keycodeCap,
  keycodeId,
  LAYER_ACTIONS,
  modifierShort,
  readLayerKey,
  readLayerMod,
  readLayerTap,
  readMacroKey,
  readModTap,
  readTapDanceKey,
} from '../device/api'

/** A key's label in the widget's own shape: a split key (`masked`) has the hold above and the tap below. */
export interface PictureLabel {
  outer: string
  inner: string
  masked: boolean
}

/** The tables' label for a plain key, as the widget would draw it ("Caps\nLock"). */
const plainLabel = (code: number): string => keycodeLabel(keycodeId(code))

/** A layer's name for a key: the user's (from the layer stack) where given, otherwise "Layer 4". */
const nameOf = (layer: number, names?: readonly string[]): string => names?.[layer]?.trim() || `Layer ${layer}`

/** A longer name on two lines ("Windows\nFn"), so it fits a 1u key. */
const fold = (name: string): string => (name.length > 7 && name.includes(' ') ? name.replace(' ', '\n') : name)

/**
 * The friendly label for a keycode, or null where the tables' own label is already friendly. `layerNames` names
 * the layers of layer keys; without them (or past their end) a layer is "Layer 4".
 */
export function pictureLabel(code: number, layerNames?: readonly string[]): PictureLabel | null {
  const macro = readMacroKey(code)
  if (macro !== null) return { outer: `Macro\n${macro}`, inner: '', masked: false }
  const tapDance = readTapDanceKey(code)
  if (tapDance !== null) return { outer: `Multi-\ntap ${tapDance}`, inner: '', masked: false }
  // The palette's extra groups (Swapped and disabled keys, typing helpers …), with the tiles' labels.
  const friendly = friendlyKey(code)
  if (friendly) return { outer: friendly.label, inner: '', masked: false }
  // A keycode no table names (MIDI, steno, Unicode …): its family rather than a bare number.
  if (/^0x/i.test(keycodeId(code))) return { outer: keycodeCap(code), inner: '', masked: false }
  const layerKey = readLayerKey(code)
  const action = layerKey && LAYER_ACTIONS.find((a) => a.op === layerKey.op)
  if (layerKey && action) return { outer: `${action.short}\n${fold(nameOf(layerKey.layer, layerNames))}`, inner: '', masked: false }
  const modTap = readModTap(code)
  if (modTap) return { outer: modifierShort(modTap.mods), inner: plainLabel(modTap.key), masked: true }
  const layerTap = readLayerTap(code)
  if (layerTap) return { outer: nameOf(layerTap.layer, layerNames), inner: layerTap.key ? plainLabel(layerTap.key) : '', masked: true }
  const layerMod = readLayerMod(code)
  if (layerMod) return { outer: `Hold +${modifierShort(layerMod.mods)}\n${nameOf(layerMod.layer, layerNames)}`, inner: '', masked: false }
  return null
}

/**
 * The same for a knob direction, as the text the widget is given instead of the keycode: a knob has no split
 * drawing for friendly labels, so a tap / hold key reads as two lines, tap above hold.
 */
export function knobPictureText(code: number, layerNames?: readonly string[]): string | null {
  const label = pictureLabel(code, layerNames)
  if (!label) return null
  if (!label.masked) return label.outer
  return `${label.inner.split('\n').join(' ') || 'Nothing'}\n${label.outer}`
}
