// SPDX-License-Identifier: GPL-3.0-or-later
// Names for the layers. The keyboard has nowhere to store them, so they live in this browser, per keyboard.

import { useMemo } from 'react'
import { useDevice, type KeyboardData, type LinkInfo } from '../device'
import { getPref, setPref, usePref } from '../ui/prefs'

const NONE: string[] = []
const key = (uid: string) => `layer-names:${uid}`

/** Keychron's convention: the Mac/Windows switch picks a pair of layers, the second of each pair being Fn. */
const KEYCHRON_PAIRS = ['Mac', 'Mac Fn', 'Windows', 'Windows Fn']
const KEYCHRON_VENDOR = 0x3434

/** Whether the keyboard follows Keychron's layer convention. Known from the link, before anything else loads. */
export const isKeychron = (link: LinkInfo | null): boolean => link?.vendorId === KEYCHRON_VENDOR

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

/** The layer names of the connected keyboard; empty when none is connected. */
export function useConnectedLayerNames(): string[] {
  const keyboard = useDevice((s) => s.keyboard)
  const link = useDevice((s) => s.link)
  return useLayerNames(keyboard, isKeychron(link))
}

/** The names as stored for a keyboard: what the user typed, empty where the default applies. For backups. */
export function storedLayerNames(uid: string): string[] {
  return getPref<string[]>(key(uid), NONE)
}

/** Replaces every stored name for a keyboard at once (a restore); empty names mean the default. */
export function setLayerNames(uid: string, names: string[]): void {
  setPref(key(uid), names.map((name) => name.trim()))
}

/** Names a layer; an empty name goes back to the default. */
export function renameLayer(uid: string, index: number, name: string): void {
  const names = [...getPref<string[]>(key(uid), NONE)]
  while (names.length <= index) names.push('')
  names[index] = name.trim()
  setPref(key(uid), names)
}

// Macro names: the same idea. A macro without one is "Macro 1", "Macro 2" … (QMK's M0, M1 …).

const macroKey = (uid: string) => `macro-names:${uid}`

export const defaultMacroName = (index: number): string => `Macro ${index + 1}`

/** The names the user gave the connected keyboard's macros, as stored ("" where none was given). */
export function useStoredMacroNames(): string[] {
  const uid = useDevice((s) => s.keyboard?.uid ?? '')
  return usePref<string[]>(macroKey(uid), NONE)[0]
}

export function storedMacroNames(uid: string): string[] {
  return getPref<string[]>(macroKey(uid), NONE)
}

/** Replaces every stored macro name for a keyboard at once (a restore). */
export function setMacroNames(uid: string, names: string[]): void {
  setPref(macroKey(uid), names.map((name) => name.trim()))
}

/** Names a macro; an empty name goes back to the default. */
export function renameMacro(uid: string, index: number, name: string): void {
  const names = [...getPref<string[]>(macroKey(uid), NONE)]
  while (names.length <= index) names.push('')
  names[index] = name.trim()
  setPref(macroKey(uid), names)
}
