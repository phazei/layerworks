// SPDX-License-Identifier: GPL-3.0-or-later
// Vial's own save files (.vil), so a layout can move between Vial and Layerworks. The conversion is Pipette's
// (vendored vil-compat.ts and macro.ts); this file feeds it from the store and turns what it reads into contents a
// restore plans from. Vial files hold keys, knob, macros, the entries and QMK settings; not lighting, Keychron
// settings or layer names.

import {
  deserializeAllMacros,
  jsonToMacroActions,
  macroActionsToJson,
  serializeAllMacros,
  type MacroAction,
} from '../vendor/pipette/shared/macro'
import { normalizeQmkSettingData } from '../vendor/pipette/shared/qmk-settings-normalize'
import { extractUidFromJson, isVialGuiFile, vialGuiToVil, vilToVialGuiJson } from '../vendor/pipette/shared/vil-compat'
import type { VilFile } from '../vendor/pipette/shared/types/protocol'
import { parseKeycode } from './keycodes'
import { knobSlots } from './knob-map'
import type { FileIdentity, KeyboardContents } from './restore'
import type { DeviceState } from './store'

export const VIL_EXTENSION = '.vil'

/** Why a file can't be read as a Vial file. The message is for the user. */
export class VilError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'VilError'
  }
}

/** The connected keyboard as a Vial file's text. Parts not read (or that failed) are saved empty. */
export function exportVil(state: DeviceState): string {
  const kb = state.keyboard
  if (!kb) throw new Error('No keyboard is connected.')
  const settings: Record<string, number[]> = {}
  for (const [id, bytes] of Object.entries(state.settings ?? {})) settings[id] = normalizeQmkSettingData(Number(id), bytes)
  const vil: VilFile = {
    uid: kb.uid,
    keymap: kb.keymap,
    encoderLayout: kb.knobs,
    macros: state.macros ?? [],
    layoutOptions: kb.layoutOptions,
    tapDance: state.entries?.tapDance ?? [],
    combo: state.entries?.combo ?? [],
    keyOverride: state.entries?.keyOverride ?? [],
    altRepeatKey: state.entries?.altRepeatKey ?? [],
    qmkSettings: settings,
  }
  const macros = state.macros ? deserializeAllMacros(state.macros, kb.vialProtocol, kb.macroCount) : []
  // Vial lists every macro slot, empty ones too.
  while (macros.length < kb.macroCount) macros.push([])
  return (
    vilToVialGuiJson(vil, {
      rows: kb.rows,
      cols: kb.cols,
      layers: kb.layers,
      // Vial's encoder_layout runs from knob number 0 to the highest (./knob-map.ts, knobSlots).
      encoderCount: knobSlots(kb.knobIndices),
      vialProtocol: kb.vialProtocol,
      viaProtocol: kb.viaProtocol,
      macroActions: macros.map((actions) => JSON.parse(macroActionsToJson(actions)) as unknown[]),
    }) + '\n'
  )
}

const isInt = (v: unknown, max: number): boolean => typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= max

/**
 * Everything in a Vial file that can't go to a keyboard as it is, one phrase each. The vendored converter passes
 * numbers through and turns unknown key names into 0 (Nothing); the keyboard's commands keep 8 or 16 bits, so 70000
 * would land as another key, 4.7 as 4, a 1e9 ms tapping term as 51 712 ms. Checked before anything is written.
 */
interface VilCheck {
  /** Values that can't be written at all: the file is refused. */
  problems: string[]
  /** Key names this keyboard doesn't know (another firmware's own keys, USER13 …): those places are left alone. */
  unknownNames: Set<string>
  unknownKeys: Set<string>
  unknownKnobs: Set<string>
  unknownEntries: Record<'tapDance' | 'combo' | 'keyOverride' | 'altRepeatKey', Set<number>>
}

