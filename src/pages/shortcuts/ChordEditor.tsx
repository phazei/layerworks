// SPDX-License-Identifier: GPL-3.0-or-later
// A key chord (combo): two to four keys pressed together send something else. The keys are picked by clicking them
// on a small picture of the keyboard's base layer; a chord stores what those keys send (J, K), not where they are.

import { useMemo } from 'react'
import { X } from 'lucide-react'
import { chordKeys, keycodeTitle, useDevice, withChordKeys, type ComboEntry } from '../../device'
import { useConnectedLayerNames } from '../../shell/layer-names'
import { Button } from '../../ui/controls'
import { Disclosure } from '../../ui/layout'
import { KeyboardPicture, type PictureSelection } from '../../ui/KeyboardPicture'
import { EntryFrame, KeyField, useEntryDraft } from './EntryEditor'
import { Caps } from './StepRow'

const MAX_KEYS = 4
const EXAMPLE: ComboEntry = { key1: 0x0d, key2: 0x0e, key3: 0, key4: 0, output: 0x29 }

export function ChordEditor({ index }: { index: number }) {
  const draft = useEntryDraft('combo', index)
  const kb = useDevice((s) => s.keyboard)
  const live = useDevice((s) => s.layer)
  const layerNames = useConnectedLayerNames()
  const base = live?.base ?? 0
  const keys = draft ? chordKeys(draft.entry) : []

  // The positions on the base layer that send one of the chord's keys, marked on the picture.
  const marked = useMemo(() => {
    const set = new Set<string>()
    if (!kb) return set
    for (let row = 0; row < kb.rows; row++) {
      for (let col = 0; col < kb.cols; col++) {
        if (keys.includes(kb.keymap[`${base},${row},${col}`] ?? 0)) set.add(`${row},${col}`)
      }
    }
    return set
  }, [kb, base, keys])

  if (!draft || !kb) return null
  const { entry, edit } = draft
  const setKeys = (next: number[]) => edit(withChordKeys(entry, next.slice(0, MAX_KEYS)))
  const toggle = (code: number) => {
    if (!code) return
    if (keys.includes(code)) setKeys(keys.filter((k) => k !== code))
    else if (keys.length < MAX_KEYS) setKeys([...keys, code])
  }
  const onPicture = (selection: PictureSelection) => {
    if (selection.kind === 'key') toggle(kb.keymap[`${base},${selection.row},${selection.col}`] ?? 0)
  }

  return (
    <EntryFrame
      kind="combo"
      index={index}
      draft={draft}
      intro={
        <p>
          Press two to four keys at the same moment and the keyboard sends something else instead; pressed one after
          the other they type as usual. A chord works on its own once saved, on every layer. How close together the
          presses must be is a typing setting (Typing feel page).
        </p>
      }
      example={{ label: 'J and K together send Esc', entry: EXAMPLE }}
    >
      <div className="flex flex-col gap-2">
        <span className="text-[13px] font-medium text-muted">Keys pressed together</span>
        <div className="flex flex-wrap items-center gap-2" aria-label="Keys in the chord" role="list">
          {keys.length === 0 && <span className="text-muted italic">Click two to four keys on the picture.</span>}
          {keys.map((code, i) => (
            <span key={code} role="listitem" className="flex items-center gap-1.5">
              {i > 0 && <span className="text-muted">+</span>}
              <Caps code={code} />
              <Button size="sm" variant="quiet" className="px-1.5" aria-label={`Take ${keycodeTitle(code)} out of the chord`} onClick={() => toggle(code)}>
                <X size={13} aria-hidden />
              </Button>
            </span>
          ))}
        </div>
        <div className="rounded-control border border-edge p-2">
          <KeyboardPicture keyboard={kb} layer={base} highlighted={marked} onSelect={onPicture} />
        </div>
        <p className="text-[13px] text-muted">
          Click a key to add it, again to take it out. The picture shows the {layerNames[base] ?? `layer ${base}`} layer:
          a chord is made of what the keys send there, so it follows a key you move elsewhere.
        </p>
      </div>
      <KeyField label="Sends" value={entry.output} shortcuts exclude={['tapDance', 'repeat']} onChange={(output) => edit({ ...entry, output })} />
      <Disclosure id="chord-more" label="More options">
        <div className="flex flex-col gap-2">
          <p className="text-[13px] text-muted">
            A key that isn’t on the {layerNames[base] ?? 'base'} layer (one from a Fn layer, say) can be added from the
            list instead.
          </p>
          <KeyField
            label="Add a key from the list"
            value={0}
            optional
            onChange={(code) => toggle(code)}
          />
        </div>
      </Disclosure>
    </EntryFrame>
  )
}
