// SPDX-License-Identifier: GPL-3.0-or-later
// The unlock flow on screen: first what unlocking is and which keys to hold (shown on the keyboard), then the
// keyboard's own count as a bar while the keys are held, then done. Once the keyboard has started counting
// there is no way back, so the dialog can't be closed until it ends, and leaving the page asks first.

import { useEffect, useMemo, useRef, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from 'react'
import { CircleCheck, TriangleAlert, Unplug } from 'lucide-react'
import {
  KC_NOTHING,
  KC_SAME_AS_BELOW,
  keycodeName,
  posKey,
  useDevice,
  type KeyboardData,
  type UnlockProgress,
} from '../device'
import { Button, Spinner } from '../ui/controls'
import { KeyboardPicture } from '../ui/KeyboardPicture'
import { Modal } from '../ui/Modal'
import { ProgressBar } from '../ui/ProgressBar'
import { closeUnlock, startUnlock, useUnlockRequest } from './unlock-dialog'

/** "Esc and Enter": the unlock keys by what they type on the base layer, or by position when that says nothing. */
export function unlockKeyNames(keyboard: KeyboardData, layer: number, keys: [number, number][]): string {
  const names = keys.map(([row, col]) => {
    const code = keyboard.keymap[`${layer},${row},${col}`] ?? keyboard.keymap[`0,${row},${col}`] ?? KC_NOTHING
    return code === KC_NOTHING || code === KC_SAME_AS_BELOW ? `the key at row ${row + 1}, column ${col + 1}` : keycodeName(code)
  })
  if (names.length <= 1) return names.join('')
  return `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`
}

function Warning({ children }: { children: ReactNode }) {
  return (
    <div className="flex gap-2.5 rounded-control border border-edge bg-raised px-3 py-2.5 text-[13px] text-content">
      <TriangleAlert size={16} aria-hidden className="mt-0.5 shrink-0 text-warning" />
      <div>{children}</div>
    </div>
  )
}

const HOW_TO_END =
  'If you can’t finish, unplug the keyboard and plug it back in, or move its connection switch away and back: that ends it, still locked.'

/** `count`: how many keys the keyboard asks for (two on most, up to 15). */
export function Counting({ progress, keys, count }: { progress: UnlockProgress | null; keys: string; count: number }) {
  const done = progress ? progress.total - progress.remaining : 0
  const total = progress?.total ?? 50
  // Remember how far it got, to say so when letting go starts the count again.
  const best = useRef(0)
  best.current = Math.max(best.current, done)
  const restarted = progress !== null && done === 0 && best.current > 0

  return (
    <div className="flex flex-col gap-4">
      <p className="text-content">
        Hold <strong>{keys}</strong> together and keep holding until the bar is full.
      </p>
      <div className="flex flex-col gap-1.5">
        <ProgressBar label="Unlocking" value={done} max={total} valueText={`${done} of ${total} steps`} />
        <div className="flex justify-between text-[13px]">
          <span aria-live="polite">
            {progress === null ? (
              <span className="inline-flex items-center gap-1.5">
                <Spinner size={13} /> Starting…
              </span>
            ) : progress.silent ? (
              'The keyboard isn’t answering right now. Still asking…'
            ) : restarted ? (
              `The count started again: hold ${count === 2 ? 'both keys' : 'all of them'} at the same time.`
            ) : done === 0 ? (
              'Waiting for the keys…'
            ) : (
              'Keep holding…'
            )}
          </span>
          <span className="tabular-nums">
            {done} of {total}
          </span>
        </div>
      </div>
      <p className="text-[13px]">
        The keyboard doesn’t type until this finishes, and it can’t be cancelled. {HOW_TO_END}
      </p>
    </div>
  )
}

export function UnlockDialog() {
  const request = useUnlockRequest()
  const keyboard = useDevice((s) => s.keyboard)
  const status = useDevice((s) => s.unlock)
  const unlocking = useDevice((s) => s.unlocking)
  const layer = useDevice((s) => s.layer)

  const base = layer?.base ?? 0
  const unlockKeys = useMemo(() => status?.keys ?? [], [status])
  const highlighted = useMemo(() => new Set(unlockKeys.map(([row, col]) => posKey(row, col))), [unlockKeys])
  const keys = keyboard && unlockKeys.length > 0 ? unlockKeyNames(keyboard, base, unlockKeys) : 'the unlock keys'

  // An unlock under way shows, however it was started.
  const counting = request.running || unlocking !== null
  const open = request.open || counting

  // Leaving the page mid-way leaves a keyboard that doesn't type: the browser asks first.
  useEffect(() => {
    if (!counting) return
    const ask = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener('beforeunload', ask)
    return () => window.removeEventListener('beforeunload', ask)
  }, [counting])

  // While counting, keys reach this page only on the demo keyboard; don't let Enter or Space press anything.
  const swallow = (event: ReactKeyboardEvent) => {
    if (counting) event.preventDefault()
  }

  const step = counting
    ? 'counting'
    : request.result === 'disconnected'
      ? 'lost'
      : request.result === 'failed'
        ? 'failed'
        : request.result === 'unlocked' || status?.unlocked
          ? 'done'
          : 'confirm'

  const title = {
    confirm: 'Unlock the keyboard?',
    counting: `Hold ${keys}`,
    done: 'The keyboard is unlocked',
    lost: 'The keyboard was disconnected',
    failed: 'The keyboard didn’t start unlocking',
  }[step]

  const footer =
    step === 'confirm' ? (
      <>
        <Button onClick={closeUnlock}>Cancel</Button>
        <Button variant="primary" disabled={!keyboard || unlockKeys.length === 0} onClick={() => void startUnlock()}>
          Start unlocking
        </Button>
      </>
    ) : step === 'counting' ? null : (
      <Button variant="primary" onClick={closeUnlock}>
        {step === 'done' ? 'Done' : 'Close'}
      </Button>
    )

  return (
    <div onKeyDownCapture={swallow} onKeyUpCapture={swallow}>
      <Modal open={open} title={title} footer={footer} dismissible={!counting} onDismiss={closeUnlock}>
        {step === 'confirm' && (
          <div className="flex flex-col gap-3">
            <p>
              Unlocking is a safety step, so a web page can’t quietly read your typing or change powerful settings.
              {request.reason && <> {request.reason}</>}
            </p>
            <p className="text-content">
              After you start, hold <strong>{keys}</strong> together on the keyboard (marked below) until the bar is
              full, about 6 seconds.
            </p>
            {keyboard && (
              <div className="rounded-control bg-surface p-2">
                <KeyboardPicture keyboard={keyboard} layer={base} highlighted={highlighted} />
              </div>
            )}
            <Warning>
              Until it finishes, the keyboard won’t type, and nothing can stop it. {HOW_TO_END}
            </Warning>
            <p className="text-[13px]">
              It stays unlocked until the keyboard restarts or changes connection mode, or until you lock it again.
            </p>
          </div>
        )}
        {step === 'counting' && (
          <div className="flex flex-col gap-3">
            {keyboard && (
              <div className="rounded-control bg-surface p-2">
                <KeyboardPicture keyboard={keyboard} layer={base} highlighted={highlighted} />
              </div>
            )}
            <Counting progress={unlocking} keys={keys} count={unlockKeys.length} />
          </div>
        )}
        {step === 'done' && (
          <p className="flex gap-2.5">
            <CircleCheck size={18} aria-hidden className="mt-0.5 shrink-0 text-success" />
            <span>
              You can let go. It stays unlocked until it restarts or changes connection mode; the device card in the
              sidebar can lock it again sooner.
            </span>
          </p>
        )}
        {step === 'lost' && (
          <p className="flex gap-2.5">
            <Unplug size={18} aria-hidden className="mt-0.5 shrink-0" />
            <span>It went away before it finished unlocking. It starts locked the next time it is connected.</span>
          </p>
        )}
        {step === 'failed' && <p>Nothing has changed: the keyboard works as before, still locked. Try again in a moment.</p>}
      </Modal>
    </div>
  )
}
