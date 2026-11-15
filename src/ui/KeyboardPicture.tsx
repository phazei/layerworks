// SPDX-License-Identifier: GPL-3.0-or-later
// The picture of the keyboard for one layer. Wraps Pipette's keyboard widget so the rest of the app doesn't
// depend on its props.

import { useMemo } from 'react'
import { KeyboardWidget } from '../vendor/pipette/renderer/components/keyboard'
import { keycodeId, posKey, type KeyboardData, type KleKey } from '../device/api'

export type PictureSelection =
  | { kind: 'key'; row: number; col: number }
  | { kind: 'knob'; knob: number; direction: 0 | 1 }

interface Props {
  keyboard: KeyboardData
  layer: number
  /** "row,col" of keys held down right now. */
  pressed?: Set<string>
  selection?: PictureSelection | null
  /** Makes keys and knob directions clickable. */
  onSelect?: (selection: PictureSelection) => void
  /** "row,col" of keys to mark as seen (the Test page), in the token colour --key-bg-seen. Pressed wins. */
  seen?: Set<string>
  /** "row,col" of keys to point out, e.g. the keys to hold for unlocking. */
  highlighted?: Set<string>
}

// The widget's own "ever pressed" colour is a fixed light green; seen keys use its per-key fill instead, which
// takes a token.
const SEEN_FILL = 'var(--key-bg-seen)'

export function KeyboardPicture({ keyboard, layer, pressed, selection, onSelect, seen, highlighted }: Props) {
  const seenFills = useMemo(() => (seen ? new Map([...seen].map((pos) => [pos, SEEN_FILL])) : undefined), [seen])

  const keycodes = useMemo(() => {
    const map = new Map<string, string>()
    for (let row = 0; row < keyboard.rows; row++) {
      for (let col = 0; col < keyboard.cols; col++) {
        map.set(posKey(row, col), keycodeId(keyboard.keymap[`${layer},${row},${col}`] ?? 0))
      }
    }
    return map
  }, [keyboard, layer])

  const knobKeycodes = useMemo(() => {
    const map = new Map<string, [string, string]>()
    for (let knob = 0; knob < keyboard.knobCount; knob++) {
      map.set(String(knob), [
        keycodeId(keyboard.knobs[`${layer},${knob},0`] ?? 0),
        keycodeId(keyboard.knobs[`${layer},${knob},1`] ?? 0),
      ])
    }
    return map
  }, [keyboard, layer])

  if (!keyboard.layout) return null
  return (
    // The widget draws at a fixed size; let it shrink to the space there is.
    <div className="flex justify-center [&>svg]:h-auto [&>svg]:max-w-full">
      <KeyboardWidget
        keys={keyboard.layout.keys}
        keycodes={keycodes}
        encoderKeycodes={knobKeycodes}
        pressedKeys={pressed}
        highlightedKeys={highlighted}
        keyColors={seenFills}
        selectedKey={selection?.kind === 'key' ? selection : null}
        selectedEncoder={selection?.kind === 'knob' ? { idx: selection.knob, dir: selection.direction } : null}
        onKeyClick={onSelect && ((key: KleKey) => onSelect({ kind: 'key', row: key.row, col: key.col }))}
        onEncoderClick={
          onSelect &&
          ((key: KleKey, direction: number) =>
            onSelect({ kind: 'knob', knob: key.encoderIdx, direction: direction === 1 ? 1 : 0 }))
        }
        readOnly={!onSelect}
      />
    </div>
  )
}
