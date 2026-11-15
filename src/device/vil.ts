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
      encoderCount: kb.knobCount,
      vialProtocol: kb.vialProtocol,
      viaProtocol: kb.viaProtocol,
      macroActions: macros.map((actions) => JSON.parse(macroActionsToJson(actions)) as unknown[]),
    }) + '\n'
  )
}

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
  const first = layout[0] as unknown[][]
  const contents: KeyboardContents = {
    keymap: vil.keymap,
    knobs: vil.encoderLayout,
    layoutOptions: vil.layoutOptions,
    entries: {
      tapDance: vil.tapDance,
      combo: vil.combo,
      keyOverride: vil.keyOverride,
      altRepeatKey: vil.altRepeatKey,
    },
    settings: Object.fromEntries(Object.entries(vil.qmkSettings).map(([id, bytes]) => [Number(id), bytes])),
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
