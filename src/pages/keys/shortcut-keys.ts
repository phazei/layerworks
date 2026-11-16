// SPDX-License-Identifier: GPL-3.0-or-later
// Macro and multi-tap keys by what they are: the macro's name (the user's, or "Macro 3") and what it types, the
// multi-tap key's taps and holds, and where each is set up on the Shortcuts & macros page. Used for the palette's
// tiles and the inspector's "Now" line.

import { useMemo } from 'react'
import {
  entryIsEmpty,
  readMacroKey,
  readMacros,
  readTapDanceKey,
  useDevice,
  type Entries,
  type KeyboardData,
  type PaletteGroup,
} from '../../device'
import { defaultMacroName, useStoredMacroNames } from '../../shell/layer-names'
import { summarize, summarizeEntry } from '../shortcuts/describe'
import { shortcutHref } from '../shortcuts/route'

export interface ShortcutKey {
  kind: 'macro' | 'tapDance'
  index: number
  /** In words: the macro's name, "Macro 3", "Multi-tap key 1". */
  name: string
  /** On a key tile: the same, shorter where it can be ("Multi-" over "tap 1"). */
  label: string
  /** One line: "Types “hello@example.com”", "Tap: Escape · Double tap: Caps Lock"; empty while still being read. */
  summary: string
  /** Nothing set up in this slot yet. */
  empty: boolean
  /** Where it is set up: "#/shortcuts/macro/3". */
  href: string
}

export interface ShortcutSources {
  keyboard: KeyboardData | null
  /** The keyboard's macro buffer, null until read. */
  macros: number[] | null
  entries: Entries | null
  /** The names the user gave the macros ("" where none). */
  macroNames: readonly string[]
}

/** What a macro or multi-tap keycode is, or null for any other keycode. */
export function shortcutKeyOf(code: number, sources: ShortcutSources, steps = readAllMacros(sources)): ShortcutKey | null {
  const macro = readMacroKey(code)
  if (macro !== null) {
    const name = sources.macroNames[macro]?.trim() || defaultMacroName(macro)
    const macroSteps = steps?.[macro]
    const empty = macroSteps !== undefined && macroSteps.length === 0
    return {
      kind: 'macro',
      index: macro,
      name,
      label: name,
      summary: macroSteps === undefined ? '' : empty ? 'Empty' : summarize(macroSteps),
      empty,
      href: shortcutHref('macro', macro),
    }
  }
  const tapDance = readTapDanceKey(code)
  if (tapDance !== null) {
    const entry = sources.entries?.tapDance[tapDance]
    const empty = entry !== undefined && entryIsEmpty('tapDance', entry)
    return {
      kind: 'tapDance',
      index: tapDance,
      name: `Multi-tap key ${tapDance + 1}`,
      // Broken after the hyphen: "Multi-tap" set bold (the current key) is wider than a tile.
      label: `Multi-\ntap ${tapDance + 1}`,
      summary: entry === undefined ? '' : empty ? 'Empty' : summarizeEntry('tapDance', entry),
      empty,
      href: shortcutHref('tapDance', tapDance),
    }
  }
  return null
}

function readAllMacros({ keyboard, macros }: ShortcutSources) {
  return keyboard && macros ? readMacros(macros, keyboard.vialProtocol, keyboard.macroCount) : null
}

/** shortcutKeyOf for the connected keyboard, as it is now. */
export function useShortcutKeys(): (code: number) => ShortcutKey | null {
  const keyboard = useDevice((s) => s.keyboard)
  const macros = useDevice((s) => s.macros)
  const entries = useDevice((s) => s.entries)
  const macroNames = useStoredMacroNames()
  return useMemo(() => {
    const sources = { keyboard, macros, entries, macroNames }
    const steps = readAllMacros(sources)
    return (code: number) => shortcutKeyOf(code, sources, steps)
  }, [keyboard, macros, entries, macroNames])
}

/** "Email: Types “hello@example.com”", "Multi-tap key 2: Empty, set it up on Shortcuts & macros". */
export function shortcutKeyWords(key: ShortcutKey): string {
  if (key.empty) return `${key.name}: empty, set it up on Shortcuts & macros`
  return key.summary ? `${key.name}: ${key.summary}` : key.name
}

/** The palette's macro and multi-tap groups with their keys named and summed up, and a link to where they're set up. */
export function nameShortcutGroups(groups: PaletteGroup[], shortcutKey: (code: number) => ShortcutKey | null): PaletteGroup[] {
  return groups.map((group) => {
    if (group.id !== 'macros' && group.id !== 'tapDance') return group
    return {
      ...group,
      link: group.link ?? { label: 'Set up on Shortcuts & macros', href: '#/shortcuts' },
      keys: group.keys.map((key) => {
        const found = shortcutKey(key.code)
        return found ? { ...key, label: found.label, description: shortcutKeyWords(found), empty: found.empty } : key
      }),
    }
  })
}
