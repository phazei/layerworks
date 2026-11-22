// SPDX-License-Identifier: GPL-3.0-or-later
// Putting saved contents back on a keyboard. What a file holds (KeyboardContents, read from a Layerworks backup or
// a Vial file), whether it fits the connected keyboard, and the plan of writes that makes the keyboard match it:
// only what differs. Pure functions; DeviceStore.restore runs the plan.

import { normalizeQmkSettingData } from '../vendor/pipette/shared/qmk-settings-normalize'
import type {
  AltRepeatKeyEntry,
  ComboEntry,
  KeyOverrideEntry,
  TapDanceEntry,
} from '../vendor/pipette/shared/types/protocol'
import type { DeviceState, Entries, Slot } from './store'
import { formatDuration, timersProblem, type WirelessTimers } from './wireless'
import { debounceMax, debounceType, snapClickProblem, type SnapClickEntry } from './keychron-typing'
import { keycodeName, macroTitle, parseKeycode, readMacroKey, readTapDanceKey } from './keycodes'
import { layoutChangeWords } from './layout-options'
import { readMacros } from './macros'
import { keymapRisks, type Risk } from './risks'
import { settingValueProblem } from './settings'
import { normaliseLockLights, PER_KEY_STYLE_COUNT, type Hsv, type LockLights, type ZoneEffect } from './keychron-rgb'

export interface LightingValues {
  mode: number
  speed: number
  hue: number
  sat: number
  val: number
}

export interface Debounce {
  type: number
  time: number
}

/** Everything a file can put back on a keyboard. A part that is left out is left alone. */
export interface KeyboardContents {
  /** "layer,row,col" → keycode */
  keymap?: Record<string, number>
  /** "layer,knob,direction" → keycode */
  knobs?: Record<string, number>
  layoutOptions?: number
  /** The macro buffer, as the keyboard stores it. */
  macros?: number[]
  entries?: Partial<Entries>
  /** QMK setting ID → value bytes, least significant first */
  settings?: Record<number, number[]>
  lighting?: LightingValues
  wireless?: WirelessTimers
  debounce?: Debounce
  /** Keychron Snap Click, every slot. */
  snapClick?: SnapClickEntry[]
  /** Keychron per-key lighting: one colour per LED index, and the style (./keychron-rgb). */
  keyColours?: { colours: Hsv[]; style: number }
  /** Keychron mixed lighting: the zone of each LED, and each zone's effect slots in the keyboard's numbering. */
  zones?: { regions: number[]; effects: ZoneEffect[][] }
  /** Keychron lock lights (Caps Lock and the like): their colour and which are off. */
  lockLights?: LockLights
  /** As stored in the browser: an empty name means the default. */
  layerNames?: string[]
  /** As stored in the browser: an empty name means the default. */
  macroNames?: string[]
  /** What reading the file left out, one sentence each, shown with the plan's `ignored`. */
  notes?: string[]
}

/** Who a file says it is for. Parts the file doesn't say are null. */
export interface FileIdentity {
  name: string | null
  vendorId: number | null
  productId: number | null
  /** Vial's keyboard ID: the same for every keyboard running the same firmware definition. */
  uid: string | null
  rows: number | null
  cols: number | null
  /** The Vial protocol of the firmware the file was made on; null when it holds keys by name (a Vial file). */
  vialProtocol?: number | null
}

/**
 * Whether raw keycode numbers (and macro bytes) mean the same on two Vial protocols. Compatibility: vial-qmk
 * renumbered most keycodes beyond the basic ones with protocol 6 (2023; modifiers, layer keys, QK_BOOT all moved:
 * the vendored tables `shared/keycodes/keycodes-v5.ts` and `keycodes-v6.ts`, vial-qmk `quantum/vial.h`
 * VIAL_PROTOCOL_VERSION), and protocol 1 stores macros without the action prefix that 2 and later use
 * (`VIAL_PROTOCOL_ADVANCED_MACROS`). A backup keeps raw numbers, so it only fits firmware that numbers keys alike.
 */
export function sameKeyNumbering(a: number, b: number): boolean {
  return a >= 6 === b >= 6 && a >= 2 === b >= 2
}

export type FitCheck = { fits: false; reason: string } | { fits: true; warnings: string[] }

const RECEIVER_IDS = (productId: number) => productId >= 0xd000 && productId <= 0xdfff

