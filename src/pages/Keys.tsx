// SPDX-License-Identifier: GPL-3.0-or-later
// Keys: click a key or a knob direction on the stage, then choose what it does.

import { Keyboard } from 'lucide-react'
import { keycodeId, keycodeName, slotKeycode, useDevice } from '../device'
import type { PageDef } from '../plugins/api'
import { shownLayer, toSlot, useStage } from '../shell/stage-store'
import { Placeholder } from './Placeholder'

function KeysPage() {
  const keyboard = useDevice((s) => s.keyboard)
  const live = useDevice((s) => s.layer)
  const stage = useStage()
  const selection = stage.selection

  if (!keyboard || !selection) {
    return (
      <Placeholder>
        <p>Click a key, or one side of the knob, in the picture above to choose what it does.</p>
      </Placeholder>
    )
  }

  const code = slotKeycode(keyboard, toSlot(selection, shownLayer(stage, live, keyboard.layers)))
  const what = selection.kind === 'knob' ? `Turning the knob ${selection.direction === 0 ? 'right' : 'left'}` : 'This key'
  return (
    <Placeholder>
      <p>
        {what} does <span className="font-medium text-content">{keycodeName(code)}</span>{' '}
        <span className="font-mono text-xs">({keycodeId(code)})</span> on this layer.
      </p>
      <p>Choosing something else for it comes here: a key, a shortcut, or a layer switch.</p>
    </Placeholder>
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
