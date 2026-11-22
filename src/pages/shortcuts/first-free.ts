// SPDX-License-Identifier: GPL-3.0-or-later
// The slot "Add" opens and a number-less address ("#/shortcuts/multi-tap") lands on: the first one with nothing
// saved in it and no draft, in the page's order (macros and multi-tap keys from number 1, 0 last; the other kinds
// from their first slot).

import { entryIsEmpty, firstFreeSlot, readMacros, type AnyEntry, type Entries, type KeyboardData } from '../../device'
import { draftOf, entryDraftOf, type DraftKind } from './drafts'
import { usesQmkNumber } from './route'

/** The first free slot of a kind; null when every one is taken; undefined while the keyboard is still being read. */
export function firstFree(
  kind: DraftKind,
  kb: KeyboardData,
  macros: number[] | null,
  entries: Entries | null,
  drafts: ReadonlyMap<string, unknown>,
): number | null | undefined {
  if (kind === 'macro') {
    if (!macros) return undefined
    const saved = readMacros(macros, kb.vialProtocol, kb.macroCount)
    return firstFreeSlot(kb.macroCount, (i) => (saved[i]?.length ?? 0) === 0 && draftOf(drafts, kb.uid, i) === undefined)
  }
  if (!entries) return undefined
  const saved = entries[kind] as AnyEntry[]
  const free = (i: number) => entryIsEmpty(kind, saved[i]) && entryDraftOf(drafts, kb.uid, kind, i) === undefined
  if (usesQmkNumber(kind)) return firstFreeSlot(saved.length, free)
  const index = saved.findIndex((_, i) => free(i))
  return index >= 0 ? index : null
}