function definitionId(value: unknown): number | null {
  const n = typeof value === 'string' ? Number(value) : typeof value === 'number' ? value : NaN
  return Number.isInteger(n) && n >= 0 && n <= 0xffff ? n : null
}

/**
 * The connected keyboard's identity. Vendor and product ID come from its definition, or from the cable link; a
 * 2.4 GHz receiver has its own IDs, which say nothing about the keyboard behind it.
 */
export function keyboardIdentity(state: DeviceState): FileIdentity | null {
  const kb = state.keyboard
  if (!kb) return null
  const definition = kb.definition as unknown as Record<string, unknown>
  const cable = state.link && !RECEIVER_IDS(state.link.productId) ? state.link : null
  return {
    name: kb.name,
    vendorId: definitionId(definition.vendorId) ?? cable?.vendorId ?? null,
    productId: definitionId(definition.productId) ?? cable?.productId ?? null,
    uid: kb.uid,
    rows: kb.rows,
    cols: kb.cols,
    vialProtocol: kb.vialProtocol,
  }
}

const sameUid = (a: string, b: string) => {
  try {
    return BigInt(a) === BigInt(b)
  } catch {
    return a.toLowerCase() === b.toLowerCase()
  }
}

/** Whether a file can go on the connected keyboard: refused for another model, a warning for another firmware. */
export function checkFit(file: FileIdentity, state: DeviceState): FitCheck {
  const here = keyboardIdentity(state)
  if (!here) return { fits: false, reason: 'No keyboard is connected.' }
  const fileName = file.name ? `“${file.name}”` : 'another keyboard'
  if (
    file.vendorId !== null &&
    file.productId !== null &&
    here.vendorId !== null &&
    here.productId !== null &&
    (file.vendorId !== here.vendorId || file.productId !== here.productId)
  ) {
    return { fits: false, reason: `This file was made for ${fileName}, a different keyboard from this one.` }
  }
  if (file.rows !== null && file.cols !== null && (file.rows !== here.rows || file.cols !== here.cols)) {
    return {
      fits: false,
      reason: `This file was made for ${fileName}, whose keys are wired differently (${file.rows} × ${file.cols} instead of ${here.rows} × ${here.cols}), so its keys wouldn’t land in the right places.`,
    }
  }
  if (file.vialProtocol != null && here.vialProtocol != null && !sameKeyNumbering(file.vialProtocol, here.vialProtocol)) {
    return {
      fits: false,
      reason:
        'This backup was made when the keyboard ran other Vial firmware, which numbers keys differently, so its keys ' +
        'would come back wrong. If you have a Vial file (.vil) from that time, restore that instead: it names the keys.',
    }
  }
  const warnings: string[] = []
  if (file.uid && here.uid && !sameUid(file.uid, here.uid)) {
    warnings.push(
      'The file comes from a keyboard of the same model running different firmware. Keys and settings that firmware doesn’t share with this one may not work the same.',
    )
  }
  return { fits: true, warnings }
}

export interface KeyChange {
  slot: Slot
  from: number
  to: number
}

export interface EntryChange<T> {
  index: number
  entry: T
}

export interface RestorePlan {
  /** Keys and knob directions. */
  keys: KeyChange[]
  layoutOptions: number | null
  /** The layout options that change, in the definition's words ("Split Backspace on"); empty where none it names. */
  layoutChanges: string[]
  /** The whole macro buffer, when any of it differs. */
  macros: number[] | null
  tapDance: EntryChange<TapDanceEntry>[]
  combo: EntryChange<ComboEntry>[]
  keyOverride: EntryChange<KeyOverrideEntry>[]
  altRepeatKey: EntryChange<AltRepeatKeyEntry>[]
  settings: { qsid: number; value: number[] }[]
  lighting: LightingValues | null
  wireless: WirelessTimers | null
  debounce: Debounce | null
  /** Snap Click slots that differ. */
  snapClick: { index: number; entry: SnapClickEntry }[]
  /** Per-key colours and style; a part that already matches is null. */
  keyColours: { colours: Hsv[] | null; style: number | null } | null
  /** Zone map and the zones whose effects differ. */
  zones: { regions: number[] | null; effects: { zone: number; effects: ZoneEffect[] }[] } | null
  /** The lock lights, when they differ. */
  lockLights: LockLights | null
  /** Names for the browser to keep; null when they already match. */
  layerNames: string[] | null
  /** Macro names for the browser to keep; null when they already match. */
  macroNames: string[] | null
  /** What the file holds that this keyboard can't take, one sentence each. */
  ignored: string[]
}

