// SPDX-License-Identifier: GPL-3.0-or-later
// Everything read from the connected keyboard, in one framework-free store. React reads it through
// ./useDevice; plugins get it through their device context.

import * as protocol from '../vendor/pipette/tauri-shim/protocol'
import {
  reloadKeychron,
  setKeychronDebounce,
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
import { LAYER_PUSH, parseLayerReport, type LayerState } from './pushes'
import { pollMatrix, type MatrixPoller } from './matrix'
import { createTransport, TransportError, type Transport } from './transport'
import { parseUnlockStatus, runUnlock, statusRequest, type UnlockProgress } from './unlock'
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
  /** Why the last change could not be written; cleared by the next one that succeeds. */
  writeError: string | null
  canUndo: boolean
  canRedo: boolean
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
}

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
  failed: { part: RestorePart; what: string; error: string }[]
  /** Writes not attempted because the keyboard is locked. */
  skipped: { part: RestorePart; what: string }[]
  /** The keyboard went away part-way: everything after `written` was not written. */
  stopped: boolean
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
  writeError: null,
  canUndo: false,
  canRedo: false,
}

/** Lighting changes reach the keyboard at once but only survive a restart once saved; save after this pause. */
const LIGHTING_SAVE_DELAY_MS = 1500

const NOT_CONNECTED = 'The keyboard is not connected'

/** VIA's macro buffer write: [0x0F, offset (big-endian), size, up to 28 bytes]. */
const VIA_MACRO_SET_BUFFER = 0x0f
const MACRO_CHUNK = 28

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
  /** Locks the keyboard again. */
  lock(): Promise<void>
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
   * Reads every key straight from the keyboard while it is unlocked; `listener` gets the keys down ("row,col")
   * whenever they change. Polling runs while anyone watches and the keyboard is unlocked, and stops when the last
   * watcher leaves, the keyboard locks or goes away. Returns the stop function.
   */
  watchMatrix(listener: (down: ReadonlySet<string>) => void): () => void
  /** The request queue of the connected keyboard, for plugins and raw commands; null when disconnected. */
  readonly transport: Transport | null
}

