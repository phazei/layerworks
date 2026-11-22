// SPDX-License-Identifier: GPL-3.0-or-later
// Changes that can leave a keyboard hard to use: the firmware-update key, the key that wipes the keyboard's memory,
// a base layer left with hardly any letters, layers nothing reaches any more, a layer turned on with no key to turn
// it off. Compared before and after a change (a restore plan, or one key), so only what the change itself causes is
// said, not a setup the person already chose.

import { getLayerOpTarget } from '../vendor/pipette/shared/keycodes/keycodes-classify'
import { keycodeId, parseKeycode, readLayerTap, readModTap } from './keycodes'
import type { KeyboardData } from './store'

/** One thing a change would do that needs saying before it is written. */
export interface Risk {
  kind: 'boot' | 'wipe' | 'letters' | 'unreachable' | 'stuck'
  /** The sentence, with layers named by `layerName`. */
  text: string
}

const LETTER_A = 0x04
const LETTER_Z = 0x1d
/** Fewer letters than this on a base layer means it hardly types (a full keyboard has 26). */
const FEW_LETTERS = 10

/**
 * The layers the keyboard falls back to when nothing is held: layer 0, and on Keychron keyboards with Mac and
 * Windows pairs, layer 2 as well (the switch picks the pair).
 */
export function baseLayers(kb: Pick<KeyboardData, 'layers' | 'definition'>): number[] {
  const vendor = Number((kb.definition as unknown as Record<string, unknown>).vendorId)
  return vendor === 0x3434 && kb.layers >= 4 ? [0, 2] : [0]
}

/** The layer a layer key reaches, and whether it stays on after the key is let go. */
function layerOp(code: number): { layer: number; stays: boolean } | null {
  const target = getLayerOpTarget(keycodeId(code))
  if (!target) return null
  return { layer: target.layer, stays: /^(TG|TO|DF|PDF)\(/.test(keycodeId(code)) }
}

const isLetter = (code: number) => {
  const key = code <= 0xff ? code : (readModTap(code)?.key ?? readLayerTap(code)?.key ?? 0)
  return key >= LETTER_A && key <= LETTER_Z
}

type Keymap = Record<string, number>

function layerKeys(keymap: Keymap, layer: number): number[] {
  const prefix = `${layer},`
  return Object.entries(keymap)
    .filter(([key]) => key.startsWith(prefix))
    .map(([, code]) => code)
}

/** Every layer a base layer can reach through layer keys, following them from layer to layer. */
function reachable(keymap: Keymap, from: number, layers: number): Set<number> {
  const seen = new Set([from])
  const todo = [from]
  while (todo.length) {
    const layer = todo.pop()!
    for (const code of layerKeys(keymap, layer)) {
      const op = layerOp(code)
      if (op && op.layer < layers && !seen.has(op.layer)) {
        seen.add(op.layer)
        todo.push(op.layer)
      }
    }
  }
  return seen
}

/** Layers a key turns on and leaves on (TG, TO, DF) where no layer key on that layer leads anywhere else. */
function stuckLayers(keymap: Keymap, layers: number): Set<number> {
  const stuck = new Set<number>()
  for (const [key, code] of Object.entries(keymap)) {
    const op = layerOp(code)
    if (!op?.stays || op.layer >= layers) continue
    const [layer, ...pos] = key.split(',')
    if (Number(layer) === op.layer) continue
    // TG on the target layer falls through when the same key there is "same as below".
    const sameKey = keymap[`${op.layer},${pos.join(',')}`]
    if (sameKey === 1) continue
    const out = layerKeys(keymap, op.layer).some((c) => {
      const back = layerOp(c)
      return back !== null && back.layer !== op.layer
    })
    if (!out && !layerKeys(keymap, op.layer).some((c) => layerOp(c)?.layer === op.layer)) stuck.add(op.layer)
  }
  return stuck
}

const list = (names: string[]) => (names.length <= 1 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`)

/**
 * What a change of the keymap (`before` → `after`, "layer,row,col" → keycode) would newly cause. `added` are the
 * keycodes the change writes (to count the firmware-update and memory-wiping keys).
 */
export function keymapRisks(
  kb: Pick<KeyboardData, 'layers' | 'definition'>,
  before: Keymap,
  after: Keymap,
  added: number[],
  layerName: (layer: number) => string,
): Risk[] {
  const risks: Risk[] = []
  const boot = parseKeycode('QK_BOOT')
  const wipe = parseKeycode('QK_CLEAR_EEPROM')
  const boots = boot === null ? 0 : added.filter((c) => c === boot).length
  const wipes = wipe === null ? 0 : added.filter((c) => c === wipe).length
  if (boots > 0) {
    risks.push({
      kind: 'boot',
      text: `${boots === 1 ? 'A key gets' : `${boots} keys get`} the firmware update key: pressing it stops the keyboard typing until it is unplugged and plugged back in.`,
    })
  }
  if (wipes > 0) {
    risks.push({
      kind: 'wipe',
      text: `${wipes === 1 ? 'A key gets' : `${wipes} keys get`} the key that wipes the keyboard’s memory: pressing it puts back the firmware’s own keys and settings.`,
    })
  }
  for (const base of baseLayers(kb)) {
    const letters = (map: Keymap) => layerKeys(map, base).filter(isLetter).length
    if (letters(before) >= FEW_LETTERS && letters(after) < FEW_LETTERS) {
      risks.push({ kind: 'letters', text: `${layerName(base)} would have hardly any letter keys left, so the keyboard could barely type there.` })
    }
    const was = reachable(before, base, kb.layers)
    const now = reachable(after, base, kb.layers)
    const lost = [...was].filter((layer) => !now.has(layer))
    if (lost.length > 0) {
      risks.push({
        kind: 'unreachable',
        text: `No key on ${layerName(base)} would reach ${list(lost.map(layerName))} any more.`,
      })
    }
  }
  const stuckBefore = stuckLayers(before, kb.layers)
  for (const layer of stuckLayers(after, kb.layers)) {
    if (stuckBefore.has(layer)) continue
    risks.push({ kind: 'stuck', text: `${layerName(layer)} could be turned on with no key on it to leave it.` })
  }
  return risks
}
