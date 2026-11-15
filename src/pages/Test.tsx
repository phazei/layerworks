// SPDX-License-Identifier: GPL-3.0-or-later
// Test: press keys and watch them light up, to check every key works. Keys come from the browser's key events
// always, and straight from the keyboard's switches while it is unlocked (Fn and layer keys included). The page
// draws its own picture: it needs the seen marking, and no layer stack.

import { useEffect, useMemo, useState } from 'react'
import { Activity, Lock, LockOpen, MousePointerClick, Pause, RotateCcw } from 'lucide-react'
import { matrixKeys, useDevice, type KeyboardData, type LayerState } from '../device'
import type { PageDef } from '../plugins/api'
import { usePressedKeys } from '../shell/pressed-keys'
import { openUnlock } from '../shell/unlock-dialog'
import { Button } from '../ui/controls'
import { KeyboardPicture } from '../ui/KeyboardPicture'
import { Card, HelpButton } from '../ui/layout'
import { ProgressBar } from '../ui/ProgressBar'
import { useSeenKeys } from './test/seen'
import { useMatrix, type MatrixMode } from './test/useMatrix'

const NO_LAYER: LayerState = { base: 0, held: 0, active: 0 }

/** Keys the browser would act on (scroll, focus, menus, reload), kept for the test while this page is open. */
function useKeepKeysOnPage(): void {
  useEffect(() => {
    const keep = (event: KeyboardEvent) => {
      const target = event.target instanceof Element ? event.target : null
      if (event.ctrlKey || event.metaKey || target?.closest('dialog, input, textarea, select, [contenteditable]')) return
      event.preventDefault()
    }
    window.addEventListener('keydown', keep)
    window.addEventListener('keyup', keep)
    return () => {
      window.removeEventListener('keydown', keep)
      window.removeEventListener('keyup', keep)
    }
  }, [])
}

/** Whether this window has the keyboard's attention, which the browser's key events need. */
function useWindowFocus(): boolean {
  const [focused, setFocused] = useState(() => document.hasFocus())
  useEffect(() => {
    const on = () => setFocused(true)
    const off = () => setFocused(false)
    window.addEventListener('focus', on)
    window.addEventListener('blur', off)
    return () => {
      window.removeEventListener('focus', on)
      window.removeEventListener('blur', off)
    }
  }, [])
  return focused
}

function ModeNote({ mode, wireless, canUnlock, resume }: { mode: MatrixMode; wireless: boolean; canUnlock: boolean; resume: () => void }) {
  if (mode === 'off') {
    return (
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <p className="flex min-w-0 flex-1 gap-2.5">
          <Lock size={16} aria-hidden className="mt-0.5 shrink-0" />
          <span>
            Seeing keys through the browser, as any web page can. Fn, Fn2 and other layer keys and the knob send
            nothing the browser sees, so they can’t be tested while the keyboard is locked.
          </span>
        </p>
        {canUnlock && (
          <Button size="sm" variant="primary" icon={<LockOpen size={14} aria-hidden />} onClick={() => openUnlock(TEST_REASON)}>
            Unlock to see every key…
          </Button>
        )}
      </div>
    )
  }
  if (mode === 'paused') {
    return (
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <p className="flex min-w-0 flex-1 gap-2.5">
          <Pause size={16} aria-hidden className="mt-0.5 shrink-0" />
          <span>
            Paused, so the keyboard can go to sleep: reading it over 2.4 GHz keeps it awake. Press any key to carry on.
          </span>
        </p>
        <Button size="sm" onClick={resume}>
          Carry on
        </Button>
      </div>
    )
  }
  return (
    <p className="flex gap-2.5">
      <LockOpen size={16} aria-hidden className="mt-0.5 shrink-0" />
      <span>
        Reading every key straight from the keyboard, Fn and layer keys included, while this page is open.
        {wireless && ' Through the receiver it is asked about ten times a second, so hold each key a moment.'}{' '}
        Turning the knob doesn’t show; pressing it does.
      </span>
    </p>
  )
}

const TEST_REASON = 'The key test needs it to see Fn, the layer keys and the knob, which never reach the browser.'

function KeyTest({ keyboard }: { keyboard: KeyboardData }) {
  const layer = useDevice((s) => s.layer)
  const wireless = useDevice((s) => s.link?.kind === 'receiver')
  const capabilities = useDevice((s) => s.capabilities)
  const browser = usePressedKeys(keyboard, layer ?? NO_LAYER)
  const matrix = useMatrix()
  const focused = useWindowFocus()
  const { seen, add, reset } = useSeenKeys(keyboard.uid)
  useKeepKeysOnPage()

  const all = useMemo(() => matrixKeys(keyboard), [keyboard])
  const pressed = useMemo(() => new Set([...browser, ...matrix.down]), [browser, matrix.down])
  useEffect(() => add(pressed), [pressed, add])

  const seenHere = useMemo(() => new Set(all.filter((key) => seen.has(key))), [all, seen])
  const check = capabilities?.check('keyMatrix')
  const canUnlock = check !== undefined && !check.available && check.needsUnlock === true

  return (
    <div className="flex max-w-6xl flex-col gap-4">
      <Card>
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <div className="flex min-w-56 flex-1 flex-col gap-1.5">
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-semibold tabular-nums" aria-live="polite">
                  {seenHere.size} of {all.length} keys seen
                </span>
                {seenHere.size === all.length && all.length > 0 && <span className="text-[13px] text-success">Every key works</span>}
              </div>
              <ProgressBar label="Keys seen" value={seenHere.size} max={all.length} className="max-w-md" />
            </div>
            <Button icon={<RotateCcw size={15} aria-hidden />} onClick={reset} disabled={seen.size === 0}>
              Start again
            </Button>
          </div>
          <div className="rounded-control bg-surface p-3">
            <KeyboardPicture keyboard={keyboard} layer={layer?.active ?? 0} pressed={pressed} seen={seenHere} />
          </div>
          <p className="text-[13px] text-muted">
            Press each key once. A key lights up while it is down and stays marked once seen; any key still plain at
            the end didn’t reach the app.
          </p>
        </div>
      </Card>
      <div className="flex flex-col gap-2 rounded-card bg-card px-5 py-4 text-[13px] text-muted shadow-card">
        <ModeNote mode={matrix.mode === 'hidden' ? 'watching' : matrix.mode} wireless={wireless} canUnlock={canUnlock} resume={matrix.resume} />
        {matrix.mode === 'off' && !focused && (
          <p className="flex gap-2.5 text-content">
            <MousePointerClick size={16} aria-hidden className="mt-0.5 shrink-0" />
            Click anywhere in this window first: the browser only passes keys to the window in front.
          </p>
        )}
        <div className="-mb-1 flex items-center gap-1">
          How testing works
          <HelpButton topic="test-keys" />
        </div>
      </div>
    </div>
  )
}

function TestPage() {
  const keyboard = useDevice((s) => s.keyboard)
  return keyboard ? <KeyTest keyboard={keyboard} /> : null
}

export const testPage: PageDef = { path: 'test', title: 'Test', icon: Activity, help: 'test-keys', component: TestPage }
