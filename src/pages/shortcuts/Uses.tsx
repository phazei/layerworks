// SPDX-License-Identifier: GPL-3.0-or-later
// Where a shortcut sits on the keyboard: the keys and knob turns whose keycode runs it, each a button that shows
// that key on the Keys page. With none, how to put it on one.

import { Keyboard } from 'lucide-react'
import { keycodeName, keycodeUses, useDevice, type Slot } from '../../device'
import { useConnectedLayerNames } from '../../shell/layer-names'
import { navigate } from '../../shell/router'
import { stage } from '../../shell/stage-store'
import { Button } from '../../ui/controls'

interface Props {
  /** The keycode that runs it (M0, TD(0) …); null when the keyboard's tables don't have one. */
  code: number | null
  /** Said when no key runs it: where to find it on the Keys page. */
  howTo: string
}

export function Uses({ code, howTo }: Props) {
  const kb = useDevice((s) => s.keyboard)
  const layer = useDevice((s) => s.layer)
  const layerNames = useConnectedLayerNames()
  if (!kb) return null
  const uses = code === null ? [] : keycodeUses(kb, code)
  const base = layer?.base ?? 0
  const open = (slot: Slot) => {
    stage.showLayer(slot.layer)
    stage.select(slot.kind === 'key' ? { kind: 'key', row: slot.row, col: slot.col } : { kind: 'knob', knob: slot.knob, direction: slot.direction })
    navigate('/keys')
  }
  const where = (slot: Slot) =>
    slot.kind === 'key'
      ? `the ${keycodeName(kb.keymap[`${base},${slot.row},${slot.col}`] ?? 0) || 'unlabelled'} key`
      : `the knob turned ${slot.direction === 0 ? 'left' : 'right'}`

  return (
    <div className="flex flex-col gap-1.5">
      <h3 className="flex items-center gap-1.5 text-[13px] font-medium text-muted">
        <Keyboard size={14} aria-hidden />
        Runs when you press
      </h3>
      {uses.length === 0 ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="text-[13px] text-muted">No key runs it yet. {howTo}</span>
          <Button size="sm" onClick={() => navigate('/keys')}>
            Put it on a key…
          </Button>
        </div>
      ) : (
        <ul className="flex flex-wrap gap-1.5">
          {uses.map((slot) => (
            <li key={`${slot.layer}:${slot.kind === 'key' ? `${slot.row},${slot.col}` : `k${slot.knob},${slot.direction}`}`}>
              <button
                type="button"
                onClick={() => open(slot)}
                className="cursor-pointer rounded-pill border border-edge bg-raised px-3 py-1 text-[13px] hover:border-accent hover:text-accent"
              >
                {layerNames[slot.layer] ?? `Layer ${slot.layer}`}: {where(slot)}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
