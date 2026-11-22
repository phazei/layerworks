// SPDX-License-Identifier: GPL-3.0-or-later
// The keyboard's layout options: which of a definition's alternative keys (split Backspace or not, ISO Enter, a
// bottom row …) the keyboard has, and the keys that are therefore there.

import { filterVisibleKeys, repositionLayoutKeys } from '../vendor/pipette/shared/kle/filter-keys'
import { decodeLayoutOptions } from '../vendor/pipette/shared/kle/layout-options'
import type { KleKey } from '../vendor/pipette/shared/kle/types'
import type { KeyboardData } from './store'

type LayoutSource = Pick<KeyboardData, 'layout' | 'layoutOptions' | 'definition'>

const NONE: ReadonlyMap<number, number> = new Map()

/**
 * Compatibility: many definitions (278 of vial-qmk's 857) draw alternatives for parts of the keyboard: a group per
 * label in `layouts.labels`, each key of a group marked with its group and choice (KLE label 8, "group,choice";
 * vial_qmk keyboards/<board>/keymaps/vial/vial.json, e.g. gh80_3000). The keyboard keeps which choice it has as one
 * number (VIA's layout options, quantum/via.c id_layout_options), the last label in the lowest bits. This is the
 * chosen choice of every group the keys use. A choice the labels don't allow, or that has no keys, counts as the
 * first (0) where it has keys, so a stored value out of range still draws a whole keyboard; a group without a label
 * takes its first choice too.
 */
export function layoutChoices(keyboard: LayoutSource): ReadonlyMap<number, number> {
  const keys = keyboard.layout?.keys ?? []
  const present = new Map<number, Set<number>>()
  for (const key of keys) {
    if (key.layoutIndex < 0) continue
    const choices = present.get(key.layoutIndex) ?? new Set<number>()
    choices.add(key.layoutOption)
    present.set(key.layoutIndex, choices)
  }
  if (present.size === 0) return NONE
  const decoded = decodeLayoutOptions(keyboard.layoutOptions, keyboard.definition.layouts?.labels ?? [])
  const chosen = new Map<number, number>()
  for (const [group, choices] of present) {
    const wanted = decoded.get(group) ?? 0
    chosen.set(group, choices.has(wanted) ? wanted : choices.has(0) ? 0 : Math.min(...choices))
  }
  return chosen
}

/**
 * The keys the keyboard has with its chosen layout: the vendored widget's own moving of a chosen alternative into
 * the first one's place, then leaving out the other alternatives and decals (shared/kle/filter-keys.ts).
 */
export function visibleLayoutKeys(keyboard: LayoutSource): KleKey[] {
  if (!keyboard.layout) return []
  const choices = new Map(layoutChoices(keyboard))
  return filterVisibleKeys(repositionLayoutKeys(keyboard.layout.keys, choices), choices)
}
