// SPDX-License-Identifier: GPL-3.0-or-later
// The keys the Test page has seen, kept outside the page so a look at Help and back doesn't lose the count.
// Starts afresh for another keyboard and on Reset.

import { useCallback, useSyncExternalStore } from 'react'

let owner: string | null = null
let seen: ReadonlySet<string> = new Set()
const listeners = new Set<() => void>()

function publish(next: ReadonlySet<string>): void {
  seen = next
  for (const listener of [...listeners]) listener()
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Keys ("row,col") seen so far on keyboard `uid`, a way to add more, and reset. */
export function useSeenKeys(uid: string): { seen: ReadonlySet<string>; add: (keys: Iterable<string>) => void; reset: () => void } {
  if (owner !== uid) {
    owner = uid
    seen = new Set()
  }
  const current = useSyncExternalStore(subscribe, () => seen)
  const add = useCallback((keys: Iterable<string>) => {
    const fresh = [...keys].filter((key) => !seen.has(key))
    if (fresh.length > 0) publish(new Set([...seen, ...fresh]))
  }, [])
  const reset = useCallback(() => publish(new Set()), [])
  return { seen: current, add, reset }
}

/** For tests. */
export function forgetSeenKeys(): void {
  owner = null
  seen = new Set()
}
