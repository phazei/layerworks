// SPDX-License-Identifier: GPL-3.0-or-later
// Everything read from the connected keyboard, in one framework-free store. React reads it through
// ./useDevice; plugins get it through their device context.

import * as protocol from '../vendor/pipette/tauri-shim/protocol'
import {
  reloadKeychron,
  saveKeychronSnapClick,
  setKeychronDebounce,
  setKeychronSnapClick,
  setKeychronWirelessLpm,
} from '../vendor/pipette/tauri-shim/keychron-protocol'
import { setTransport } from '../vendor/pipette/tauri-shim/transport'
import { runProbeSequence, type ProbeDecompress } from '../vendor/pipette/shared/hid/probe-sequence'
import { parseDefinitionLayout } from '../vendor/pipette/shared/kle/definition-layout'
import { recreateKeyboardKeycodes } from '../vendor/pipette/shared/keycodes/keycodes'
import {
  VIAL_PROTOCOL_DYNAMIC,
  VIAL_PROTOCOL_KEY_OVERRIDE,
  VIAL_PROTOCOL_QMK_SETTINGS,
} from '../vendor/pipette/shared/constants/protocol'
import type { KeyboardLayout } from '../vendor/pipette/shared/kle/types'
import type { KeychronState } from '../vendor/pipette/shared/types/keychron'
import type {
  AltRepeatKeyEntry,
  ComboEntry,
  DynamicEntryCounts,
  KeyboardDefinition,
  KeyOverrideEntry,
  TapDanceEntry,
  UnlockStatus,
} from '../vendor/pipette/shared/types/protocol'
import { buildCapabilities, type Capabilities, type LightingInfo } from './capabilities'
import type { HidLink, LinkKind } from './link'
import { FACTORY_RESET_PUSH, LAYER_PUSH, parseLayerReport, type LayerState } from './pushes'
import { pollMatrix, type MatrixPoller } from './matrix'
import { createTransport, TransportError, type Transport } from './transport'
import { parseUnlockStatus, runUnlock, statusRequest, UnlockStopped, type UnlockProgress } from './unlock'
import {
  bootKeycode,
  countOf,
  ENTRY_KINDS,
  entryNeedsUnlock,
  type EntryChange,
  type RestorePart,
  type RestorePlan,
} from './restore'
import { timersProblem, type WirelessTimers } from './wireless'
import { encodeMacro, rawMacros, replaceMacro, stepProblem, type MacroStep } from './macros'
import { entryProblem, sameEntry, type AnyEntry, type EntryOf } from './entries'
import type { EntryKind } from './restore'
import { decodeSetting, largestValue, settingWidth, withSettingValue } from './settings'
import { debounceMax, snapClickProblem, type Debounce, type SnapClickEntry } from './keychron-typing'
import {
  accepted,
  colourPackets,
  effectPackets,
  lockLightsPacket,
  normaliseLockLights,
  PER_KEY_STYLE_COUNT,
  regionPackets,
  savePacket,
  stylePacket,
  ZONES_EFFECT,
  type Hsv,
  type LockLights,
  type ZoneEffect,
} from './keychron-rgb'

export interface LinkInfo {
  kind: LinkKind
  productName: string
  vendorId: number
  productId: number
}

/** Read first; the keyboard picture can be drawn from this alone. */
export interface KeyboardData {
  uid: string
  name: string
  viaProtocol: number
  vialProtocol: number
  definition: KeyboardDefinition
  layout: KeyboardLayout | null
  layers: number
  rows: number
  cols: number
  /** "layer,row,col" → keycode */
  keymap: Record<string, number>
  /** "layer,knob,direction" → keycode; direction 0 is counter-clockwise (left), 1 clockwise (right) */
  knobs: Record<string, number>
  knobCount: number
  layoutOptions: number
  counts: DynamicEntryCounts
  macroCount: number
  macroBytes: number
}

export interface Entries {
  tapDance: TapDanceEntry[]
  combo: ComboEntry[]
  keyOverride: KeyOverrideEntry[]
  altRepeatKey: AltRepeatKeyEntry[]
}

export interface Lighting extends LightingInfo {
  mode: number
  speed: number
  hue: number
  sat: number
  val: number
}

/** The parts read in the background after the keyboard picture is up, in this order. */
export const LOAD_PARTS = ['macros', 'entries', 'settings', 'lighting', 'unlock', 'keychron'] as const
export type LoadPart = (typeof LOAD_PARTS)[number]

export interface DeviceState {
  status: 'disconnected' | 'connecting' | 'ready' | 'error'
  /** Why status is 'error'. */
  error: string | null
  link: LinkInfo | null
  keyboard: KeyboardData | null
  capabilities: Capabilities | null
  /** null when the firmware doesn't report its layer. */
  layer: LayerState | null
  /** Parts not read yet; empty once loading has finished. */
  loading: readonly LoadPart[]
  /** Parts that could not be read. */
  failed: readonly LoadPart[]
  /** The macro buffer, as stored on the keyboard. */
  macros: number[] | null
  entries: Entries | null
  /** QMK setting ID → raw value bytes */
  settings: Record<number, number[]> | null
  lighting: Lighting | null
  unlock: UnlockStatus | null
  /** The unlock under way (`unlock()`): the keyboard's own count. null when none is running. */
  unlocking: UnlockProgress | null
  /** null while loading, and for firmware without Keychron commands. */
  keychron: KeychronState | null
  /** Changes on their way to the keyboard. 0 means everything shown is saved on it. */
  writing: number
  /**
   * Lighting shown on the keyboard but not saved on it yet (saved after a short pause, `flushSaves` saves it now).
   * Lost if the keyboard restarts before then.
   */
  savePending: boolean
  /** A restore is being written. */
  restoring: boolean
  /** Why the last change could not be written, in plain words; cleared by the next one that succeeds. */
  writeError: string | null
  canUndo: boolean
  canRedo: boolean
  /**
   * Set when the keyboard went away by itself (unplugged, receiver pulled), not through `disconnect()`, until the
   * next connect. `duringWrite`: a change was on its way at the time.
   */
  lost: { duringWrite: boolean } | null
}

/** One place a keycode can be assigned: a key, or one direction of a knob (0 is counter-clockwise). */
export type Slot =
  | { kind: 'key'; layer: number; row: number; col: number }
  | { kind: 'knob'; layer: number; knob: number; direction: 0 | 1 }

/** One step of undo: a single assignment, every key and knob change of a restore, or a saved macro. */
interface Edit {
  changes: { slot: Slot; from: number; to: number }[]
  /** The macro buffer before and after a macro was saved. */
  macros?: { from: number[]; to: number[] }
  /** A saved tap dance, combo, key override or alt repeat entry, before and after. */
  entry?: { kind: EntryKind; index: number; from: AnyEntry; to: AnyEntry }
  /** A typing setting (QMK setting, debounce, a Snap Click pair), before and after. */
  value?: ValueEdit
}

/** One setting's change, with how to write either value back. */
interface ValueEdit {
  /** Which setting: changes to the same one in quick succession (a slider drag) merge into one step. */
  key: string
  /** When it last changed (ms), for merging. */
  at: number
  from: unknown
  to: unknown
  write: (value: unknown) => Promise<boolean>
}

/** Changes to one setting less than this apart are one undo step: a dragged slider is undone in one go. */
const MERGE_MS = 1000

/** How saving a tap dance, combo, key override or alt repeat entry went. */
export type EntrySaveResult =
  | 'saved'
  | 'unchanged'
  /** Not attempted: it holds the firmware-update key, which the keyboard only takes while unlocked. */
  | 'locked'
  /** Not attempted: `entryProblem` says why, or the slot doesn't exist or hasn't been read. */
  | 'invalid'
  | 'failed'

/** Said when undo or redo would write an entry holding QK_BOOT while the keyboard is locked. */
export const ENTRY_UNDO_LOCKED = 'Undoing this change needs the keyboard unlocked (it holds the firmware-update key).'

/** How saving a macro went. */
export type MacroSaveResult =
  | 'saved'
  /** The keyboard already holds it. */
  | 'unchanged'
  /** Not attempted: macro writes need the keyboard unlocked. */
  | 'locked'
  /** Not attempted: it doesn't fit in the space the macros share. */
  | 'too-big'
  /** Not attempted: a step can't be saved as it is (`stepProblem`), or the macros haven't been read. */
  | 'invalid'
  /** Tried, and the write failed (`writeError` says why). */
  | 'failed'

/** Said when undo or redo would write the macro buffer while the keyboard is locked. */
export const MACRO_UNDO_LOCKED = 'Undoing a macro change needs the keyboard unlocked. Unlock it, then undo again.'

export interface RestoreProgress {
  done: number
  total: number
}

/** What a restore did. Every write is tried in turn; one that fails doesn't stop the rest. */
export interface RestoreReport {
  /** Writes that reached the keyboard, per part. */
  written: Partial<Record<RestorePart, number>>
  /** `error` in plain words; `detail` the technical message, for a Details disclosure. */
  failed: { part: RestorePart; what: string; error: string; detail: string }[]
  /** Writes not attempted because the keyboard is locked. */
  skipped: { part: RestorePart; what: string }[]
  /** It stopped part-way: everything after `written` was not written. */
  stopped: boolean
  /** Why it stopped: the keyboard went away, or stopped answering (asleep, switched off, out of range). */
  stoppedBecause: 'disconnected' | 'not-answering' | null
  /** How many of the plan's writes were tried before it stopped, and how many there were. */
  done: number
  total: number
  /** The key and knob changes can be taken back with one undo. */
  undoable: boolean
}

const UNDO_LIMIT = 100

export function slotKeycode(keyboard: KeyboardData, slot: Slot): number {
  return slot.kind === 'key'
    ? (keyboard.keymap[`${slot.layer},${slot.row},${slot.col}`] ?? 0)
    : (keyboard.knobs[`${slot.layer},${slot.knob},${slot.direction}`] ?? 0)
}

function withKeycode(keyboard: KeyboardData, slot: Slot, keycode: number): KeyboardData {
  return slot.kind === 'key'
    ? { ...keyboard, keymap: { ...keyboard.keymap, [`${slot.layer},${slot.row},${slot.col}`]: keycode } }
    : { ...keyboard, knobs: { ...keyboard.knobs, [`${slot.layer},${slot.knob},${slot.direction}`]: keycode } }
}

/** The lighting values that can be changed together. */
export type LightingChange = Partial<Pick<Lighting, 'mode' | 'speed' | 'hue' | 'sat' | 'val'>>

