// SPDX-License-Identifier: GPL-3.0-or-later
// A HidLink with no hardware behind it, and a small Vial keyboard to put behind it.

import { REPORT_LEN, type HidLink, type LinkKind } from './link'

const XOR = 0x28

export function report(...bytes: number[]): Uint8Array {
  const out = new Uint8Array(REPORT_LEN)
  out.set(bytes.slice(0, REPORT_LEN))
  return out
}

const xor = (bytes: Uint8Array) => bytes.map((b) => b ^ XOR)

/** Answers one decoded request with a decoded reply, or nothing to stay silent. */
export type Responder = (request: Uint8Array) => Uint8Array | number[] | null | undefined

export class FakeLink implements HidLink {
  readonly vendorId = 0x3434
  readonly productName: string
  readonly productId: number
  /** Every request sent, decoded. */
  readonly requests: Uint8Array[] = []
  responder: Responder | null = null
  closed = false

  private reportListeners = new Set<(report: Uint8Array) => void>()
  private closeListeners = new Set<() => void>()

  constructor(readonly kind: LinkKind = 'cable') {
    this.productId = kind === 'cable' ? 0x0af0 : 0xd030
    this.productName = kind === 'cable' ? 'Keychron K15 Max' : 'Keychron Link'
  }

  async send(sent: Uint8Array): Promise<void> {
    if (this.closed) throw new Error('closed')
    const request = this.kind === 'receiver' ? xor(sent) : sent.slice()
    this.requests.push(request)
    const reply = this.responder?.(request)
    if (reply) queueMicrotask(() => this.reply(reply))
  }

  /** Delivers a reply the way this link carries replies (encoded through a receiver). */
  reply(bytes: Uint8Array | number[]): void {
    const decoded = report(...bytes)
    this.deliver(this.kind === 'receiver' ? xor(decoded) : decoded)
  }

  /** Delivers a report exactly as given: for pushes and receiver notices, which are never encoded. */
  deliver(raw: Uint8Array | number[]): void {
    const bytes = report(...raw)
    for (const listener of [...this.reportListeners]) listener(bytes)
  }

  /** The device goes away. */
  drop(): void {
    this.closed = true
    for (const listener of [...this.closeListeners]) listener()
  }

  onReport(listener: (report: Uint8Array) => void): () => void {
    this.reportListeners.add(listener)
    return () => this.reportListeners.delete(listener)
  }

  onClose(listener: () => void): () => void {
    this.closeListeners.add(listener)
    return () => this.closeListeners.delete(listener)
  }

  async close(): Promise<void> {
    this.drop()
  }
}

export interface FakeKeyboardConfig {
  name: string
  uid: number[]
  vialProtocol: number
  layers: number
  rows: number
  cols: number
  /** KLE rows for the definition. Labels are "row,col", or "idx,dir" + "e" for a knob. */
  kle: unknown[][]
  customKeycodes: { name: string; title: string; shortName: string }[]
  /** A complete Vial definition to serve instead of one built from name, rows, cols, kle and customKeycodes. */
  definition?: object
  /** VialRGB state: effect number, speed, hue, saturation, brightness. */
  rgb: { mode: number; speed: number; hue: number; sat: number; val: number }
  /** VialRGB effect numbers the keyboard lists (Off is implied). Default: RGB_EFFECTS. */
  rgbEffects?: number[]
  /** The brightness VialRGB reports as its maximum. Default: 200. */
  rgbMaxBrightness?: number
  /**
   * The lighting as last saved (EEPROM); `rgb` is what is running (RAM). Set from `rgb` when the fake starts. As in
   * vial-qmk's rgb_matrix.c, the first frame of a different effect reloads speed and colour from here.
   */
  rgbSaved?: { mode: number; speed: number; hue: number; sat: number; val: number }
  /** keymap[layer][row][col] */
  keymap: number[][][]
  /** knob[layer] = [counter-clockwise, clockwise] */
  knob: [number, number][]
  counts: { tapDance: number; combo: number; keyOverride: number; altRepeatKey: number; featureFlags: number }
  macroCount: number
  macros: number[]
  qsids: number[]
  /** QMK setting values written so far, by ID; a setting not written reads as its own ID in the first byte. */
  settingValues?: Record<number, number[]>
  /**
   * What Vial's settings reset (`0xFE 0x0C`) puts back, by ID. Without it, the reset forgets every value written,
   * so each setting reads as its own ID again.
   */
  settingDefaults?: Record<number, number[]>
  /**
   * Tap dance, combo, key override and alt repeat entries written so far, as the bytes after the status byte. An
   * entry not written reads as its number + 1 in the first byte, so tests can tell them apart.
   */
  entryBytes?: Partial<Record<EntryKind, number[][]>>
  /** VIA layout options. Default 0. */
  layoutOptions?: number
  /** null: the firmware has no Keychron commands. */
  keychron: FakeKeychron | null
  layer: { base: number; held: number }
  unlocked: boolean
  /** The keys to hold for unlocking, (row, col). */
  unlockKeys: [number, number][]
  /** Physical keys down right now, "row,col": what the switch matrix reports, and what unlocking checks. */
  held: Set<string>
}

