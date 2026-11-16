// SPDX-License-Identifier: GPL-3.0-or-later
// "Switch layer": pick the layer, then the sentence that says how the key switches to it. A sentence applies at
// once. Folded away below them: the layer held together with modifiers (QMK's LM), which needs the modifiers ticked
// first and so has its own button.

import { useState } from 'react'
import {
  keycodeId,
  LAYER_ACTIONS,
  layerKeycode,
  layerModKeycode,
  MAX_TAP_LAYER,
  modifierWords,
  readLayerKey,
  readLayerMod,
} from '../../device'
import { Button, OptionButton } from '../../ui/controls'
import { Disclosure, HelpButton } from '../../ui/layout'
import { PageLink } from '../../ui/PageLink'
import { layerName, layerSentence } from './describe'
import { ModifierBoxes } from './Modifiers'
import { useTappingToggle } from './tapping-toggle'

interface Props {
  current: number
  names: string[]
  /** The layer the key being edited is on. */
  ownLayer: number
  onAssign: (code: number) => void
}

export function LayerChoice({ current, names, ownLayer, onAssign }: Props) {
  const now = readLayerKey(current) ?? readLayerMod(current)
  const nowMods = readLayerMod(current)
  const [target, setTarget] = useState(now && now.layer < names.length ? now.layer : ownLayer + 1 < names.length ? ownLayer + 1 : 0)
  const toggle = useTappingToggle()

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
                <span className="block font-medium">{layerSentence(action, names[target], toggle.taps)}</span>
                <span className="block text-[13px] text-muted">{action.hint}</span>
              </span>
              <span className="shrink-0 font-mono text-xs text-muted">{keycodeId(code)}</span>
            </OptionButton>
          )
        })}
      </div>
      <p className="text-[13px] text-muted">
        {toggle.setting ? (
          <>
            How many taps keep a layer on ({toggle.taps} now) is set on the{' '}
            <PageLink href="#/typing/tapHold">Typing feel page</PageLink>, under Tap or hold.
          </>
        ) : (
          `How many taps keep a layer on (${toggle.taps}) is fixed in this keyboard’s firmware.`
        )}
      </p>
      <div className="[&>div]:mt-1">
        <Disclosure id="keys-layer-mods" label="With modifiers held too" forceOpen={nowMods !== null}>
          {/* A new layer picked above starts the modifiers afresh from what the key holds now. */}
          <LayerWithMods key={target} current={current} name={layerName(names, target)} layer={target} initialMods={nowMods?.mods ?? 0} onAssign={onAssign} />
        </Disclosure>
      </div>
    </div>
  )
}

interface LayerWithModsProps {
  current: number
  name: string
  layer: number
  initialMods: number
  onAssign: (code: number) => void
}

function LayerWithMods({ current, name, layer, initialMods, onAssign }: LayerWithModsProps) {
  const [mods, setMods] = useState(initialMods)
  const code = layerModKeycode(layer, mods)
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1">
        <span className="font-medium">While held, use {name} with modifiers</span>
        <HelpButton topic="layer-mod" />
      </div>
      <p className="text-[13px] text-muted">Like holding Fn and Ctrl at once: the keys on that layer come with the modifiers held.</p>
      {layer > MAX_TAP_LAYER ? (
        <p className="text-[13px] text-muted">Only the first {MAX_TAP_LAYER + 1} layers can be held this way.</p>
      ) : (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <ModifierBoxes mods={mods} onChange={setMods} />
          <Button size="sm" className="ml-auto" disabled={code === null || code === current} onClick={() => code !== null && onAssign(code)}>
            {code === null ? 'Tick a modifier' : code === current ? 'This is what it does now' : `Use ${name} + ${modifierWords(mods)}`}
          </Button>
        </div>
      )}
      {code !== null && <span className="font-mono text-xs text-muted">{keycodeId(code)}</span>}
    </div>
  )
}