const DISCONNECTED: DeviceState = {
  status: 'disconnected',
  error: null,
  link: null,
  keyboard: null,
  capabilities: null,
  layer: null,
  loading: [],
  failed: [],
  macros: null,
  entries: null,
  settings: null,
  lighting: null,
  unlock: null,
  unlocking: null,
  keychron: null,
  writing: 0,
  savePending: false,
  restoring: false,
  writeError: null,
  canUndo: false,
  canRedo: false,
  lost: null,
}

/** Lighting changes reach the keyboard at once but only survive a restart once saved; save after this pause. */
const LIGHTING_SAVE_DELAY_MS = 1500

const NOT_CONNECTED = 'The keyboard is not connected'

/** Said when a change gets no reply: what probably happened, and what to do. */
export const NOT_ANSWERING: Record<LinkKind, string> = {
  receiver:
    'The keyboard didn’t answer. It may be asleep, switched off or out of range: press a key on it to wake it, then try again.',
  cable: 'The keyboard didn’t answer. Check that it is plugged in, then try again.',
}

/** Said when connecting gets no reply. */
export const NOT_ANSWERING_AT_CONNECT: Record<LinkKind, string> = {
  receiver:
    'The keyboard didn’t answer through the receiver. Set its switch to 2.4 GHz and press a key to wake it, then connect again.',
  cable: 'The keyboard didn’t answer. Unplug it, plug it back in, then connect again.',
}

/** Said when the keyboard sends requests back unchanged: an unlock started elsewhere is counting. */
export const OTHER_APP_UNLOCKING =
  'Another app or tab has started unlocking this keyboard, so it isn’t taking changes. Finish the unlock there ' +
  '(hold the keys it names), or unplug the keyboard and plug it back in (through the receiver: move its connection ' +
  'switch away and back).'

/** Said when the unlock this app stopped waiting for may still be counting on the keyboard. */
export const UNLOCK_LEFT_COUNTING =
  'The keyboard may still be waiting to be unlocked, and then it neither types nor takes changes. Unplug it and plug ' +
  'it back in (through the receiver: move its connection switch away and back), then connect again.'

/** Added when a failed change couldn't be checked by reading it back. */
const UNCHECKED = 'The app couldn’t check what the keyboard holds now; reconnect it to be sure.'

/** Said when a macro save stopped part-way. */
export const MACRO_INTERRUPTED =
  'The macro was only partly saved, so the keyboard won’t run any macro until they are saved again. Save it again, ' +
  'or restore a backup. The page shows what the keyboard holds now.'

/** Said when the firmware-update key would go on a key or knob turn while the keyboard is locked. */
export const KEY_BOOT_LOCKED = 'The firmware update key only goes on a key while the keyboard is unlocked.'

/** Answers in a row without a reply after which a long job (a restore) stops: the keyboard has gone quiet. */
const QUIET_AFTER = 3
/** Restore writes in a row that got no reply after which it stops (each has also tried to read back). */
const QUIET_STEPS = 2
/** How long an "is the keyboard free?" check counts before it is asked again. */
const FREE_CHECK_MS = 2000

/** VIA's macro buffer write: [0x0F, offset (big-endian), size, up to 28 bytes]. */
const VIA_MACRO_SET_BUFFER = 0x0f
const MACRO_CHUNK = 28
/** What the macro memory's last byte holds while it is being written (anything but 0: see sendMacroBuffer). */
const MACRO_WRITING = 0xff
/** VIA's single keycode read: [0x04, layer, row, col] → keycode in bytes 4-5. */
const VIA_GET_KEYCODE = 0x04

/**
 * The macro memory was left half-written (its last byte isn't 0): vial-qmk plays no macro until it is written
 * again in full (dynamic_keymap.c, dynamic_keymap_macro_send).
 */
export const macrosHalted = (buffer: readonly number[] | null): boolean =>
  !!buffer && buffer.length > 0 && buffer[buffer.length - 1] !== 0
/** VIA's keymap read in pieces of this many bytes, as the first read does. */
const KEYMAP_CHUNK = 28
/** via.h: id_dynamic_keymap_reset, id_dynamic_keymap_macro_reset, id_bootloader_jump. */
const VIA_KEYMAP_RESET = 0x06
const VIA_MACRO_RESET = 0x10
const VIA_BOOTLOADER_JUMP = 0x0b
/** A reset rewrites the whole keymap (or macro memory) in EEPROM before the keyboard answers. */
const RESET_REQUEST = { timeoutMs: 5000, attempts: 2 }

/** One write: what to send, and what to change in the state once it reached the keyboard. */
interface WriteJob {
  send: () => Promise<void>
  applied: () => Partial<DeviceState>
}

const NO_ENTRIES: DynamicEntryCounts = { tapDance: 0, combo: 0, keyOverride: 0, altRepeatKey: 0, featureFlags: 0 }
const KC_GET_LAYER = 0xa3
const UNHANDLED = 0xff

export interface DeviceStore {
  getState(): DeviceState
  subscribe(listener: () => void): () => void
  /** Takes over an open link and loads the keyboard. Resolves when the keyboard picture can be drawn. */
  connect(link: HidLink): Promise<void>
  disconnect(): Promise<void>
  /** Assigns a keycode to a key or knob direction on the keyboard. Can be undone. */
  assign(slot: Slot, keycode: number): Promise<void>
  undo(): Promise<void>
  redo(): Promise<void>
  /** Changes the lighting effect or its values. Shown on the keyboard at once, saved to it after a short pause. */
  setLighting(change: LightingChange): Promise<void>
  /**
   * Reads the lighting effect and its values again (one request), for when the keyboard may have changed them
   * itself: its lighting keys change them without telling anyone.
   */
  refreshLighting(): Promise<void>
  /**
   * Unlocks the keyboard: the user holds its unlock keys while the keyboard counts down (`unlocking`). Holds every
   * other request until it ends; it can't be cancelled. Resolves 'unlocked', 'disconnected' when the keyboard went
   * away first, or 'failed' when it couldn't start (then the keyboard was never blocked). One at a time: a second
   * call joins the first.
   */
  unlock(): Promise<UnlockResult>
  /**
   * Stops waiting for the unlock under way: the app stops polling and resolves it 'stopped'. The keyboard itself
   * can't be told to stop: if it was counting, it goes on ignoring keys and commands until it restarts.
   */
  stopUnlock(): void
  /** Locks the keyboard again. */
  lock(): Promise<void>
  /** Saves now the lighting waiting for its pause (before the page closes). */
  flushSaves(): Promise<void>
  /**
   * Saves macro `index` as `steps`, rewriting the parts of the shared macro buffer that change; every other macro
   * stays byte for byte. Needs the keyboard unlocked: while locked it resolves 'locked' without sending anything.
   * A saved macro is one undo step (undo needs the keyboard unlocked too).
   */
  saveMacro(index: number, steps: MacroStep[]): Promise<MacroSaveResult>
  /**
   * Saves one tap dance, combo, key override or alt repeat entry; the others stay as they are. An entry holding
   * QK_BOOT in a place vial-qmk checks needs the keyboard unlocked: locked, it resolves 'locked' and sends
   * nothing. One undo step.
   */
  saveEntry<K extends EntryKind>(kind: K, index: number, entry: EntryOf<K>): Promise<EntrySaveResult>
  /**
   * Writes a restore plan (./restore) to the keyboard, part by part, as one change in the queue. Writes that need
   * the keyboard unlocked are skipped while it is locked. Key and knob changes become one undo step. Layer names
   * are the caller's: they live in the browser.
   */
  restore(plan: RestorePlan, onProgress?: (progress: RestoreProgress) => void): Promise<RestoreReport>
  /** Sets Keychron's wireless timers (lights off, sleep). The keyboard saves them itself. */
  setWirelessTimers(timers: WirelessTimers): Promise<void>
  /**
   * Sets one QMK setting to `value` (decoded: a number, or the setting's bits together). The keyboard saves it
   * itself; no unlocking needed. One undo step; quick changes to the same setting (a slider drag) merge into one.
   * Resolves false when it wasn't written: unknown or unreported setting, or the write failed (`writeError`).
   */
  setSetting(qsid: number, value: number): Promise<boolean>
  /**
   * Puts every QMK setting back to the firmware's defaults (Vial's reset command), then reads them again. Includes
   * the swapped and disabled keys and N-key rollover. Not undoable.
   */
  resetSettings(): Promise<boolean>
  /** Sets Keychron's key bounce filter. The keyboard saves it itself. One undo step, merged like `setSetting`. */
  setDebounce(debounce: Debounce): Promise<boolean>
  /** Sets one Snap Click pair (type 0 empties the slot) and saves the table on the keyboard. One undo step. */
  setSnapClick(index: number, entry: SnapClickEntry): Promise<boolean>
  /**
   * Keychron per-key colours ("Key by key"): the whole table, one colour per LED index. Only the keys that change
   * are sent, nine to a packet; the keyboard shows them at once and they are saved on it after a short pause.
   * Changes with the same `undoKey` (one paint stroke) in quick succession are one undo step.
   */
  setKeyColours(colours: Hsv[], undoKey?: string): Promise<boolean>
  /** How the per-key colours light up (Keychron's per-key style, 0 – 4). One undo step. */
  setKeyStyle(style: number): Promise<boolean>
  /** Keychron mixed lighting ("Mixed zones"): the zone of every LED. Like `setKeyColours`. */
  setZones(regions: number[], undoKey?: string): Promise<boolean>
  /** Every effect slot of one zone, in the keyboard's own effect numbering (./keychron-rgb). One undo step. */
  setZoneEffects(zone: number, effects: ZoneEffect[]): Promise<boolean>
  /**
   * Keychron's lock lights: their one colour and which are off (./keychron-rgb, LockLights). Shown at once, saved on
   * the keyboard after a pause. One undo step; quick changes (a dragged slider) merge into one.
   */
  setLockLights(change: Partial<LockLights>): Promise<boolean>
  /**
   * Puts the keyboard's keys back to its firmware's own keymap (VIA's keymap reset): every layer's keys and the
   * knob, the QMK settings, and every tap dance, combo, key override and alt repeat entry. With `macros`, the macros
   * are emptied too (VIA's macro reset). Neither needs unlocking; lighting, Keychron settings and layout options
   * stay. Then reads all of that again, and forgets the undo history, which can't bring it back.
   */
  resetKeymap(options?: { macros?: boolean }): Promise<boolean>
  /**
   * Restarts the keyboard into firmware update mode (Vial's bootloader jump). Only on the cable and only while
   * unlocked. Once the keyboard has answered, the store lets go of it: it is leaving USB as a keyboard.
   */
  restartToBootloader(): Promise<BootloaderResult>
  /**
   * Reads every key straight from the keyboard while it is unlocked; `listener` gets the keys down ("row,col")
   * whenever they change. Polling runs while anyone watches and the keyboard is unlocked, and stops when the last
   * watcher leaves, the keyboard locks or goes away. Returns the stop function.
   */
  watchMatrix(listener: (down: ReadonlySet<string>) => void): () => void
  /** The request queue of the connected keyboard, for plugins and raw commands; null when disconnected. */
  readonly transport: Transport | null
}