export const ENTRY_KINDS = ['tapDance', 'combo', 'keyOverride', 'altRepeatKey'] as const
export type EntryKind = (typeof ENTRY_KINDS)[number]

/** The parts of a restore, in the order they are written. */
export type RestorePart =
  | 'keys'
  | 'knob'
  | 'layoutOptions'
  | 'macros'
  | EntryKind
  | 'settings'
  | 'lighting'
  | 'wireless'
  | 'debounce'
  | 'snapClick'
  | 'keyColours'
  | 'zones'
  | 'lockLights'
  | 'layerNames'
  | 'macroNames'

/** The parts' names in sentences: friendly first, the QMK name in brackets where there is one. */
export const PART_NAMES: Record<RestorePart, { one: string; many: string; qmk?: string }> = {
  keys: { one: 'key', many: 'keys' },
  knob: { one: 'knob turn', many: 'knob turns' },
  layoutOptions: { one: 'layout option', many: 'layout options' },
  macros: { one: 'macro memory', many: 'macro memory' },
  tapDance: { one: 'multi-tap key', many: 'multi-tap keys', qmk: 'tap dance' },
  combo: { one: 'key chord', many: 'key chords', qmk: 'combos' },
  keyOverride: { one: 'shortcut replacement', many: 'shortcut replacements', qmk: 'key overrides' },
  altRepeatKey: { one: 'repeat rule', many: 'repeat rules', qmk: 'alt repeat' },
  settings: { one: 'typing setting', many: 'typing settings', qmk: 'QMK settings' },
  lighting: { one: 'lighting', many: 'lighting' },
  wireless: { one: 'wireless timers', many: 'wireless timers' },
  debounce: { one: 'key bounce filter', many: 'key bounce filter', qmk: 'debounce' },
  snapClick: { one: 'Snap Click pair', many: 'Snap Click pairs', qmk: 'SOCD' },
  keyColours: { one: 'key colours', many: 'key colours', qmk: 'per-key RGB' },
  zones: { one: 'mixed zones', many: 'mixed zones', qmk: 'mixed RGB' },
  lockLights: { one: 'lock lights', many: 'lock lights', qmk: 'indicators' },
  layerNames: { one: 'layer names', many: 'layer names' },
  macroNames: { one: 'macro names', many: 'macro names' },
}

/** "3 multi-tap keys (tap dance)" */
export function countOf(part: RestorePart, n: number): string {
  const name = PART_NAMES[part]
  return `${n} ${n === 1 ? name.one : name.many}${name.qmk ? ` (${name.qmk})` : ''}`
}

/** A QMK setting's value as one number, read from its bytes (least significant first) at its real width. */
function settingValue(qsid: number, bytes: number[]): number {
  return normalizeQmkSettingData(qsid, bytes).reduce((sum, byte, i) => sum + (byte & 0xff) * 256 ** i, 0)
}

const sameEntry = (a: object, b: object) => {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)])
  return [...keys].every((k) => (a as Record<string, unknown>)[k] === (b as Record<string, unknown>)[k])
}

function parseSlotKey(key: string): number[] | null {
  const parts = key.split(',').map(Number)
  return parts.length === 3 && parts.every((n) => Number.isInteger(n) && n >= 0) ? parts : null
}

/**
 * The writes that make the connected keyboard match `contents`. Parts the file leaves out, and parts the keyboard
 * hasn't been read yet, are left alone. `storedNames` and `storedMacroNames` are the layer and macro names this
 * browser keeps for the keyboard.
 */
