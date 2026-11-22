// SPDX-License-Identifier: GPL-3.0-or-later
// Keys: click a key or a knob direction on the stage, then choose what it does in the inspector below it. Armed
// from a shortcut's editor ("Put it on a key…", keys/arming.ts), the next key clicked gets that shortcut instead.

import { useEffect, useRef } from 'react'
import { Keyboard, MousePointerClick, Pointer } from 'lucide-react'
import { deviceStore, FIXED_KNOBS, keycodeTitle, parseKeycode, slotKeycode, useDevice } from '../device'
import type { PageDef } from '../plugins/api'
import { useConnectedLayerNames } from '../shell/layer-names'
import { screenshotOption } from '../shell/session'
import { shownLayer, toSlot, useStage, type Selection } from '../shell/stage-store'
import { Button } from '../ui/controls'
import { Card, Notice } from '../ui/layout'
import { armedDone, armingState, armKey, disarm, forgetJustPut, useArming, type Armed } from './keys/arming'
import { Inspector } from './keys/Inspector'
import { layerName } from './keys/describe'
import { useShortcutKeys } from './keys/shortcut-keys'

/** The card before a key is picked; `knob` mentions the knob only on a keyboard that has one. */
export function NothingSelected({ knob }: { knob: boolean }) {
  return (
    <Card className="flex items-start gap-4">
      <MousePointerClick size={22} aria-hidden className="mt-0.5 shrink-0 text-accent" />
      <div className="flex flex-col gap-1.5">
        <p className="font-medium">Click a key in the picture{knob && ', or one side of the knob,'} to choose what it does.</p>
        <ul className="flex flex-col gap-1 text-[13px] text-muted">
          <li>To change what a key does while Fn is held, pick that layer on the left first.</li>
          <li>Every change goes to the keyboard straight away, and Undo at the bottom takes it back.</li>
          <li>Esc lets go of the selected key.</li>
        </ul>
      </div>
    </Card>
  )
}

/** Armed: which shortcut the next click puts on a key, on which layer, and Cancel. */
function ArmedCard({ armed, layer, knob }: { armed: Armed; layer: string; knob: boolean }) {
  return (
    <Card className="flex items-start gap-4 border border-accent">
      <Pointer size={22} aria-hidden className="mt-0.5 shrink-0 text-accent" />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <p role="status" className="font-medium">
          Click the key that should run {armed.name}
        </p>
        <ul className="flex flex-col gap-1 text-[13px] text-muted">
          <li>
            On {layer}. For another layer, pick it in the list of layers first.{knob && ' One side of the knob works too.'}
          </li>
          {armed.hint && <li>{armed.hint}</li>}
          <li>Undo at the bottom takes it back. Esc or Cancel stops without changing anything.</li>
        </ul>
      </div>
      <Button size="sm" onClick={disarm}>
        Cancel
      </Button>
    </Card>
  )
}

const whereOf = (layer: number, selection: Selection) =>
  selection.kind === 'key' ? `${layer},${selection.row},${selection.col}` : `${layer},knob,${selection.knob},${selection.direction}`

function KeysPage() {
  const keyboard = useDevice((s) => s.keyboard)
  const live = useDevice((s) => s.layer)
  const stage = useStage()
  const names = useConnectedLayerNames()
  const { armed, justPut } = useArming()
  const selection = stage.selection
  const layer = keyboard ? shownLayer(stage, live, keyboard.layers) : 0

  // Armed, a click selects a key: that key gets the shortcut, through the store's normal assign (one undo step),
  // and stays selected so the inspector shows the result.
  useEffect(() => {
    const now = armingState().armed
    if (!now || !selection || !keyboard) return
    const slot = toSlot(selection, layer)
    const before = slotKeycode(keyboard, slot)
    armedDone({ name: now.name, where: whereOf(layer, selection), before })
    void deviceStore.assign(slot, now.code)
  }, [selection, layer, keyboard])

  // `?put-on-key=TD(1)` in the URL: armed with that keycode once the keyboard is in, for screenshots. Only on the
  // demo keyboard (screenshotOption): a link mustn't arm a real keyboard's next click.
  const shortcutKey = useShortcutKeys()
  const urlArmed = useRef(false)
  useEffect(() => {
    const asked = screenshotOption('put-on-key')
    const code = asked && keyboard ? parseKeycode(asked) : null
    if (urlArmed.current || code === null) return
    urlArmed.current = true
    // After the shell has reset the stage for the keyboard just connected.
    const name = shortcutKey(code)?.name ?? keycodeTitle(code)
    setTimeout(() => armKey({ code, name }, deviceStore.getState().layer?.active), 150)
  }, [keyboard, live, shortcutKey])

  // Esc ends it (the stage's own Esc only lets go of a selection, and there is none).
  useEffect(() => {
    if (!armed) return
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && disarm()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [armed])

  // "It held … before" is about the key it went on; another key, or another layer, forgets it.
  const here = selection ? whereOf(layer, selection) : null
  useEffect(() => {
    if (justPut && justPut.where !== here) forgetJustPut()
  }, [justPut, here])

  if (!keyboard) return null
  if (armed) {
    return (
      <div data-tour="keys-page">
        <ArmedCard armed={armed} layer={layerName(names, layer)} knob={keyboard.knobCount > 0} />
      </div>
    )
  }
  // A knob the firmware keeps to itself can't be picked (a selection from the address included).
  if (!selection || (selection.kind === 'knob' && keyboard.knobCount === 0)) {
    return (
      <div data-tour="keys-page" className="flex flex-col gap-3">
        <NothingSelected knob={keyboard.knobCount > 0} />
        {/* Compatibility: knobs the firmware doesn't let apps change (device/knob-map.ts), said where they'd be. */}
        {keyboard.fixedKnobs > 0 && <Notice>{FIXED_KNOBS} The picture marks it “Fixed”.</Notice>}
      </div>
    )
  }

  const where = selection.kind === 'key' ? `key ${selection.row},${selection.col}` : `knob ${selection.knob},${selection.direction}`
  const put = justPut && justPut.where === here ? { name: justPut.name, before: justPut.before } : undefined
  return (
    // Wide enough for the inspector's two columns, it fills exactly the space under the stage (placed absolutely,
    // so what is inside can't make the page taller), but not below 15rem in a short window. Narrower, it is as
    // tall as its contents and the page scrolls.
    <div data-tour="keys-page" className="@container/keys relative flex min-h-60 flex-1 flex-col">
      <Inspector
        // A new key or layer starts the inspector afresh, on the choice that matches it.
        key={`${layer} ${where}`}
        keyboard={keyboard}
        slot={toSlot(selection, layer)}
        names={names}
        base={live?.base ?? 0}
        justPut={put}
      />
    </div>
  )
}

export const keysPage: PageDef = {
  path: 'keys',
  title: 'Keys',
  icon: Keyboard,
  stage: 'select',
  help: 'assign-key',
  component: KeysPage,
}