function vilProblems(raw: Record<string, unknown>, vil: VilFile): VilCheck {
  const check: VilCheck = {
    problems: [],
    unknownNames: new Set(),
    unknownKeys: new Set(),
    unknownKnobs: new Set(),
    unknownEntries: { tapDance: new Set(), combo: new Set(), keyOverride: new Set(), altRepeatKey: new Set() },
  }
  const { problems } = check
  /** Checks one key value; false when it is a name this keyboard doesn't know. */
  const keyName = (value: unknown, where: string): boolean => {
    if (typeof value === 'string') {
      if (parseKeycode(value) !== null) return true
      check.unknownNames.add(value.slice(0, 40))
      return false
    }
    if (!isInt(value, 0xffff) && value !== -1) problems.push(`${where} holds ${JSON.stringify(value)?.slice(0, 40)}`)
    return true
  }
  const grid = (value: unknown) => (Array.isArray(value) ? (value as unknown[]) : [])
  grid(raw.layout).forEach((layer, l) =>
    grid(layer).forEach((row, r) =>
      grid(row).forEach((v, c) => {
        if (!keyName(v, `layer ${l}, row ${r + 1}, column ${c + 1}`)) check.unknownKeys.add(`${l},${r},${c}`)
      }),
    ),
  )
  grid(raw.encoder_layout).forEach((layer, l) =>
    grid(layer).forEach((pair, k) =>
      grid(pair).forEach((v, d) => {
        if (!keyName(v, `layer ${l}, knob ${k + 1} ${d === 0 ? 'left' : 'right'}`)) check.unknownKnobs.add(`${l},${k},${d}`)
      }),
    ),
  )
  const entryKeys = (kind: keyof VilCheck['unknownEntries'], index: number, values: unknown[], where: string) => {
    for (const v of values) if (!keyName(v, where)) check.unknownEntries[kind].add(index)
  }
  const numbers = (entry: Record<string, unknown>, fields: [string, number][], where: string) => {
    for (const [field, max] of fields) {
      const value = entry[field]
      if (value !== undefined && !isInt(value, max)) problems.push(`${where} has ${JSON.stringify(value)?.slice(0, 20)} for ${field}`)
    }
  }
  grid(raw.tap_dance).forEach((entry, i) => {
    const e = grid(entry)
    entryKeys('tapDance', i, e.slice(0, 4), `multi-tap key ${i}`)
    if (e.length < 5 || !isInt(e[4], 0xffff)) problems.push(`multi-tap key ${i} has no usable tapping term`)
  })
  grid(raw.combo).forEach((entry, i) => entryKeys('combo', i, grid(entry).slice(0, 5), `key chord ${i}`))
  grid(raw.key_override).forEach((entry, i) => {
    const e = (entry ?? {}) as Record<string, unknown>
    entryKeys('keyOverride', i, [e.trigger, e.replacement], `shortcut replacement ${i}`)
    numbers(e, [['layers', 0xffff], ['trigger_mods', 0xff], ['negative_mod_mask', 0xff], ['suppressed_mods', 0xff], ['options', 0xff]], `shortcut replacement ${i}`)
  })
  grid(raw.alt_repeat_key).forEach((entry, i) => {
    const e = (entry ?? {}) as Record<string, unknown>
    entryKeys('altRepeatKey', i, [e.keycode, e.alt_keycode], `repeat rule ${i}`)
    numbers(e, [['allowed_mods', 0xff], ['options', 0xff]], `repeat rule ${i}`)
  })
  if (raw.layout_options !== undefined && !isInt(raw.layout_options, 0xffffffff)) problems.push('the layout options aren’t a number')
  const settings = raw.settings && typeof raw.settings === 'object' ? (raw.settings as Record<string, unknown>) : {}
  for (const [id, value] of Object.entries(settings)) {
    if (!/^\d+$/.test(id) || !isInt(value, 0xffffffff)) problems.push(`typing setting ${id.slice(0, 10)} has ${JSON.stringify(value)?.slice(0, 20)}`)
  }
  // The converter's output, in case a field slipped through as something else (unknown names are dealt with above).
  const readable = (entries: Record<string, number>, unknown: Set<string>) =>
    Object.entries(entries).every(([key, code]) => unknown.has(key) || isInt(code, 0xffff))
  if (!readable(vil.keymap, check.unknownKeys) || !readable(vil.encoderLayout, check.unknownKnobs)) {
    problems.push('a key that can’t be read')
  }
  return check
}

