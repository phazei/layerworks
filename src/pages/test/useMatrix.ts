// SPDX-License-Identifier: GPL-3.0-or-later
// The keys the keyboard itself reports as down, for the Test page. Reads only while the page is shown, the tab is
// visible and the keyboard is unlocked. Through the 2.4 GHz receiver every read keeps the keyboard awake, so
// after a while with nothing pressed it pauses until a key or click brings it back (spec section 8).

import { useEffect, useState } from 'react'
import { deviceStore, useDevice } from '../../device'

/** How long the receiver link may go without a change before reading pauses. */
export const IDLE_MS = 2 * 60_000

export type MatrixMode =
  /** Locked, or the lock state is still being read: nothing is read. */
  | 'off'
  | 'watching'
  /** The tab is in the background. */
  | 'hidden'
  /** Paused on the receiver after a while without input; resume() or any key or click starts it again. */
  | 'paused'

const NONE: ReadonlySet<string> = new Set()

export function useMatrix(): { mode: MatrixMode; down: ReadonlySet<string>; resume: () => void } {
  const unlocked = useDevice((s) => s.unlock?.unlocked === true && s.unlocking === null)
  const wireless = useDevice((s) => s.link?.kind === 'receiver')
  const [visible, setVisible] = useState(() => typeof document === 'undefined' || document.visibilityState !== 'hidden')
  const [paused, setPaused] = useState(false)
  const [down, setDown] = useState<ReadonlySet<string>>(NONE)

  useEffect(() => {
    const onChange = () => setVisible(document.visibilityState !== 'hidden')
    document.addEventListener('visibilitychange', onChange)
    return () => document.removeEventListener('visibilitychange', onChange)
  }, [])

  const active = unlocked && visible && !paused
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

  const mode: MatrixMode = !unlocked ? 'off' : !visible ? 'hidden' : paused ? 'paused' : 'watching'
  return { mode, down, resume: () => setPaused(false) }
}
