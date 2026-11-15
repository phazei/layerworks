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
  /** keymap[layer][row][col] */
  keymap: number[][][]
  /** knob[layer] = [clockwise, counter-clockwise] */
  knob: [number, number][]
  counts: { tapDance: number; combo: number; keyOverride: number; altRepeatKey: number; featureFlags: number }
  macroCount: number
  macros: number[]
  qsids: number[]
  /** null: the firmware has no Keychron commands. */
  keychron: { protocol: number; features: number; firmware: string } | null
  layer: { base: number; held: number }
  unlocked: boolean
}

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
    ...overrides,
  }
}

/** VialRGB effect numbers the fake keyboard has. */
export const RGB_EFFECTS = [1, 2, 3, 6, 13, 15, 22, 39]

const le16 = (v: number) => [v & 0xff, (v >> 8) & 0xff]
const be16 = (v: number) => [(v >> 8) & 0xff, v & 0xff]

/** The definition is not compressed here; pair it with `plainDefinition` as the store's decompress function. */
export async function plainDefinition(bytes: number[]): Promise<string> {
  return new TextDecoder().decode(Uint8Array.from(bytes))
}

/**
 * Answers the requests the device layer makes, from the given config. Writes (keys, knob, lighting) change the
 * config, so later reads see them.
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
        config.knob[request[2]][request[4]] = (request[5] << 8) | request[6]
        return []
      case 0x05:
        return [config.unlocked ? 1 : 0, 0, 0, 0, 1, 2, ...new Array<number>(26).fill(0xff)]
      case 0x09: {
        const from = request[2] | (request[3] << 8)
        const rest = config.qsids.filter((q) => q > from).flatMap(le16)
        return [...rest, ...new Array<number>(REPORT_LEN).fill(0xff)].slice(0, REPORT_LEN)
      }
      case 0x0a:
        return [0, request[2], 0, 0, 0]
      case 0x0d:
        if (request[2] === 0x00) {
          const { tapDance, combo, keyOverride, altRepeatKey, featureFlags } = config.counts
          const out = new Array<number>(REPORT_LEN).fill(0)
          out.splice(0, 4, tapDance, combo, keyOverride, altRepeatKey)
          out[REPORT_LEN - 1] = featureFlags
          return out
        }
        // Any entry: status 0, then the entry number as its first value so tests can tell them apart.
        return [0, request[3] + 1, 0]
      default:
        return Array.from(request)
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
        return request[1] === 0x01 ? [0xa7, 0x01, 0, 0, 0, 0, 0] : [0xa7, request[1], 1]
      default:
        return [0xff]
    }
  }

  return (request) => {
    switch (request[0]) {
      case 0xfe:
        return vial(request)
      case 0x01:
        return [0x01, 0x00, 0x09]
      case 0x02:
        return [0x02, request[1], 0, 0, 0, 0]
      case 0x05:
        config.keymap[request[1]][request[2]][request[3]] = (request[4] << 8) | request[5]
        return Array.from(request)
      case 0x07:
        if (request[1] === 0x41) {
          const [speed, hue, sat, val] = request.subarray(4, 8)
          config.rgb = { mode: request[2] | (request[3] << 8), speed, hue, sat, val }
        }
        return Array.from(request)
      case 0x09:
        return [0x09]
      case 0x08:
        if (request[1] === 0x40) return [0x08, 0x40, 1, 0, 200]
        if (request[1] === 0x41) {
          const { mode, speed, hue, sat, val } = config.rgb
          return [0x08, 0x41, ...le16(mode), speed, hue, sat, val]
        }
        if (request[1] === 0x42) {
          const from = request[2] | (request[3] << 8)
          const effects = RGB_EFFECTS.filter((e) => e > from).flatMap(le16)
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