export type EntryKind = 'tapDance' | 'combo' | 'keyOverride' | 'altRepeatKey'

export interface FakeKeychron {
  protocol: number
  features: number
  firmware: string
  /** Misc feature bits (`0xA7 0x01`); with them, the misc protocol version reads 2. Default 0: none. */
  misc?: number
  /** Wireless timers in seconds (`0xA7 0x0B/0x0C`): backlight off, sleep. */
  lpm?: { backlitTime: number; idleTime: number }
  /** Battery percent (`0xAC`); 0 on the cable, as the firmware reports it. */
  battery?: number
  /** Debounce (`0xA7 0x05/0x06`). */
  debounce?: { type: number; time: number }
  /** Snap Click pairs (`0xA7 0x07` – `0x0A`): the running table; its length is the number of slots. */
  snapClick?: { type: number; key1: number; key2: number }[]
  /** The Snap Click table as last saved (`0xA7 0x0A`). */
  snapClickSaved?: { type: number; key1: number; key2: number }[]
}

/** QK_BOOT in Vial protocol 6: the firmware turns it into 0 in knob and entry writes while locked. */
const QK_BOOT = 0x7c00

export function fakeKeyboardConfig(overrides: Partial<FakeKeyboardConfig> = {}): FakeKeyboardConfig {
  const layers = overrides.layers ?? 3
  const rows = 2
  const cols = 3
  return {
    name: 'Fake 6',
    uid: [1, 2, 3, 4, 5, 6, 7, 8],
    vialProtocol: 6,
    layers,
    rows,
    cols,
    kle: [
      ['0,0', '0,1', '0,2', '0,0\n\n\n\n\n\n\n\n\ne', '0,1\n\n\n\n\n\n\n\n\ne'],
      ['1,0', '1,1', '1,2'],
    ],
    customKeycodes: [{ name: 'CUSTOM_ONE', title: 'First custom key', shortName: 'Cst1' }],
    rgb: { mode: 22, speed: 128, hue: 10, sat: 255, val: 180 },
    keymap: Array.from({ length: layers }, (_, layer) =>
      Array.from({ length: rows }, (_, row) =>
        Array.from({ length: cols }, (_, col) => 4 + layer * rows * cols + row * cols + col),
      ),
    ),
    knob: Array.from({ length: layers }, () => [0x81, 0x80] as [number, number]),
    counts: { tapDance: 2, combo: 1, keyOverride: 1, altRepeatKey: 1, featureFlags: 0x03 },
    macroCount: 4,
    macros: Array.from({ length: 40 }, (_, i) => (i % 9 === 8 ? 0 : 0x61 + (i % 9))),
    qsids: [2, 7, 18],
    keychron: null,
    layer: { base: 0, held: 0 },
    unlocked: false,
    unlockKeys: [
      [0, 0],
      [1, 2],
    ],
    held: new Set(),
    ...overrides,
  }
}

const UNLOCK_COUNTER_MAX = 50

/** Dynamic entry kinds in the order of their get/set subcommands (1/2, 3/4, 5/6, 7/8). */
const ENTRY_KINDS: EntryKind[] = ['tapDance', 'combo', 'keyOverride', 'altRepeatKey']
/** Where each kind's keycodes sit in its bytes (u16 LE), the ones vial.c runs through its firewall. */
const ENTRY_KEYCODES: Record<EntryKind, number[]> = {
  tapDance: [0, 2, 4, 6],
  combo: [8],
  keyOverride: [2],
  altRepeatKey: [0, 2],
}

/** VialRGB effect numbers the fake keyboard has. */
export const RGB_EFFECTS = [1, 2, 3, 6, 13, 15, 22, 39]

const le16 = (v: number) => [v & 0xff, (v >> 8) & 0xff]
const be16 = (v: number) => [(v >> 8) & 0xff, v & 0xff]
const be32 = (v: number) => [...be16(Math.floor(v / 0x10000)), ...be16(v)]
const readBe32 = (bytes: Uint8Array, at: number) =>
  bytes[at] * 0x1000000 + (bytes[at + 1] << 16) + (bytes[at + 2] << 8) + bytes[at + 3]

