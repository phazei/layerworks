// SPDX-License-Identifier: GPL-3.0-or-later
// Macros as steps a person can read: type text, tap a key, hold a key down, let it go, wait. The keyboard keeps
// all its macros in one shared buffer, one after another, each ended by a 0 byte; the encoding of a step is the
// vendored macro.ts (vial-gui's), which differs between Vial protocol 1 and 2+ (delays and 16-bit keys need 2+).

import {
  serializeMacro,
  deserializeMacro,
  isValidMacroText,
  splitMacroBuffer,
  type MacroAction,
} from '../vendor/pipette/shared/macro'
import { VIAL_PROTOCOL_ADVANCED_MACROS } from '../vendor/pipette/shared/constants/protocol'
import { parseKeycode } from './keycodes'
import type { KeyboardData, Slot } from './store'

export type MacroStep =
  | { kind: 'text'; text: string }
  /** Press and release one key; a shortcut keycode (Ctrl+C) taps the key with its modifiers. */
  | { kind: 'tap'; key: number }
  | { kind: 'down'; key: number }
  | { kind: 'up'; key: number }
  | { kind: 'wait'; ms: number }

/** The longest wait one step can hold: the firmware stores it in two bytes of base 255, each plus one. */
export const MAX_WAIT_MS = 254 * 255 + 254

const toAction = (step: MacroStep): MacroAction => {
  switch (step.kind) {
    case 'text':
      return { type: 'text', text: step.text }
    case 'wait':
      return { type: 'delay', delay: step.ms }
    default:
      return { type: step.kind, keycodes: [step.key] }
  }
}

function fromAction(action: MacroAction): MacroStep[] {
  switch (action.type) {
    case 'text':
      return [{ kind: 'text', text: action.text }]
    case 'delay':
      return [{ kind: 'wait', ms: action.delay }]
    default:
      return action.keycodes.map((key) => ({ kind: action.type, key }))
  }
}

/** One macro's bytes, without the 0 that ends it. Steps with a problem (see `stepProblem`) encode to nothing. */
export function encodeMacro(steps: MacroStep[], vialProtocol: number): number[] {
  return serializeMacro(
    steps.filter((s) => stepProblem(s, vialProtocol) === null).map(toAction),
    vialProtocol,
  )
}

export function decodeMacro(bytes: number[], vialProtocol: number): MacroStep[] {
  return deserializeMacro(bytes, vialProtocol).flatMap(fromAction)
}

/** The bytes of each macro as stored, `count` of them (missing ones empty). */
export function rawMacros(buffer: number[], count: number): number[][] {
  const raw = splitMacroBuffer(buffer, count)
  while (raw.length < count) raw.push([])
  return raw.slice(0, count)
}

/** Every macro on the keyboard as steps. */
export function readMacros(buffer: number[], vialProtocol: number, count: number): MacroStep[][] {
  return rawMacros(buffer, count).map((bytes) => decodeMacro(bytes, vialProtocol))
}

/** Bytes a macro takes in the shared buffer, its ending 0 included. */
export const macroSize = (steps: MacroStep[], vialProtocol: number): number => encodeMacro(steps, vialProtocol).length + 1

export interface MacroSpace {
  /** The whole buffer. */
  size: number
  /** Taken by all the macros, each with its ending 0. */
  used: number
  free: number
}

export function macroSpace(buffer: number[], count: number, size: number): MacroSpace {
  const used = rawMacros(buffer, count).reduce((sum, bytes) => sum + bytes.length + 1, 0)
  return { size, used, free: Math.max(0, size - used) }
}

/**
 * The buffer with macro `index` replaced by `bytes`, every other macro byte for byte as it was, padded with 0 to
 * `size`. null when it doesn't fit; `overflow` says by how many bytes.
 */
export function replaceMacro(
  buffer: number[],
  count: number,
  size: number,
  index: number,
  bytes: number[],
): { buffer: number[] } | { buffer: null; overflow: number } {
  const raw = rawMacros(buffer, count)
  raw[index] = bytes
  const joined = raw.flatMap((macro) => [...macro, 0])
  if (joined.length > size) return { buffer: null, overflow: joined.length - size }
  while (joined.length < size) joined.push(0)
  return { buffer: joined }
}

