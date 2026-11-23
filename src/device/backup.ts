// SPDX-License-Identifier: GPL-3.0-or-later
// The backup file: everything read from the keyboard, plus the layer names this browser keeps for it, in one JSON
// file. Versioned, so a later Layerworks can still read it and an older one says it is too new. Pure functions:
// making the file's text, reading it back with clear messages for anything wrong, and turning it into the
// contents a restore plans from (./restore).

import type { KeychronState } from '../vendor/pipette/shared/types/keychron'
import { keyboardIdentity, type Debounce, type FileIdentity, type KeyboardContents, type LightingValues } from './restore'
import { knobSlots } from './knob-map'
import type { DeviceState, Entries } from './store'
import type { WirelessTimers } from './wireless'
import type { SnapClickEntry } from './keychron-typing'
import type { Hsv, ZoneEffect } from './keychron-rgb'

export const BACKUP_FORMAT = 'layerworks-backup'
export const BACKUP_VERSION = 1
export const BACKUP_EXTENSION = '.layerworks.json'

export interface BackupKeyboard {
  name: string
  /** From the keyboard's definition, or the cable link; null when neither says. */
  vendorId: number | null
  productId: number | null
  /** Vial's keyboard ID, "0x…". The same for every keyboard running the same firmware definition. */
  uid: string
  rows: number
  cols: number
  layers: number
  knobs: number
  viaProtocol: number
  vialProtocol: number
  /** What Keychron firmware reports as its version, when it does. */
  firmware: string | null
}

export interface BackupKeychron {
  wireless: WirelessTimers | null
  debounce: Debounce | null
  /** Everything else read from the Keychron commands, for reference; restore doesn't use it yet. */
  state: Record<string, unknown>
}

export interface Backup {
  format: typeof BACKUP_FORMAT
  version: number
  /** ISO date and time. */
  savedAt: string
  keyboard: BackupKeyboard
  /** One per layer, as stored in the browser; an empty name means the default. */
  layerNames: string[]
  /** One per macro, as stored in the browser; an empty name means the default. Missing in older files. */
  macroNames?: string[]
  /** keymap[layer][row][col] = keycode */
  keymap: number[][][]
  /**
   * knobs[layer][knob] = [left (counter-clockwise), right (clockwise)], by the knob's number in the firmware's commands
   * (0 to the highest; one the keyboard has no knob for holds [0, 0]).
   */
  knobs: [number, number][][]
  layoutOptions: number
  /** The macro buffer as the keyboard stores it; null when it couldn't be read. */
  macros: number[] | null
  entries: Entries | null
  /** QMK setting ID → raw value bytes */
  settings: Record<string, number[]> | null
  lighting: LightingValues | null
  keychron: BackupKeychron | null
}

/** Parts the backup would be missing because they couldn't be read (empty when the backup is complete). */
export function missingParts(state: DeviceState): string[] {
  const names = { macros: 'macros', entries: 'multi-tap keys, key chords and the like', settings: 'typing settings', lighting: 'lighting', keychron: 'Keychron settings' } as const
  return (Object.keys(names) as (keyof typeof names)[]).filter((p) => state.failed.includes(p)).map((p) => names[p])
}

/** A JSON-safe copy: Maps become plain objects. */
function plain(value: unknown): unknown {
  return JSON.parse(JSON.stringify(value, (_, v: unknown) => (v instanceof Map ? Object.fromEntries(v) : v)))
}

function keychronBackup(kc: KeychronState): BackupKeychron {
  return {
    wireless: kc.hasWireless ? { backlitTime: kc.wirelessBacklitTime, idleTime: kc.wirelessIdleTime } : null,
    debounce: kc.hasDebounce ? { type: kc.debounceType, time: kc.debounceTime } : null,
    // Battery and the active layer change all the time; they aren't settings.
    state: plain({ ...kc, batteryLevel: undefined, defaultLayer: undefined }) as Record<string, unknown>,
  }
}

/**
 * The backup of the connected keyboard. `layerNames` and `macroNames` are the ones stored in the browser (empty for a
 * default).
 */