/** The definition is not compressed here; pair it with `plainDefinition` as the store's decompress function. */
export async function plainDefinition(bytes: number[]): Promise<string> {
  return new TextDecoder().decode(Uint8Array.from(bytes))
}

/**
 * Answers the requests the device layer makes, from the given config. Writes (keys, knob, lighting, macros, tap
 * dance and the other entries, QMK settings and their reset, layout options, Keychron timers, debounce and Snap
 * Click) change the config, so
 * later reads see them. Locked, macro writes are ignored and QK_BOOT in knob and entry writes becomes 0, as in
 * vial-qmk.
 */
export function fakeKeyboard(config: FakeKeyboardConfig): Responder {
  const definition = new TextEncoder().encode(
    JSON.stringify(
      config.definition ?? {
        name: config.name,
        matrix: { rows: config.rows, cols: config.cols },
        layouts: { keymap: config.kle },
        lighting: 'vialrgb',
        customKeycodes: config.customKeycodes,
      },
    ),
  )
  const keymapBytes = () => config.keymap.flat(2).flatMap(be16)
  config.rgbSaved ??= { ...config.rgb }
  /** vial.c's vial_keycode_firewall: QK_BOOT only goes in while unlocked. */
  const firewall = (code: number) => (code === QK_BOOT && !config.unlocked ? 0 : code)

  // Unlock as vial-qmk does it (quantum/vial.c): 50 steps, one per poll while every unlock key is held and more
  // than 100 ms have passed since the last step; any other poll starts the count again.
  const unlock = { inProgress: false, counter: UNLOCK_COUNTER_MAX, timer: 0 }
  const holdingUnlockKeys = () => config.unlockKeys.every(([row, col]) => config.held.has(`${row},${col}`))

  const matrixState = (): number[] => {
    const bytesPerRow = Math.ceil(config.cols / 8)
    const out: number[] = []
    for (let row = 0; row < config.rows; row++) {
      let bits = 0
      for (let col = 0; col < config.cols; col++) if (config.held.has(`${row},${col}`)) bits += 2 ** col
      for (let i = bytesPerRow - 1; i >= 0; i--) out.push(Math.floor(bits / 256 ** i) % 256)
    }
    return [0x02, 0x03, ...out]
  }

  const vial = (request: Uint8Array): number[] => {
    switch (request[1]) {
      case 0x00:
        return [config.vialProtocol, 0, 0, 0, ...config.uid]
      case 0x01:
        return [definition.length & 0xff, definition.length >> 8, 0, 0]
      case 0x02: {
        const block = request[2] | (request[3] << 8)
        return Array.from(definition.subarray(block * REPORT_LEN, (block + 1) * REPORT_LEN))
      }
      case 0x03: {
        const [cw, ccw] = config.knob[request[2]]
        return [...be16(cw), ...be16(ccw)]
      }
      case 0x04:
        config.knob[request[2]][request[4]] = firewall((request[5] << 8) | request[6])
        return []
      case 0x05: {
        const out = new Array<number>(REPORT_LEN).fill(0xff)
        out[0] = config.unlocked ? 1 : 0
        out[1] = unlock.inProgress ? 1 : 0
        config.unlockKeys.forEach(([row, col], i) => out.splice(2 + i * 2, 2, row, col))
        return out
      }
      case 0x06:
        unlock.inProgress = true
        unlock.counter = UNLOCK_COUNTER_MAX
        unlock.timer = Date.now()
        return Array.from(request)
      case 0x07:
        if (unlock.inProgress) {
          if (Date.now() - unlock.timer > 100 && holdingUnlockKeys()) {
            unlock.timer = Date.now()
            if (--unlock.counter === 0) {
              unlock.inProgress = false
              config.unlocked = true
            }
          } else {
            unlock.counter = UNLOCK_COUNTER_MAX
          }
        }
        return [config.unlocked ? 1 : 0, unlock.inProgress ? 1 : 0, unlock.counter]
      case 0x08:
        config.unlocked = false
        return Array.from(request)
      case 0x09: {
        const from = request[2] | (request[3] << 8)
        const rest = config.qsids.filter((q) => q > from).flatMap(le16)
        return [...rest, ...new Array<number>(REPORT_LEN).fill(0xff)].slice(0, REPORT_LEN)
      }
      case 0x0a: {
        const qsid = request[2] | (request[3] << 8)
        if (!config.qsids.includes(qsid)) return [1]
        return [0, ...(config.settingValues?.[qsid] ?? [request[2], 0, 0, 0])]
      }
      case 0x0b: {
        const qsid = request[2] | (request[3] << 8)
        if (!config.qsids.includes(qsid)) return [1]
        config.settingValues = { ...config.settingValues, [qsid]: Array.from(request.subarray(4)) }
        return [0]
      }
      case 0x0c:
        // qmk_settings_reset: every setting back to the firmware's defaults; the request comes back unchanged.
        config.settingValues = structuredClone(config.settingDefaults ?? {})
        return Array.from(request)
      case 0x0d: {
        if (request[2] === 0x00) {
          const { tapDance, combo, keyOverride, altRepeatKey, featureFlags } = config.counts
          const out = new Array<number>(REPORT_LEN).fill(0)
          out.splice(0, 4, tapDance, combo, keyOverride, altRepeatKey)
          out[REPORT_LEN - 1] = featureFlags
          return out
        }
        const kind = ENTRY_KINDS[(request[2] - 1) >> 1]
        const index = request[3]
        if (!kind || index >= config.counts[kind]) return [1]
        const stored = (config.entryBytes ??= {})[kind] ?? []
        if (request[2] % 2 === 1) return [0, ...(stored[index] ?? [index + 1, 0])]
        const bytes = Array.from(request.subarray(4))
        for (const at of ENTRY_KEYCODES[kind]) {
          const code = firewall(bytes[at] | (bytes[at + 1] << 8))
          bytes.splice(at, 2, code & 0xff, code >> 8)
        }
        stored[index] = bytes
        config.entryBytes[kind] = stored
        return [0]
      }
      default:
        return Array.from(request)
    }
  }

  /** Keychron's misc group (`0xA7`): reply `[0xA7, sub, status, ...]`, status 0 for success. */
  const keychronMisc = (kc: FakeKeychron, request: Uint8Array): number[] => {
    const sub = request[1]
    const misc = kc.misc ?? 0
    const ok = (...data: number[]) => [0xa7, sub, 0, ...data]
    const fail = [0xa7, sub, 1]
    switch (sub) {
      case 0x01:
        return misc ? ok(2, 0, misc & 0xff, misc >> 8) : [0xa7, 0x01, 0, 0, 0, 0, 0]
      case 0x05:
        return kc.debounce ? ok(0, kc.debounce.type, kc.debounce.time) : fail
      case 0x06:
        if (!kc.debounce) return fail
        kc.debounce = { type: request[2], time: request[3] }
        return ok()
      case 0x07:
        return kc.snapClick ? ok(kc.snapClick.length) : fail
      case 0x08: {
        // snap_click.c: start, count (at most 9), then type, key 1, key 2 per pair.
        const [start, count] = [request[2], request[3]]
        if (!kc.snapClick || count > 9 || start + count > kc.snapClick.length) return fail
        return ok(...kc.snapClick.slice(start, start + count).flatMap((p) => [p.type, p.key1, p.key2]))
      }
      case 0x09: {
        // Checked as the firmware does (a type it knows; both keys for a used pair), then changed in RAM only.
        const [start, count] = [request[2], request[3]]
        if (!kc.snapClick || count > 9 || start + count > kc.snapClick.length) return fail
        const pairs = Array.from({ length: count }, (_, i) => {
          const [type, key1, key2] = request.subarray(4 + i * 3, 7 + i * 3)
          return { type, key1, key2 }
        })
        if (pairs.some((p) => p.type > 5 || (p.type !== 0 && (p.key1 === 0 || p.key2 === 0)))) return fail
        kc.snapClick.splice(start, count, ...pairs)
        return ok()
      }
      case 0x0a:
        if (!kc.snapClick) return fail
        kc.snapClickSaved = structuredClone(kc.snapClick)
        return ok()
      case 0x0b:
        return kc.lpm ? ok(...le16(kc.lpm.backlitTime), ...le16(kc.lpm.idleTime)) : fail
      case 0x0c: {
        // The firmware refuses a backlight time under 5 s or a sleep time under 60 s, and saves on success.
        const backlitTime = request[2] | (request[3] << 8)
        const idleTime = request[4] | (request[5] << 8)
        if (!kc.lpm || backlitTime < 5 || idleTime < 60) return fail
        kc.lpm = { backlitTime, idleTime }
        return ok()
      }
      default:
        return fail
    }
  }

  const keychron = (request: Uint8Array): number[] => {
    const kc = config.keychron
    if (!kc) return [0xff]
    switch (request[0]) {
      case 0xa0:
        return [0xa0, kc.protocol]
      case 0xa1:
        return [0xa1, ...Array.from(kc.firmware, (c) => c.charCodeAt(0))]
      case 0xa2:
        return [0xa2, 0, ...le16(kc.features)]
      case 0xa3:
        return [0xa3, config.layer.base, config.layer.held]
      case 0xa7:
        return keychronMisc(kc, request)
      case 0xac:
        return [0xac, kc.battery ?? 0]
      default:
        return [0xff]
    }
  }

  /** While unlocking, the firmware answers only these Vial commands and sends everything else back unchanged. */
  const ANSWERED_WHILE_UNLOCKING = [0x00, 0x01, 0x02, 0x05, 0x06, 0x07]

  return (request) => {
    if (unlock.inProgress && !(request[0] === 0xfe && ANSWERED_WHILE_UNLOCKING.includes(request[1]))) {
      return Array.from(request)
    }
    switch (request[0]) {
      case 0xfe:
        return vial(request)
      case 0x01:
        return [0x01, 0x00, 0x09]
      case 0x02:
        // The switch matrix only while unlocked; locked, the request comes back with every key up.
        if (request[1] === 0x03) return config.unlocked ? matrixState() : Array.from(request)
        if (request[1] === 0x02) return [0x02, 0x02, ...be32(config.layoutOptions ?? 0)]
        return [0x02, request[1], 0, 0, 0, 0]
      case 0x03:
        if (request[1] === 0x02) config.layoutOptions = readBe32(request, 2)
        return Array.from(request)
      case 0x05:
        config.keymap[request[1]][request[2]][request[3]] = (request[4] << 8) | request[5]
        return Array.from(request)
      case 0x07:
        if (request[1] === 0x41) {
          // vialrgb.c: set the mode (0 turns the lights off), the speed, then the colour, which
          // rgb_matrix_sethsv ignores while the lights are off.
          const [speed, hue, sat, val] = request.subarray(4, 8)
          const mode = request[2] | (request[3] << 8)
          const before = config.rgb
          config.rgb = mode === 0 ? { ...before, mode, speed } : { mode, speed, hue, sat, val }
          // rgb_matrix.c: the first frame of a different effect (off counts as one) reloads speed and colour from
          // EEPROM, over what was just sent. The firmware does it on its next frame; here, at once.
          if (mode !== before.mode) {
            const saved = config.rgbSaved!
            config.rgb = { ...config.rgb, speed: saved.speed, hue: saved.hue, sat: saved.sat, val: saved.val }
          }
        }
        return Array.from(request)
      case 0x09:
        // vialrgb_save: the running lighting goes to EEPROM.
        config.rgbSaved = { ...config.rgb }
        return [0x09]
      case 0x08:
        if (request[1] === 0x40) return [0x08, 0x40, 1, 0, config.rgbMaxBrightness ?? 200]
        if (request[1] === 0x41) {
          const { mode, speed, hue, sat, val } = config.rgb
          return [0x08, 0x41, ...le16(mode), speed, hue, sat, val]
        }
        if (request[1] === 0x42) {
          const from = request[2] | (request[3] << 8)
          const effects = (config.rgbEffects ?? RGB_EFFECTS).filter((e) => e > from).flatMap(le16)
          return [0x08, 0x42, ...effects, ...new Array<number>(REPORT_LEN).fill(0xff)].slice(0, REPORT_LEN)
        }
        return [0x08, request[1]]
      case 0x0c:
        return [0x0c, config.macroCount]
      case 0x0d:
        return [0x0d, ...be16(config.macros.length)]
      case 0x0e: {
        const offset = (request[1] << 8) | request[2]
        return [0x0e, request[1], request[2], request[3], ...config.macros.slice(offset, offset + request[3])]
      }
      case 0x0f: {
        // via.c: macro writes are skipped until unlocked, and the request comes back unchanged either way.
        const offset = (request[1] << 8) | request[2]
        const size = request[3]
        if (config.unlocked && size <= 28 && offset + size <= config.macros.length) {
          config.macros.splice(offset, size, ...request.subarray(4, 4 + size))
        }
        return Array.from(request)
      }
      case 0x11:
        return [0x11, config.layers]
      case 0x12: {
        const offset = (request[1] << 8) | request[2]
        return [0x12, request[1], request[2], request[3], ...keymapBytes().slice(offset, offset + request[3])]
      }
      default:
        return request[0] >= 0xa0 && request[0] <= 0xaf ? keychron(request) : [0xff]
    }
  }
}
