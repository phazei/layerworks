// SPDX-License-Identifier: GPL-3.0-or-later
// Work a page holds that hasn't reached the keyboard yet (a macro being edited, say). Pages declare it here; the
// status line shows it instead of "Saved on the keyboard" and leads back to it.

import { useSyncExternalStore } from 'react'

export interface UnsavedWork {
  /** What it is, starting with a capital: "Macro 3". */
  label: string
  /** Its kind in the plural, for counting several: "macros". */
  group: string
  /** Where to go to finish it, e.g. "#/shortcuts/macro/3". */
  href?: string
  /** The keyboard it belongs to (its uid), when it belongs to one. */
  keyboard?: string
}

let work = new Map<string, UnsavedWork>()
const listeners = new Set<() => void>()

/** Declares (or with null withdraws) unsaved work under an id of the page's choosing, e.g. "macro:<uid>:3". */
export function setUnsaved(id: string, unsaved: UnsavedWork | null): void {
  if (unsaved === null && !work.has(id)) return
  work = new Map(work)
  if (unsaved === null) work.delete(id)
  else work.set(id, unsaved)
  for (const listener of [...listeners]) listener()
}

/** Every piece of unsaved work, in the order it was declared. */
export function useUnsaved(): ReadonlyMap<string, UnsavedWork> {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => work,
  )
}

/**
 * The status line's sentence for some unsaved work: "Macro 3 has changes not yet saved to the keyboard", "2 macros
 * have unsaved changes", or "3 items have unsaved changes" when they are of different kinds.
 */
export function describeUnsaved(items: UnsavedWork[]): string {
  if (items.length === 0) return ''
  if (items.length === 1) return `${items[0].label} has changes not yet saved to the keyboard`
  const group = items[0].group
  return items.every((item) => item.group === group)
    ? `${items.length} ${group} have unsaved changes`
    : `${items.length} items have unsaved changes`
}
