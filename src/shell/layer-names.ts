// SPDX-License-Identifier: GPL-3.0-or-later
// Names for the layers. The keyboard has nowhere to store them, so they live in this browser, per keyboard.

import { useMemo } from 'react'
import type { KeyboardData } from '../device'
import { getPref, setPref, usePref } from '../ui/prefs'

const NONE: string[] = []
const key = (uid: string) => `layer-names:${uid}`

/** Keychron's convention: the Mac/Windows switch picks a pair of layers, the second of each pair being Fn. */
const KEYCHRON_PAIRS = ['Mac', 'Mac Fn', 'Windows', 'Windows Fn']

export function defaultLayerName(index: number, keychron: boolean, layerCount: number): string {
  if (keychron && layerCount >= KEYCHRON_PAIRS.length && index < KEYCHRON_PAIRS.length) return KEYCHRON_PAIRS[index]
  return `Layer ${index}`
}

/** The name of every layer: the user's where set, otherwise the default. */
export function useLayerNames(keyboard: KeyboardData | null, keychron: boolean): string[] {
  const [stored] = usePref<string[]>(key(keyboard?.uid ?? ''), NONE)
  const count = keyboard?.layers ?? 0
  return useMemo(
    () => Array.from({ length: count }, (_, i) => stored[i]?.trim() || defaultLayerName(i, keychron, count)),
    [stored, count, keychron],
  )
}

/** Names a layer; an empty name goes back to the default. */
export function renameLayer(uid: string, index: number, name: string): void {
  const names = [...getPref<string[]>(key(uid), NONE)]
  while (names.length <= index) names.push('')
  names[index] = name.trim()
  setPref(key(uid), names)
}
