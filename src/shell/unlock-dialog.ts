// SPDX-License-Identifier: GPL-3.0-or-later
// Whether the unlock dialog is open, and what became of the unlock it started. Anything that needs the keyboard
// unlocked calls openUnlock(reason) and, if it wants to carry on by itself afterwards, awaits whether it worked; the
// dialog (UnlockDialog.tsx, mounted once in the shell) does the rest.

import { useSyncExternalStore } from 'react'
import { deviceStore, type UnlockResult } from '../device'
import { demoKeyboard } from './session'

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
/** Whoever asked through openUnlock and is waiting to hear whether the keyboard is now unlocked. */
let waiting: ((unlocked: boolean) => void)[] = []

function set(patch: Partial<UnlockRequest>): void {
  request = { ...request, ...patch }
  for (const listener of [...listeners]) listener()
}

function settle(unlocked: boolean): void {
  const all = waiting
  waiting = []
  for (const resolve of all) resolve(unlocked)
}

/**
 * Opens the dialog at its first step: what unlocking is and which keys to hold. Resolves true as soon as the unlock
 * completes (while the dialog still shows "done"), so whatever needed it can go ahead by itself; false when the
 * dialog is closed without unlocking (cancelled, or the unlock didn't complete). Already unlocked: true at once,
 * without opening anything.
 */
export function openUnlock(reason?: string): Promise<boolean> {
  if (deviceStore.getState().unlock?.unlocked) return Promise.resolve(true)
  const answer = new Promise<boolean>((resolve) => waiting.push(resolve))
  if (!request.running) set({ ...CLOSED, open: true, reason: reason ?? null })
  return answer
}

/**
 * Starts unlocking (the dialog shows the progress). Called by the dialog's Start button, and by `?unlock=start` in
 * the address (screenshots). Started from anywhere but the open dialog, it only goes ahead on the demo keyboard: a
 * link mustn't make a real keyboard stop typing. Elsewhere it opens the dialog at its first step instead.
 */
export function startUnlock(): Promise<UnlockResult> {
  if (!request.open && !demoKeyboard()) {
    void openUnlock()
    return Promise.resolve('failed')
  }
  set({ open: true, running: true, result: null })
  return deviceStore.unlock().then((result) => {
    set({ running: false, result })
    if (result === 'unlocked') settle(true)
    return result
  })
}

/** Closes the dialog. Ignored while an unlock is running: it can't be walked away from. */
export function closeUnlock(): void {
  if (request.running || deviceStore.getState().unlocking) return
  set(CLOSED)
  settle(false)
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
