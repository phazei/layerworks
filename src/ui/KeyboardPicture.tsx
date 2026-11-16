// SPDX-License-Identifier: GPL-3.0-or-later
// The picture of the keyboard for one layer. Wraps Pipette's keyboard widget so the rest of the app doesn't
// depend on its props.

import { useId, useMemo } from 'react'
import { KeyboardWidget } from '../vendor/pipette/renderer/components/keyboard'
import { cx } from './controls'
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
  /** Knob directions ("knob,direction") to show turned just now, and ones to mark as seen. Turned wins. */
  knobsTurned?: ReadonlySet<string>
  knobsSeen?: ReadonlySet<string>
  /**
   * Fill the box it is in, width and height, keeping its shape and centred (the box needs a height). Without it the
   * picture takes its own size, shrinking to the width there is.
   */
  fit?: boolean
}

// The widget's own "ever pressed" colour is a fixed light green; seen keys use its per-key fill instead, which
// takes a token.
const SEEN_FILL = 'var(--key-bg-seen)'

/**
 * The widget has no pressed or seen state for knob directions; it draws each as a <g data-encoder-pos="knob,dir">
 * with a circle and a label. CSS beats SVG presentation attributes, so a rule scoped to this picture recolours them.
 */
function knobRules(scope: string, turned: ReadonlySet<string> = new Set(), seen: ReadonlySet<string> = new Set()): string {
  const at = (pos: string) => `[data-picture="${scope}"] [data-encoder-pos="${pos}"]`
  const seenOnly = [...seen].filter((pos) => !turned.has(pos))
  return [
    ...seenOnly.map((pos) => `${at(pos)} > circle { fill: var(--key-bg-seen) }`),
    ...[...turned].map((pos) => `${at(pos)} > circle { fill: var(--key-bg-pressed) } ${at(pos)} > text { fill: var(--key-label-pressed) }`),
  ].join('\n')
}

export function KeyboardPicture({ keyboard, layer, pressed, selection, onSelect, seen, highlighted, knobsTurned, knobsSeen, fit = false }: Props) {
  const scope = useId()
  const knobStyle = knobRules(scope, knobsTurned, knobsSeen)
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
    // The widget draws at a fixed size; let it shrink to the space there is. It fills a held key with
    // var(--success) and picks the label colour for that per theme; inside the picture --success is the pressed
    // key token, light enough in the light theme for the dark label the widget keeps there.
    <div
      data-picture={scope}
      className={cx(
        'flex justify-center [--success:var(--key-bg-pressed)]',
        // The svg's viewBox keeps the shape when both sides are set: it scales to fit and centres.
        fit ? 'h-full w-full [&>svg]:h-full [&>svg]:w-full' : '[&>svg]:h-auto [&>svg]:max-w-full',
      )}
    >
      {knobStyle && <style>{knobStyle}</style>}
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
