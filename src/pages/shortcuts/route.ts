// SPDX-License-Identifier: GPL-3.0-or-later
// The page's own addresses: "#/shortcuts/macro/1" is Macro 1 (QMK's M0) open in the editor.

export const macroHref = (index: number): string => `#/shortcuts/macro/${index + 1}`

/** The macro the path opens (0-based), or null. */
export function macroFromPath(path: string): number | null {
  const match = /^\/shortcuts\/macro\/(\d+)\/?$/.exec(path)
  const n = match ? Number(match[1]) : 0
  return n >= 1 ? n - 1 : null
}
