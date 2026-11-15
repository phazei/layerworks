// SPDX-License-Identifier: GPL-3.0-or-later
// Sends changes one at a time, and while one is on its way keeps only the newest of the rest. Dragging a slider
// produces dozens of values a second; the keyboard gets as many as it can take, always ending on the last one,
// and never two of them overlapping.

import { useState, useSyncExternalStore } from 'react'

export interface LatestQueue<T extends object> {
  /** Merges the change into what is waiting and sends it as soon as nothing else is on its way. */
  push(change: T): void
  /** Everything sent but not finished, or waiting, merged; an empty object when the queue is idle. */
  pending(): Partial<T>
  subscribe(listener: () => void): () => void
  /** Resolves once everything pushed so far has been sent. */
  idle(): Promise<void>
}

export function createLatestQueue<T extends object>(send: (change: T) => Promise<unknown>): LatestQueue<T> {
  let waiting: T | null = null
  let sending: T | null = null
  let snapshot: Partial<T> = {}
  let idlers: (() => void)[] = []
  const listeners = new Set<() => void>()

  function changed(): void {
    snapshot = { ...sending, ...waiting }
    for (const listener of [...listeners]) listener()
  }

  async function pump(): Promise<void> {
    while (waiting) {
      sending = waiting
      waiting = null
      changed()
      try {
        await send(sending)
      } catch {
        // The sender reports its own failures (the device store's writeError); carry on with the next change.
      }
    }
    sending = null
    changed()
    const done = idlers
    idlers = []
    for (const resolve of done) resolve()
  }

  return {
    push(change) {
      waiting = { ...waiting, ...change }
      if (sending) changed()
      else void pump()
    },
    pending: () => snapshot,
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    idle: () => (sending || waiting ? new Promise((resolve) => idlers.push(resolve)) : Promise.resolve()),
  }
}

/** A queue for the life of the component, and what it still has on its way (re-rendering as that changes). */
export function useLatestQueue<T extends object>(send: (change: T) => Promise<unknown>): [Partial<T>, (change: T) => void] {
  const [queue] = useState(() => createLatestQueue(send))
  const pending = useSyncExternalStore(queue.subscribe, queue.pending)
  return [pending, queue.push]
}