export function createBackup(
  state: DeviceState,
  layerNames: string[],
  now: Date = new Date(),
  macroNames: string[] = [],
): Backup {
  const kb = state.keyboard
  const identity = keyboardIdentity(state)
  if (!kb || !identity) throw new Error('No keyboard is connected.')
  const range = (n: number) => Array.from({ length: n }, (_, i) => i)
  const settings = state.settings
    ? Object.fromEntries(Object.entries(state.settings).map(([id, bytes]) => [id, [...bytes]]))
    : null
  const light = state.lighting
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    savedAt: now.toISOString(),
    keyboard: {
      name: kb.name,
      vendorId: identity.vendorId,
      productId: identity.productId,
      uid: kb.uid,
      rows: kb.rows,
      cols: kb.cols,
      layers: kb.layers,
      knobs: kb.knobCount,
      viaProtocol: kb.viaProtocol,
      vialProtocol: kb.vialProtocol,
      firmware: state.keychron?.firmwareVersion || null,
    },
    layerNames: range(kb.layers).map((i) => layerNames[i]?.trim() ?? ''),
    macroNames: range(kb.macroCount).map((i) => macroNames[i]?.trim() ?? ''),
    keymap: range(kb.layers).map((l) => range(kb.rows).map((r) => range(kb.cols).map((c) => kb.keymap[`${l},${r},${c}`] ?? 0))),
    // By the knob's firmware number, 0 to the highest, as Vial's files lay them out (./knob-map.ts, knobSlots): a number
    // no knob has stays at Nothing, and a restore passes over it.
    knobs: range(kb.layers).map((l) =>
      range(knobSlots(kb.knobIndices)).map((k): [number, number] => [kb.knobs[`${l},${k},0`] ?? 0, kb.knobs[`${l},${k},1`] ?? 0]),
    ),
    layoutOptions: kb.layoutOptions,
    macros: state.macros ? [...state.macros] : null,
    entries: state.entries ? (plain(state.entries) as Entries) : null,
    settings,
    lighting: light && light.kind === 'vialrgb' ? { mode: light.mode, speed: light.speed, hue: light.hue, sat: light.sat, val: light.val } : null,
    keychron: state.keychron ? keychronBackup(state.keychron) : null,
  }
}

/** The backup's text, as written to the file. */
export const backupText = (backup: Backup): string => JSON.stringify(backup, null, 2) + '\n'

/** "keychron-k15-max-2026-11-15.layerworks.json" */
export function backupFileName(name: string, date: Date, extension = BACKUP_EXTENSION): string {
  const slug = name.toLowerCase().replace(/\(.*?\)/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'keyboard'
  const day = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  return `${slug}-${day}${extension}`
}

/** Why a file can't be read as a backup. The message is for the user. */
export class BackupError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'BackupError'
  }
}

const DAMAGED = (what: string) => new BackupError(`The backup file is damaged: ${what}.`)

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const isInt = (v: unknown, max: number): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= max

function ints(value: unknown, max: number, what: string): number[] {
  if (!Array.isArray(value) || !value.every((v) => isInt(v, max))) throw DAMAGED(what)
  return value as number[]
}

function nullable<T>(value: unknown, read: (v: unknown) => T): T | null {
  return value === null || value === undefined ? null : read(value)
}

function fields<K extends string>(value: unknown, keys: readonly K[], max: number, what: string): Record<K, number> {
  if (!isRecord(value) || !keys.every((k) => isInt(value[k], max))) throw DAMAGED(what)
  return Object.fromEntries(keys.map((k) => [k, value[k]])) as Record<K, number>
}

function flags<K extends string>(value: unknown, keys: readonly K[], what: string): Record<K, boolean> {
  if (!isRecord(value) || !keys.every((k) => typeof value[k] === 'boolean')) throw DAMAGED(what)
  return Object.fromEntries(keys.map((k) => [k, value[k]])) as Record<K, boolean>
}

const U16 = 0xffff

function readEntries(value: unknown): Entries {
  if (!isRecord(value)) throw DAMAGED('the tap dance and combo section')
  const list = (key: string) => {
    const v = value[key] ?? []
    if (!Array.isArray(v)) throw DAMAGED(`the ${key} list`)
    return v as unknown[]
  }
  return {
    tapDance: list('tapDance').map((e, i) =>
      fields(e, ['onTap', 'onHold', 'onDoubleTap', 'onTapHold', 'tappingTerm'], U16, `tap dance ${i}`),
    ),
    combo: list('combo').map((e, i) => fields(e, ['key1', 'key2', 'key3', 'key4', 'output'], U16, `combo ${i}`)),
    keyOverride: list('keyOverride').map((e, i) => ({
      ...fields(e, ['triggerKey', 'replacementKey', 'layers'], U16, `key override ${i}`),
      ...fields(e, ['triggerMods', 'negativeMods', 'suppressedMods', 'options'], 0xff, `key override ${i}`),
      ...flags(e, ['enabled'], `key override ${i}`),
    })),
    altRepeatKey: list('altRepeatKey').map((e, i) => ({
      ...fields(e, ['lastKey', 'altKey'], U16, `alt repeat ${i}`),
      ...fields(e, ['allowedMods', 'options'], 0xff, `alt repeat ${i}`),
      ...flags(e, ['enabled'], `alt repeat ${i}`),
    })),
  }
}

