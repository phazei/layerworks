// SPDX-License-Identifier: GPL-3.0-or-later
// The page's own addresses: "#/shortcuts/macro/1" is Macro 1 open in the editor. Macros and multi-tap keys use
// QMK's own number, as on screen: macro/1 is M1, macro/0 is M0, multi-tap/2 is TD(2). Key chords, shortcut
// replacements and repeat rules have no number of QMK's that shows anywhere, so they count from 1: chord/1 is the
// first slot.

import type { DraftKind } from './drafts'

const SLUGS: Record<DraftKind, string> = {
  macro: 'macro',
  tapDance: 'multi-tap',
  combo: 'chord',
  keyOverride: 'replacement',
  altRepeatKey: 'repeat',
}

/** Kinds whose number on screen is QMK's own (M1, TD(1)), slot 0 included. */
export const usesQmkNumber = (kind: DraftKind): boolean => kind === 'macro' || kind === 'tapDance'

/** The number shown for a slot: QMK's for macros and multi-tap keys, otherwise counting from 1. */
export const slotNumber = (kind: DraftKind, index: number): number => (usesQmkNumber(kind) ? index : index + 1)

export interface Opened {
  kind: DraftKind
  index: number
}

export const shortcutHref = (kind: DraftKind, index: number): string => `#/shortcuts/${SLUGS[kind]}/${slotNumber(kind, index)}`

export const macroHref = (index: number): string => shortcutHref('macro', index)

/** What the path opens (index 0-based, the slot), or null. */
export function openedFromPath(path: string): Opened | null {
  const match = /^\/shortcuts\/([a-z-]+)\/(\d+)\/?$/.exec(path)
  if (!match) return null
  const kind = (Object.keys(SLUGS) as DraftKind[]).find((k) => SLUGS[k] === match[1])
  if (!kind) return null
  const n = Number(match[2])
  const index = usesQmkNumber(kind) ? n : n - 1
  return index >= 0 ? { kind, index } : null
}

/** The macro the path opens (QMK's index), or null. */
export function macroFromPath(path: string): number | null {
  const opened = openedFromPath(path)
  return opened?.kind === 'macro' ? opened.index : null
}
