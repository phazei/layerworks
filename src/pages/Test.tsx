// SPDX-License-Identifier: GPL-3.0-or-later
// Test: press keys and watch them light up, to check every key works. Keys come from the browser's key events
// always, and straight from the keyboard's switches while it is unlocked (Fn and layer keys included). The page
// draws its own picture: it needs the seen marking, and no layer stack.

import { useEffect, useMemo, useState } from 'react'
import { Activity, Lock, LockOpen, MousePointerClick, Pause, RotateCcw, RotateCw } from 'lucide-react'
import { keycodeTitle, matrixKeys, useDevice, type KeyboardData, type LayerState } from '../device'
import type { PageDef } from '../plugins/api'
import { useConnectedLayerNames } from '../shell/layer-names'
import { knobDirections, useKnobTurns, usePressedKeys } from '../shell/pressed-keys'
import { openUnlock } from '../shell/unlock-dialog'
import { Button } from '../ui/controls'
import { KeyboardPicture } from '../ui/KeyboardPicture'
import { Card, HelpButton } from '../ui/layout'
import { ProgressBar } from '../ui/ProgressBar'
import { knobPlan, type KnobPlan, type Visibility } from './test/knob'
import { useSeenKeys } from './test/seen'
import { useMatrix, type MatrixMode } from './test/useMatrix'

const NO_LAYER: LayerState = { base: 0, held: 0, active: 0 }
const KNOB = 'knob:'

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
            Seeing keys through the browser, as any web page can. Fn, Fn2 and other layer keys send
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
        {wireless && ' Through the receiver it is asked about ten times a second, so hold each key a moment.'}
      </span>
    </p>
  )
}

const TEST_REASON = 'The key test needs it to see Fn and the layer keys, which never reach the browser.'

/** "left", "right", or "knob 2 left" where there is more than one knob. */
function turnName(position: string, knobCount: number): string {
  const [knob, direction] = position.split(',')
  const way = direction === '1' ? 'right' : 'left'
  return knobCount > 1 ? `knob ${Number(knob) + 1} ${way}` : way
}

const WHY: Record<Exclude<Visibility, 'seen'>, [string, string]> = {
  kept: ['which the computer keeps for itself, so this page can’t see it', 'which the computer keeps for itself, so this page can’t see them'],
  maybe: ['which may not reach this page', 'which may not reach this page'],
  unseen: ['which this page can’t see', 'which this page can’t see'],
}

/** "On Windows, turning it right sends Volume Up, which …", one sentence per kind of trouble. */
function troubleSentences(plan: KnobPlan, layerName: string, knobCount: number): string[] {
  const kinds = ['kept', 'maybe', 'unseen'] as const
  return kinds.flatMap((kind) => {
    const these = plan.here.filter((d) => d.visibility === kind)
    if (these.length === 0) return []
    const turns = these.map((d) => turnName(d.position, knobCount)).join(' or ')
    const sends = these.map((d) => keycodeTitle(d.code)).join(' and ')
    return [`On ${layerName}, turning it ${turns} sends ${sends}, ${WHY[kind][these.length > 1 ? 1 : 0]}.`]
  })
}

/** How turning the knob is seen, which directions can't be on the active layer, and where they can. */
function KnobNote({ plan, layer }: { plan: KnobPlan; layer: LayerState }) {
  const names = useConnectedLayerNames()
  const name = (n: number) => names[n] ?? `layer ${n}`
  if (plan.here.length === 0) return null
  const troubles = troubleSentences(plan, name(layer.active), plan.here.length / 2)
  const there = plan.elsewhere
  return (
    <p className="flex gap-2.5">
      <RotateCw size={16} aria-hidden className="mt-0.5 shrink-0" />
      <span>
        Turning the knob shows when it sends something this page can see, like scrolling or an ordinary key, while
        this window is in front.
        {troubles.map((sentence) => ` ${sentence}`)}
        {there &&
          ` ${there.way === 'hold' ? 'Hold' : 'Switch to'} ${name(there.layer)} and turn it: there ${there.does}, which this page can see.`}
      </span>
    </p>
  )
}

