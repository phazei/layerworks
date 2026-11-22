// SPDX-License-Identifier: GPL-3.0-or-later
// "Press a key": the next key pressed on the keyboard becomes what the selected key does, as if its tile had been
// clicked. Locked, only the browser's key events count, so only keys that reach the computer as keys (not Fn, layer
// or macro keys, most media keys). Unlocked, the keyboard's switch matrix is read too, only while waiting: a press
// there gives the key's position, and the value taken is what that key does now on the layer the keyboard is on
// (tap-or-hold and layer keys included). When both report the press, the matrix wins: it is the exact key.

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { Keyboard } from 'lucide-react'
import { useDevice, type KeyboardData } from '../../device'
import { useMatrix } from '../../device/useMatrix'
import { keycodeOfEvent } from '../../shell/pressed-keys'
import { screenshotOption } from '../../shell/session'
import { openUnlock } from '../../shell/unlock-dialog'
import { Button } from '../../ui/controls'
import { useKeyCapture } from '../../ui/KeyCapture'
import { HelpButton } from '../../ui/layout'
import { keyNow } from './describe'

/** How long a browser key event waits for the matrix to report the same press (it reads every 20 – 60 ms). */
export const MATRIX_WAIT_MS = 400

const ESCAPE = 0x29
const NO_LAYER = { base: 0, active: 0 }

interface Options {
  keyboard: KeyboardData
  /** Called with the keycode taken; it goes through the same checks as a palette pick. */
  onPick: (code: number) => void
}

/** The button for beside the palette's search, and a line to show under it while waiting (or after a refusal). */
export function usePressKey({ keyboard, onPick }: Options): { button: ReactNode; note: ReactNode | null } {
  // `?press-key` in the URL: waiting from the start, for screenshots of the line it shows. Only on the demo keyboard
  // (screenshotOption): waiting, the next key pressed is written.
  const [waiting, setWaiting] = useState(() => screenshotOption('press-key') !== null)
  const [refusal, setRefusal] = useState<string | null>(null)
  const layer = useDevice((s) => s.layer) ?? NO_LAYER
  const unlocked = useDevice((s) => s.unlock?.unlocked === true)
  const matrix = useMatrix(waiting)
  const watching = matrix.mode === 'watching'
  const browserTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const seen = useRef<ReadonlySet<string>>(new Set())

  const stop = useCallback(() => {
    clearTimeout(browserTimer.current)
    setWaiting(false)
  }, [])

  const take = useCallback(
    (code: number | null, refused: string) => {
      stop()
      if (code === null) setRefusal(refused)
      else onPick(code)
    },
    [onPick, stop],
  )

  // The browser's report: at once while locked; unlocked, only if the matrix hasn't reported the press in time.
  const onBrowserKey = useCallback(
    (eventCode: string) => {
      const code = keycodeOfEvent(eventCode) ?? null
      const refused = unlocked
        ? 'That key couldn’t be read. Try again, or pick it below.'
        : 'The browser can’t tell which key that is. Unlocking lets this see every key; or pick it below.'
      if (!watching) return take(code, refused)
      clearTimeout(browserTimer.current)
      browserTimer.current = setTimeout(() => take(code, refused), MATRIX_WAIT_MS)
    },
    [take, unlocked, watching],
  )
  useKeyCapture(waiting, onBrowserKey, stop)

  // The matrix's report: a key down now that wasn't before. Esc's position stops waiting, as Esc does.
  useEffect(() => {
    if (!waiting) return
    const added = [...matrix.down].filter((position) => !seen.current.has(position))
    seen.current = matrix.down
    if (added.length === 0) return
    const code = keyNow(keyboard, added[0], layer)
    if (code === ESCAPE) return stop()
    take(code, 'That key does nothing on this layer.')
  }, [matrix.down, waiting, keyboard, layer, take, stop])

  useEffect(() => () => clearTimeout(browserTimer.current), [])

  const start = () => {
    setRefusal(null)
    seen.current = new Set()
    if (waiting) return stop()
    matrix.resume()
    setWaiting(true)
  }

  const button = (
    <Button
      size="sm"
      variant={waiting ? 'primary' : 'secondary'}
      icon={<Keyboard size={14} aria-hidden />}
      aria-pressed={waiting}
      onClick={start}
      onBlur={stop}
      className="shrink-0"
    >
      {waiting ? 'Press a key now…' : 'Press a key'}
    </Button>
  )

  let note: ReactNode | null = null
  if (waiting) {
    note = unlocked ? (
      <>
        Press the key on the keyboard: this key then does what that one does now, on the layer the keyboard is on.
        It also does its usual job on the computer meanwhile (a macro key types its macro). Esc stops.
      </>
    ) : (
      <>
        Press the key on the keyboard. While it is locked only keys the computer receives count: not Fn, layer or
        macro keys, and most media keys.{' '}
        <button
          type="button"
          // Before the press-key button loses focus, so the click lands.
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            stop()
            void openUnlock('Unlocked, “Press a key” sees every key, Fn and layer keys included.')
          }}
          className="cursor-pointer font-medium text-accent hover:underline"
        >
          Unlock to see every key…
        </button>{' '}
        Esc stops.
      </>
    )
  } else if (refusal) {
    note = <span className="text-danger">{refusal}</span>
  }

  return {
    button,
    note:
      note === null ? null : (
        <span className="flex items-start gap-0.5">
          <span>{note}</span>
          <HelpButton topic="press-key" />
        </span>
      ),
  }
}
