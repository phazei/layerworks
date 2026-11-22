// SPDX-License-Identifier: GPL-3.0-or-later
// The keys the keyboard itself reports as down (its switch matrix), for the Test page and the Keys page's "Press a
// key". Reads only while `enabled`, the tab is visible and the keyboard is unlocked; every caller shares the store's
// one poll loop (deviceStore.watchMatrix). Through the 2.4 GHz receiver every read keeps the keyboard awake, so
// after a while with nothing pressed it pauses until a key or click brings it back (spec section 8).

import { useEffect, useState } from 'react'
import { matrixReadable } from './matrix'
import { deviceStore, useDevice } from './useDevice'

/** How long the receiver link may go without a change before reading pauses. */
export const IDLE_MS = 2 * 60_000

export type MatrixMode =
  /** Locked, the lock state is still being read, or the caller doesn't want it now: nothing is read. */
  | 'off'
  | 'watching'
  /** The tab is in the background. */
  | 'hidden'
  /** Paused on the receiver after a while without input; resume() or any key or click starts it again. */
  | 'paused'

const NONE: ReadonlySet<string> = new Set()

/** `enabled`: read only while the caller needs it (the Keys page: while "Press a key" waits). */
export function useMatrix(enabled = true): { mode: MatrixMode; down: ReadonlySet<string>; resume: () => void } {
  // Readable: unlocked, not unlocking, and a matrix VIA's read can report (./matrix.ts, matrixReadable).
  const unlocked = useDevice(
    (s) => s.unlock?.unlocked === true && s.unlocking === null && (!s.keyboard || matrixReadable(s.keyboard.rows, s.keyboard.cols)),
  )
  const wireless = useDevice((s) => s.link?.kind === 'receiver')
  const [visible, setVisible] = useState(() => typeof document === 'undefined' || document.visibilityState !== 'hidden')
  const [paused, setPaused] = useState(false)
  const [down, setDown] = useState<ReadonlySet<string>>(NONE)

  useEffect(() => {
    const onChange = () => setVisible(document.visibilityState !== 'hidden')
    document.addEventListener('visibilitychange', onChange)
    return () => document.removeEventListener('visibilitychange', onChange)
  }, [])

  const active = enabled && unlocked && visible && !paused
  useEffect(() => {
    if (!active) return
    let idle: ReturnType<typeof setTimeout> | undefined
    const restartIdle = () => {
      if (!wireless) return
      clearTimeout(idle)
      idle = setTimeout(() => setPaused(true), IDLE_MS)
    }
    restartIdle()
    const stop = deviceStore.watchMatrix((keys) => {
      setDown(keys)
      restartIdle()
    })
    return () => {
      clearTimeout(idle)
      stop()
      setDown(NONE)
    }
  }, [active, wireless])

  // Paused: the browser still sees keys, and any of them (or a click) brings reading back.
  useEffect(() => {
    if (!paused) return
    const wake = () => setPaused(false)
    window.addEventListener('keydown', wake)
    window.addEventListener('pointerdown', wake)
    return () => {
      window.removeEventListener('keydown', wake)
      window.removeEventListener('pointerdown', wake)
    }
  }, [paused])

  const mode: MatrixMode = !enabled || !unlocked ? 'off' : !visible ? 'hidden' : paused ? 'paused' : 'watching'
  return { mode, down, resume: () => setPaused(false) }
}
