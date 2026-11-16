// SPDX-License-Identifier: GPL-3.0-or-later
// Macros being edited and not saved yet, one draft per keyboard and macro. Kept outside React, so leaving the page
// and coming back finds them as they were; lost when the page is reloaded, which the browser asks about first.

import { useSyncExternalStore } from 'react'
import type { MacroStep } from '../../device'

let drafts = new Map<string, MacroStep[]>()
const listeners = new Set<() => void>()
const key = (uid: string, index: number) => `${uid}:${index}`

function changed(): void {
  drafts = new Map(drafts)
  for (const listener of [...listeners]) listener()
  syncLeaveWarning()
}

/** Sets the draft of a macro; null drops it (saved, or reverted). */
export function setDraft(uid: string, index: number, steps: MacroStep[] | null): void {
  if (steps === null) {
    if (!drafts.has(key(uid, index))) return
    drafts.delete(key(uid, index))
  } else {
    drafts.set(key(uid, index), steps)
  }
  changed()
}

export const getDraft = (uid: string, index: number): MacroStep[] | undefined => drafts.get(key(uid, index))

/** Every draft, for marking unsaved macros. */
export function useDrafts(): ReadonlyMap<string, MacroStep[]> {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => drafts,
  )
}

export const draftOf = (all: ReadonlyMap<string, MacroStep[]>, uid: string, index: number) => all.get(key(uid, index))

/** Drops every draft (tests). */
export function clearDrafts(): void {
  drafts = new Map()
  changed()
}

// Closing or reloading the tab would lose the drafts: the browser asks first, as long as there are any.
const warn = (event: BeforeUnloadEvent) => {
  event.preventDefault()
}
let warning = false
function syncLeaveWarning(): void {
  if (typeof window === 'undefined') return
  const want = drafts.size > 0
  if (want === warning) return
  warning = want
  if (want) window.addEventListener('beforeunload', warn)
  else window.removeEventListener('beforeunload', warn)
}