export function planRestore(
  contents: KeyboardContents,
  state: DeviceState,
  storedNames: string[] = [],
  storedMacroNames: string[] = [],
): RestorePlan {
  const kb = state.keyboard
  const plan: RestorePlan = {
    keys: [],
    layoutOptions: null,
    layoutChanges: [],
    macros: null,
    tapDance: [],
    combo: [],
    keyOverride: [],
    altRepeatKey: [],
    settings: [],
    lighting: null,
    wireless: null,
    debounce: null,
    snapClick: [],
    keyColours: null,
    zones: null,
    lockLights: null,
    layerNames: null,
    macroNames: null,
    ignored: [],
  }
  if (!kb) return plan
  plan.ignored.push(...(contents.notes ?? []))

  // Keys and knob directions.
  const extraLayers = new Set<number>()
  let outside = 0
  for (const [key, to] of Object.entries(contents.keymap ?? {})) {
    const at = parseSlotKey(key)
    if (!at) continue
    const [layer, row, col] = at
    if (layer >= kb.layers) extraLayers.add(layer)
    else if (row >= kb.rows || col >= kb.cols) outside++
    else if ((kb.keymap[key] ?? 0) !== to) plan.keys.push({ slot: { kind: 'key', layer, row, col }, from: kb.keymap[key] ?? 0, to })
  }
  for (const [key, to] of Object.entries(contents.knobs ?? {})) {
    const at = parseSlotKey(key)
    if (!at) continue
    const [layer, knob, direction] = at
    if (layer >= kb.layers) extraLayers.add(layer)
    else if (knob >= kb.knobCount || direction > 1) outside++
    else if ((kb.knobs[key] ?? 0) !== to) {
      plan.keys.push({ slot: { kind: 'knob', layer, knob, direction: direction as 0 | 1 }, from: kb.knobs[key] ?? 0, to })
    }
  }
  if (extraLayers.size > 0) {
    const n = extraLayers.size
    plan.ignored.push(`${n} layer${n === 1 ? '' : 's'} beyond the ${kb.layers} this keyboard has.`)
  }
  if (outside > 0) plan.ignored.push(`${outside} key${outside === 1 ? '' : 's'} this keyboard doesn’t have.`)

  if (contents.layoutOptions !== undefined && contents.layoutOptions !== kb.layoutOptions) {
    plan.layoutOptions = contents.layoutOptions
    plan.layoutChanges = layoutChangeWords(kb, contents.layoutOptions)
  }

  // Macros: one buffer, written whole.
  if (contents.macros && state.macros && kb.macroBytes > 0) {
    const wanted = contents.macros.slice(0, kb.macroBytes)
    if (contents.macros.slice(kb.macroBytes).some((b) => b !== 0)) {
      plan.ignored.push('Macros that don’t fit in this keyboard’s macro memory.')
    }
    while (wanted.length < kb.macroBytes) wanted.push(0)
    const runner = macroRunningShortcut(wanted, kb.vialProtocol, kb.macroCount)
    if (runner !== null) {
      plan.ignored.push(
        `Macros: ${macroTitle(runner)} runs another macro or a shortcut key, which can freeze the keyboard, so the file’s macros aren’t restored.`,
      )
    } else if (wanted.some((b, i) => b !== state.macros?.[i])) plan.macros = wanted
  }

  // Tap dance, combos, key overrides, alt repeat.
  if (contents.entries && state.entries) {
    const counts: Record<EntryKind, number> = {
      tapDance: kb.counts.tapDance,
      combo: kb.counts.combo,
      keyOverride: kb.counts.keyOverride,
      altRepeatKey: kb.counts.altRepeatKey,
    }
    for (const kind of ENTRY_KINDS) {
      const wanted = (contents.entries[kind] ?? []) as object[]
      const now = state.entries[kind] as object[]
      const changes = plan[kind] as EntryChange<object>[]
      wanted.forEach((entry, index) => {
        // A hole: the file's entry named keys this keyboard doesn't know (./vil), so it is left alone.
        if (index >= counts[kind] || !entry) return
        if (!now[index] || !sameEntry(now[index], entry)) changes.push({ index, entry })
      })
      if (wanted.length > counts[kind]) {
        const beyond = wanted.slice(counts[kind]).filter((e) => e && !isEmptyEntry(kind, e)).length
        if (beyond > 0) plan.ignored.push(`${countOf(kind, beyond)} beyond the ${counts[kind]} this keyboard has.`)
      }
    }
  }

  // QMK settings.
  if (contents.settings && state.settings) {
    let unknown = 0
    for (const [id, bytes] of Object.entries(contents.settings)) {
      const qsid = Number(id)
      const now = state.settings[qsid]
      if (!now) {
        unknown++
        continue
      }
      const value = settingValue(qsid, bytes)
      const problem = settingValueProblem(qsid, value)
      if (problem) plan.ignored.push(`Typing setting ${problem}.`)
      else if (value !== settingValue(qsid, now)) {
        plan.settings.push({ qsid, value: normalizeQmkSettingData(qsid, bytes) })
      }
    }
    if (unknown > 0) plan.ignored.push(`${countOf('settings', unknown)} this keyboard doesn’t have.`)
  }

  // Lighting.
  const light = contents.lighting
  const nowLight = state.lighting
  if (light && nowLight) {
    if (nowLight.kind !== 'vialrgb') plan.ignored.push('Lighting: this keyboard’s lights can’t be set by the app.')
    else if (!nowLight.effects.has(light.mode)) plan.ignored.push('Lighting: this keyboard doesn’t have the saved effect.')
    else {
      // Brightness above the keyboard's maximum is what the firmware would make of it anyway.
      const val = nowLight.maxBrightness > 0 ? Math.min(light.val, nowLight.maxBrightness) : light.val
      const wanted = { mode: light.mode, speed: light.speed, hue: light.hue, sat: light.sat, val }
      if ((['mode', 'speed', 'hue', 'sat', 'val'] as const).some((k) => wanted[k] !== nowLight[k])) plan.lighting = wanted
    }
  }

  // Keychron: wireless timers and debounce.
  const kc = state.keychron
  if (contents.wireless) {
    const w = contents.wireless
    if (!kc?.hasWireless) plan.ignored.push('Wireless timers: this keyboard has none.')
    else if (timersProblem(w)) plan.ignored.push(`Wireless timers: ${timersProblem(w)}`)
    else if (w.backlitTime !== kc.wirelessBacklitTime || w.idleTime !== kc.wirelessIdleTime) plan.wireless = { ...w }
  }
  if (contents.debounce) {
    const d = contents.debounce
    if (!kc?.hasDebounce) plan.ignored.push('Key bounce filter: this keyboard doesn’t let the app set it.')
    else if (!debounceType(d.type) || d.time > debounceMax(d.type)) {
      plan.ignored.push(`Key bounce filter: type ${d.type} with ${d.time} ms isn’t one the keyboard takes.`)
    } else if (d.type !== kc.debounceType || d.time !== kc.debounceTime) plan.debounce = { ...d }
  }

  // Keychron: Snap Click.
  if (contents.snapClick) {
    if (!kc?.hasSnapClick) plan.ignored.push('Snap Click: this keyboard doesn’t have it.')
    else {
      const slots = kc.snapClickEntries
      let beyond = 0
      let unusable = 0
      contents.snapClick.forEach((entry, index) => {
        if (index >= slots.length) {
          if (entry.type !== 0) beyond++
          return
        }
        if (snapClickProblem(entry) !== null) {
          unusable++
          return
        }
        const now = slots[index]
        if (now.type !== entry.type || now.key1 !== entry.key1 || now.key2 !== entry.key2) {
          plan.snapClick.push({ index, entry: { type: entry.type, key1: entry.key1, key2: entry.key2 } })
        }
      })
      if (beyond > 0) plan.ignored.push(`${countOf('snapClick', beyond)} beyond the ${slots.length} this keyboard has.`)
      if (unusable > 0) plan.ignored.push(`${countOf('snapClick', unusable)} the keyboard wouldn’t take.`)
    }
  }

  // Keychron: per-key colours and zones. Tables are per LED, so they only go back on a keyboard with as many.
  const rgb = kc?.hasRgb ? kc.rgb : null
  if (contents.keyColours) {
    const { colours, style } = contents.keyColours
    if (!rgb || rgb.ledCount === 0) plan.ignored.push('Key colours: this keyboard can’t give each key its own colour.')
    else if (colours.length !== rgb.ledCount) plan.ignored.push('Key colours: this keyboard has a different number of lights.')
    else {
      const sameColours = colours.every((c, i) => rgb.perKeyColors[i]?.every((v, j) => v === c[j]))
      const wantedStyle = style >= 0 && style < PER_KEY_STYLE_COUNT && style !== rgb.perKeyRGBType ? style : null
      if (!sameColours || wantedStyle !== null) {
        plan.keyColours = { colours: sameColours ? null : colours.map((c) => [...c] as Hsv), style: wantedStyle }
      }
    }
  }
  if (contents.zones) {
    const { regions, effects } = contents.zones
    if (!rgb || rgb.mixedRGBLayers === 0) plan.ignored.push('Mixed zones: this keyboard has none.')
    else if (regions.length !== rgb.ledCount || effects.length !== rgb.mixedRGBLayers) {
      plan.ignored.push('Mixed zones: this keyboard has a different number of lights or zones.')
    } else {
      const sameRegions = regions.every((z, i) => z === rgb.mixedRGBRegions[i])
      const changed = effects.flatMap((list, zone) => {
        const now = rgb.mixedRGBEffects[zone] ?? []
        const same = list.length === now.length && list.every((e, i) => sameEntry(e, now[i]))
        return same || list.length !== rgb.mixedRGBEffectsPerLayer ? [] : [{ zone, effects: list.map((e) => ({ ...e })) }]
      })
      if (!sameRegions || changed.length > 0) {
        plan.zones = { regions: sameRegions || regions.some((z) => z >= rgb.mixedRGBLayers) ? null : [...regions], effects: changed }
      }
    }
  }

  // Keychron: the lock lights' colour and switches.
  if (contents.lockLights) {
    const now = kc?.hasRgb ? kc.rgb?.osIndicatorConfig : null
    if (!now) plan.ignored.push('Lock lights: this keyboard doesn’t let the app set them.')
    else {
      const wanted = normaliseLockLights(contents.lockLights)
      if ((['disableMask', 'hue', 'sat', 'val'] as const).some((k) => wanted[k] !== now[k])) plan.lockLights = wanted
    }
  }

  // Layer names, kept in the browser.
  if (contents.layerNames) {
    const pad = (names: string[]) => Array.from({ length: kb.layers }, (_, i) => names[i]?.trim() ?? '')
    const wanted = pad(contents.layerNames)
    const now = pad(storedNames)
    if (wanted.some((name, i) => name !== now[i])) plan.layerNames = wanted
  }
  if (contents.macroNames) {
    const pad = (names: string[]) => Array.from({ length: kb.macroCount }, (_, i) => names[i]?.trim() ?? '')
    const wanted = pad(contents.macroNames)
    const now = pad(storedMacroNames)
    if (wanted.some((name, i) => name !== now[i])) plan.macroNames = wanted
  }

  return plan
}

