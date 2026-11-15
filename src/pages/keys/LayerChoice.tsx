// SPDX-License-Identifier: GPL-3.0-or-later
// "Switch layer": pick the layer, then the sentence that says how the key switches to it. A sentence applies at
// once.

import { useState } from 'react'
import { keycodeId, LAYER_ACTIONS, layerKeycode, readLayerKey } from '../../device'
import { OptionButton } from '../../ui/controls'
import { layerSentence } from './describe'

interface Props {
  current: number
  names: string[]
  /** The layer the key being edited is on. */
  ownLayer: number
  onAssign: (code: number) => void
}

export function LayerChoice({ current, names, ownLayer, onAssign }: Props) {
  const now = readLayerKey(current)
  const [target, setTarget] = useState(now && now.layer < names.length ? now.layer : ownLayer + 1 < names.length ? ownLayer + 1 : 0)

  return (
    <div className="flex flex-col gap-3">
      <div role="group" aria-label="Layer to switch to" className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1.5 text-muted">Which layer</span>
        {names.map((name, layer) => (
          <OptionButton key={layer} shape="chip" selected={layer === target} onClick={() => setTarget(layer)}>
            {name}
          </OptionButton>
        ))}
      </div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(min(19rem,100%),1fr))] gap-1.5">
        {LAYER_ACTIONS.map((action) => {
          const code = layerKeycode(action.op, target)
          return (
            <OptionButton key={action.op} selected={code === current} onClick={() => onAssign(code)}>
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{layerSentence(action, names[target])}</span>
                <span className="block text-[13px] text-muted">{action.hint}</span>
              </span>
              <span className="shrink-0 font-mono text-xs text-muted">{keycodeId(code)}</span>
            </OptionButton>
          )
        })}
      </div>
    </div>
  )
}