function readKeyboard(value: unknown): BackupKeyboard {
  if (!isRecord(value)) throw new BackupError('The backup doesn’t say which keyboard it was made from.')
  const id = (v: unknown): number | null => {
    if (v === null || v === undefined) return null
    if (!isInt(v, U16)) throw DAMAGED('the keyboard’s vendor or product ID')
    return v
  }
  const counts = fields(value, ['rows', 'cols', 'layers', 'knobs', 'viaProtocol', 'vialProtocol'], 0xffffffff, 'the keyboard’s description')
  if (typeof value.name !== 'string' || typeof value.uid !== 'string') throw DAMAGED('the keyboard’s name or ID')
  return {
    name: value.name,
    vendorId: id(value.vendorId),
    productId: id(value.productId),
    uid: value.uid,
    ...counts,
    firmware: typeof value.firmware === 'string' ? value.firmware : null,
  }
}

/** Reads a backup file's text. Throws a BackupError saying what is wrong. */
export function parseBackup(text: string): Backup {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new BackupError('This file isn’t a Layerworks backup: it can’t be read as one.')
  }
  if (!isRecord(data) || data.format !== BACKUP_FORMAT) {
    throw new BackupError('This file isn’t a Layerworks backup.')
  }
  if (!isInt(data.version, Number.MAX_SAFE_INTEGER) || data.version < 1) throw DAMAGED('its version is missing')
  if (data.version > BACKUP_VERSION) {
    throw new BackupError(
      `This backup was made by a newer version of Layerworks (format ${data.version}). Update the app to restore it.`,
    )
  }
  const keyboard = readKeyboard(data.keyboard)

  if (!Array.isArray(data.keymap)) throw DAMAGED('the keymap is missing')
  const keymap = data.keymap.map((layer: unknown, l) => {
    if (!Array.isArray(layer)) throw DAMAGED(`layer ${l} of the keymap`)
    return layer.map((row: unknown, r) => ints(row, U16, `layer ${l}, row ${r} of the keymap`))
  })
  const knobs = (Array.isArray(data.knobs) ? data.knobs : []).map((layer: unknown, l) => {
    if (!Array.isArray(layer)) throw DAMAGED(`the knob on layer ${l}`)
    return layer.map((pair: unknown) => {
      const both = ints(pair, U16, `the knob on layer ${l}`)
      if (both.length !== 2) throw DAMAGED(`the knob on layer ${l}`)
      return [both[0], both[1]] as [number, number]
    })
  })

  const settings = nullable(data.settings, (v) => {
    if (!isRecord(v)) throw DAMAGED('the typing settings')
    return Object.fromEntries(
      Object.entries(v).map(([id, bytes]) => {
        if (!/^\d+$/.test(id)) throw DAMAGED('the typing settings')
        return [id, ints(bytes, 0xff, `typing setting ${id}`)]
      }),
    )
  })

  const keychron = nullable(data.keychron, (v): BackupKeychron => {
    if (!isRecord(v)) throw DAMAGED('the Keychron settings')
    return {
      wireless: nullable(v.wireless, (w) => fields(w, ['backlitTime', 'idleTime'], U16, 'the wireless timers')),
      debounce: nullable(v.debounce, (d) => fields(d, ['type', 'time'], 0xff, 'the debounce setting')),
      state: isRecord(v.state) ? v.state : {},
    }
  })

  const layerNames = Array.isArray(data.layerNames) ? data.layerNames.map((n) => (typeof n === 'string' ? n : '')) : []

  return {
    format: BACKUP_FORMAT,
    version: data.version,
    savedAt: typeof data.savedAt === 'string' ? data.savedAt : '',
    keyboard,
    layerNames,
    ...(Array.isArray(data.macroNames) ? { macroNames: data.macroNames.map((n) => (typeof n === 'string' ? n : '')) } : {}),
    keymap,
    knobs,
    layoutOptions: isInt(data.layoutOptions, 0xffffffff) ? data.layoutOptions : 0,
    macros: nullable(data.macros, (v) => ints(v, 0xff, 'the macros')),
    entries: nullable(data.entries, readEntries),
    settings,
    // VialRGB's effect id is 16-bit; speed and colour are bytes (vialrgb.c).
    lighting: nullable(data.lighting, (v) => ({
      ...fields(v, ['mode'], U16, 'the lighting'),
      ...fields(v, ['speed', 'hue', 'sat', 'val'], 0xff, 'the lighting'),
    })),
    keychron,
  }
}

