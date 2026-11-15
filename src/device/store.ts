// SPDX-License-Identifier: GPL-3.0-or-later
// Everything read from the connected keyboard, in one framework-free store. React reads it through
// ./useDevice; plugins get it through their device context.

import * as protocol from '../vendor/pipette/tauri-shim/protocol'
import { reloadKeychron } from '../vendor/pipette/tauri-shim/keychron-protocol'
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
import { createTransport, TransportError, type Transport } from './transport'

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
  /** "layer,knob,direction" → keycode; direction 0 is clockwise */
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
  /** null while loading, and for firmware without Keychron commands. */
  keychron: KeychronState | null
  /** Changes on their way to the keyboard. 0 means everything shown is saved on it. */
  writing: number
  /** Why the last change could not be written; cleared by the next one that succeeds. */
  writeError: string | null
  canUndo: boolean
  canRedo: boolean
}

/** One place a keycode can be assigned: a key, or one direction of a knob (0 is clockwise). */
export type Slot =
  | { kind: 'key'; layer: number; row: number; col: number }
  | { kind: 'knob'; layer: number; knob: number; direction: 0 | 1 }

interface Edit {
  slot: Slot
  from: number
  to: number
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
  keychron: null,
  writing: 0,
  writeError: null,
  canUndo: false,
  canRedo: false,
}

/** Lighting changes reach the keyboard at once but only survive a restart once saved; save after this pause. */
const LIGHTING_SAVE_DELAY_MS = 1500

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
  /** The request queue of the connected keyboard, for plugins and raw commands; null when disconnected. */
  readonly transport: Transport | null
}

export interface DeviceStoreOptions {
  /** Turns the keyboard's compressed definition into JSON text. */
  decompress: ProbeDecompress
}

export function createDeviceStore({ decompress }: DeviceStoreOptions): DeviceStore {
  let state = DISCONNECTED
  let session: { transport: Transport; link: HidLink } | null = null
  const listeners = new Set<() => void>()

  function set(patch: Partial<DeviceState>): void {
    state = { ...state, ...patch }
    for (const listener of [...listeners]) listener()
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
    })
  }

  async function readKeyboard(transport: Transport): Promise<{ keyboard: KeyboardData; layer: LayerState | null }> {
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

  function forget(): void {
    undoStack = []
    redoStack = []
    if (lightingSaveTimer) clearTimeout(lightingSaveTimer)
    lightingSaveTimer = null
  }

  /** Runs one write, keeping `writing` and `writeError` in step. Resolves with whether it reached the keyboard. */
  async function write(send: () => Promise<void>, applied: () => Partial<DeviceState>): Promise<boolean> {
    const current = session
    if (!current) return false
    set({ writing: state.writing + 1 })
    try {
      await send()
      if (session === current) set({ ...applied(), writing: state.writing - 1, writeError: null })
      return session === current
    } catch (error) {
      if (session === current) {
        set({ writing: state.writing - 1, writeError: error instanceof Error ? error.message : String(error) })
      }
      return false
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
    undoStack = [...undoStack, { slot, from, to: keycode }].slice(-UNDO_LIMIT)
    redoStack = []
    set(history())
  }

  async function step(from: 'undo' | 'redo'): Promise<void> {
    const edit = (from === 'undo' ? undoStack : redoStack).at(-1)
    if (!edit) return
    if (!(await writeKeycode(edit.slot, from === 'undo' ? edit.from : edit.to))) return
    if (from === 'undo') {
      undoStack = undoStack.filter((e) => e !== edit)
      redoStack = [...redoStack, edit]
    } else {
      redoStack = redoStack.filter((e) => e !== edit)
      undoStack = [...undoStack, edit]
    }
    set(history())
  }

  async function setLighting(change: LightingChange): Promise<void> {
    const now = state.lighting
    if (!now || now.kind !== 'vialrgb') return
    const next = { ...now, ...change }
    const sent = await write(
      () => protocol.setVialRGBMode(next.mode, next.speed, next.hue, next.sat, next.val),
      () => (state.lighting ? { lighting: { ...state.lighting, ...change } } : {}),
    )
    if (!sent) return
    if (lightingSaveTimer) clearTimeout(lightingSaveTimer)
    lightingSaveTimer = setTimeout(() => {
      lightingSaveTimer = null
      void write(() => protocol.saveLighting(), () => ({}))
    }, LIGHTING_SAVE_DELAY_MS)
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
    assign,
    undo: () => step('undo'),
    redo: () => step('redo'),
    setLighting,

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
