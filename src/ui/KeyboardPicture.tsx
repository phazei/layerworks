// SPDX-License-Identifier: GPL-3.0-or-later
// The picture of the keyboard for one layer. Wraps Pipette's keyboard widget so the rest of the app doesn't
// depend on its props.

import { useMemo } from 'react'
import { KeyboardWidget } from '../vendor/pipette/renderer/components/keyboard'
import { keycodeId, posKey, type KeyboardData } from '../device'

interface Props {
  keyboard: KeyboardData
  layer: number
  /** "row,col" of keys held down right now. */
  pressed?: Set<string>
}

export function KeyboardPicture({ keyboard, layer, pressed }: Props) {
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
    <KeyboardWidget
      keys={keyboard.layout.keys}
      keycodes={keycodes}
      encoderKeycodes={knobKeycodes}
      pressedKeys={pressed}
      readOnly
    />
  )
}