/** Characters a macro can type: the printable ones of US ASCII (send_string assumes a US layout). */
export const canTypeText = isValidMacroText

/** The characters of `text` a macro can't type, each once. */
export function untypable(text: string): string[] {
  return [...new Set([...text].filter((c) => !isValidMacroText(c)))]
}

/** Why a step can't be saved as it is, in words; null when it can. */
export function stepProblem(step: MacroStep, vialProtocol: number): string | null {
  const advanced = vialProtocol >= VIAL_PROTOCOL_ADVANCED_MACROS
  switch (step.kind) {
    case 'text': {
      if (step.text === '') return 'Type the text this step should type.'
      const bad = untypable(step.text)
      if (bad.length === 0) return null
      const shown = bad.map((c) => (c === '\n' ? 'line breaks' : c === '\t' ? 'tabs' : `“${c}”`)).join(', ')
      return `A macro can’t type ${shown}: only the letters, digits and symbols on a US keyboard. Use a “Tap a key” step for Enter or Tab.`
    }
    case 'wait':
      if (!advanced) return 'This keyboard’s firmware can’t wait inside a macro.'
      if (!Number.isInteger(step.ms) || step.ms < 0 || step.ms > MAX_WAIT_MS) return `A wait can be up to ${MAX_WAIT_MS / 1000} seconds.`
      return null
    default:
      if (step.key === 0) return 'Pick a key.'
      if (step.key > 0xff && !advanced) return 'This keyboard’s firmware can only use plain keys in a macro.'
      return null
  }
}

export const sameSteps = (a: MacroStep[], b: MacroStep[]): boolean => JSON.stringify(a) === JSON.stringify(b)

/** The keycode that runs macro `index` (QMK's M0, M1 …) for the connected keyboard's protocol. */
export const macroKeycode = (index: number): number | null => parseKeycode(`M${index}`)

/** Every key and knob direction that runs macro `index`. */
export function macroUses(keyboard: KeyboardData, index: number): Slot[] {
  const code = macroKeycode(index)
  return code === null ? [] : keycodeUses(keyboard, code)
}

/** Every key and knob direction, on any layer, that holds `code`. */
export function keycodeUses(keyboard: KeyboardData, code: number): Slot[] {
  const slots: Slot[] = []
  for (const [key, value] of Object.entries(keyboard.keymap)) {
    if (value !== code) continue
    const [layer, row, col] = key.split(',').map(Number)
    slots.push({ kind: 'key', layer, row, col })
  }
  for (const [key, value] of Object.entries(keyboard.knobs)) {
    if (value !== code) continue
    const [layer, knob, direction] = key.split(',').map(Number)
    slots.push({ kind: 'knob', layer, knob, direction: direction === 1 ? 1 : 0 })
  }
  return slots.sort((a, b) => a.layer - b.layer)
}

// --- Recording ---------------------------------------------------------------------------------------------------

export interface RecordedKey {
  type: 'down' | 'up'
  /** The basic keycode (HID usage) of the key. */
  key: number
  /** Milliseconds, from any fixed point. */
  time: number
}

const MODIFIER_BITS: Record<number, number> = {
  0xe0: 0x01, 0xe1: 0x02, 0xe2: 0x04, 0xe3: 0x08, // left Ctrl, Shift, Alt, GUI
  0xe4: 0x11, 0xe5: 0x12, 0xe6: 0x14, 0xe7: 0x18, // right ones
}
const isModifier = (key: number) => key in MODIFIER_BITS

/** What a plain key types on a US layout, and with Shift. */
const US_CHARS: Record<number, [string, string]> = {
  0x2c: [' ', ' '], 0x2d: ['-', '_'], 0x2e: ['=', '+'], 0x2f: ['[', '{'], 0x30: [']', '}'], 0x31: ['\\', '|'],
  0x33: [';', ':'], 0x34: ["'", '"'], 0x35: ['`', '~'], 0x36: [',', '<'], 0x37: ['.', '>'], 0x38: ['/', '?'],
}
for (let i = 0; i < 26; i++) US_CHARS[0x04 + i] = [String.fromCharCode(97 + i), String.fromCharCode(65 + i)]
'1234567890'.split('').forEach((d, i) => (US_CHARS[0x1e + i] = [d, '!@#$%^&*()'[i]]))

