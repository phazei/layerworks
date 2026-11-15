// SPDX-License-Identifier: GPL-3.0-or-later
// Whether the unlock dialog is open, and what became of the unlock it started. Anything that needs the keyboard
// unlocked calls openUnlock(reason); the dialog (UnlockDialog.tsx, mounted once in the shell) does the rest.

import { useSyncExternalStore } from 'react'
import { deviceStore, type UnlockResult } from '../device'

export interface UnlockRequest {
  open: boolean
  /** Why it was asked for, one sentence shown in the dialog, e.g. "The key test needs it to see Fn." */
  reason: string | null
  /** The flow has been started from the dialog and hasn't ended. */
  running: boolean
  /** How the last flow ended, until the dialog is closed. */
  result: UnlockResult | null
}

const CLOSED: UnlockRequest = { open: false, reason: null, running: false, result: null }
let request = CLOSED
const listeners = new Set<() => void>()

function set(patch: Partial<UnlockRequest>): void {
  request = { ...request, ...patch }
  for (const listener of [...listeners]) listener()
}

/** Opens the dialog at its first step: what unlocking is and which keys to hold. */
export function openUnlock(reason?: string): void {
  if (request.running) return
  set({ ...CLOSED, open: true, reason: reason ?? null })
}

/** Starts unlocking (the dialog shows the progress). Called by the dialog's Start button. */
export function startUnlock(): Promise<UnlockResult> {
  set({ open: true, running: true, result: null })
  return deviceStore.unlock().then((result) => {
    set({ running: false, result })
    return result
  })
}

/** Closes the dialog. Ignored while an unlock is running: it can't be walked away from. */
export function closeUnlock(): void {
  if (request.running || deviceStore.getState().unlocking) return
  set(CLOSED)
}

export function useUnlockRequest(): UnlockRequest {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => request,
  )
}
