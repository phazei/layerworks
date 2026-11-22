// SPDX-License-Identifier: GPL-3.0-or-later
// What the Test page can find out about the knob. Turns aren't switches, so a turn is only seen when what it sends
// reaches the browser, and not everything does: the volume keys stay with the computer (Chrome on Windows doesn't
// pass them to pages), and the media keys often go to the browser's own media handling.

import { keycodeId, keycodeTitle, KC_SAME_AS_BELOW, readLayerKey, type KeyboardData, type LayerState } from '../../device'
import { howHeard, knobDirections, knobKeycode } from '../../shell/pressed-keys'

/**
 * How well the page sees a keycode: `seen` (plain keys, keys with modifiers, scrolling), `kept` (the volume keys,
 * which the computer keeps for itself), `maybe` (media keys, which may not reach the page) or `unseen` (layer
 * keys, lighting ...). A `kept` or `maybe` key that does arrive is still counted.
 */
export type Visibility = 'seen' | 'kept' | 'maybe' | 'unseen'

const KEPT = new Set(['KC_VOLU', 'KC_VOLD', 'KC_MUTE'])
const MAYBE = new Set(['KC_MNXT', 'KC_MPRV', 'KC_MPLY', 'KC_MSTP', 'KC_MSEL'])

export function visibility(code: number): Visibility {
  const heard = howHeard(code)
  if (!heard) return 'unseen'
  if ('key' in heard) {
    const id = keycodeId(heard.key)
    if (KEPT.has(id)) return 'kept'
    if (MAYBE.has(id)) return 'maybe'
  }
  return 'seen'
}

/**
 * Compatibility: keyboards have no knob, one (the K15 Max) or several (up to 8 in vial_qmk, e.g. keyboards/splitkb/elora);
 * the definition's knob keys (KLE label "e") say how many (KeyboardData.knobCount). The Test page's sentences say
 * "the knob" or "each knob" by this.
 */
export const severalKnobs = (keyboard: Pick<KeyboardData, 'knobCount'>): boolean => keyboard.knobCount > 1

/** How to get to a layer from where the keyboard rests: it is the base, a key holds it, or a key switches to it. */
export type Way = 'base' | 'hold' | 'switch'

/** The layers the keyboard can be on: its base layer, and those the base layer's keys hold or switch to. */
export function reachableLayers(keyboard: KeyboardData, base: number): Map<number, Way> {
  const layers = new Map<number, Way>([[base, 'base']])
  for (let row = 0; row < keyboard.rows; row++) {
    for (let col = 0; col < keyboard.cols; col++) {
      let code = keyboard.keymap[`${base},${row},${col}`] ?? 0
      if (code === KC_SAME_AS_BELOW) code = keyboard.keymap[`0,${row},${col}`] ?? 0
      const key = readLayerKey(code)
      if (!key || key.layer >= keyboard.layers || key.layer === base) continue
      const way: Way = key.op === 'MO' ? 'hold' : 'switch'
      if (layers.get(key.layer) !== 'hold') layers.set(key.layer, way)
    }
  }
  return layers
}

/** A layer where every knob direction sends something the page sees, and how it reads there. */
export interface Elsewhere {
  layer: number
  way: Way
  /** "it scrolls", or "it sends Page Up and Page Down" ("they …" for several knobs). */
  does: string
}

export interface KnobPlan {
  /** Each direction on the active layer: what it sends and how well the page sees it. */
  here: { position: string; code: number; visibility: Visibility }[]
  /** The directions the page can check on some reachable layer: the ones the count is out of. */
  checkable: string[]
  /** Where to turn the knob instead, when it can't all be checked on the active layer. */
  elsewhere: Elsewhere | null
}

const at = (layer: number, base: number): LayerState => ({ base, held: layer === base ? 0 : layer, active: layer })

export function knobPlan(keyboard: KeyboardData, layer: LayerState): KnobPlan {
  const positions = knobDirections(keyboard)
  const here = positions.map((position) => {
    const code = knobKeycode(keyboard, layer, position)
    return { position, code, visibility: visibility(code) }
  })
  const reachable = reachableLayers(keyboard, layer.base)
  reachable.set(layer.active, reachable.get(layer.active) ?? 'switch')
  const seenOn = (n: number, position: string) => visibility(knobKeycode(keyboard, at(n, layer.base), position)) === 'seen'
  const checkable = positions.filter((position) => [...reachable.keys()].some((n) => seenOn(n, position)))

  let elsewhere: Elsewhere | null = null
  if (here.some((d) => d.visibility !== 'seen')) {
    for (const [n, way] of reachable) {
      if (n === layer.active || !positions.every((position) => seenOn(n, position))) continue
      const codes = positions.map((position) => knobKeycode(keyboard, at(n, layer.base), position))
      const scrolls = codes.every((code) => {
        const heard = howHeard(code)
        return heard !== null && 'wheel' in heard
      })
      const they = severalKnobs(keyboard)
      elsewhere = {
        layer: n,
        way,
        does: scrolls ? (they ? 'they scroll' : 'it scrolls') : `${they ? 'they send' : 'it sends'} ${codes.map(keycodeTitle).join(' and ')}`,
      }
      break
    }
  }
  return { here, checkable, elsewhere }
}
