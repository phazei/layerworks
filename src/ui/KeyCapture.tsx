// SPDX-License-Identifier: GPL-3.0-or-later
// "Press a key": a button that, once clicked, takes the next key pressed on the keyboard as its value. Esc or a
// click elsewhere stops waiting. The caller turns the browser's key code into its own value and draws it.

import { useEffect, useState, type ReactNode } from 'react'
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

export function KeyCapture({ current, onKey, label, refusal = 'That key can’t be used here.' }: KeyCaptureProps) {
  const [waiting, setWaiting] = useState(false)
  const [refused, setRefused] = useState(false)

  useEffect(() => {
    if (!waiting) return
    const down = (event: KeyboardEvent) => {
      event.preventDefault()
      event.stopPropagation()
      if (event.repeat) return
      if (event.code === 'Escape') return setWaiting(false)
      const ok = onKey(event.code)
      setRefused(!ok)
      if (ok) setWaiting(false)
    }
    // Capture phase, so nothing else on the page acts on the key first.
    window.addEventListener('keydown', down, true)
    return () => window.removeEventListener('keydown', down, true)
  }, [waiting, onKey])

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