export type UnlockResult = 'unlocked' | 'disconnected' | 'failed' | 'stopped'

/** How `restartToBootloader` went. */
export type BootloaderResult =
  /** The keyboard took it and is restarting; the store has let go of it. */
  | 'restarting'
  /** Not sent: the keyboard ignores it until unlocked (via.c). */
  | 'locked'
  /** Not sent: through the 2.4 GHz receiver. Firmware goes on over the cable. */
  | 'cable-only'
  /** The firmware doesn't have the command (a Vial build with VIAL_INSECURE, or not Vial). */
  | 'unsupported'
  | 'failed'

/** Said when a keyboard is found in the middle of an unlock some other page or app started and left. */
export const STILL_UNLOCKING =
  'The keyboard is still waiting to be unlocked (an app or page started it and closed before it finished), and ' +
  'won’t answer until then. Unplug it and plug it back in, or move its connection switch away and back, then ' +
  'connect again.'

export interface DeviceStoreOptions {
  /** Turns the keyboard's compressed definition into JSON text. */
  decompress: ProbeDecompress
}

export function createDeviceStore({ decompress }: DeviceStoreOptions): DeviceStore {
  let state = DISCONNECTED
  type Session = { transport: Transport; link: HidLink }
  let session: Session | null = null
  const listeners = new Set<() => void>()

  function set(patch: Partial<DeviceState>): void {
    state = { ...state, ...patch }
    syncMatrix()
    for (const listener of [...listeners]) listener()
  }

  // Matrix reading: one poller for all watchers, running only while it can get an answer.
  const matrixWatchers = new Set<(down: ReadonlySet<string>) => void>()
  let matrix: { poller: MatrixPoller; session: Session } | null = null

  function syncMatrix(): void {
    const kb = state.keyboard
    const wanted = matrixWatchers.size > 0 && session !== null && kb !== null && state.unlock?.unlocked === true
    if (matrix && (!wanted || matrix.session !== session)) {
      matrix.poller.stop()
      matrix = null
      for (const watcher of [...matrixWatchers]) watcher(new Set())
    }
    if (wanted && !matrix && session && kb) {
      matrix = {
        session,
        poller: pollMatrix(session.transport, kb, (down) => {
          for (const watcher of [...matrixWatchers]) watcher(down)
        }),
      }
    }
  }

  function capabilities(): Capabilities | null {
    const kb = state.keyboard
    if (!kb) return null
    return buildCapabilities({
      viaProtocol: kb.viaProtocol,
      vialProtocol: kb.vialProtocol,
      layers: kb.layers,
      knobs: kb.knobCount,
      counts: kb.counts,
      macroCount: kb.macroCount,
      macroBytes: kb.macroBytes,
      qmkSettings: state.settings ? new Set(Object.keys(state.settings).map(Number)) : null,
      lighting: state.lighting,
      keychron: state.keychron,
      keychronPending: state.loading.includes('keychron'),
      unlocked: state.unlock ? state.unlock.unlocked : null,
    })
  }

  async function readKeyboard(transport: Transport): Promise<{ keyboard: KeyboardData; layer: LayerState | null }> {
    // A keyboard in the middle of an unlock answers almost nothing truthfully; reading it would give nonsense.
    if (parseUnlockStatus(await transport.request(statusRequest()))?.inProgress) throw new Error(STILL_UNLOCKING)
    const probe = await runProbeSequence(async (data) => Array.from(await transport.request(data)), decompress)
    const viaProtocol = await protocol.getProtocolVersion()
    const counts = probe.vialProtocol >= VIAL_PROTOCOL_DYNAMIC ? await protocol.getDynamicEntryCount() : NO_ENTRIES
    const macroCount = await protocol.getMacroCount()
    const macroBytes = await protocol.getMacroBufferSize()

    // The vendored keycode tables are global: they must know this keyboard before any keycode is named.
    const supportedFeatures = new Set<string>()
    if (counts.featureFlags & 0x01) supportedFeatures.add('caps_word')
    if (counts.featureFlags & 0x02) supportedFeatures.add('layer_lock')
    if (probe.vialProtocol >= VIAL_PROTOCOL_KEY_OVERRIDE) supportedFeatures.add('persistent_default_layer')
    if (counts.altRepeatKey > 0) supportedFeatures.add('repeat_key')
    recreateKeyboardKeycodes({
      vialProtocol: probe.vialProtocol,
      layers: probe.layers,
      macroCount,
      tapDanceCount: counts.tapDance,
      customKeycodes: probe.definition.customKeycodes ?? null,
      midi: probe.definition.vial?.midi ?? '',
      supportedFeatures,
    })

    const layerReply = await transport.request([KC_GET_LAYER])
    return {
      keyboard: {
        uid: probe.uid,
        name: probe.name,
        viaProtocol,
        vialProtocol: probe.vialProtocol,
        definition: probe.definition,
        layout: parseDefinitionLayout(probe.definition).layout,
        layers: probe.layers,
        rows: probe.rows,
        cols: probe.cols,
        keymap: probe.keymap,
        knobs: probe.encoderLayout,
        knobCount: probe.encoderCount,
        layoutOptions: probe.layoutOptions,
        counts,
        macroCount,
        macroBytes,
      },
      layer: layerReply[0] === UNHANDLED ? null : parseLayerReport(layerReply),
    }
  }

  const readers: Record<LoadPart, (kb: KeyboardData) => Promise<Partial<DeviceState>>> = {
    async macros(kb) {
      return { macros: kb.macroBytes > 0 ? await protocol.getMacroBuffer(kb.macroBytes) : [] }
    },

    async entries(kb) {
      const entries: Entries = { tapDance: [], combo: [], keyOverride: [], altRepeatKey: [] }
      const { counts } = kb
      for (let i = 0; i < counts.tapDance; i++) entries.tapDance.push(await protocol.getTapDance(i))
      for (let i = 0; i < counts.combo; i++) entries.combo.push(await protocol.getCombo(i))
      for (let i = 0; i < counts.keyOverride; i++) entries.keyOverride.push(await protocol.getKeyOverride(i))
      for (let i = 0; i < counts.altRepeatKey; i++) entries.altRepeatKey.push(await protocol.getAltRepeatKey(i))
      return { entries }
    },

    async settings(kb) {
      const settings: Record<number, number[]> = {}
      if (kb.vialProtocol < VIAL_PROTOCOL_QMK_SETTINGS) return { settings }
      // The keyboard lists its setting IDs a page at a time, each page starting after the highest ID so far.
      const ids = new Set<number>()
      for (let highest = 0; highest !== 0xffff; ) {
        const page = await protocol.qmkSettingsQuery(highest)
        const before = highest
        for (let i = 0; i + 1 < page.length; i += 2) {
          const id = page[i] | (page[i + 1] << 8)
          highest = Math.max(highest, id)
          if (id !== 0xffff) ids.add(id)
        }
        if (highest === before) break
      }
      for (const id of ids) settings[id] = await protocol.qmkSettingsGet(id)
      return { settings }
    },

    async lighting(kb) {
      const kind = kb.definition.lighting ?? 'none'
      const none: Lighting = { kind, effects: new Set(), maxBrightness: 0, mode: 0, speed: 0, hue: 0, sat: 0, val: 0 }
      if (kind !== 'vialrgb') return { lighting: none }
      const info = await protocol.getVialRGBInfo()
      if (info.version !== 1) return { lighting: none }
      const effects = await protocol.getVialRGBSupported()
      const mode = await protocol.getVialRGBMode()
      return { lighting: { kind, effects, maxBrightness: info.maxBrightness, ...mode } }
    },

    async unlock() {
      return { unlock: await protocol.getUnlockStatus() }
    },

    async keychron() {
      return { keychron: await reloadKeychron() }
    },
  }

  async function readRest(current: typeof session, keyboard: KeyboardData, parts: readonly LoadPart[] = LOAD_PARTS): Promise<void> {
    for (const part of parts) {
      let patch: Partial<DeviceState>
      try {
        patch = await readers[part](keyboard)
      } catch (error) {
        if (session !== current) return
        if (error instanceof TransportError && error.reason === 'disconnected') return
        console.warn(`[device] could not read ${part}:`, error)
        patch = { failed: [...state.failed, part] }
      }
      if (session !== current) return
      set({ ...patch, loading: state.loading.filter((p) => p !== part) })
      set({ capabilities: capabilities() })
    }
  }

  let undoStack: Edit[] = []
  let redoStack: Edit[] = []
  let lightingSaveTimer: ReturnType<typeof setTimeout> | null = null
  let keyLightingSaveTimer: ReturnType<typeof setTimeout> | null = null
  /** When the keyboard last said no unlock was counting (checkFree). */
  let freeCheckedAt = 0
  /** This app stopped waiting for an unlock that may still be counting on the keyboard. */
  let unlockLeftCounting = false
  /** The technical message of the last failed write, for a restore report's details. */
  let lastFailureDetail = ''
  /** The last failed write got no reply at all. */
  let lastFailureTimedOut = false

  let changes: Promise<unknown> = Promise.resolve()

  /**
   * Changes run one at a time, so each starts from the result of the one before, however fast they are asked for.
   * A change belongs to the keyboard connected when it was asked for: if that keyboard has gone (or has been read
   * afresh) by the time its turn comes, the change is dropped and resolves with `dropped`.
   */
  function inOrder<T>(change: () => Promise<T>, dropped: T): Promise<T> {
    const asked = session
    const run = () => (asked !== null && session === asked ? change() : Promise.resolve(dropped))
    const done = changes.then(run, run)
    changes = done.catch(() => undefined)
    return done
  }

  function forget(): void {
    undoStack = []
    redoStack = []
    if (lightingSaveTimer) clearTimeout(lightingSaveTimer)
    lightingSaveTimer = null
    if (keyLightingSaveTimer) clearTimeout(keyLightingSaveTimer)
    keyLightingSaveTimer = null
    freeCheckedAt = 0
    unlockLeftCounting = false
  }

  /** What went wrong, in plain words for the page. The technical message goes to the console. */
  function plainError(error: unknown, current: Session): string {
    const raw = error instanceof Error ? error.message : String(error)
    lastFailureDetail = raw
    lastFailureTimedOut = error instanceof TransportError && error.reason === 'timeout'
    if (error instanceof TransportError) {
      if (error.reason === 'timeout') {
        console.warn('[device] no reply:', raw)
        return NOT_ANSWERING[current.link.kind]
      }
      if (error.reason === 'busy') return unlockLeftCounting ? UNLOCK_LEFT_COUNTING : OTHER_APP_UNLOCKING
      if (error.reason === 'disconnected') return NOT_CONNECTED
    }
    return raw
  }

  /**
   * Before a change: is an unlock counting on the keyboard (started by another app or tab, or one this app stopped
   * waiting for)? Then the keyboard sends every request back unchanged, which looks like success (via.c). Asked at
   * most every FREE_CHECK_MS; the unlock status is one of the few requests it answers while counting.
   */
  async function checkFree(current: Session): Promise<void> {
    if (Date.now() - freeCheckedAt < FREE_CHECK_MS) return
    const status = parseUnlockStatus(await current.transport.request(statusRequest()))
    if (status?.inProgress) throw new TransportError('busy', 'An unlock is counting on the keyboard')
    freeCheckedAt = Date.now()
  }

  /** What reading back a failed write found: whether the keyboard took it after all, and what to show. */
  interface Check {
    took: boolean
    patch?: Partial<DeviceState>
    /** Said instead of the write's own error when it didn't take. */
    message?: string
  }

  /** Runs one write, keeping `writing` and `writeError` in step. Resolves with whether it reached the keyboard. */
  async function write(
    send: () => Promise<void>,
    applied: () => Partial<DeviceState>,
    verify?: () => Promise<Check>,
  ): Promise<boolean> {
    return (await writeOrError(send, applied, verify)) === null
  }

  /**
   * `write`, resolving with why it failed (in plain words), or null when it reached the keyboard. A write that fails
   * without a reply may still have been carried out (the reply was lost, or came late); `verify` then reads back what
   * it touched, so the page shows what the keyboard holds, and a write it finds done counts as done.
   */
  async function writeOrError(
    send: () => Promise<void>,
    applied: () => Partial<DeviceState>,
    verify?: () => Promise<Check>,
  ): Promise<string | null> {
    const current = session
    if (!current) return NOT_CONNECTED
    set({ writing: state.writing + 1 })
    try {
      await checkFree(current)
      await send()
      if (session !== current) return NOT_CONNECTED
      set({ ...applied(), writing: state.writing - 1, writeError: null })
      return null
    } catch (error) {
      if (session !== current) return NOT_CONNECTED
      let message = plainError(error, current)
      const detail = lastFailureDetail
      // Busy: whatever comes back is an echo, not the keyboard's state. Disconnected: nothing to ask.
      const askable = !(error instanceof TransportError && (error.reason === 'busy' || error.reason === 'disconnected'))
      let patch: Partial<DeviceState> = {}
      if (verify && askable) {
        if (current.transport.stats.unanswered >= QUIET_AFTER) message = `${message} ${UNCHECKED}`
        else {
          try {
            const check = await verify()
            if (session !== current) return NOT_CONNECTED
            if (check.took) {
              set({ ...applied(), ...check.patch, writing: state.writing - 1, writeError: null })
              return null
            }
            patch = check.patch ?? {}
            if (check.message) message = check.message
          } catch (again) {
            if (session !== current) return NOT_CONNECTED
            console.warn('[device] could not read back a failed change:', again)
            message = `${message} ${UNCHECKED}`
          }
        }
      }
      lastFailureDetail = detail
      set({ ...patch, writing: state.writing - 1, writeError: message })
      return message
    }
  }

  /** What a key or knob direction holds now, read from the keyboard (VIA `0x04`, Vial's knob read). */
  async function readSlot(slot: Slot): Promise<number> {
    if (slot.kind === 'knob') return (await protocol.getEncoder(slot.layer, slot.knob))[slot.direction]
    const reply = await session!.transport.request([VIA_GET_KEYCODE, slot.layer, slot.row, slot.col])
    return (reply[4] << 8) | reply[5]
  }

  const slotCheck = (slot: Slot, keycode: number) => async (): Promise<Check> => {
    const now = await readSlot(slot)
    return { took: now === keycode, patch: state.keyboard ? { keyboard: withKeycode(state.keyboard, slot, now) } : {} }
  }

  function writeKeycode(slot: Slot, keycode: number): Promise<boolean> {
    return write(
      () =>
        slot.kind === 'key'
          ? protocol.setKeycode(slot.layer, slot.row, slot.col, keycode)
          : protocol.setEncoder(slot.layer, slot.knob, slot.direction, keycode),
      () => (state.keyboard ? { keyboard: withKeycode(state.keyboard, slot, keycode) } : {}),
      slotCheck(slot, keycode),
    )
  }

  const history = () => ({ canUndo: undoStack.length > 0, canRedo: redoStack.length > 0 })

  /**
   * QK_BOOT on a key or knob turn while locked. vial-qmk turns it into nothing in knob and entry writes, but takes it
   * in a single key write (via.c `id_dynamic_keymap_set_keycode` has no firewall); Vial asks first, and so does the
   * store, on every route to a key.
   */
  const bootLocked = (code: number) => !state.unlock?.unlocked && code === bootKeycode()

  async function assign(slot: Slot, keycode: number): Promise<void> {
    if (!state.keyboard) return
    const from = slotKeycode(state.keyboard, slot)
    if (from === keycode) return
    if (bootLocked(keycode)) {
      set({ writeError: KEY_BOOT_LOCKED })
      return
    }
    if (!(await writeKeycode(slot, keycode))) return
    remember({ changes: [{ slot, from, to: keycode }] })
  }

  function remember(edit: Edit): void {
    undoStack = [...undoStack, edit].slice(-UNDO_LIMIT)
    redoStack = []
    set(history())
  }

  async function step(from: 'undo' | 'redo'): Promise<void> {
    const edit = (from === 'undo' ? undoStack : redoStack).at(-1)
    if (!edit) return
    if (edit.changes.some((c) => bootLocked(from === 'undo' ? c.from : c.to))) {
      set({ writeError: KEY_BOOT_LOCKED })
      return
    }
    if (edit.macros) {
      // Locked, the keyboard would ignore the write: say so and keep the step.
      if (!state.unlock?.unlocked) {
        set({ writeError: MACRO_UNDO_LOCKED })
        return
      }
      const [before, after] = from === 'undo' ? [edit.macros.to, edit.macros.from] : [edit.macros.from, edit.macros.to]
      // What the keyboard holds may differ from what the step remembers (a save that stopped part-way); write from that.
      if (!(await writeMacroBuffer(state.macros ?? before, after))) return
    }
    if (edit.entry) {
      const { kind, index } = edit.entry
      const value = from === 'undo' ? edit.entry.from : edit.entry.to
      if (!state.unlock?.unlocked && entryNeedsUnlock(kind, value, bootKeycode())) {
        set({ writeError: ENTRY_UNDO_LOCKED })
        return
      }
      if (!(await writeEntry(kind, index, value))) return
    }
    if (edit.value && !(await edit.value.write(from === 'undo' ? edit.value.from : edit.value.to))) return
    // A group is taken back last change first. If a write fails the step stays, so it can be tried again; the
    // writes that did go through are harmless to repeat.
    const changes = from === 'undo' ? [...edit.changes].reverse() : edit.changes
    for (const change of changes) {
      if (!(await writeKeycode(change.slot, from === 'undo' ? change.from : change.to))) return
    }
    if (from === 'undo') {
      undoStack = undoStack.filter((e) => e !== edit)
      redoStack = [...redoStack, edit]
    } else {
      redoStack = redoStack.filter((e) => e !== edit)
      undoStack = [...undoStack, edit]
    }
    set(history())
  }

  /**
   * Sends the effect and its values so that the keyboard keeps them. vial-qmk's rgb_matrix.c reloads speed and
   * colour from what was last saved on the first frame of a different effect (off counts as one), over what was
   * just sent. So when the effect changes, the values are sent, saved and sent again: wherever that first frame
   * falls, it either reloads the values just saved or comes before the second send, which then stays.
   */
  async function sendLighting(modeBefore: number, next: Required<LightingChange>): Promise<void> {
    const { mode, speed, hue, sat, val } = next
    await protocol.setVialRGBMode(mode, speed, hue, sat, val)
    if (mode === modeBefore) return
    await protocol.saveLighting()
    await protocol.setVialRGBMode(mode, speed, hue, sat, val)
  }

  /** Reads the effect and its values back after a lighting write failed. */
  const lightingCheck = (next: Required<LightingChange>) => async (): Promise<Check> => {
    const values = await protocol.getVialRGBMode()
    const took = (['mode', 'speed', 'hue', 'sat', 'val'] as const).every((k) => values[k] === next[k])
    return { took, patch: state.lighting ? { lighting: { ...state.lighting, ...values } } : {} }
  }

  const pendingSaves = () => lightingSaveTimer !== null || keyLightingSaveTimer !== null

  function saveLightingSoon(): void {
    if (lightingSaveTimer) clearTimeout(lightingSaveTimer)
    lightingSaveTimer = setTimeout(() => {
      lightingSaveTimer = null
      set({ savePending: pendingSaves() })
      void write(() => protocol.saveLighting(), () => ({}))
    }, LIGHTING_SAVE_DELAY_MS)
    set({ savePending: true })
  }

  async function setLighting(change: LightingChange): Promise<void> {
    const now = state.lighting
    if (!now || now.kind !== 'vialrgb') return
    const next = { ...now, ...change }
    const sent = await write(
      () => sendLighting(now.mode, next),
      () => (state.lighting ? { lighting: { ...state.lighting, ...change } } : {}),
      lightingCheck(next),
    )
    if (sent) saveLightingSoon()
  }

  async function refreshLighting(): Promise<void> {
    const current = session
    if (!current || state.lighting?.kind !== 'vialrgb') return
    try {
      const values = await protocol.getVialRGBMode()
      if (session !== current || !state.lighting) return
      // While Keychron's mixed lighting runs, each zone puts its own colour and speed in the running settings every
      // frame (mixed_rgb.c); those aren't the user's. Keep the ones the store has, so another effect gets them.
      const read = values.mode === ZONES_EFFECT ? { mode: values.mode, val: values.val } : values
      set({ lighting: { ...state.lighting, ...read } })
    } catch {
      // A missed refresh leaves the values as they were; the next one or the next change puts them right.
    }
  }

  /** One piece of the macro memory (VIA `0x0F`). */
  function sendMacroBytes(transport: Transport, offset: number, bytes: number[]): Promise<Uint8Array> {
    return transport.request([VIA_MACRO_SET_BUFFER, offset >> 8, offset & 0xff, bytes.length, ...bytes])
  }

  /**
   * Writes the macro memory in VIA's order: its last byte is set first to a value other than 0, then the pieces that
   * differ from `before` go out, then the last byte gets its real value. vial-qmk plays no macro while that byte isn't
   * 0 (dynamic_keymap.c, dynamic_keymap_macro_send), so a write that stops part-way leaves macros that don't run,
   * rather than a mixture of old and new ones that do.
   */
  async function sendMacroBuffer(transport: Transport, before: number[], after: number[]): Promise<void> {
    const last = after.length - 1
    if (last < 0) return
    const target = [...after]
    target[last] = MACRO_WRITING
    const was = [...before]
    await sendMacroBytes(transport, last, [MACRO_WRITING])
    was[last] = MACRO_WRITING
    for (let offset = 0; offset < target.length; offset += MACRO_CHUNK) {
      const chunk = target.slice(offset, offset + MACRO_CHUNK)
      if (chunk.every((b, i) => was[offset + i] === b)) continue
      await sendMacroBytes(transport, offset, chunk)
    }
    await sendMacroBytes(transport, last, [after[last]])
  }

  /** Reads the macro memory back after a macro write failed. */
  const macroCheck = (after: number[]) => async (): Promise<Check> => {
    const now = await protocol.getMacroBuffer(after.length)
    return { took: now.every((b, i) => b === after[i]), patch: { macros: now }, message: MACRO_INTERRUPTED }
  }

  /**
   * Writes the macro memory, only the 28-byte pieces that differ from `before` (what the keyboard holds), then
   * shows it. Locked, the keyboard would ignore it: callers check first.
   */
  function writeMacroBuffer(before: number[], after: number[]): Promise<boolean> {
    return write(
      async () => {
        const transport = session?.transport
        if (!transport) throw new Error(NOT_CONNECTED)
        await sendMacroBuffer(transport, before, after)
      },
      () => ({ macros: [...after] }),
      macroCheck(after),
    )
  }

  async function saveMacro(index: number, steps: MacroStep[]): Promise<MacroSaveResult> {
    const kb = state.keyboard
    const buffer = state.macros
    if (!kb || !buffer || index < 0 || index >= kb.macroCount) return 'invalid'
    if (steps.some((s) => stepProblem(s, kb.vialProtocol) !== null)) return 'invalid'
    const bytes = encodeMacro(steps, kb.vialProtocol)
    const now = rawMacros(buffer, kb.macroCount)[index]
    // A memory left half-written (its last byte not 0) is written again even when this macro already matches.
    if (now.length === bytes.length && now.every((b, i) => b === bytes[i]) && !macrosHalted(buffer)) return 'unchanged'
    const next = replaceMacro(buffer, kb.macroCount, kb.macroBytes, index, bytes)
    if (!next.buffer) return 'too-big'
    if (!state.unlock?.unlocked) return 'locked'
    if (!(await writeMacroBuffer(buffer, next.buffer))) return 'failed'
    remember({ changes: [], macros: { from: buffer, to: next.buffer } })
    return 'saved'
  }

  const ENTRY_SETTERS = {
    tapDance: protocol.setTapDance,
    combo: protocol.setCombo,
    keyOverride: protocol.setKeyOverride,
    altRepeatKey: protocol.setAltRepeatKey,
  } as Record<EntryKind, (index: number, entry: AnyEntry) => Promise<void>>

  const ENTRY_GETTERS = {
    tapDance: protocol.getTapDance,
    combo: protocol.getCombo,
    keyOverride: protocol.getKeyOverride,
    altRepeatKey: protocol.getAltRepeatKey,
  } as Record<EntryKind, (index: number) => Promise<AnyEntry>>

  /** Reads an entry back after its write failed. */
  const entryCheck = (kind: EntryKind, index: number, entry: AnyEntry) => async (): Promise<Check> => {
    const now = await ENTRY_GETTERS[kind](index)
    if (!state.entries) return { took: sameEntry(now, entry) }
    const list = [...(state.entries[kind] as AnyEntry[])]
    list[index] = now
    return { took: sameEntry(now, entry), patch: { entries: { ...state.entries, [kind]: list } } }
  }

  /** Writes one entry and shows it. */
  function writeEntry(kind: EntryKind, index: number, entry: AnyEntry): Promise<boolean> {
    return write(
      () => ENTRY_SETTERS[kind](index, entry),
      () => {
        if (!state.entries) return {}
        const list = [...(state.entries[kind] as AnyEntry[])]
        list[index] = { ...entry }
        return { entries: { ...state.entries, [kind]: list } }
      },
      entryCheck(kind, index, entry),
    )
  }

  async function saveEntry(kind: EntryKind, index: number, entry: AnyEntry): Promise<EntrySaveResult> {
    const now = (state.entries?.[kind] as AnyEntry[] | undefined)?.[index]
    if (!now) return 'invalid'
    if (sameEntry(now, entry)) return 'unchanged'
    if (entryProblem(kind, entry) !== null) return 'invalid'
    if (!state.unlock?.unlocked && entryNeedsUnlock(kind, entry, bootKeycode())) return 'locked'
    if (!(await writeEntry(kind, index, entry))) return 'failed'
    remember({ changes: [], entry: { kind, index, from: { ...now }, to: { ...entry } } })
    return 'saved'
  }

  let unlocking: Promise<UnlockResult> | null = null
  /** Set by stopUnlock; the unlock loop checks it between polls. */
  let stopAsked = false

  async function runUnlockFlow(): Promise<UnlockResult> {
    const current = session
    if (!current) return 'disconnected'
    if (state.unlock?.unlocked) return 'unlocked'
    let started = false
    stopAsked = false
    try {
      const status = await runUnlock({
        transport: current.transport,
        onProgress: (progress) => {
          started = true
          if (session === current) set({ unlocking: progress })
        },
        shouldStop: () => stopAsked,
      })
      if (session !== current) return 'disconnected'
      unlockLeftCounting = false
      freeCheckedAt = 0
      set({ unlock: status, unlocking: null })
      set({ capabilities: capabilities() })
      return 'unlocked'
    } catch (error) {
      if (session !== current || (error instanceof TransportError && error.reason === 'disconnected')) {
        return 'disconnected'
      }
      set({ unlocking: null })
      if (error instanceof UnlockStopped) {
        // The keyboard can't be told to stop; if it was counting it still is, and ignores everything until it restarts.
        unlockLeftCounting = started
        freeCheckedAt = 0
        return 'stopped'
      }
      // Only reached before the keyboard started counting (or when it refused to start): it still works.
      console.warn(`[device] unlock ${started ? 'stopped' : 'did not start'}:`, error)
      return 'failed'
    }
  }

  function unlock(): Promise<UnlockResult> {
    unlocking ??= runUnlockFlow().finally(() => {
      unlocking = null
    })
    return unlocking
  }

  function stopUnlock(): void {
    if (unlocking) stopAsked = true
  }

  async function lock(): Promise<void> {
    if (!state.unlock?.unlocked) return
    const sent = await write(
      () => protocol.lock(),
      () => (state.unlock ? { unlock: { ...state.unlock, unlocked: false } } : {}),
      async () => {
        const now = await protocol.getUnlockStatus()
        return { took: !now.unlocked, patch: { unlock: now } }
      },
    )
    if (sent) set({ capabilities: capabilities() })
  }

  async function restore(plan: RestorePlan, onProgress?: (progress: RestoreProgress) => void): Promise<RestoreReport> {
    const report: RestoreReport = {
      written: {},
      failed: [],
      skipped: [],
      stopped: false,
      stoppedBecause: null,
      done: 0,
      total: 0,
      undoable: false,
    }
    const current = session
    if (!current || !state.keyboard) return { ...report, stopped: true, stoppedBecause: 'disconnected' }
    // Locked, vial-qmk ignores macro writes and turns QK_BOOT into "nothing" in knob and entry writes (vial.c,
    // via.c). Those are skipped rather than written wrong; keys with QK_BOOT too, as Vial itself asks first.
    const unlocked = state.unlock?.unlocked === true
    const boot = bootKeycode()

    interface Step extends WriteJob {
      part: RestorePart
      what: string
      needsUnlock: boolean
      /** Reads back what a failed write touched (writeOrError). */
      verify?: () => Promise<Check>
      /** Called once the write reached the keyboard. */
      done?: () => void
    }
    const steps: Step[] = []
    const written: Edit['changes'] = []

    for (const change of plan.keys) {
      const { slot, to } = change
      const part = slot.kind === 'key' ? 'keys' : 'knob'
      const what =
        slot.kind === 'key'
          ? `layer ${slot.layer}, row ${slot.row}, column ${slot.col}`
          : `layer ${slot.layer}, knob ${slot.knob} ${slot.direction === 0 ? 'left' : 'right'}`
      let from: number | null = null
      steps.push({
        part,
        what,
        needsUnlock: to === boot,
        send: async () => {
          const kb = state.keyboard
          if (!kb) return
          const now = slotKeycode(kb, slot)
          if (now === to) return
          from = now
          await (slot.kind === 'key'
            ? protocol.setKeycode(slot.layer, slot.row, slot.col, to)
            : protocol.setEncoder(slot.layer, slot.knob, slot.direction, to))
        },
        applied: () => (state.keyboard ? { keyboard: withKeycode(state.keyboard, slot, to) } : {}),
        verify: slotCheck(slot, to),
        done: () => {
          if (from !== null) written.push({ slot, from, to })
        },
      })
    }

    if (plan.layoutOptions !== null) {
      const options = plan.layoutOptions
      steps.push({
        part: 'layoutOptions',
        what: 'layout options',
        needsUnlock: false,
        send: () => protocol.setLayoutOptions(options),
        applied: () => (state.keyboard ? { keyboard: { ...state.keyboard, layoutOptions: options } } : {}),
      })
    }

    if (plan.macros) {
      const buffer = plan.macros
      steps.push({
        part: 'macros',
        what: 'macro memory',
        needsUnlock: true,
        // In VIA's order (sendMacroBuffer): stopped part-way, the keyboard plays no macro rather than a mixture.
        send: async () => sendMacroBuffer(current.transport, state.macros ?? [], buffer),
        applied: () => ({ macros: [...buffer] }),
        verify: macroCheck(buffer),
      })
    }

    const setters = {
      tapDance: protocol.setTapDance,
      combo: protocol.setCombo,
      keyOverride: protocol.setKeyOverride,
      altRepeatKey: protocol.setAltRepeatKey,
    } as Record<(typeof ENTRY_KINDS)[number], (index: number, entry: object) => Promise<void>>
    for (const kind of ENTRY_KINDS) {
      for (const { index, entry } of plan[kind] as EntryChange<object>[]) {
        steps.push({
          part: kind,
          what: `${countOf(kind, 1).replace(/^1 /, '')} ${index}`,
          needsUnlock: entryNeedsUnlock(kind, entry, boot),
          send: () => setters[kind](index, entry),
          applied: () => {
            if (!state.entries) return {}
            const list = [...(state.entries[kind] as object[])]
            list[index] = entry
            return { entries: { ...state.entries, [kind]: list } }
          },
          verify: entryCheck(kind, index, entry as AnyEntry),
        })
      }
    }

    for (const { qsid, value } of plan.settings) {
      const width = settingWidth(qsid)
      steps.push({
        part: 'settings',
        what: `setting ${qsid}`,
        needsUnlock: false,
        send: () => protocol.qmkSettingsSet(qsid, value),
        applied: () => {
          if (!state.settings) return {}
          // Keep the stored form: the value's bytes, padded like a read.
          const now = state.settings[qsid] ?? []
          return { settings: { ...state.settings, [qsid]: now.map((_, i) => value[i] ?? 0) } }
        },
        verify: width === undefined ? undefined : settingCheck(qsid, decodeSetting(value, width), width),
      })
    }

    if (plan.lighting) {
      const { mode, speed, hue, sat, val } = plan.lighting
      steps.push({
        part: 'lighting',
        what: 'lighting',
        needsUnlock: false,
        send: async () => {
          await sendLighting(state.lighting?.mode ?? -1, { mode, speed, hue, sat, val })
          await protocol.saveLighting()
        },
        applied: () => (state.lighting ? { lighting: { ...state.lighting, mode, speed, hue, sat, val } } : {}),
        // Found done by reading back, it may have missed the save: save again after the usual pause.
        verify: lightingCheck({ mode, speed, hue, sat, val }),
        done: saveLightingSoon,
      })
    }

    if (plan.wireless) {
      const timers = plan.wireless
      steps.push({ part: 'wireless', what: 'wireless timers', needsUnlock: false, ...wirelessWrite(timers) })
    }

    if (plan.debounce) {
      const { type, time } = plan.debounce
      steps.push({
        part: 'debounce',
        what: 'key bounce filter',
        needsUnlock: false,
        send: async () => {
          if (!(await setKeychronDebounce(type, time))) throw new Error('The keyboard refused the key bounce filter setting.')
        },
        applied: () => (state.keychron ? { keychron: { ...state.keychron, debounceType: type, debounceTime: time } } : {}),
        verify: keychronCheck((kc) => kc.debounceType === type && kc.debounceTime === time),
      })
    }

    for (const { index, entry } of plan.snapClick) {
      steps.push({
        part: 'snapClick',
        what: `Snap Click pair ${index + 1}`,
        needsUnlock: false,
        send: async () => {
          if (!(await setKeychronSnapClick(index, entry.type, entry.key1, entry.key2))) {
            throw new Error('The keyboard refused this Snap Click pair.')
          }
          if (!(await saveKeychronSnapClick())) throw new Error('The keyboard didn’t save Snap Click.')
        },
        applied: () => {
          if (!state.keychron) return {}
          const entries = [...state.keychron.snapClickEntries]
          entries[index] = { ...entry }
          return { keychron: { ...state.keychron, snapClickEntries: entries } }
        },
        verify: snapClickCheck(index, entry),
      })
    }

    // Keychron's per-key colours and zones: written, then saved with the command that saves them all. A write found
    // done by reading back may have missed that save, so `done` saves again after the usual pause.
    if (plan.keyColours) {
      const { colours, style } = plan.keyColours
      steps.push({
        part: 'keyColours',
        what: 'key colours',
        needsUnlock: false,
        send: async () => {
          const packets = [
            ...(colours ? colourPackets(state.keychron?.rgb?.perKeyColors ?? [], colours) : []),
            ...(style !== null ? [stylePacket(style)] : []),
          ]
          await sendKeyLighting([...packets, savePacket()], 'The keyboard refused the key colours.')
        },
        applied: () =>
          withKeyLighting({
            ...(colours ? { perKeyColors: colours.map((c) => [...c] as Hsv) } : {}),
            ...(style !== null ? { perKeyRGBType: style } : {}),
          }),
        verify: keychronCheck((kc) => (!colours || same(kc.rgb?.perKeyColors, colours)) && (style === null || kc.rgb?.perKeyRGBType === style)),
        done: saveKeyLightingSoon,
      })
    }

    if (plan.zones) {
      const { regions, effects } = plan.zones
      steps.push({
        part: 'zones',
        what: 'mixed zones',
        needsUnlock: false,
        send: async () => {
          const packets = [
            ...(regions ? regionPackets(state.keychron?.rgb?.mixedRGBRegions ?? [], regions) : []),
            ...effects.flatMap((z) => effectPackets(z.zone, z.effects)),
          ]
          await sendKeyLighting([...packets, savePacket()], 'The keyboard refused the mixed zones.')
        },
        applied: () => {
          const list = [...(state.keychron?.rgb?.mixedRGBEffects ?? [])]
          for (const z of effects) list[z.zone] = z.effects.map((e) => ({ ...e }))
          return withKeyLighting({ ...(regions ? { mixedRGBRegions: [...regions] } : {}), mixedRGBEffects: list })
        },
        verify: keychronCheck(
          (kc) =>
            (!regions || same(kc.rgb?.mixedRGBRegions, regions)) &&
            effects.every((z) => sameZoneEffects(kc.rgb?.mixedRGBEffects[z.zone], z.effects)),
        ),
        done: saveKeyLightingSoon,
      })
    }

    if (plan.lockLights) {
      const lights = plan.lockLights
      steps.push({
        part: 'lockLights',
        what: 'lock lights',
        needsUnlock: false,
        send: () => sendKeyLighting([lockLightsPacket(lights), savePacket()], 'The keyboard refused the lock light settings.'),
        applied: () => {
          const now = state.keychron?.rgb?.osIndicatorConfig
          return now ? withKeyLighting({ osIndicatorConfig: { ...now, ...lights } }) : {}
        },
        verify: keychronCheck((kc) => sameLockLights(kc.rgb?.osIndicatorConfig, lights)),
        done: saveKeyLightingSoon,
      })
    }

    const todo = steps.filter((s) => {
      if (unlocked || !s.needsUnlock) return true
      report.skipped.push({ part: s.part, what: s.what })
      return false
    })
    report.total = todo.length
    onProgress?.({ done: 0, total: todo.length })
    set({ restoring: true })
    let unansweredSteps = 0
    for (const [i, s] of todo.entries()) {
      const error = await writeOrError(s.send, s.applied, s.verify)
      if (session !== current) {
        report.stopped = true
        report.stoppedBecause = 'disconnected'
        break
      }
      report.done = i + 1
      if (error === null) {
        report.written[s.part] = (report.written[s.part] ?? 0) + 1
        s.done?.()
        unansweredSteps = 0
      } else {
        report.failed.push({ part: s.part, what: s.what, error, detail: lastFailureDetail })
        unansweredSteps = lastFailureTimedOut ? unansweredSteps + 1 : 0
      }
      onProgress?.({ done: i + 1, total: todo.length })
      // Writes in a row without a reply: the keyboard has gone quiet (asleep, switched off, out of range). Trying the
      // rest would only take seconds each and fail the same way.
      const quiet = unansweredSteps >= QUIET_STEPS || current.transport.stats.unanswered >= QUIET_AFTER
      if (quiet && i + 1 < todo.length) {
        report.stopped = true
        report.stoppedBecause = 'not-answering'
        break
      }
    }

    if (session === current) {
      if (written.length > 0) {
        remember({ changes: written })
        report.undoable = true
      }
      set({ capabilities: capabilities(), restoring: false })
    }
    return report
  }

  /** The write of Keychron's wireless timers; the keyboard answers with a status and saves them itself. */
  function wirelessWrite(timers: WirelessTimers): WriteJob & { verify: () => Promise<Check> } {
    return {
      send: async () => {
        const problem = timersProblem(timers)
        if (problem) throw new Error(problem)
        if (!(await setKeychronWirelessLpm(timers.backlitTime, timers.idleTime))) {
          throw new Error('The keyboard refused these timers.')
        }
      },
      applied: () =>
        state.keychron
          ? { keychron: { ...state.keychron, wirelessBacklitTime: timers.backlitTime, wirelessIdleTime: timers.idleTime } }
          : {},
      verify: keychronCheck((kc) => kc.wirelessBacklitTime === timers.backlitTime && kc.wirelessIdleTime === timers.idleTime),
    }
  }

  async function setWirelessTimers(timers: WirelessTimers): Promise<void> {
    if (!state.keychron?.hasWireless) return
    const { send, applied, verify } = wirelessWrite(timers)
    await write(send, applied, verify)
  }

  const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

  /**
   * Remembers a setting's change for undo. A change to the same setting soon after the last one, with nothing to
   * redo, extends that step instead; one that ends where the step began removes it.
   */
  function rememberValue(key: string, from: unknown, to: unknown, writeValue: (value: unknown) => Promise<boolean>): void {
    const top = undoStack.at(-1)
    const now = Date.now()
    if (top?.value?.key === key && top.changes.length === 0 && redoStack.length === 0 && now - top.value.at < MERGE_MS) {
      const merged = { ...top, value: { ...top.value, to, at: now } }
      undoStack = same(merged.value.from, to) ? undoStack.slice(0, -1) : [...undoStack.slice(0, -1), merged]
      set(history())
      return
    }
    remember({ changes: [], value: { key, at: now, from, to, write: writeValue } })
  }

  /** Reads a setting back after its write failed. */
  function settingCheck(qsid: number, value: number, width: number): () => Promise<Check> {
    return async () => {
      const now = await protocol.qmkSettingsGet(qsid)
      return {
        took: decodeSetting(now, width) === value,
        patch: state.settings ? { settings: { ...state.settings, [qsid]: now } } : {},
      }
    }
  }

  function writeSetting(qsid: number, value: number): Promise<boolean> {
    const width = settingWidth(qsid) ?? 0
    return write(
      () => protocol.qmkSettingsSet(qsid, withSettingValue([], value, width)),
      () => {
        if (!state.settings) return {}
        return { settings: { ...state.settings, [qsid]: withSettingValue(state.settings[qsid] ?? [], value, width) } }
      },
      settingCheck(qsid, value, width),
    )
  }

  /**
   * Reads Keychron's state back after one of its writes failed; `took` says whether it holds what was written. A
   * read that itself went unanswered is no answer: the state isn't replaced with a half-read one.
   */
  function keychronCheck(took: (kc: KeychronState) => boolean): () => Promise<Check> {
    return async () => {
      const transport = session?.transport
      const kc = await reloadKeychron()
      if (!kc || !transport || transport.stats.unanswered > 0) throw new Error('The keyboard didn’t answer the read-back.')
      return { took: took(kc), patch: { keychron: kc } }
    }
  }

  async function setSetting(qsid: number, value: number): Promise<boolean> {
    const stored = state.settings?.[qsid]
    const width = settingWidth(qsid)
    if (!stored || width === undefined) return false
    if (!Number.isInteger(value) || value < 0 || value > largestValue(width)) return false
    const from = decodeSetting(stored, width)
    if (from === value) return true
    if (!(await writeSetting(qsid, value))) return false
    rememberValue(`setting:${qsid}`, from, value, (v) => writeSetting(qsid, v as number))
    return true
  }

  async function resetSettings(): Promise<boolean> {
    if (!state.settings) return false
    const ids = Object.keys(state.settings).map(Number)
    const fresh: Record<number, number[]> = {}
    return write(
      async () => {
        await protocol.qmkSettingsReset()
        // The firmware's defaults are only known by reading them back.
        for (const id of ids) fresh[id] = await protocol.qmkSettingsGet(id)
      },
      () => ({ settings: fresh }),
    )
  }

  function writeDebounce({ type, time }: Debounce): Promise<boolean> {
    return write(
      async () => {
        if (!(await setKeychronDebounce(type, time))) throw new Error('The keyboard refused the key bounce filter setting.')
      },
      () => (state.keychron ? { keychron: { ...state.keychron, debounceType: type, debounceTime: time } } : {}),
      keychronCheck((kc) => kc.debounceType === type && kc.debounceTime === time),
    )
  }

  async function setDebounce(debounce: Debounce): Promise<boolean> {
    const kc = state.keychron
    if (!kc?.hasDebounce) return false
    const to = { type: debounce.type, time: Math.max(0, Math.min(Math.round(debounce.time), debounceMax(debounce.type))) }
    const from = { type: kc.debounceType, time: kc.debounceTime }
    if (same(from, to)) return true
    if (!(await writeDebounce(to))) return false
    rememberValue('debounce', from, to, (v) => writeDebounce(v as Debounce))
    return true
  }

  function writeSnapClick(index: number, entry: SnapClickEntry): Promise<boolean> {
    return write(
      async () => {
        if (!(await setKeychronSnapClick(index, entry.type, entry.key1, entry.key2))) {
          throw new Error('The keyboard refused this Snap Click pair.')
        }
        // Set only changes the running table; save keeps it over a restart.
        if (!(await saveKeychronSnapClick())) throw new Error('The keyboard didn’t save Snap Click.')
      },
      () => {
        if (!state.keychron) return {}
        const entries = [...state.keychron.snapClickEntries]
        entries[index] = { ...entry }
        return { keychron: { ...state.keychron, snapClickEntries: entries } }
      },
      snapClickCheck(index, entry),
    )
  }

  async function setSnapClick(index: number, entry: SnapClickEntry): Promise<boolean> {
    const kc = state.keychron
    const now = kc?.snapClickEntries[index]
    if (!kc?.hasSnapClick || !now || snapClickProblem(entry) !== null) return false
    const to = entry.type === 0 ? { type: 0, key1: 0, key2: 0 } : { type: entry.type, key1: entry.key1, key2: entry.key2 }
    const from = { type: now.type, key1: now.key1, key2: now.key2 }
    if (same(from, to)) return true
    if (!(await writeSnapClick(index, to))) return false
    rememberValue(`snap-click:${index}`, from, to, (v) => writeSnapClick(index, v as SnapClickEntry))
    return true
  }

  /**
   * Sends Keychron lighting packets (0xA8) in order, each checked: the firmware answers status 1 for a write it
   * refuses. Every one of them only changes the running copy; `saveKeyLightingSoon` keeps it.
   */
  async function sendKeyLighting(packets: Uint8Array[], refused: string): Promise<void> {
    const current = session
    if (!current) throw new Error(NOT_CONNECTED)
    for (const p of packets) {
      if (!accepted(await current.transport.request(p))) throw new Error(refused)
    }
  }

  function saveKeyLightingSoon(): void {
    if (keyLightingSaveTimer) clearTimeout(keyLightingSaveTimer)
    keyLightingSaveTimer = setTimeout(() => {
      keyLightingSaveTimer = null
      set({ savePending: pendingSaves() })
      void write(() => sendKeyLighting([savePacket()], 'The keyboard didn’t save the key lighting.'), () => ({}))
    }, LIGHTING_SAVE_DELAY_MS)
    set({ savePending: true })
  }

  const snapClickCheck = (index: number, entry: SnapClickEntry) =>
    keychronCheck((kc) => {
      const now = kc.snapClickEntries[index]
      return !!now && now.type === entry.type && now.key1 === entry.key1 && now.key2 === entry.key2
    })

  const sameZoneEffects = (now: ZoneEffect[] | undefined, want: ZoneEffect[]) =>
    !!now &&
    now.length === want.length &&
    now.every((e, i) => (['effect', 'hue', 'sat', 'speed', 'time'] as const).every((k) => e[k] === want[i][k]))

  const sameLockLights = (now: LockLights | null | undefined, want: LockLights) =>
    !!now && (['disableMask', 'hue', 'sat', 'val'] as const).every((k) => now[k] === want[k])

  /** The Keychron lighting part of the state with `patch` applied, for `applied`. */
  function withKeyLighting(patch: Partial<NonNullable<KeychronState['rgb']>>): Partial<DeviceState> {
    const kc = state.keychron
    if (!kc?.rgb) return {}
    return { keychron: { ...kc, rgb: { ...kc.rgb, ...patch } } }
  }

  async function writeKeyColours(colours: Hsv[]): Promise<boolean> {
    const before = state.keychron?.rgb?.perKeyColors ?? []
    const sent = await write(
      () => sendKeyLighting(colourPackets(before, colours), 'The keyboard refused these key colours.'),
      () => withKeyLighting({ perKeyColors: colours.map((c) => [...c] as Hsv) }),
      keychronCheck((kc) => same(kc.rgb?.perKeyColors, colours)),
    )
    if (sent) saveKeyLightingSoon()
    return sent
  }

  /** A whole table for the keyboard: one entry per LED. */
  const fits = (values: readonly unknown[], count: number) => values.length === count

  async function setKeyColours(colours: Hsv[], undoKey = 'key-colours'): Promise<boolean> {
    const rgb = state.keychron?.rgb
    if (!state.keychron?.hasRgb || !rgb || !fits(colours, rgb.ledCount)) return false
    const to = colours.map(([h, s, v]) => [h & 0xff, s & 0xff, v & 0xff] as Hsv)
    const from = rgb.perKeyColors.map((c) => [...c] as Hsv)
    if (same(from, to)) return true
    if (!(await writeKeyColours(to))) return false
    rememberValue(undoKey, from, to, (v) => writeKeyColours(v as Hsv[]))
    return true
  }

  async function writeKeyStyle(style: number): Promise<boolean> {
    const sent = await write(
      () => sendKeyLighting([stylePacket(style)], 'The keyboard refused this style.'),
      () => withKeyLighting({ perKeyRGBType: style }),
      keychronCheck((kc) => kc.rgb?.perKeyRGBType === style),
    )
    if (sent) saveKeyLightingSoon()
    return sent
  }

  async function setKeyStyle(style: number): Promise<boolean> {
    const rgb = state.keychron?.rgb
    if (!rgb || !Number.isInteger(style) || style < 0 || style >= PER_KEY_STYLE_COUNT) return false
    const from = rgb.perKeyRGBType
    if (from === style) return true
    if (!(await writeKeyStyle(style))) return false
    rememberValue('key-style', from, style, (v) => writeKeyStyle(v as number))
    return true
  }

  async function writeZones(regions: number[]): Promise<boolean> {
    const before = state.keychron?.rgb?.mixedRGBRegions ?? []
    const sent = await write(
      () => sendKeyLighting(regionPackets(before, regions), 'The keyboard refused these zones.'),
      () => withKeyLighting({ mixedRGBRegions: [...regions] }),
      keychronCheck((kc) => same(kc.rgb?.mixedRGBRegions, regions)),
    )
    if (sent) saveKeyLightingSoon()
    return sent
  }

  async function setZones(regions: number[], undoKey = 'zones'): Promise<boolean> {
    const rgb = state.keychron?.rgb
    if (!rgb || !fits(regions, rgb.ledCount)) return false
    if (regions.some((z) => !Number.isInteger(z) || z < 0 || z >= rgb.mixedRGBLayers)) return false
    const from = [...rgb.mixedRGBRegions]
    if (same(from, regions)) return true
    if (!(await writeZones(regions))) return false
    rememberValue(undoKey, from, [...regions], (v) => writeZones(v as number[]))
    return true
  }

  async function writeZoneEffects(zone: number, effects: ZoneEffect[]): Promise<boolean> {
    const sent = await write(
      () => sendKeyLighting(effectPackets(zone, effects), 'The keyboard refused these zone effects.'),
      () => {
        const list = [...(state.keychron?.rgb?.mixedRGBEffects ?? [])]
        list[zone] = effects.map((e) => ({ ...e }))
        return withKeyLighting({ mixedRGBEffects: list })
      },
      keychronCheck((kc) => sameZoneEffects(kc.rgb?.mixedRGBEffects[zone], effects)),
    )
    if (sent) saveKeyLightingSoon()
    return sent
  }

  async function setZoneEffects(zone: number, effects: ZoneEffect[]): Promise<boolean> {
    const rgb = state.keychron?.rgb
    const now = rgb?.mixedRGBEffects[zone]
    if (!rgb || !now || effects.length !== rgb.mixedRGBEffectsPerLayer) return false
    const from = now.map((e) => ({ ...e }))
    if (same(from, effects)) return true
    if (!(await writeZoneEffects(zone, effects))) return false
    rememberValue(`zone-effects:${zone}`, from, effects, (v) => writeZoneEffects(zone, v as ZoneEffect[]))
    return true
  }

  async function writeLockLights(lights: LockLights): Promise<boolean> {
    const sent = await write(
      () => sendKeyLighting([lockLightsPacket(lights)], 'The keyboard refused the lock light settings.'),
      () => {
        const now = state.keychron?.rgb?.osIndicatorConfig
        return now ? withKeyLighting({ osIndicatorConfig: { ...now, ...lights } }) : {}
      },
      keychronCheck((kc) => sameLockLights(kc.rgb?.osIndicatorConfig, lights)),
    )
    if (sent) saveKeyLightingSoon()
    return sent
  }

  async function setLockLights(change: Partial<LockLights>): Promise<boolean> {
    const now = state.keychron?.hasRgb ? state.keychron.rgb?.osIndicatorConfig : null
    if (!now) return false
    const from: LockLights = { disableMask: now.disableMask, hue: now.hue, sat: now.sat, val: now.val }
    const to = normaliseLockLights({ ...from, ...change })
    if (same(from, to)) return true
    if (!(await writeLockLights(to))) return false
    // Switches and colour are separate steps, so a quick switch after a colour drag isn't undone with it.
    const key = to.disableMask !== from.disableMask ? 'lock-lights:on' : 'lock-lights:colour'
    rememberValue(key, from, to, (v) => writeLockLights(v as LockLights))
    return true
  }

  /** The keymap and the knob, read again (the same requests as the first read). */
  async function readKeys(kb: KeyboardData): Promise<Pick<KeyboardData, 'keymap' | 'knobs'>> {
    const size = kb.layers * kb.rows * kb.cols * 2
    const bytes: number[] = []
    for (let offset = 0; offset < size; offset += KEYMAP_CHUNK) {
      bytes.push(...(await protocol.getKeymapBuffer(offset, Math.min(KEYMAP_CHUNK, size - offset))))
    }
    const keymap: Record<string, number> = {}
    for (let layer = 0, i = 0; layer < kb.layers; layer++) {
      for (let row = 0; row < kb.rows; row++) {
        for (let col = 0; col < kb.cols; col++, i += 2) keymap[`${layer},${row},${col}`] = (bytes[i] << 8) | bytes[i + 1]
      }
    }
    const knobIndices = [...new Set(Object.keys(kb.knobs).map((key) => Number(key.split(',')[1])))]
    const knobs: Record<string, number> = {}
    for (const knob of knobIndices) {
      for (let layer = 0; layer < kb.layers; layer++) {
        const [left, right] = await protocol.getEncoder(layer, knob)
        knobs[`${layer},${knob},0`] = left
        knobs[`${layer},${knob},1`] = right
      }
    }
    return { keymap, knobs }
  }

  async function resetKeymap({ macros = false }: { macros?: boolean } = {}): Promise<boolean> {
    const current = session
    const kb = state.keyboard
    if (!current || !kb) return false
    // dynamic_keymap_reset rewrites the whole keymap before it answers: give it time, and send it again if the
    // answer is lost (doing it twice is harmless).
    const sent = await write(
      async () => {
        await current.transport.request([VIA_KEYMAP_RESET], RESET_REQUEST)
        if (macros && kb.macroBytes > 0) await current.transport.request([VIA_MACRO_RESET], RESET_REQUEST)
      },
      () => ({}),
    )
    // Once the reset got through, undo can't bring the old setup back: its steps would write over the firmware's
    // keys. Without an answer it may or may not have; the keys read back tell.
    const forgetHistory = () => {
      undoStack = []
      redoStack = []
      set(history())
    }
    if (sent) forgetHistory()
    if (session !== current) return false
    try {
      const keys = await readKeys(kb)
      if (session !== current || !state.keyboard) return false
      const changed = !same(keys.keymap, state.keyboard.keymap) || !same(keys.knobs, state.keyboard.knobs)
      if (!sent && changed) forgetHistory()
      set({ keyboard: { ...state.keyboard, ...keys } })
    } catch (error) {
      if (session !== current) return false
      if (!sent) forgetHistory()
      console.warn('[device] could not read the keys back after a reset:', error)
      set({ writeError: `${plainError(error, current)} ${UNCHECKED}` })
      return false
    }
    // The rest it touched, read as at connect (shown as loading in the status line meanwhile).
    const parts: LoadPart[] = ['macros', 'entries', 'settings']
    set({ loading: [...state.loading, ...parts.filter((p) => !state.loading.includes(p))], failed: state.failed.filter((p) => !parts.includes(p)) })
    await readRest(current, kb, parts)
    return sent
  }

  /** Saves now what is waiting to be saved after a pause, before the keyboard goes away. */
  async function flushSaves(): Promise<void> {
    if (lightingSaveTimer) {
      clearTimeout(lightingSaveTimer)
      lightingSaveTimer = null
      set({ savePending: pendingSaves() })
      await write(() => protocol.saveLighting(), () => ({}))
    }
    if (keyLightingSaveTimer) {
      clearTimeout(keyLightingSaveTimer)
      keyLightingSaveTimer = null
      set({ savePending: pendingSaves() })
      await write(() => sendKeyLighting([savePacket()], 'The keyboard didn’t save the key lighting.'), () => ({}))
    }
  }

  /**
   * Reads the whole keyboard afresh on the same link, after Keychron's factory reset (everything changed behind the
   * app's back). Changes queued for it before are dropped (a new session), and undo is forgotten.
   */
  async function reload(old: Session): Promise<void> {
    if (session !== old) return
    forget()
    const current: Session = { transport: old.transport, link: old.link }
    session = current
    const { link } = current
    set({
      ...DISCONNECTED,
      status: 'connecting',
      link: { kind: link.kind, productName: link.productName, vendorId: link.vendorId, productId: link.productId },
    })
    await load(current)
  }

  /** Reads the keyboard on a session just opened; on failure lets go of it, saying why in plain words. */
  async function load(current: Session): Promise<void> {
    const { transport, link } = current
    try {
      const { keyboard, layer } = await readKeyboard(transport)
      if (session !== current) return
      // A layer push that arrived while loading is newer than the reply to our own question.
      set({ status: 'ready', keyboard, layer: state.layer ?? layer, loading: LOAD_PARTS })
      set({ capabilities: capabilities() })
      void readRest(current, keyboard)
    } catch (error) {
      if (session !== current) return
      session = null
      transport.stop()
      await link.close().catch(() => {})
      let message = error instanceof Error ? error.message : String(error)
      if (error instanceof TransportError && error.reason === 'timeout') {
        console.warn('[device] no reply while connecting:', message)
        message = NOT_ANSWERING_AT_CONNECT[link.kind]
      }
      set({ ...DISCONNECTED, status: 'error', error: message })
    }
  }

  async function restartToBootloader(): Promise<BootloaderResult> {
    const current = session
    if (!current) return 'failed'
    if (current.link.kind !== 'cable') return 'cable-only'
    if (!state.unlock?.unlocked) return 'locked'
    await flushSaves()
    if (session !== current) return 'failed'
    let reply: Uint8Array
    try {
      // via.c answers, waits 100 ms and jumps. Sent once: a second one would reach a keyboard already gone.
      reply = await current.transport.request([VIA_BOOTLOADER_JUMP], { attempts: 1 })
    } catch {
      return session === current ? 'failed' : 'restarting'
    }
    if (reply[0] === UNHANDLED) return 'unsupported'
    // It is leaving USB as a keyboard; let go of it now so nothing else is sent its way.
    if (session === current) await disconnect()
    return 'restarting'
  }

  function watchMatrix(listener: (down: ReadonlySet<string>) => void): () => void {
    matrixWatchers.add(listener)
    syncMatrix()
    return () => {
      matrixWatchers.delete(listener)
      syncMatrix()
    }
  }

  async function disconnect(): Promise<void> {
    const ending = session
    if (!ending) return
    forget()
    session = null
    ending.transport.stop()
    set(DISCONNECTED)
    await ending.link.close().catch(() => {})
  }

  return {
    getState: () => state,

    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },

    get transport() {
      return session?.transport ?? null
    },

    disconnect,
    // Each change belongs to the keyboard it was asked for (inOrder); the second argument is what it resolves to
    // when that keyboard has gone by its turn.
    assign: (slot, keycode) => inOrder(() => assign(slot, keycode), undefined),
    undo: () => inOrder(() => step('undo'), undefined),
    redo: () => inOrder(() => step('redo'), undefined),
    setLighting: (change) => inOrder(() => setLighting(change), undefined),
    refreshLighting: () => inOrder(refreshLighting, undefined),
    unlock,
    stopUnlock,
    lock: () => inOrder(lock, undefined),
    flushSaves: () => inOrder(flushSaves, undefined),
    saveMacro: (index, steps) => inOrder(() => saveMacro(index, steps), 'failed'),
    saveEntry: (kind, index, entry) => inOrder(() => saveEntry(kind, index, entry), 'failed'),
    restore: (plan, onProgress) =>
      inOrder(() => restore(plan, onProgress), {
        written: {},
        failed: [],
        skipped: [],
        stopped: true,
        stoppedBecause: 'disconnected',
        done: 0,
        total: 0,
        undoable: false,
      }),
    setWirelessTimers: (timers) => inOrder(() => setWirelessTimers(timers), undefined),
    setSetting: (qsid, value) => inOrder(() => setSetting(qsid, value), false),
    resetSettings: () => inOrder(resetSettings, false),
    setDebounce: (debounce) => inOrder(() => setDebounce(debounce), false),
    setSnapClick: (index, entry) => inOrder(() => setSnapClick(index, entry), false),
    setKeyColours: (colours, undoKey) => inOrder(() => setKeyColours(colours, undoKey), false),
    setKeyStyle: (style) => inOrder(() => setKeyStyle(style), false),
    setZones: (regions, undoKey) => inOrder(() => setZones(regions, undoKey), false),
    setZoneEffects: (zone, effects) => inOrder(() => setZoneEffects(zone, effects), false),
    setLockLights: (change) => inOrder(() => setLockLights(change), false),
    resetKeymap: (options) => inOrder(() => resetKeymap(options), false),
    restartToBootloader: () => inOrder(restartToBootloader, 'failed'),
    watchMatrix,

    async connect(link) {
      await disconnect()
      const transport = createTransport(link)
      const current: Session = { transport, link }
      session = current
      // The vendored protocol code sends through one module-level transport, so one keyboard at a time.
      setTransport({ sendReceive: (data) => transport.request(data), send: (data) => transport.send(data) })

      // The session object is replaced by a reload (factory reset); the link and transport stay.
      const mine = () => session !== null && session.transport === transport
      link.onClose(() => {
        if (!mine()) return
        const duringWrite = state.writing > 0 || state.restoring
        forget()
        session = null
        transport.stop()
        set({ ...DISCONNECTED, lost: { duringWrite } })
      })
      transport.onPush(LAYER_PUSH, (report) => {
        if (mine()) set({ layer: parseLayerReport(report) })
      })
      transport.onPush(FACTORY_RESET_PUSH, () => {
        if (session && mine()) void reload(session)
      })

      const { kind, productName, vendorId, productId } = link
      set({ ...DISCONNECTED, status: 'connecting', link: { kind, productName, vendorId, productId } })
      await load(current)
    },
  }
}