function KeyTest({ keyboard }: { keyboard: KeyboardData }) {
  const layer = useDevice((s) => s.layer)
  const wireless = useDevice((s) => s.link?.kind === 'receiver')
  const capabilities = useDevice((s) => s.capabilities)
  const browser = usePressedKeys(keyboard, layer ?? NO_LAYER)
  const turned = useKnobTurns(keyboard, layer ?? NO_LAYER)
  const matrix = useMatrix()
  const focused = useWindowFocus()
  const { seen, add, reset } = useSeenKeys(keyboard.uid)
  useKeepKeysOnPage()

  const all = useMemo(() => matrixKeys(keyboard), [keyboard])
  const pressed = useMemo(() => new Set([...browser, ...matrix.down]), [browser, matrix.down])
  useEffect(() => add(pressed), [pressed, add])
  // Knob directions share the seen list, as "knob:0,1", so they can't be mistaken for the key at row 0, column 1.
  useEffect(() => add([...turned].map((position) => KNOB + position)), [turned, add])

  const seenHere = useMemo(() => new Set(all.filter((key) => seen.has(key))), [all, seen])
  const knobs = useMemo(() => knobDirections(keyboard), [keyboard])
  const knobsSeen = useMemo(() => new Set(knobs.filter((position) => seen.has(KNOB + position))), [knobs, seen])
  const plan = useMemo(() => knobPlan(keyboard, layer ?? NO_LAYER), [keyboard, layer])
  // The knob counts are out of the turns the page can check on some layer the keyboard can reach (and any seen
  // anyway); the rest can't be checked here, which is not the knob's fault.
  const knobsCheckable = new Set([...plan.checkable, ...knobsSeen]).size
  const everything = all.length > 0 && seenHere.size === all.length && knobsSeen.size >= knobsCheckable
  const check = capabilities?.check('keyMatrix')
  const canUnlock = check !== undefined && !check.available && check.needsUnlock === true

  return (
    <div className="flex max-w-6xl flex-col gap-4">
      <Card>
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <div className="flex min-w-56 flex-1 flex-col gap-1.5">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1" aria-live="polite">
                <span className="text-lg font-semibold tabular-nums">
                  {seenHere.size} of {all.length} keys seen
                </span>
                {knobs.length > 0 && (
                  <span className="text-[13px] text-muted tabular-nums">
                    {knobsCheckable === 0
                      ? 'Knob turns can’t be checked here'
                      : `${knobsSeen.size} of ${knobsCheckable} knob turns${knobsCheckable < knobs.length ? ` (${knobs.length - knobsCheckable} can’t be checked here)` : ''}`}
                  </span>
                )}
                {everything && <span className="text-[13px] text-success">Every key works</span>}
              </div>
              <ProgressBar label="Keys seen" value={seenHere.size} max={all.length} className="max-w-md" />
            </div>
            <Button icon={<RotateCcw size={15} aria-hidden />} onClick={reset} disabled={seen.size === 0}>
              Start again
            </Button>
          </div>
          <div className="rounded-control bg-surface p-3">
            <KeyboardPicture
              keyboard={keyboard}
              layer={layer?.active ?? 0}
              pressed={pressed}
              seen={seenHere}
              knobsTurned={turned}
              knobsSeen={knobsSeen}
            />
          </div>
          <p className="text-[13px] text-muted">
            Press each key once{knobs.length > 0 && ' and turn the knob both ways'}. A key lights up while it is down
            and stays marked once seen; any key still plain at the end didn’t reach the app.
          </p>
        </div>
      </Card>
      <div className="flex flex-col gap-2 rounded-card bg-card px-5 py-4 text-[13px] text-muted shadow-card">
        <ModeNote mode={matrix.mode === 'hidden' ? 'watching' : matrix.mode} wireless={wireless} canUnlock={canUnlock} resume={matrix.resume} />
        <KnobNote plan={plan} layer={layer ?? NO_LAYER} />
        {!focused && (matrix.mode === 'off' || knobs.length > 0) && (
          <p className="flex gap-2.5 text-content">
            <MousePointerClick size={16} aria-hidden className="mt-0.5 shrink-0" />
            {matrix.mode === 'off'
              ? 'Click anywhere in this window first: the browser only passes keys to the window in front.'
              : 'Click anywhere in this window to see the knob: the browser only passes it to the window in front.'}
          </p>
        )}
        <div className="-mb-1 flex items-center gap-1">
          How testing works
          <HelpButton topic="test-keys" />
          {knobs.length > 0 && (
            <>
              <span className="ml-3">Testing the knob</span>
              <HelpButton topic="test-knob" />
            </>
          )}
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