/**
 * The first macro (QMK number) in a macro memory that taps, holds or lets go of another macro, a multi-tap key or a
 * repeat key, or null. vial-qmk runs such a step through the whole key handling (vial.c vial_keycode_tap →
 * process_record_via → dynamic_keymap_macro_send), so a macro running itself recurses until the keyboard locks up.
 * The app's own editor never offers these keys in a step; a file may hold them.
 */
export function macroRunningShortcut(buffer: number[], vialProtocol: number, count: number): number | null {
  const repeat = [parseKeycode('QK_REPEAT_KEY'), parseKeycode('QK_ALT_REPEAT_KEY')]
  const runs = (key: number) => readMacroKey(key) !== null || readTapDanceKey(key) !== null || repeat.includes(key)
  const macros = readMacros(buffer, vialProtocol, count)
  const index = macros.findIndex((steps) => steps.some((s) => s.kind !== 'text' && s.kind !== 'wait' && runs(s.key)))
  return index < 0 ? null : index
}

/** What a plan would newly cause that needs saying first (./risks): its key and knob changes applied to the keymap. */
export function planRisks(plan: RestorePlan, state: DeviceState, layerName: (layer: number) => string): Risk[] {
  const kb = state.keyboard
  if (!kb) return []
  const after = { ...kb.keymap }
  for (const { slot, to } of plan.keys) if (slot.kind === 'key') after[`${slot.layer},${slot.row},${slot.col}`] = to
  return keymapRisks(kb, kb.keymap, after, plan.keys.map((k) => k.to), layerName)
}

