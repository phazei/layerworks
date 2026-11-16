// SPDX-License-Identifier: GPL-3.0-or-later
// The page's own addresses: "#/shortcuts/macro/1" is Macro 1 (QMK's M0) open in the editor; "chord",
// "multi-tap", "replacement" and "repeat" do the same for the other kinds. Numbers start at 1, as on screen.

import type { DraftKind } from './drafts'

const SLUGS: Record<DraftKind, string> = {
  macro: 'macro',
  tapDance: 'multi-tap',
  combo: 'chord',
  keyOverride: 'replacement',
  altRepeatKey: 'repeat',
}

export interface Opened {
  kind: DraftKind
  index: number
}

export const shortcutHref = (kind: DraftKind, index: number): string => `#/shortcuts/${SLUGS[kind]}/${index + 1}`

export const macroHref = (index: number): string => shortcutHref('macro', index)

/** What the path opens (index 0-based), or null. */
export function openedFromPath(path: string): Opened | null {
  const match = /^\/shortcuts\/([a-z-]+)\/(\d+)\/?$/.exec(path)
  if (!match) return null
  const kind = (Object.keys(SLUGS) as DraftKind[]).find((k) => SLUGS[k] === match[1])
  const n = Number(match[2])
  return kind && n >= 1 ? { kind, index: n - 1 } : null
}

/** The macro the path opens (0-based), or null. */
export function macroFromPath(path: string): number | null {
  const opened = openedFromPath(path)
  return opened?.kind === 'macro' ? opened.index : null
}
