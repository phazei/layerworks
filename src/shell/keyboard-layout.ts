// SPDX-License-Identifier: GPL-3.0-or-later
// Reading the computer's keyboard layout, for key legends that show what each key types here (device/layout.ts).
// Chrome and Edge tell, through navigator.keyboard.getLayoutMap(), which character each writing key types without
// Shift; other browsers can't, and then nothing changes. They fire no event when the layout changes (Edge has no
// `onlayoutchange`), so it is read again when the window comes back to the front, and when a key typed in the page
// gives another character than the map said.
//
// The switch in Settings (pref `key-legends-layout`, on by default) turns it off.
//
// `?layout=KeyY:z,KeyZ:y,Semicolon:ö` in the URL stands in for the browser's map, for screenshots (headless Edge
// is US) and to try another layout's legends.

import { useSyncExternalStore } from 'react'
import { legendsFromLayoutMap, setLayoutLegends } from '../device/layout'
import { getPref, setPref } from '../ui/prefs'

export const LEGENDS_PREF = 'key-legends-layout'

interface KeyboardLayoutMap {
  forEach(callback: (value: string, key: string) => void): void
}
interface LayoutKeyboard {
  getLayoutMap?: () => Promise<KeyboardLayoutMap>
}

export interface LayoutState {
  /** The browser can tell the layout. */
  supported: boolean
  /** null until read, or when not supported. */
  map: ReadonlyMap<string, string> | null
}

let state: LayoutState = { supported: false, map: null }
const listeners = new Set<() => void>()

function set(next: LayoutState): void {
  state = next
  apply()
  for (const listener of [...listeners]) listener()
}

/** Puts the legends in place: the layout's while the switch is on and it differs from US, otherwise US. */
function apply(): void {
  const on = getPref(LEGENDS_PREF, true)
  setLayoutLegends(on && state.map ? legendsFromLayoutMap(state.map) : null)
}

/** `?layout=KeyY:z,KeyZ:y`: a layout map from the URL, or null. */
export function layoutFromUrl(search: string): Map<string, string> | null {
  const text = new URLSearchParams(search).get('layout')
  if (!text) return null
  const map = new Map<string, string>()
  for (const pair of text.split(',')) {
    const at = pair.indexOf(':')
    if (at > 0 && at < pair.length - 1) map.set(pair.slice(0, at), pair.slice(at + 1))
  }
  return map.size > 0 ? map : null
}

async function read(): Promise<void> {
  const fromUrl = typeof location === 'undefined' ? null : layoutFromUrl(location.search)
  if (fromUrl) return set({ supported: true, map: fromUrl })
  const keyboard = (typeof navigator === 'undefined' ? undefined : (navigator as { keyboard?: LayoutKeyboard }).keyboard)
  if (!keyboard?.getLayoutMap) return set({ supported: false, map: null })
  try {
    const layout = await keyboard.getLayoutMap()
    const map = new Map<string, string>()
    layout.forEach((value, key) => map.set(key, value))
    set({ supported: true, map })
  } catch {
    // Not allowed here (an insecure page, a frame): as if the browser couldn't tell.
    set({ supported: false, map: null })
  }
}

let started = false

/** Reads the layout now and keeps it current. Called once when the app starts. */
export function watchKeyboardLayout(): void {
  if (started || typeof window === 'undefined') return
  started = true
  void read()
  window.addEventListener('focus', () => void read())
  document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && void read())
  // A layout switched while the page has the focus (Win + Space): a typed character that isn't what the map says.
  window.addEventListener('keydown', (event) => {
    const expected = state.map?.get(event.code)
    if (expected === undefined || event.repeat || event.shiftKey || event.ctrlKey || event.altKey || event.metaKey) return
    if (event.key.length === 1 && event.key.toLowerCase() !== expected.toLowerCase()) void read()
  })
}

/** Turns the legends that follow the layout on or off (Settings). */
export function setLayoutLegendsOn(on: boolean): void {
  setPref(LEGENDS_PREF, on)
  apply()
}

/** Gives a layout map as the browser would, then applies it: tests. */
export function setLayoutForTests(map: ReadonlyMap<string, string> | null): void {
  set({ supported: map !== null, map })
}

export function useKeyboardLayout(): LayoutState {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => state,
  )
}

/** The US legend of the first key, in a telling order, that types something else here: "Y" → "Z". null for US. */
export function layoutExample(map: ReadonlyMap<string, string> | null): { us: string; here: string } | null {
  if (!map) return null
  const legends = legendsFromLayoutMap(map)
  if (!legends) return null
  const US_ORDER: [string, string][] = [
    ['KeyY', 'Y'], ['KeyZ', 'Z'], ['KeyQ', 'Q'], ['KeyA', 'A'], ['KeyW', 'W'], ['KeyM', 'M'], ['Semicolon', ';'],
    ['Quote', "'"], ['BracketLeft', '['], ['Minus', '-'], ['Slash', '/'], ['Digit1', '1'],
  ]
  for (const [code, us] of US_ORDER) {
    const here = map.get(code)
    if (here && here.toLowerCase() !== us.toLowerCase()) return { us, here: /^\p{L}$/u.test(here) && [...here.toLocaleUpperCase()].length === 1 ? here.toLocaleUpperCase() : here }
  }
  return null
}