/** One part of a plan, item by item, for the review's "Show the changes" list. */
export interface PlanItems {
  part: RestorePart
  /** "Keys", "Macros" … */
  title: string
  items: string[]
}

/** A macro's steps in a line: “Hello”, Ctrl + C, wait 200 ms. */
function macroLine(steps: ReturnType<typeof readMacros>[number]): string {
  if (steps.length === 0) return 'empty'
  return steps
    .map((s) =>
      s.kind === 'text'
        ? `“${s.text}”`
        : s.kind === 'wait'
          ? `wait ${s.ms} ms`
          : s.kind === 'tap'
            ? keycodeName(s.key)
            : `${s.kind === 'down' ? 'hold' : 'let go of'} ${keycodeName(s.key)}`,
    )
    .join(', ')
}

/** Every key, knob turn, macro and entry a plan changes, in words (layers named by `layerName`). */
export function planItems(plan: RestorePlan, state: DeviceState, layerName: (layer: number) => string): PlanItems[] {
  const kb = state.keyboard
  if (!kb) return []
  const out: PlanItems[] = []
  const change = (from: number, to: number) => `${keycodeName(from)} → ${keycodeName(to)}`
  const keys = plan.keys.filter((k) => k.slot.kind === 'key')
  if (keys.length) {
    out.push({
      part: 'keys',
      title: 'Keys',
      items: keys.map(({ slot, from, to }) =>
        slot.kind === 'key' ? `${layerName(slot.layer)}, row ${slot.row + 1}, column ${slot.col + 1}: ${change(from, to)}` : '',
      ),
    })
  }
  const knob = plan.keys.filter((k) => k.slot.kind === 'knob')
  if (knob.length) {
    out.push({
      part: 'knob',
      title: kb.knobCount === 1 ? 'Knob' : 'Knobs',
      items: knob.map(({ slot, from, to }) =>
        slot.kind === 'knob'
          ? `${layerName(slot.layer)}, ${kb.knobCount === 1 ? 'knob' : `knob ${slot.knob + 1}`} turned ${slot.direction === 0 ? 'left' : 'right'}: ${change(from, to)}`
          : '',
      ),
    })
  }
  if (plan.macros && state.macros) {
    const before = readMacros(state.macros, kb.vialProtocol, kb.macroCount)
    const after = readMacros(plan.macros, kb.vialProtocol, kb.macroCount)
    const items = after.flatMap((steps, i) =>
      macroLine(steps) === macroLine(before[i] ?? []) ? [] : [`${macroTitle(i)}: ${macroLine(steps)}`],
    )
    out.push({ part: 'macros', title: 'Macros', items: items.length ? items : ['The macro memory’s unused bytes'] })
  }
  for (const kind of ENTRY_KINDS) {
    const changes = plan[kind] as EntryChange<object>[]
    if (changes.length === 0) continue
    const name = PART_NAMES[kind]
    out.push({
      part: kind,
      title: name.many.charAt(0).toUpperCase() + name.many.slice(1),
      items: changes.map(({ index, entry }) => `${name.one.charAt(0).toUpperCase() + name.one.slice(1)} ${index}${isEmptyEntry(kind, entry) ? ': emptied' : ''}`),
    })
  }
  return out
}

