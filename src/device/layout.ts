// SPDX-License-Identifier: GPL-3.0-or-later
// Key legends that follow the computer's keyboard layout. The keyboard sends positions (QMK's KC_Y is "the key
// where a US keyboard has Y"); the computer's layout decides the character: on German QWERTZ that key types z. The
// browser tells which character each writing key types without Shift (navigator.keyboard.getLayoutMap(), read in
// shell/keyboard-layout.ts); this module holds the result as "basic keycode → character" for keycodes.ts, which
// names every key from it. Null while the layout is US, or unknown: then every legend is the US one.
//
// The browser says nothing about Shift or AltGr, so on another layout a key shows only what it types unshifted, and
// keys QMK stores as Shift + a key (its "!", "@" …) read "Shift + <that key's character>". See legendOf.

import { useSyncExternalStore } from 'react'

/** KeyboardEvent.code → QMK basic keycode (USB HID usage) for the keys a layout map covers. */
export const LAYOUT_CODES: Readonly<Record<string, number>> = (() => {
  const codes: Record<string, number> = {
    Minus: 0x2d, Equal: 0x2e, BracketLeft: 0x2f, BracketRight: 0x30, Backslash: 0x31, Semicolon: 0x33, Quote: 0x34,
    Backquote: 0x35, Comma: 0x36, Period: 0x37, Slash: 0x38, IntlBackslash: 0x64, IntlRo: 0x87, IntlYen: 0x89,
    Digit0: 0x27,
  }
  for (let i = 0; i < 26; i++) codes[`Key${String.fromCharCode(65 + i)}`] = 0x04 + i
  for (let i = 1; i <= 9; i++) codes[`Digit${i}`] = 0x1d + i
  return codes
})()

/** What each key types unshifted on a US layout: the legends the app shows when the layout is US or unknown. */
const US: Readonly<Record<string, string>> = (() => {
  const us: Record<string, string> = {
    Minus: '-', Equal: '=', BracketLeft: '[', BracketRight: ']', Backslash: '\\', Semicolon: ';', Quote: "'",
    Backquote: '`', Comma: ',', Period: '.', Slash: '/', IntlBackslash: '\\', Digit0: '0',
  }
  for (let i = 0; i < 26; i++) us[`Key${String.fromCharCode(65 + i)}`] = String.fromCharCode(97 + i)
  for (let i = 1; i <= 9; i++) us[`Digit${i}`] = String(i)
  return us
})()

/**
 * The legends a layout map gives, or null when it types what a US layout does on every key it names (nothing to
 * change). Keys the map leaves out keep their US legend.
 */
export function legendsFromLayoutMap(map: ReadonlyMap<string, string>): Map<number, string> | null {
  const legends = new Map<number, string>()
  let differs = false
  for (const [code, char] of map) {
    const keycode = LAYOUT_CODES[code]
    if (keycode === undefined || !char) continue
    legends.set(keycode, char)
    if (US[code] !== undefined && US[code] !== char) differs = true
  }
  return differs ? legends : null
}

let legends: ReadonlyMap<number, string> | null = null
let revision = 0
const listeners = new Set<() => void>()

/** Sets the legends (null: US legends); everything that names keys reads them. */
export function setLayoutLegends(next: ReadonlyMap<number, string> | null): void {
  const same = next === legends || (next !== null && legends !== null && next.size === legends.size && [...next].every(([k, v]) => legends!.get(k) === v))
  if (same) return
  legends = next
  revision++
  for (const listener of [...listeners]) listener()
}

/** The character the layout types for a basic keycode, unshifted; undefined while the legends are US. */
export const layoutChar = (code: number): string | undefined => legends?.get(code)

/** True while legends follow a layout other than US. */
export const layoutActive = (): boolean => legends !== null

/** A number that changes whenever the legends do: for memos that name keys, and to re-render on a change. */
export function useLegendRevision(): number {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => revision,
  )
}
