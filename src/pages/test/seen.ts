// SPDX-License-Identifier: GPL-3.0-or-later
// The keys the Test page has seen, kept outside the page so a look at Help and back doesn't lose the count.
// Starts afresh for another keyboard and on Reset.

import { useCallback, useEffect, useSyncExternalStore } from 'react'

const NONE: ReadonlySet<string> = new Set()

/** The keys seen, and the keyboard they were seen on. */
let state: { owner: string | null; keys: ReadonlySet<string> } = { owner: null, keys: NONE }
const listeners = new Set<() => void>()

function publish(owner: string, keys: ReadonlySet<string>): void {
  state = { owner, keys }
  for (const listener of [...listeners]) listener()
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Keys ("row,col") seen so far on keyboard `uid`, a way to add more, and reset. */
export function useSeenKeys(uid: string): { seen: ReadonlySet<string>; add: (keys: Iterable<string>) => void; reset: () => void } {
  // Another keyboard's keys never show: they read as none until this keyboard takes the list over.
  const seen = useSyncExternalStore(subscribe, () => (state.owner === uid ? state.keys : NONE))
  useEffect(() => {
    if (state.owner !== uid) publish(uid, NONE)
  }, [uid])
  const add = useCallback(
    (keys: Iterable<string>) => {
      const known = state.owner === uid ? state.keys : NONE
      const fresh = [...keys].filter((key) => !known.has(key))
      if (fresh.length > 0) publish(uid, new Set([...known, ...fresh]))
    },
    [uid],
  )
  const reset = useCallback(() => publish(uid, NONE), [uid])
  return { seen, add, reset }
}

/** For tests. */
export function forgetSeenKeys(): void {
  state = { owner: null, keys: NONE }
}