/** An entry that does nothing: all keycodes 0. Unused slots beyond a keyboard's count aren't worth mentioning. */
export function isEmptyEntry(kind: EntryKind, entry: object): boolean {
  const e = entry as Record<string, unknown>
  const keys: Record<EntryKind, string[]> = {
    tapDance: ['onTap', 'onHold', 'onDoubleTap', 'onTapHold'],
    combo: ['key1', 'key2', 'key3', 'key4', 'output'],
    keyOverride: ['triggerKey', 'replacementKey'],
    altRepeatKey: ['lastKey', 'altKey'],
  }
  return keys[kind].every((k) => !e[k])
}

/** QK_BOOT for the connected keyboard's protocol: the key that restarts it into firmware update mode. */
export const bootKeycode = (): number | null => parseKeycode('QK_BOOT')

/** Keycodes vial-qmk checks for QK_BOOT in each kind of entry (vial.c's vial_keycode_firewall). */
const FIREWALLED: Record<EntryKind, string[]> = {
  tapDance: ['onTap', 'onHold', 'onDoubleTap', 'onTapHold'],
  combo: ['output'],
  keyOverride: ['replacementKey'],
  altRepeatKey: ['lastKey', 'altKey'],
}

/** Whether writing this entry needs the keyboard unlocked: it holds the firmware-update key. */
export function entryNeedsUnlock(kind: EntryKind, entry: object, boot: number | null): boolean {
  if (boot === null) return false
  const e = entry as Record<string, unknown>
  return FIREWALLED[kind].some((k) => e[k] === boot)
}

/** How many of the plan's writes need the keyboard unlocked (macros count as one). */
export function unlockNeeded(plan: RestorePlan, boot: number | null = bootKeycode()): number {
  let n = plan.macros ? 1 : 0
  if (boot !== null) n += plan.keys.filter((k) => k.to === boot).length
  for (const kind of ENTRY_KINDS) {
    n += (plan[kind] as EntryChange<object>[]).filter((c) => entryNeedsUnlock(kind, c.entry, boot)).length
  }
  return n
}

export const isEmptyPlan = (plan: RestorePlan): boolean =>
  plan.keys.length === 0 &&
  plan.layoutOptions === null &&
  plan.macros === null &&
  ENTRY_KINDS.every((kind) => plan[kind].length === 0) &&
  plan.settings.length === 0 &&
  plan.lighting === null &&
  plan.wireless === null &&
  plan.debounce === null &&
  plan.snapClick.length === 0 &&
  plan.keyColours === null &&
  plan.zones === null &&
  plan.lockLights === null &&
  plan.layerNames === null &&
  plan.macroNames === null

