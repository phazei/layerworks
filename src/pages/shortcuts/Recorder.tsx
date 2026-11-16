// SPDX-License-Identifier: GPL-3.0-or-later
// "Record what I type": the browser's key events while recording, turned into steps (stepsFromRecording). The
// browser only sees keys that reach this window: not Fn or layer keys, and not shortcuts Windows or the browser
// keep for themselves.

import { useEffect, useRef, useState } from 'react'
import { Circle, Square } from 'lucide-react'
import { stepsFromRecording, type MacroStep, type RecordedKey } from '../../device'
import { usageOf } from '../../shell/pressed-keys'
import { Button, Checkbox } from '../../ui/controls'
import { HelpButton } from '../../ui/layout'
import { summarize } from './describe'

/** Pauses shorter than this are typing rhythm, not waits worth keeping. */
const PAUSE_MS = 150

interface Props {
  /** Gets the recorded steps when recording stops. */
  onRecorded: (steps: MacroStep[]) => void
}

export function Recorder({ onRecorded }: Props) {
  const [recording, setRecording] = useState(false)
  const [keepPauses, setKeepPauses] = useState(false)
  const [events, setEvents] = useState<RecordedKey[]>([])
  const [skipped, setSkipped] = useState(0)
  const latest = useRef({ events, keepPauses })
  latest.current = { events, keepPauses }

  const stop = () => {
    setRecording(false)
    const steps = stepsFromRecording(latest.current.events, latest.current.keepPauses ? { keepPausesOver: PAUSE_MS } : {})
    if (steps.length) onRecorded(steps)
    setEvents([])
  }
  const stopRef = useRef(stop)
  stopRef.current = stop

  useEffect(() => {
    if (!recording) return
    const record = (type: RecordedKey['type']) => (event: KeyboardEvent) => {
      // While recording, keys are for the macro: they don't type, scroll or press buttons here.
      event.preventDefault()
      if (event.repeat) return
      const key = usageOf(event.code)
      if (key === undefined) {
        if (type === 'down') setSkipped((n) => n + 1)
        return
      }
      setEvents((list) => [...list, { type, key, time: event.timeStamp }])
    }
    const down = record('down')
    const up = record('up')
    const blur = () => stopRef.current()
    window.addEventListener('keydown', down, true)
    window.addEventListener('keyup', up, true)
    window.addEventListener('blur', blur)
    return () => {
      window.removeEventListener('keydown', down, true)
      window.removeEventListener('keyup', up, true)
      window.removeEventListener('blur', blur)
    }
  }, [recording])

  if (!recording) {
    return (
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="flex items-center gap-0.5">
          <Button
            icon={<Circle size={13} aria-hidden className="fill-danger text-danger" />}
            onClick={() => {
              // Keys typed while recording mustn't land in a text field.
              if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
              setSkipped(0)
              setEvents([])
              setRecording(true)
            }}
          >
            Record what I type
          </Button>
          <HelpButton topic="macro-record" />
        </span>
        <Checkbox label="Keep the pauses as waits" checked={keepPauses} onChange={setKeepPauses} />
      </div>
    )
  }

  const preview = stepsFromRecording(events, keepPauses ? { keepPausesOver: PAUSE_MS } : {})
  return (
    <div role="status" className="flex flex-col gap-2 rounded-control border border-danger/40 bg-danger-soft p-3">
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex items-center gap-2 font-medium text-danger">
          <Circle size={10} aria-hidden className="animate-pulse fill-danger" />
          Recording: type on the keyboard now
        </span>
        <Button size="sm" icon={<Square size={12} aria-hidden />} onClick={stop} className="ml-auto">
          Stop recording
        </Button>
      </div>
      <p className="text-[13px] text-content">{preview.length ? summarize(preview, 8) : 'Nothing yet.'}</p>
      <p className="text-[13px] text-muted">
        Click “Stop recording” with the mouse when done. Fn and layer keys, and shortcuts Windows or the browser keep
        for themselves (Alt + Tab, Ctrl + W, the Windows key), can’t be recorded: add those with “Tap a key”.
        {skipped > 0 && ` ${skipped} key${skipped === 1 ? '' : 's'} the app doesn’t know were left out.`}
      </p>
    </div>
  )
}
