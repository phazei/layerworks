// SPDX-License-Identifier: GPL-3.0-or-later
// Where a shortcut sits on the keyboard: the keys and knob turns whose keycode runs it, each a button that shows
// that key on the Keys page, and "Put it on a key…", which opens the Keys page waiting for the key that should run it.

import { Keyboard } from 'lucide-react'
import { keycodeShortName, keycodeUses, useDevice, type Slot } from '../../device'
import { useConnectedLayerNames } from '../../shell/layer-names'
import { navigate } from '../../shell/router'
import { stage } from '../../shell/stage-store'
import { armKey } from '../keys/arming'
import { Button } from '../../ui/controls'

interface Props {
  /** The keycode that runs it (M0, TD(0) …); null when the keyboard's tables don't have one. */
  code: number | null
  /** Said when no key runs it: where to find it on the Keys page. */
  howTo: string
  /** What it is called, for the Keys page while it waits for the key: "Multi-tap key 2", the macro's name. */
  name: string
  /** Said with it on the Keys page: it is empty, or has changes not saved yet. */
  hint?: string
}

/**
 * What the Keys page says beside "Click the key that should run …" when the shortcut won't do what is shown yet:
 * empty on the keyboard (allowed, as from the palette: the key does nothing until it is set up and saved), or with
 * changes not saved (the key runs what the keyboard holds until then).
 */
export function unsavedHint(name: string, emptyOnKeyboard: boolean, unsaved: boolean): string | undefined {
  if (unsaved) return `${name} has changes not saved yet: until you save them, the key runs what the keyboard holds${emptyOnKeyboard ? ', which is nothing' : ''}.`
  if (emptyOnKeyboard) return `${name} is empty: the key does nothing until it is set up and saved.`
  return undefined
}

export function Uses({ code, howTo, name, hint }: Props) {
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
  // The Keys page, waiting for the key that should run it (pages/keys/arming.ts).
  const putOnKey = () => {
    if (code === null) return
    armKey({ code, name, hint }, layer?.active)
    navigate('/keys')
  }
  // The key by what it shows on the base layer, as in the picture.
  const baseName = (code: number) => (code > 1 ? keycodeShortName(code) : 'unlabelled')
  const where = (slot: Slot) =>
    slot.kind === 'key'
      ? `the ${baseName(kb.keymap[`${base},${slot.row},${slot.col}`] ?? 0)} key`
      : `the knob turned ${slot.direction === 0 ? 'left' : 'right'}`

  return (
    <div className="flex flex-col gap-1.5">
      <h3 className="flex items-center gap-1.5 text-[13px] font-medium text-muted">
        <Keyboard size={14} aria-hidden />
        Runs when you press
      </h3>
      {uses.length === 0 ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="text-[13px] text-muted">No key runs it yet.</span>
          <Button size="sm" disabled={code === null} onClick={putOnKey}>
            Put it on a key…
          </Button>
          <span className="text-[13px] text-muted">{howTo}</span>
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
          <li>
            <Button size="sm" variant="quiet" disabled={code === null} onClick={putOnKey}>
              Put it on another key…
            </Button>
          </li>
        </ul>
      )}
    </div>
  )
}