/** Who the backup is for, to check against the connected keyboard. */
export function backupIdentity(backup: Backup): FileIdentity {
  const { name, vendorId, productId, uid, rows, cols, vialProtocol } = backup.keyboard
  return { name, vendorId, productId, uid, rows, cols, vialProtocol }
}

/** What the backup can put back on a keyboard. */
export function backupContents(backup: Backup): KeyboardContents {
  const keymap: Record<string, number> = {}
  backup.keymap.forEach((layer, l) => layer.forEach((row, r) => row.forEach((code, c) => (keymap[`${l},${r},${c}`] = code))))
  const knobs: Record<string, number> = {}
  backup.knobs.forEach((layer, l) =>
    layer.forEach(([left, right], k) => {
      knobs[`${l},${k},0`] = left
      knobs[`${l},${k},1`] = right
    }),
  )
  const contents: KeyboardContents = { keymap, knobs, layoutOptions: backup.layoutOptions, layerNames: backup.layerNames }
  if (backup.macroNames) contents.macroNames = backup.macroNames
  if (backup.macros) contents.macros = backup.macros
  if (backup.entries) contents.entries = backup.entries
  if (backup.settings) {
    contents.settings = Object.fromEntries(Object.entries(backup.settings).map(([id, bytes]) => [Number(id), bytes]))
  }
  if (backup.lighting) contents.lighting = backup.lighting
  if (backup.keychron?.wireless) contents.wireless = backup.keychron.wireless
  if (backup.keychron?.debounce) contents.debounce = backup.keychron.debounce
  Object.assign(contents, keychronExtras(backup.keychron?.state ?? {}))
  return contents
}

const byte = (v: unknown): v is number => isInt(v, 0xff)

/**
 * Snap Click, Keychron's per-key and zone lighting and the lock lights, from the Keychron state the backup keeps as read
 * (KeychronState, with its Maps as objects). Each part is taken only if it is whole and well-formed; a damaged one
 * is left out rather than failing the whole file.
 */
function keychronExtras(state: Record<string, unknown>): Pick<KeyboardContents, 'snapClick' | 'keyColours' | 'zones' | 'lockLights'> {
  const out: Pick<KeyboardContents, 'snapClick' | 'keyColours' | 'zones' | 'lockLights'> = {}
  const snap = state.snapClickEntries
  if (state.hasSnapClick === true && Array.isArray(snap) && snap.every((e) => isRecord(e) && byte(e.type) && byte(e.key1) && byte(e.key2))) {
    out.snapClick = (snap as SnapClickEntry[]).map(({ type, key1, key2 }) => ({ type, key1, key2 }))
  }
  const rgb = state.rgb
  if (state.hasRgb !== true || !isRecord(rgb)) return out
  const colours = rgb.perKeyColors
  if (
    Array.isArray(colours) &&
    colours.length > 0 &&
    colours.every((c) => Array.isArray(c) && c.length === 3 && c.every(byte)) &&
    byte(rgb.perKeyRGBType)
  ) {
    out.keyColours = { colours: (colours as Hsv[]).map((c) => [...c] as Hsv), style: rgb.perKeyRGBType }
  }
  const regions = rgb.mixedRGBRegions
  const effects = rgb.mixedRGBEffects
  const isEffect = (e: unknown) =>
    isRecord(e) && byte(e.effect) && byte(e.hue) && byte(e.sat) && byte(e.speed) && isInt(e.time, 0xffffffff)
  if (
    Array.isArray(regions) &&
    regions.length > 0 &&
    regions.every(byte) &&
    Array.isArray(effects) &&
    effects.length > 0 &&
    effects.every((list) => Array.isArray(list) && list.every(isEffect))
  ) {
    out.zones = {
      regions: [...(regions as number[])],
      effects: (effects as ZoneEffect[][]).map((list) => list.map(({ effect, hue, sat, speed, time }) => ({ effect, hue, sat, speed, time }))),
    }
  }
  const lights = rgb.osIndicatorConfig
  if (isRecord(lights) && byte(lights.disableMask) && byte(lights.hue) && byte(lights.sat) && byte(lights.val)) {
    out.lockLights = { disableMask: lights.disableMask, hue: lights.hue, sat: lights.sat, val: lights.val }
  }
  return out
}
