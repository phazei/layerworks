// SPDX-License-Identifier: GPL-3.0-or-later
// The Keys page in words: what a keycode does, which of the inspector's choices it belongs to, and what a key
// that is "same as the layer below" ends up doing.

import {
  canTakeModifiers,
  KC_SAME_AS_BELOW,
  keycodeCap,
  keycodeName,
  keycodeTitle,
  LAYER_ACTIONS,
  layerActionSentence,
  modifierShort,
  modifierWords,
  readLayerKey,
  readLayerMod,
  readLayerTap,
  readOneShotMod,
  readShortcut,
  readTapHold,
  slotKeycode,
  tapHoldWords,
  type KeyboardData,
  type LayerAction,
  type Slot,
} from '../../device'

/** The inspector's four ways of choosing. */
export type Choice = 'key' | 'shortcut' | 'layer' | 'tapHold'

export const layerName = (names: string[], layer: number): string => names[layer] ?? `Layer ${layer}`

/** A layer action's sentence: "While held, use Fn2"; `taps` is the keyboard's tapping toggle (useTappingToggle). */
export function layerSentence(action: LayerAction, name: string, taps?: number): string {
  return layerActionSentence(action, name, taps)
}

/** "While held, use Fn2 with Ctrl + Shift" */
export const layerModSentence = (name: string, mods: number): string => `While held, use ${name} with ${modifierWords(mods)}`

/** What a keycode does, in plain words; layer keys say the layer's name (and, to stay on, how many taps). */
export function describeKeycode(code: number, names: string[], taps?: number): string {
  const layerKey = readLayerKey(code)
  const action = layerKey && LAYER_ACTIONS.find((a) => a.op === layerKey.op)
  if (layerKey && action) return layerSentence(action, layerName(names, layerKey.layer), taps)
  const tapHold = readTapHold(code)
  if (tapHold) return tapHoldWords(tapHold, (layer) => layerName(names, layer))
  const layerMod = readLayerMod(code)
  if (layerMod) return layerModSentence(layerName(names, layerMod.layer), layerMod.mods)
  return keycodeTitle(code)
}

/** The label for the keycap beside "Now": two lines for a key that does two things, with the layer's name. */
export function capLabel(code: number, names: string[]): string {
  const layerTap = readLayerTap(code)
  if (layerTap) return `${layerTap.key ? keycodeName(layerTap.key) : 'Nothing'}\n${layerName(names, layerTap.layer)}`
  const layerMod = readLayerMod(code)
  if (layerMod) return `${layerName(names, layerMod.layer)}\n+ ${modifierShort(layerMod.mods)}`
  return keycodeCap(code)
}

/**
 * Where the inspector opens for a keycode: the choice it belongs to, and whether "More options" holds it (a
 * one-shot modifier, nothing, same as the layer below, or a code none of the choices builds).
 */
export function choiceFor(code: number, paletteCodes: ReadonlySet<number>): { choice: Choice; more: boolean } {
  if (paletteCodes.has(code)) return { choice: 'key', more: false }
  if (readLayerKey(code) || readLayerMod(code)) return { choice: 'layer', more: false }
  if (readTapHold(code)) return { choice: 'tapHold', more: false }
  const shortcut = readShortcut(code)
  if (shortcut && shortcut.mods !== 0 && canTakeModifiers(shortcut.key)) return { choice: 'shortcut', more: false }
  return { choice: 'key', more: true }
}

/** True for a keycode More options has its own control for (so it isn't put in the key-code field). */
export const hasOwnOption = (code: number): boolean => code === 0 || code === KC_SAME_AS_BELOW || readOneShotMod(code) !== null

/**
 * For a slot that is "same as the layer below": the layer it normally ends up on, and what it does there. QMK
 * takes the highest switched-on layer under it with an assignment, and layer 0 when none has one. While a layer
 * above the base is in use, the layer switched on under it is normally just the keyboard's base layer (the
 * Mac/Windows switch), so the key falls to the base layer, then to layer 0: on Fn2 over Windows it is the Windows
 * key, not the Windows Fn one. A layer at or under the base (Mac Fn while on Windows) falls straight to layer 0.
 * Other layers held at the same time are not counted. null on the bottom layer, or when nothing below has an
 * assignment.
 */
export function fallThrough(keyboard: KeyboardData, slot: Slot, base: number): { layer: number; code: number } | null {
  if (slotKeycode(keyboard, slot) !== KC_SAME_AS_BELOW || slot.layer === 0) return null
  const layers = slot.layer > base && base > 0 ? [base, 0] : [0]
  for (const layer of layers) {
    const code = slotKeycode(keyboard, { ...slot, layer })
    if (code !== KC_SAME_AS_BELOW) return { layer, code }
  }
  return null
}