export interface PlanLine {
  part: RestorePart
  text: string
  /** Some of it can only be written while the keyboard is unlocked. */
  needsUnlock: boolean
}

/** "Windows, Windows Fn and Fn2" */
function listNames(names: string[]): string {
  return names.length <= 1 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`
}

/** What a plan changes, one line per part, in plain words. `layerNames` name the layers. */
export function describePlan(plan: RestorePlan, layerNames: string[], boot: number | null = bootKeycode()): PlanLine[] {
  const lines: PlanLine[] = []
  const layerName = (i: number) => layerNames[i] ?? `Layer ${i}`
  const onLayers = (changes: KeyChange[]) => {
    const layers = [...new Set(changes.map((c) => c.slot.layer))].sort((a, b) => a - b)
    return layers.length > 3 ? `on ${layers.length} layers` : `on ${listNames(layers.map(layerName))}`
  }
  const keys = plan.keys.filter((k) => k.slot.kind === 'key')
  const knob = plan.keys.filter((k) => k.slot.kind === 'knob')
  const bootIn = (changes: KeyChange[]) => boot !== null && changes.some((c) => c.to === boot)
  if (keys.length) lines.push({ part: 'keys', text: `${countOf('keys', keys.length)} ${onLayers(keys)}`, needsUnlock: bootIn(keys) })
  if (knob.length) lines.push({ part: 'knob', text: `${countOf('knob', knob.length)} ${onLayers(knob)}`, needsUnlock: bootIn(knob) })
  if (plan.layoutOptions !== null) {
    const text = plan.layoutChanges.length > 0 ? `Layout: ${plan.layoutChanges.join(', ')}` : 'Layout options'
    lines.push({ part: 'layoutOptions', text, needsUnlock: false })
  }
  if (plan.macros) lines.push({ part: 'macros', text: 'Macros (all of them are replaced)', needsUnlock: true })
  for (const kind of ENTRY_KINDS) {
    const changes = plan[kind] as EntryChange<object>[]
    if (changes.length === 0) continue
    lines.push({
      part: kind,
      text: countOf(kind, changes.length),
      needsUnlock: changes.some((c) => entryNeedsUnlock(kind, c.entry, boot)),
    })
  }
  if (plan.settings.length) lines.push({ part: 'settings', text: countOf('settings', plan.settings.length), needsUnlock: false })
  if (plan.lighting) lines.push({ part: 'lighting', text: 'Lighting: effect, speed, colour and brightness', needsUnlock: false })
  if (plan.wireless) {
    lines.push({
      part: 'wireless',
      text: `Wireless timers: lights off after ${formatDuration(plan.wireless.backlitTime)}, sleep after ${formatDuration(plan.wireless.idleTime)}`,
      needsUnlock: false,
    })
  }
  if (plan.debounce) lines.push({ part: 'debounce', text: `Key bounce filter: ${plan.debounce.time} ms (debounce)`, needsUnlock: false })
  if (plan.snapClick.length) lines.push({ part: 'snapClick', text: countOf('snapClick', plan.snapClick.length), needsUnlock: false })
  if (plan.keyColours) {
    const what = [plan.keyColours.colours && 'colours', plan.keyColours.style !== null && 'how they light up'].filter(Boolean)
    lines.push({ part: 'keyColours', text: `Key by key lighting: ${what.join(' and ')} (per-key RGB)`, needsUnlock: false })
  }
  if (plan.zones) {
    const what = [plan.zones.regions && 'which keys are in each zone', plan.zones.effects.length > 0 && 'the zones’ effects'].filter(Boolean)
    lines.push({ part: 'zones', text: `Mixed zones: ${what.join(' and ')} (mixed RGB)`, needsUnlock: false })
  }
  if (plan.lockLights) lines.push({ part: 'lockLights', text: 'Lock lights: colour and which light up (indicators)', needsUnlock: false })
  if (plan.layerNames) lines.push({ part: 'layerNames', text: 'Layer names (kept in this browser)', needsUnlock: false })
  if (plan.macroNames) lines.push({ part: 'macroNames', text: 'Macro names (kept in this browser)', needsUnlock: false })
  return lines
}