/** Leaves out of a record the places whose key names the keyboard doesn't know. */
const without = (entries: Record<string, number>, unknown: Set<string>) =>
  Object.fromEntries(Object.entries(entries).filter(([key]) => !unknown.has(key)))

export interface VilRead {
  identity: FileIdentity
  contents: KeyboardContents
}

/**
 * Reads a Vial file's text into contents for the connected keyboard. Macros are stored the way a keyboard on
 * `vialProtocol` keeps them. Throws a VilError saying what is wrong.
 */
export function parseVil(text: string, vialProtocol: number): VilRead {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new VilError('This file isn’t a Vial file: it can’t be read as one.')
  }
  if (!isVialGuiFile(data)) throw new VilError('This file isn’t a Vial file.')
  const raw = data as Record<string, unknown>
  const layout = raw.layout as unknown[]
  const grid = layout.every((layer) => Array.isArray(layer) && layer.every((row) => Array.isArray(row)))
  if (!grid || layout.length === 0) throw new VilError('The Vial file is damaged: its keymap can’t be read.')

  const macros: MacroAction[][] = []
  for (const [i, macro] of ((Array.isArray(raw.macro) ? raw.macro : []) as unknown[]).entries()) {
    const actions = jsonToMacroActions(JSON.stringify(macro))
    if (!actions) throw new VilError(`The Vial file is damaged: macro ${i} can’t be read.`)
    macros.push(actions)
  }

  let vil: VilFile
  try {
    vil = vialGuiToVil(raw, text, serializeAllMacros(macros, vialProtocol))
  } catch {
    throw new VilError('The Vial file is damaged: some of it can’t be read.')
  }
  const check = vilProblems(raw, vil)
  const { problems } = check
  if (problems.length > 0) {
    const more = problems.length > 3 ? `, and ${problems.length - 3} more` : ''
    throw new VilError(`The Vial file has values this app can’t use, so nothing was written: ${problems.slice(0, 3).join('; ')}${more}.`)
  }
  // An entry naming a key this keyboard doesn't know is left as it is (a hole the plan skips): written, it would hold
  // Nothing there.
  const skipped = (kind: keyof VilCheck['unknownEntries'], list: unknown[]) =>
    check.unknownEntries[kind].size === 0 ? list : list.map((e, i) => (check.unknownEntries[kind].has(i) ? undefined : e))
  const first = layout[0] as unknown[][]
  const contents: KeyboardContents = {
    keymap: without(vil.keymap, check.unknownKeys),
    knobs: without(vil.encoderLayout, check.unknownKnobs),
    layoutOptions: vil.layoutOptions,
    entries: {
      tapDance: skipped('tapDance', vil.tapDance) as typeof vil.tapDance,
      combo: skipped('combo', vil.combo) as typeof vil.combo,
      keyOverride: skipped('keyOverride', vil.keyOverride) as typeof vil.keyOverride,
      altRepeatKey: skipped('altRepeatKey', vil.altRepeatKey) as typeof vil.altRepeatKey,
    },
    settings: Object.fromEntries(Object.entries(vil.qmkSettings).map(([id, bytes]) => [Number(id), bytes])),
  }
  if (check.unknownNames.size > 0) {
    const places = check.unknownKeys.size + check.unknownKnobs.size + Object.values(check.unknownEntries).reduce((n, s) => n + s.size, 0)
    const names = [...check.unknownNames]
    contents.notes = [
      `${places} ${places === 1 ? 'place uses a key name' : 'places use key names'} this keyboard doesn’t know (${names.slice(0, 3).join(', ')}${names.length > 3 ? ' …' : ''}), so ${places === 1 ? 'it is' : 'they are'} left as ${places === 1 ? 'it is' : 'they are'}.`,
    ]
  }
  if (Array.isArray(raw.macro)) contents.macros = vil.macros
  return {
    identity: {
      name: null,
      vendorId: null,
      productId: null,
      uid: extractUidFromJson(text),
      rows: first.length,
      cols: Array.isArray(first[0]) ? first[0].length : null,
    },
    contents,
  }
}
