// SPDX-License-Identifier: GPL-3.0-or-later
// The last restore that stopped part-way, kept for this visit: the Restore panel unmounts when the keyboard goes
// away, so the connect prompt and the Device page say it afterwards. Restoring the same file again finishes it:
// the plan only holds what still differs.

import { useSyncExternalStore } from 'react'

export interface RestoreRecord {
  fileName: string
  /** The keyboard it was for (its Vial uid). */
  uid: string
  done: number
  total: number
  /** The keyboard went away, or stopped answering. */
  because: 'disconnected' | 'not-answering'
}

let record: RestoreRecord | null = null
const listeners = new Set<() => void>()

/** Records a restore that stopped part-way, or with null forgets it (one finished, or the notice was dismissed). */
export function setRestoreRecord(next: RestoreRecord | null): void {
  record = next
  for (const listener of [...listeners]) listener()
}

export function useRestoreRecord(): RestoreRecord | null {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => record,
  )
}

/** "Restoring file.json stopped after 24 of 25 changes …" */
export function describeRecord(r: RestoreRecord): string {
  const why = r.because === 'disconnected' ? 'the keyboard went away' : 'the keyboard stopped answering'
  return `Restoring ${r.fileName} stopped after ${r.done} of ${r.total} changes, because ${why}. Choose the same file again on the Device page and restore it: only what still differs is written.`
}
