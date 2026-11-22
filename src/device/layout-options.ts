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

/** One option group as the Layout card shows it: its words, and the words of each choice. */
export interface LayoutOption {
  group: number
  title: string
  /** Each choice's words; a yes / no option has "Off" and "On" (its title says what is on). */
  choices: string[]
  /** A yes / no option (a label that is a plain string). */
  switch: boolean
}

/**
 * The option groups as the definition names them (`layouts.labels`): a plain string is a yes / no option named by
 * it, a list is a title followed by its choices' names. Labels with fewer than two choices are left out.
 */
export function layoutOptionList(labels: readonly (string | string[])[] | undefined): LayoutOption[] {
  return (labels ?? []).flatMap((label, group): LayoutOption[] => {
    if (typeof label === 'string') return [{ group, title: label, choices: ['Off', 'On'], switch: true }]
    if (!Array.isArray(label) || label.length < 3) return []
    return [{ group, title: String(label[0]), choices: label.slice(1).map(String), switch: false }]
  })
}

/**
 * The options that differ between the keyboard's value and `to`, in the definition's words: "Split Backspace on",
 * "Bottom row: 7U". For the restore review.
 */
export function layoutChangeWords(keyboard: LayoutSource, to: number): string[] {
  const now = layoutChoices(keyboard)
  const then = layoutChoices({ ...keyboard, layoutOptions: to })
  return layoutOptionList(keyboard.definition.layouts?.labels).flatMap((option) => {
    const choice = then.get(option.group) ?? 0
    if ((now.get(option.group) ?? 0) === choice) return []
    return [option.switch ? `${option.title} ${choice === 1 ? 'on' : 'off'}` : `${option.title}: ${option.choices[choice] ?? choice}`]
  })
}

/** The bits each label takes in the stored value, as VIA counts them (vendored decodeLayoutOptions). */
const bitsOf = (label: string | string[]) => {
  const choices = typeof label === 'string' ? 2 : label.length - 1
  return choices <= 1 ? 0 : 32 - Math.clz32(choices - 1)
}

/**
 * The stored value with `group` set to `choice`, every other group's bits as they were: the reverse of the vendored
 * decodeLayoutOptions (the last label in the lowest bits).
 */
export function withLayoutChoice(value: number, labels: readonly (string | string[])[], group: number, choice: number): number {
  let shift = 0
  for (let index = labels.length - 1; index > group; index--) shift += bitsOf(labels[index])
  const bits = bitsOf(labels[group])
  if (bits === 0) return value >>> 0
  const mask = ((1 << bits) - 1) << shift
  return ((value & ~mask) | ((choice << shift) & mask)) >>> 0
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
