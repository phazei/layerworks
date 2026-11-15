// SPDX-License-Identifier: GPL-3.0-or-later
// Keys: click a key or a knob direction on the stage, then choose what it does in the inspector below it.

import { Keyboard, MousePointerClick } from 'lucide-react'
import { useDevice } from '../device'
import type { PageDef } from '../plugins/api'
import { useConnectedLayerNames } from '../shell/layer-names'
import { shownLayer, toSlot, useStage } from '../shell/stage-store'
import { Card } from '../ui/layout'
import { Inspector } from './keys/Inspector'

function NothingSelected() {
  return (
    <Card className="flex items-start gap-4">
      <MousePointerClick size={22} aria-hidden className="mt-0.5 shrink-0 text-accent" />
      <div className="flex flex-col gap-1.5">
        <p className="font-medium">Click a key in the picture, or one side of the knob, to choose what it does.</p>
        <ul className="flex flex-col gap-1 text-[13px] text-muted">
          <li>To change what a key does while Fn is held, pick that layer on the left first.</li>
          <li>Every change goes to the keyboard straight away, and Undo at the bottom takes it back.</li>
          <li>Esc lets go of the selected key.</li>
        </ul>
      </div>
    </Card>
  )
}

function KeysPage() {
  const keyboard = useDevice((s) => s.keyboard)
  const live = useDevice((s) => s.layer)
  const stage = useStage()
  const names = useConnectedLayerNames()
  const selection = stage.selection

  if (!keyboard) return null
  if (!selection) return <NothingSelected />

  const layer = shownLayer(stage, live, keyboard.layers)
  const where = selection.kind === 'key' ? `key ${selection.row},${selection.col}` : `knob ${selection.knob},${selection.direction}`
  return (
    // Wide enough for the inspector's two columns, it fills exactly the space under the stage (placed absolutely,
    // so what is inside can't make the page taller), but not below 15rem in a short window. Narrower, it is as
    // tall as its contents and the page scrolls.
    <div className="@container/keys relative flex min-h-60 flex-1 flex-col">
      <Inspector
        // A new key or layer starts the inspector afresh, on the choice that matches it.
        key={`${layer} ${where}`}
        keyboard={keyboard}
        slot={toSlot(selection, layer)}
        names={names}
        base={live?.base ?? 0}
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