export type UnlockResult = 'unlocked' | 'disconnected' | 'failed'

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

  async function readRest(current: typeof session, keyboard: KeyboardData): Promise<void> {
    for (const part of LOAD_PARTS) {
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

  let changes: Promise<unknown> = Promise.resolve()

  /** Changes run one at a time, so each starts from the result of the one before, however fast they are asked for. */
  function inOrder<T>(change: () => Promise<T>): Promise<T> {
    const done = changes.then(change, change)
    changes = done.catch(() => undefined)
    return done
  }

  function forget(): void {
    undoStack = []
    redoStack = []
    if (lightingSaveTimer) clearTimeout(lightingSaveTimer)
    lightingSaveTimer = null
  }

  /** Runs one write, keeping `writing` and `writeError` in step. Resolves with whether it reached the keyboard. */
  async function write(send: () => Promise<void>, applied: () => Partial<DeviceState>): Promise<boolean> {
    return (await writeOrError(send, applied)) === null
  }

  /** `write`, resolving with why it failed, or null when it reached the keyboard. */
  async function writeOrError(send: () => Promise<void>, applied: () => Partial<DeviceState>): Promise<string | null> {
    const current = session
    if (!current) return NOT_CONNECTED
    set({ writing: state.writing + 1 })
    try {
      await send()
      if (session !== current) return NOT_CONNECTED
      set({ ...applied(), writing: state.writing - 1, writeError: null })
      return null
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      if (session === current) set({ writing: state.writing - 1, writeError: message })
      return message
    }
  }

  function writeKeycode(slot: Slot, keycode: number): Promise<boolean> {
    return write(
      () =>
        slot.kind === 'key'
          ? protocol.setKeycode(slot.layer, slot.row, slot.col, keycode)
          : protocol.setEncoder(slot.layer, slot.knob, slot.direction, keycode),
      () => (state.keyboard ? { keyboard: withKeycode(state.keyboard, slot, keycode) } : {}),
    )
  }

  const history = () => ({ canUndo: undoStack.length > 0, canRedo: redoStack.length > 0 })

  async function assign(slot: Slot, keycode: number): Promise<void> {
    if (!state.keyboard) return
    const from = slotKeycode(state.keyboard, slot)
    if (from === keycode) return
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
    if (edit.macros) {
      // Locked, the keyboard would ignore the write: say so and keep the step.
      if (!state.unlock?.unlocked) {
        set({ writeError: MACRO_UNDO_LOCKED })
        return
      }
      const [before, after] = from === 'undo' ? [edit.macros.to, edit.macros.from] : [edit.macros.from, edit.macros.to]
      if (!(await writeMacroBuffer(before, after))) return
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

  async function setLighting(change: LightingChange): Promise<void> {
    const now = state.lighting
    if (!now || now.kind !== 'vialrgb') return
    const next = { ...now, ...change }
    const sent = await write(
      () => sendLighting(now.mode, next),
      () => (state.lighting ? { lighting: { ...state.lighting, ...change } } : {}),
    )
    if (!sent) return
    if (lightingSaveTimer) clearTimeout(lightingSaveTimer)
    lightingSaveTimer = setTimeout(() => {
      lightingSaveTimer = null
      void write(() => protocol.saveLighting(), () => ({}))
    }, LIGHTING_SAVE_DELAY_MS)
  }

  async function refreshLighting(): Promise<void> {
    const current = session
    if (!current || state.lighting?.kind !== 'vialrgb') return
    try {
      const values = await protocol.getVialRGBMode()
      if (session === current && state.lighting) set({ lighting: { ...state.lighting, ...values } })
    } catch {
      // A missed refresh leaves the values as they were; the next one or the next change puts them right.
    }
  }

  /**
   * Writes the macro buffer, only the 28-byte pieces that differ from `before` (what the keyboard holds), then
   * shows it. Locked, the keyboard would ignore it: callers check first.
   */
  function writeMacroBuffer(before: number[], after: number[]): Promise<boolean> {
    return write(
      async () => {
        const transport = session?.transport
        if (!transport) throw new Error(NOT_CONNECTED)
        for (let offset = 0; offset < after.length; offset += MACRO_CHUNK) {
          const chunk = after.slice(offset, offset + MACRO_CHUNK)
          if (chunk.every((b, i) => before[offset + i] === b)) continue
          await transport.request([VIA_MACRO_SET_BUFFER, offset >> 8, offset & 0xff, chunk.length, ...chunk])
        }
      },
      () => ({ macros: [...after] }),
    )
  }

  async function saveMacro(index: number, steps: MacroStep[]): Promise<MacroSaveResult> {
    const kb = state.keyboard
    const buffer = state.macros
    if (!kb || !buffer || index < 0 || index >= kb.macroCount) return 'invalid'
    if (steps.some((s) => stepProblem(s, kb.vialProtocol) !== null)) return 'invalid'
    const bytes = encodeMacro(steps, kb.vialProtocol)
    const now = rawMacros(buffer, kb.macroCount)[index]
    if (now.length === bytes.length && now.every((b, i) => b === bytes[i])) return 'unchanged'
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

  async function runUnlockFlow(): Promise<UnlockResult> {
    const current = session
    if (!current) return 'disconnected'
    if (state.unlock?.unlocked) return 'unlocked'
    let started = false
    try {
      const status = await runUnlock({
        transport: current.transport,
        onProgress: (progress) => {
          started = true
          if (session === current) set({ unlocking: progress })
        },
      })
      if (session !== current) return 'disconnected'
      set({ unlock: status, unlocking: null })
      set({ capabilities: capabilities() })
      return 'unlocked'
    } catch (error) {
      if (session !== current || (error instanceof TransportError && error.reason === 'disconnected')) {
        return 'disconnected'
      }
      // Only reached before the keyboard started counting (or when it refused to start): it still works.
      console.warn(`[device] unlock ${started ? 'stopped' : 'did not start'}:`, error)
      set({ unlocking: null })
      return 'failed'
    }
  }

  function unlock(): Promise<UnlockResult> {
    unlocking ??= runUnlockFlow().finally(() => {
      unlocking = null
    })
    return unlocking
  }

  async function lock(): Promise<void> {
    if (!state.unlock?.unlocked) return
    const sent = await write(
      () => protocol.lock(),
      () => (state.unlock ? { unlock: { ...state.unlock, unlocked: false } } : {}),
    )
    if (sent) set({ capabilities: capabilities() })
  }

  async function restore(plan: RestorePlan, onProgress?: (progress: RestoreProgress) => void): Promise<RestoreReport> {
    const report: RestoreReport = { written: {}, failed: [], skipped: [], stopped: false, undoable: false }
    const current = session
    if (!current || !state.keyboard) return { ...report, stopped: true }
    // Locked, vial-qmk ignores macro writes and turns QK_BOOT into "nothing" in knob and entry writes (vial.c,
    // via.c). Those are skipped rather than written wrong; keys with QK_BOOT too, as Vial itself asks first.
    const unlocked = state.unlock?.unlocked === true
    const boot = bootKeycode()

    interface Step extends WriteJob {
      part: RestorePart
      what: string
      needsUnlock: boolean
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
      steps.push({
        part,
        what,
        needsUnlock: to === boot,
        send: async () => {
          const kb = state.keyboard
          if (!kb) return
          const from = slotKeycode(kb, slot)
          if (from === to) return
          await (slot.kind === 'key'
            ? protocol.setKeycode(slot.layer, slot.row, slot.col, to)
            : protocol.setEncoder(slot.layer, slot.knob, slot.direction, to))
          written.push({ slot, from, to })
        },
        applied: () => (state.keyboard ? { keyboard: withKeycode(state.keyboard, slot, to) } : {}),
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
        send: () => protocol.setMacroBuffer(buffer),
        applied: () => ({ macros: [...buffer] }),
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
        })
      }
    }

    for (const { qsid, value } of plan.settings) {
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
        what: 'debounce',
        needsUnlock: false,
        send: async () => {
          if (!(await setKeychronDebounce(type, time))) throw new Error('The keyboard refused the debounce setting.')
        },
        applied: () => (state.keychron ? { keychron: { ...state.keychron, debounceType: type, debounceTime: time } } : {}),
      })
    }

    const todo = steps.filter((s) => {
      if (unlocked || !s.needsUnlock) return true
      report.skipped.push({ part: s.part, what: s.what })
      return false
    })
    onProgress?.({ done: 0, total: todo.length })
    for (const [i, s] of todo.entries()) {
      const error = await writeOrError(s.send, s.applied)
      if (session !== current) {
        report.stopped = true
        break
      }
      if (error === null) report.written[s.part] = (report.written[s.part] ?? 0) + 1
      else report.failed.push({ part: s.part, what: s.what, error })
      onProgress?.({ done: i + 1, total: todo.length })
    }

    if (session === current) {
      if (written.length > 0) {
        remember({ changes: written })
        report.undoable = true
      }
      set({ capabilities: capabilities() })
    }
    return report
  }

  /** The write of Keychron's wireless timers; the keyboard answers with a status and saves them itself. */
  function wirelessWrite(timers: WirelessTimers): WriteJob {
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
    }
  }

  async function setWirelessTimers(timers: WirelessTimers): Promise<void> {
    if (!state.keychron?.hasWireless) return
    const { send, applied } = wirelessWrite(timers)
    await write(send, applied)
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
    assign: (slot, keycode) => inOrder(() => assign(slot, keycode)),
    undo: () => inOrder(() => step('undo')),
    redo: () => inOrder(() => step('redo')),
    setLighting: (change) => inOrder(() => setLighting(change)),
    refreshLighting: () => inOrder(refreshLighting),
    unlock,
    lock: () => inOrder(lock),
    saveMacro: (index, steps) => inOrder(() => saveMacro(index, steps)),
    saveEntry: (kind, index, entry) => inOrder(() => saveEntry(kind, index, entry)),
    restore: (plan, onProgress) => inOrder(() => restore(plan, onProgress)),
    setWirelessTimers: (timers) => inOrder(() => setWirelessTimers(timers)),
    watchMatrix,

    async connect(link) {
      await disconnect()
      const transport = createTransport(link)
      const current = (session = { transport, link })
      // The vendored protocol code sends through one module-level transport, so one keyboard at a time.
      setTransport({ sendReceive: (data) => transport.request(data), send: (data) => transport.send(data) })

      link.onClose(() => {
        if (session !== current) return
        forget()
        session = null
        transport.stop()
        set(DISCONNECTED)
      })
      transport.onPush(LAYER_PUSH, (report) => {
        if (session === current) set({ layer: parseLayerReport(report) })
      })

      const { kind, productName, vendorId, productId } = link
      set({ ...DISCONNECTED, status: 'connecting', link: { kind, productName, vendorId, productId } })

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
        set({ ...DISCONNECTED, status: 'error', error: error instanceof Error ? error.message : String(error) })
      }
    },
  }
}
