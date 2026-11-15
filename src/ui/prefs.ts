// SPDX-License-Identifier: GPL-3.0-or-later
// Small things the app remembers in this browser: theme, which "More options" are open, layer names.

import { useCallback, useSyncExternalStore } from 'react'

const PREFIX = 'layerworks:'
const listeners = new Set<() => void>()
const cache = new Map<string, unknown>()

function read<T>(key: string, fallback: T): T {
  if (cache.has(key)) return cache.get(key) as T
  let value = fallback
  try {
    const stored = localStorage.getItem(PREFIX + key)
    if (stored !== null) value = JSON.parse(stored) as T
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
