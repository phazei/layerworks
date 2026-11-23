// SPDX-License-Identifier: GPL-3.0-or-later
// Shortcuts being edited and not saved yet: one draft per keyboard, kind and slot (a macro's steps, or a tap dance,
// combo, key override or alt repeat entry). Kept outside React, so leaving the page and coming back finds them as
// they were; lost when the page is reloaded, which the browser asks about first.

import { useSyncExternalStore } from 'react'
import type { AnyEntry, EntryKind, MacroStep } from '../../device'
import { storedMacroNames } from '../../ui/layer-names'
import { setUnsaved } from '../../shell/unsaved'
import { shortcutHref, slotNumber } from './route'

/** What a draft can be for: a macro, or one of the entry kinds. */
export type DraftKind = 'macro' | EntryKind

let drafts = new Map<string, unknown>()
const listeners = new Set<() => void>()
const key = (uid: string, kind: DraftKind, index: number) => `${uid}:${kind}:${index}`

function changed(): void {
  drafts = new Map(drafts)
  for (const listener of [...listeners]) listener()
  syncLeaveWarning()
}

function put(id: string, value: unknown): void {
  if (value === null) {
    if (!drafts.has(id)) return
    drafts.delete(id)
  } else {
    drafts.set(id, value)
  }
  changed()
}

/** Sets the draft of a macro; null drops it (saved, or reverted). */
export function setDraft(uid: string, index: number, steps: MacroStep[] | null): void {
  put(key(uid, 'macro', index), steps)
  announce(uid, 'macro', index, steps !== null)
}

// The status line shows drafts as unsaved work (shell/unsaved.ts), leading back to them.
const NAMES: Record<DraftKind, [string, string]> = {
  macro: ['Macro', 'macros'],
  tapDance: ['Multi-tap key', 'multi-tap keys'],
  combo: ['Key chord', 'key chords'],
  keyOverride: ['Shortcut replacement', 'shortcut replacements'],
  altRepeatKey: ['Repeat rule', 'repeat rules'],
}
function announce(uid: string, kind: DraftKind, index: number, unsaved: boolean): void {
  const [one, many] = NAMES[kind]
  // As the list calls it: a macro by the name the user gave it, otherwise "Macro 3" for M3.
  const label = (kind === 'macro' && storedMacroNames(uid)[index]?.trim()) || `${one} ${slotNumber(kind, index)}`
  setUnsaved(key(uid, kind, index), unsaved ? { label, group: many, href: shortcutHref(kind, index), keyboard: uid } : null)
}

/** Says a macro's unsaved work again under its new name, after it is renamed. */
export function renamedMacro(uid: string, index: number): void {
  if (drafts.has(key(uid, 'macro', index))) announce(uid, 'macro', index, true)
}

export const getDraft = (uid: string, index: number): MacroStep[] | undefined =>
  drafts.get(key(uid, 'macro', index)) as MacroStep[] | undefined

/** Sets the draft of a tap dance, combo, key override or alt repeat entry; null drops it. */
export function setEntryDraft(uid: string, kind: EntryKind, index: number, entry: AnyEntry | null): void {
  put(key(uid, kind, index), entry)
  announce(uid, kind, index, entry !== null)
}

export const getEntryDraft = (uid: string, kind: EntryKind, index: number): AnyEntry | undefined =>
  drafts.get(key(uid, kind, index)) as AnyEntry | undefined

/** Every draft, for marking unsaved ones. */
export function useDrafts(): ReadonlyMap<string, unknown> {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => drafts,
  )
}

export const draftOf = (all: ReadonlyMap<string, unknown>, uid: string, index: number) =>
  all.get(key(uid, 'macro', index)) as MacroStep[] | undefined

export const entryDraftOf = (all: ReadonlyMap<string, unknown>, uid: string, kind: EntryKind, index: number) =>
  all.get(key(uid, kind, index)) as AnyEntry | undefined

/** How many drafts there are: shortcuts with unsaved changes. */
export const draftCount = (): number => drafts.size

/** Drops every draft (tests). */
export function clearDrafts(): void {
  for (const id of drafts.keys()) setUnsaved(id, null)
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
