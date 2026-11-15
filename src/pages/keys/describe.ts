// SPDX-License-Identifier: GPL-3.0-or-later
// The Keys page in words: what a keycode does, which of the inspector's choices it belongs to, and what a key
// that is "same as the layer below" ends up doing.

import {
  canTakeModifiers,
  KC_SAME_AS_BELOW,
  keycodeTitle,
  LAYER_ACTIONS,
  readLayerKey,
  readShortcut,
  slotKeycode,
  type KeyboardData,
  type LayerAction,
  type Slot,
} from '../../device'

/** The inspector's three ways of choosing. */
export type Choice = 'key' | 'shortcut' | 'layer'

export const layerName = (names: string[], layer: number): string => names[layer] ?? `Layer ${layer}`

export function layerSentence(action: LayerAction, name: string): string {
  return action.sentence.replace('{layer}', name)
}

/** What a keycode does, in plain words; layer keys say the layer's name. */
export function describeKeycode(code: number, names: string[]): string {
  const layerKey = readLayerKey(code)
  const action = layerKey && LAYER_ACTIONS.find((a) => a.op === layerKey.op)
  if (layerKey && action) return layerSentence(action, layerName(names, layerKey.layer))
  return keycodeTitle(code)
}

/**
 * Where the inspector opens for a keycode: the choice it belongs to, and whether "More options" holds it (nothing,
 * same as the layer below, or a code none of the choices builds).
 */
export function choiceFor(code: number, paletteCodes: ReadonlySet<number>): { choice: Choice; more: boolean } {
  if (paletteCodes.has(code)) return { choice: 'key', more: false }
  if (readLayerKey(code)) return { choice: 'layer', more: false }
  const shortcut = readShortcut(code)
  if (shortcut && shortcut.mods !== 0 && canTakeModifiers(shortcut.key)) return { choice: 'shortcut', more: false }
  return { choice: 'key', more: true }
}

/**
 * For a slot that is "same as the layer below": the first layer under it with an assignment of its own, and that
 * assignment. Above the keyboard's base layer, the layers down to the base count; layers under the base are off,
 * except that QMK falls back to layer 0 when nothing else has an assignment. A layer under the base belongs to the
 * other pair (Mac while on Windows), so all layers under it count. null on the bottom layer, or when no layer
 * below has an assignment.
 */
export function fallThrough(keyboard: KeyboardData, slot: Slot, base: number): { layer: number; code: number } | null {
  if (slotKeycode(keyboard, slot) !== KC_SAME_AS_BELOW || slot.layer === 0) return null
  const stop = slot.layer > base ? base : slot.layer === base ? slot.layer : 0
  const layers = []
  for (let layer = slot.layer - 1; layer >= stop; layer--) layers.push(layer)
  if (!layers.includes(0)) layers.push(0)
  for (const layer of layers) {
    const code = slotKeycode(keyboard, { ...slot, layer })
    if (code !== KC_SAME_AS_BELOW) return { layer, code }
  }
  return null
}
