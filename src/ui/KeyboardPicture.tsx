// SPDX-License-Identifier: GPL-3.0-or-later
// The picture of the keyboard for one layer. Wraps Pipette's keyboard widget so the rest of the app doesn't
// depend on its props.

import { useId, useMemo } from 'react'
import { KeyboardWidget } from '../vendor/pipette/renderer/components/keyboard'
import { KEY_UNIT } from '../vendor/pipette/renderer/components/keyboard/constants'
import { cx } from './controls'
import { knobPictureText, pictureLabel, type PictureLabel } from './picture-labels'
// The one place ui reaches into the shell: layer names live in the browser per keyboard, and every picture names
// layer keys by them.
import { useConnectedLayerNames } from '../shell/layer-names'
import { keycodeId, layoutChoices, posKey, type KeyboardData, type KleKey } from '../device/api'
import { useLegendRevision } from '../device/layout'

/** How many pixels the widget draws a 1u key at, in the picture's own size (before it is scaled to fit). */
export const PICTURE_KEY_UNIT = KEY_UNIT

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
  /**
   * "row,col" → a colour to fill the key with (key colours). `light` says it is a light colour: its label is drawn
   * dark, otherwise light, in either theme.
   */
  fills?: ReadonlyMap<string, { colour: string; light: boolean }>
  /** "row,col" → a CSS colour for a thick outline (lighting zones). */
  outlines?: ReadonlyMap<string, string>
  /** The layers' names, for layer keys ("Hold" over "Fn2"). Default: the connected keyboard's (shell/layer-names.ts). */
  layerNames?: readonly string[]
}

// The widget's own "ever pressed" colour is a fixed light green; seen keys use its per-key fill instead, which
// takes a token.
const SEEN_FILL = 'var(--key-bg-seen)'

/**
 * Seen keys and knob directions (the Test page) get a thick outline as well as their tint, so they stand out from the
 * keys not seen yet by more than a faint colour (--key-edge-seen is 3:1 against a key's face in both themes).
 */
function seenRules(scope: string, seen: ReadonlySet<string> = new Set(), knobsSeen: ReadonlySet<string> = new Set()): string {
  const edge = 'stroke: var(--key-edge-seen); stroke-width: 3px'
  return [
    ...[...seen].map((pos) => `[data-picture="${scope}"] [data-key-pos="${pos}"] > :first-child { ${edge} }`),
    ...[...knobsSeen].map((pos) => `[data-picture="${scope}"] [data-encoder-pos="${pos}"] > circle { ${edge} }`),
  ].join('\n')
}

/** The label of a knob the firmware doesn't let apps change, in place of what it does. */
const FIXED = 'Fixed'

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

/**
 * The key's outer shape is the first child of its <g data-key-pos>; rules scoped to this picture outline it, and
 * colour the labels of filled keys (the widget's own choice only knows its own fills).
 */
function keyRules(
  scope: string,
  outlines: ReadonlyMap<string, string> = new Map(),
  fills: ReadonlyMap<string, { light: boolean }> = new Map(),
): string {
  const at = (pos: string) => `[data-picture="${scope}"] [data-key-pos="${pos}"]`
  return [
    ...[...outlines].map(([pos, colour]) => `${at(pos)} > :first-child { stroke: ${colour}; stroke-width: 3.5px }`),
    ...[...fills].map(([pos, { light }]) => `${at(pos)} text { fill: var(${light ? '--key-label-on-light' : '--key-label-on-dark'}) }`),
  ].join('\n')
}

export function KeyboardPicture({
  keyboard,
  layer,
  pressed,
  selection,
  onSelect,
  seen,
  highlighted,
  knobsTurned,
  knobsSeen,
  fit = false,
  fills,
  outlines,
  layerNames,
}: Props) {
  const scope = useId()
  const connectedNames = useConnectedLayerNames()
  const names = layerNames ?? connectedNames
  // The labels follow the computer's layout; this changes when it does.
  const legends = useLegendRevision()
  const knobStyle = [knobRules(scope, knobsTurned, knobsSeen), keyRules(scope, outlines, fills), seenRules(scope, seen, knobsSeen)]
    .filter(Boolean)
    .join('\n')
  const seenFills = useMemo(() => (seen ? new Map([...seen].map((pos) => [pos, SEEN_FILL])) : undefined), [seen])
  const fillColours = useMemo(() => (fills ? new Map([...fills].map(([pos, f]) => [pos, f.colour])) : undefined), [fills])

  // Friendly labels where the tables only have QMK's names (picture-labels.ts).
  const { keycodes, labels } = useMemo(() => {
    const keycodes = new Map<string, string>()
    const labels = new Map<string, PictureLabel>()
    for (let row = 0; row < keyboard.rows; row++) {
      for (let col = 0; col < keyboard.cols; col++) {
        const code = keyboard.keymap[`${layer},${row},${col}`] ?? 0
        keycodes.set(posKey(row, col), keycodeId(code))
        const label = pictureLabel(code, names)
        if (label) labels.set(posKey(row, col), label)
      }
    }
    return { keycodes, labels }
  }, [keyboard, layer, names, legends])

  const knobKeycodes = useMemo(() => {
    const map = new Map<string, [string, string]>()
    // The widget has no label override for knobs; it draws an unknown keycode as its text.
    const text = (code: number) => knobPictureText(code, names) ?? keycodeId(code)
    for (let knob = 0; knob < keyboard.knobCount; knob++) {
      map.set(String(knob), [text(keyboard.knobs[`${layer},${knob},0`] ?? 0), text(keyboard.knobs[`${layer},${knob},1`] ?? 0)])
    }
    // Knobs the firmware keeps to itself (KeyboardData.fixedKnobs): what they do isn't known, so they say so.
    if (keyboard.fixedKnobs > 0) {
      for (const key of keyboard.layout?.keys ?? []) if (key.encoderIdx >= 0) map.set(String(key.encoderIdx), [FIXED, FIXED])
    }
    return map
  }, [keyboard, layer, names, legends])
  // Only the chosen layout's keys (device/layout-options.ts): the widget moves the chosen alternatives into place and
  // leaves out the others.
  const layoutOptions = useMemo(() => new Map(layoutChoices(keyboard)), [keyboard])
  // Only knobs the app can change can be picked.
  const editableKnobs = keyboard.knobCount > 0

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
        labelOverrides={labels}
        encoderKeycodes={knobKeycodes}
        layoutOptions={layoutOptions}
        pressedKeys={pressed}
        highlightedKeys={highlighted}
        keyColors={fillColours ?? seenFills}
        selectedKey={selection?.kind === 'key' ? selection : null}
        selectedEncoder={selection?.kind === 'knob' ? { idx: selection.knob, dir: selection.direction } : null}
        onKeyClick={onSelect && ((key: KleKey) => onSelect({ kind: 'key', row: key.row, col: key.col }))}
        onEncoderClick={
          onSelect && editableKnobs
            ? (key: KleKey, direction: number) =>
                onSelect({ kind: 'knob', knob: key.encoderIdx, direction: direction === 1 ? 1 : 0 })
            : undefined
        }
        readOnly={!onSelect}
      />
    </div>
  )
}
