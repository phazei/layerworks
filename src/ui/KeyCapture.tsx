// SPDX-License-Identifier: GPL-3.0-or-later
// "Press a key": a button that, once clicked, takes the next key pressed on the keyboard as its value. Esc or a
// click elsewhere stops waiting. The caller turns the browser's key code into its own value and draws it.

import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { cx } from './controls'

interface KeyCaptureProps {
  /** What is chosen now, drawn by the caller (a keycap), or null when nothing is. */
  current: ReactNode | null
  /** The browser's code of the key pressed (`KeyboardEvent.code`); return false to refuse it (said under it). */
  onKey: (code: string) => boolean
  /** What this key is, for screen readers: "First key". */
  label: string
  /** Said when a key is refused. */
  refusal?: string
}

/**
 * While `active`, hands the browser code of each key pressed to `onKey` (repeats left out) and keeps the page from
 * acting on it; Esc calls `onCancel` instead. For callers that draw their own button (the Keys page's "Press a key").
 */
export function useKeyCapture(active: boolean, onKey: (code: string) => void, onCancel: () => void): void {
  useEffect(() => {
    if (!active) return
    const down = (event: KeyboardEvent) => {
      event.preventDefault()
      event.stopPropagation()
      if (event.repeat) return
      if (event.code === 'Escape') onCancel()
      else onKey(event.code)
    }
    // Capture phase, so nothing else on the page acts on the key first.
    window.addEventListener('keydown', down, true)
    return () => window.removeEventListener('keydown', down, true)
  }, [active, onKey, onCancel])
}

export function KeyCapture({ current, onKey, label, refusal = 'That key can’t be used here.' }: KeyCaptureProps) {
  const [waiting, setWaiting] = useState(false)
  const [refused, setRefused] = useState(false)

  const take = useCallback(
    (code: string) => {
      const ok = onKey(code)
      setRefused(!ok)
      if (ok) setWaiting(false)
    },
    [onKey],
  )
  const stop = useCallback(() => setWaiting(false), [])
  useKeyCapture(waiting, take, stop)

  return (
    <span className="inline-flex flex-col gap-1">
      <button
        type="button"
        aria-label={`${label}: ${waiting ? 'press a key now' : 'click, then press a key'}`}
        aria-pressed={waiting}
        onClick={() => {
          setRefused(false)
          setWaiting(!waiting)
        }}
        onBlur={() => setWaiting(false)}
        className={cx(
          'inline-flex h-9 min-w-24 cursor-pointer items-center justify-center gap-2 rounded-control border px-2 text-[13px] transition-colors duration-(--motion-fast)',
          waiting ? 'border-accent bg-accent-soft text-accent' : 'border-edge bg-raised text-muted hover:bg-raised-hover',
        )}
      >
        {waiting ? 'Press a key…' : (current ?? 'Pick a key')}
      </button>
      {refused && <span className="text-[13px] text-danger">{refusal}</span>}
    </span>
  )
}
