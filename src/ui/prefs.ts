// SPDX-License-Identifier: GPL-3.0-or-later
// Small things the app remembers in this browser: theme, which "More options" are open, layer names.

import { useCallback, useSyncExternalStore } from 'react'

const PREFIX = 'layerworks:'
const listeners = new Set<() => void>()
const cache = new Map<string, unknown>()

const isStringList = (v: unknown) => Array.isArray(v) && v.every((s) => typeof s === 'string')
const isByte = (v: unknown) => typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= 255
const isHueSat = (v: unknown) =>
  typeof v === 'object' && v !== null && isByte((v as Record<string, unknown>).hue) && isByte((v as Record<string, unknown>).sat)

/**
 * Shapes of the values kept under known names, by the name's start. Every `phazei.github.io` project shares this
 * browser storage, and an older or damaged value can be anything, so a value is only used when it has its shape.
 */
const SHAPES: [prefix: string, valid: (value: unknown) => boolean][] = [
  ['layer-names:', isStringList],
  ['macro-names:', isStringList],
  // Before 'key-colour', which it starts with.
  ['key-colours-recent', (v) => Array.isArray(v) && v.every(isHueSat)],
  ['key-colour', isHueSat],
]

/**
 * Whether a stored value can stand in for `fallback`: the shape its name calls for (SHAPES), else the same kind of
 * value as the fallback (a finite number for a number, an array for an array, a plain object for an object; for a
 * null fallback a number, string or null).
 */
function fits(key: string, value: unknown, fallback: unknown): boolean {
  const shape = SHAPES.find(([prefix]) => key.startsWith(prefix))
  if (shape) return shape[1](value)
  if (fallback === null) return value === null || typeof value === 'string' || (typeof value === 'number' && Number.isFinite(value))
  if (Array.isArray(fallback)) return Array.isArray(value)
  if (typeof fallback === 'number') return typeof value === 'number' && Number.isFinite(value)
  if (typeof fallback === 'object') return typeof value === 'object' && value !== null && !Array.isArray(value)
  return typeof value === typeof fallback
}

function read<T>(key: string, fallback: T): T {
  if (cache.has(key)) return cache.get(key) as T
  let value = fallback
  try {
    const stored = localStorage.getItem(PREFIX + key)
    if (stored !== null) {
      const parsed: unknown = JSON.parse(stored)
      // A value of the wrong shape is treated as absent.
      if (fits(key, parsed, fallback)) value = parsed as T
    }
  } catch {
    // Unreadable or blocked storage: carry on with the fallback.
  }
  cache.set(key, value)
  return value
}

export function getPref<T>(key: string, fallback: T): T {
  return read(key, fallback)
}

export function setPref<T>(key: string, value: T): void {
  cache.set(key, value)
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value))
  } catch {
    // Storage full or blocked: the value still holds until the page closes.
  }
  for (const listener of [...listeners]) listener()
}

/** Forgets everything remembered, in storage and in memory (tests: each starts as a fresh browser would). */
export function clearPrefs(): void {
  cache.clear()
  try {
    for (const key of Object.keys(localStorage)) if (key.startsWith(PREFIX)) localStorage.removeItem(key)
  } catch {
    // Blocked storage: nothing was kept there.
  }
  for (const listener of [...listeners]) listener()
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Like useState, but kept across visits. `fallback` must be a stable value (a constant, not a new object). */
export function usePref<T>(key: string, fallback: T): [T, (value: T) => void] {
  const value = useSyncExternalStore(subscribe, () => read(key, fallback))
  const set = useCallback((next: T) => setPref(key, next), [key])
  return [value, set]
}