/** Shortcut keycode: QMK keeps the modifiers in bits 8-12 (bit 12 for the right-hand ones). */
const withMods = (mods: number, key: number) => ((mods & 0x1f) << 8) | key

/** The text a tap types, when it is a printable key with no modifier or only Shift. */
function charOf(key: number): string | null {
  const mods = (key >> 8) & 0x1f
  const base = key & 0xff
  const pair = US_CHARS[base]
  if (!pair || key > 0x1fff) return null
  if (mods === 0) return pair[0]
  if (mods === 0x02 || mods === 0x12) return pair[1]
  return null
}

export interface RecordOptions {
  /** Keep pauses longer than this as waits (ms); leave out to drop the timing. */
  keepPausesOver?: number
}

/**
 * Turns key presses recorded from the browser into readable steps: a press and release with nothing between is a
 * tap; keys tapped while only modifiers are held become shortcuts (Ctrl+C), the modifiers dropped; runs of
 * printable keys become text. Anything else stays as hold and let go.
 */
export function stepsFromRecording(events: RecordedKey[], options: RecordOptions = {}): MacroStep[] {
  type Timed = { step: MacroStep; time: number }
  const out: Timed[] = []
  // Keys still held that a step hasn't accounted for: modifiers wrapping shortcuts are dropped on release.
  const held: { key: number; used: boolean; emitted: boolean; time: number }[] = []

  for (let i = 0; i < events.length; i++) {
    const event = events[i]
    // The next event that isn't the key repeating.
    let j = i + 1
    while (events[j]?.type === 'down' && events[j].key === event.key) j++
    const next = events[j]
    if (event.type === 'down') {
      if (held.some((h) => h.key === event.key)) continue // auto-repeat
      if (isModifier(event.key)) {
        held.push({ key: event.key, used: false, emitted: false, time: event.time })
        continue
      }
      if (next && next.type === 'up' && next.key === event.key) {
        // Modifiers not written out as holds wrap this tap as a shortcut (those written out are down already).
        const loose = held.filter((h) => isModifier(h.key) && !h.emitted)
        const looseMods = loose.reduce((m, h) => m | MODIFIER_BITS[h.key], 0)
        loose.forEach((h) => (h.used = true))
        out.push({ step: { kind: 'tap', key: looseMods ? withMods(looseMods, event.key) : event.key }, time: event.time })
        i = j
        continue
      }
      // A key held while something else happens: write the modifiers held so far, then this one, as holds.
      for (const h of held) {
        if (!h.emitted) {
          out.push({ step: { kind: 'down', key: h.key }, time: h.time })
          h.emitted = true
        }
      }
      held.push({ key: event.key, used: false, emitted: true, time: event.time })
      out.push({ step: { kind: 'down', key: event.key }, time: event.time })
    } else {
      const at = held.findIndex((h) => h.key === event.key)
      if (at < 0) continue // released a key pressed before recording started
      const [h] = held.splice(at, 1)
      if (h.emitted) out.push({ step: { kind: 'up', key: event.key }, time: event.time })
      else if (!h.used) out.push({ step: { kind: 'tap', key: event.key }, time: h.time }) // a modifier on its own
    }
  }
  // Keys still down when recording stopped are let go, so the macro never leaves one held.
  for (const h of held) if (h.emitted) out.push({ step: { kind: 'up', key: h.key }, time: Infinity })

  // Pauses, then text.
  const steps: MacroStep[] = []
  let last: number | null = null
  for (const { step, time } of out) {
    const gap = last === null || !Number.isFinite(time) ? 0 : time - last
    if (options.keepPausesOver !== undefined && gap > options.keepPausesOver) {
      steps.push({ kind: 'wait', ms: Math.min(MAX_WAIT_MS, Math.round(gap / 10) * 10) })
    }
    if (Number.isFinite(time)) last = time
    const char = step.kind === 'tap' ? charOf(step.key) : null
    const prev = steps.at(-1)
    if (char !== null && prev?.kind === 'text') prev.text += char
    else if (char !== null) steps.push({ kind: 'text', text: char })
    else steps.push(step)
  }
  return steps
}
