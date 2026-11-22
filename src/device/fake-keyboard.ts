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
  readonly vendorId: number
  readonly productName: string
  readonly productId: number
  /** Every request sent, decoded. */
  readonly requests: Uint8Array[] = []
  responder: Responder | null = null
  closed = false

  private reportListeners = new Set<(report: Uint8Array) => void>()
  private closeListeners = new Set<() => void>()

  /**
   * A K15 Max on the cable, or Keychron's receiver; `usb` gives another keyboard's USB identity on the cable (what
   * WebHID reports: vendor and product ID, the product name from the firmware's USB descriptor).
   */
  constructor(
    readonly kind: LinkKind = 'cable',
    usb?: { vendorId: number; productId: number; productName: string },
  ) {
    this.vendorId = usb?.vendorId ?? 0x3434
    this.productId = usb?.productId ?? (kind === 'cable' ? 0x0af0 : 0xd030)
    this.productName = usb?.productName ?? (kind === 'cable' ? 'Keychron K15 Max' : 'Keychron Link')
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
  /** Several knobs: knobs[layer][index] = [counter-clockwise, clockwise]. When given, used instead of knob. */
  knobs?: [number, number][][]
  /**
   * false: firmware built without ENCODER_MAP_ENABLE, which leaves Vial's knob commands unhandled and sends the
   * request back unchanged (vial-qmk quantum/vial.c, vial_get_encoder / vial_set_encoder). Default true.
   */
  knobMap?: boolean
  /**
   * The keymap and knob built into the firmware, which VIA's keymap reset (`0x06`) puts back. Set from `keymap` and
   * `knob` when the fake starts.
   */
  firmwareKeymap?: number[][][]
  firmwareKnob?: [number, number][]
  firmwareKnobs?: [number, number][][]
  /** A Vial build with VIAL_INSECURE: no bootloader jump (`0x0B` is an unknown command). */
  insecure?: boolean
  /** Called when the keyboard takes the bootloader jump: it is about to leave USB (the demo drops the link). */
  onBootloaderJump?: () => void
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
  /** Keychron's own lighting (`0xA8`, feature bit 0x80): per-key colours and mixed zones. */
  rgb?: FakeKeychronRgb
  /**
   * N-key rollover (`0xA7 0x12` / `0x13`, with feature bit 0x0200 or misc bit 0x80): the reply's state byte, as
   * keychron/common/nkro.c builds it: bit 0 on, bit 1 switchable, bit 2 adaptive. Setting it fails unless
   * switchable, as on firmware with adaptive N-key rollover (the K15 Max).
   */
  nkro?: number
}

export interface FakeKeychronRgb {
  /** ledAt[row][col]: the LED under each key, 0xFF for none (rgb.c's g_led_config). */
  ledAt: number[][]
  /** One [hue, saturation, value] per LED. */
  colours: [number, number, number][]
  style: number
  /** The zone of each LED; the number of zones is `effects.length`. */
  regions: number[]
  /** effects[zone][slot] */
  effects: { effect: number; hue: number; sat: number; speed: number; time: number }[][]
  /** The keyboard's own number of its mixed effect: zone effects must be below it (keychron_rgb.c). */
  mixedEffect: number
  /**
   * The lock lights (`0xA8 0x03/0x04`): which the keyboard has (bits: Num, Caps, Scroll, Compose, Kana), which are
   * off, and their colour. Default: Caps Lock only, all on, white, as keychron_rgb.c starts out.
   */
  indicators?: { available: number; disable: number; hue: number; sat: number; val: number }
  /** What the save command (`0xA8 0x02`) last kept. */
  saved?: {
    colours: [number, number, number][]
    style: number
    regions: number[]
    effects: FakeKeychronRgb['effects']
    indicators?: FakeKeychronRgb['indicators']
  }
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
 * dance and the other entries, QMK settings and their reset, layout options, Keychron timers, debounce, Snap Click,
 * key lighting and lock lights, the keymap and macro resets) change the config, so
 * later reads see them. Locked, macro writes are ignored and QK_BOOT in knob and entry writes becomes 0, as in
 * vial-qmk.
 */
/**
 * A knob's two directions on a layer, as the fake keeps them (to read or change in place): knobs where given, else
 * knob, which ignores the index (one knob). undefined for a layer or knob the keyboard doesn't have.
 */
export function knobAt(config: FakeKeyboardConfig, layer: number, index: number): [number, number] | undefined {
  return config.knobs ? config.knobs[layer]?.[index] : config.knob[layer]
}

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
  config.firmwareKeymap ??= structuredClone(config.keymap)
  config.firmwareKnob ??= structuredClone(config.knob)
  if (config.knobs) config.firmwareKnobs ??= structuredClone(config.knobs)

  /**
   * dynamic_keymap_reset (quantum/dynamic_keymap.c): every layer's keys and the knob from the firmware's keymap, the
   * QMK settings to their defaults, and every entry emptied as the firmware writes it: tap dance with TAPPING_TERM
   * (200 ms), key overrides on every layer with the three activation options and switched off. Macros, lighting
   * and the Keychron settings stay.
   */
  const resetKeymap = () => {
    config.keymap = structuredClone(config.firmwareKeymap!)
    config.knob = structuredClone(config.firmwareKnob!)
    if (config.firmwareKnobs) config.knobs = structuredClone(config.firmwareKnobs)
    config.settingValues = structuredClone(config.settingDefaults ?? {})
    const empty: Record<EntryKind, number[]> = {
      tapDance: [0, 0, 0, 0, 0, 0, 0, 0, ...le16(200)],
      combo: new Array<number>(10).fill(0),
      keyOverride: [0, 0, 0, 0, 0xff, 0xff, 0, 0, 0, 0x07],
      altRepeatKey: new Array<number>(6).fill(0),
    }
    config.entryBytes = Object.fromEntries(
      ENTRY_KINDS.map((kind) => [kind, Array.from({ length: config.counts[kind] }, () => [...empty[kind]])]),
    )
  }
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
        if (config.knobMap === false) return Array.from(request)
        const [cw, ccw] = knobAt(config, request[2], request[3]) ?? [0, 0]
        return [...be16(cw), ...be16(ccw)]
      }
      case 0x04: {
        if (config.knobMap === false) return Array.from(request)
        const pair = knobAt(config, request[2], request[3])
        if (pair) pair[request[4]] = firewall((request[5] << 8) | request[6])
        return []
      }
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
      case 0x12:
        return kc.nkro === undefined ? fail : ok(kc.nkro)
      case 0x13:
        if (kc.nkro === undefined || !(kc.nkro & 0x02) || request[2] > 1) return fail
        kc.nkro = (kc.nkro & ~0x01) | request[2]
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

  /**
   * Keychron's lighting group (`0xA8`), as keychron_rgb.c answers it: `[0xA8, sub, status, ...data]`, status 1
   * for anything it refuses, with the same limits (9 colours, 29 / 28 zones, 3 effects to a packet).
   */
  const keychronRgb = (rgb: FakeKeychronRgb, request: Uint8Array): number[] => {
    const sub = request[1]
    const ok = (...data: number[]) => [0xa8, sub, 0, ...data]
    const fail = [0xa8, sub, 1]
    const leds = rgb.colours.length
    const zones = rgb.effects.length
    const slots = rgb.effects[0]?.length ?? 0
    const [a, b, c] = [request[2], request[3], request[4]]
    const lights = () => (rgb.indicators ??= { available: 0x02, disable: 0, hue: 0xff, sat: 0, val: 0xff })
    switch (sub) {
      case 0x01:
        return ok(1, 0)
      case 0x02:
        rgb.saved = structuredClone({ colours: rgb.colours, style: rgb.style, regions: rgb.regions, effects: rgb.effects, indicators: lights() })
        return ok()
      case 0x03: {
        const { available, disable, hue, sat, val } = lights()
        return ok(available, disable, hue, sat, val)
      }
      case 0x04:
        // set_indicators_config: taken as sent, the brightness raised to 128 at least.
        rgb.indicators = { ...lights(), disable: a, hue: b, sat: c, val: Math.max(128, request[5]) }
        return ok()
      case 0x05:
        return ok(leds)
      case 0x06: {
        // row, then a 3-byte column mask; one LED index per column, 0xFF for none. Rows past the matrix fail.
        const row = rgb.ledAt[a]
        if (!row) return fail
        return ok(...row)
      }
      case 0x07:
        return ok(rgb.style)
      case 0x08:
        if (a >= 5) return fail
        rgb.style = a
        return ok()
      case 0x09:
        if (b > 9) return fail
        return ok(...rgb.colours.slice(a, a + b).flat())
      case 0x0a:
        if (b > 9 || a + b > leds) return fail
        for (let i = 0; i < b; i++) rgb.colours[a + i] = [request[4 + i * 3], request[5 + i * 3], request[6 + i * 3]]
        return ok()
      case 0x0b:
        return ok(zones, slots)
      case 0x0c:
        if (b > 29 || a + b > leds) return fail
        return ok(...rgb.regions.slice(a, a + b))
      case 0x0d: {
        if (b > 28 || a + b > leds) return fail
        const values = Array.from(request.subarray(4, 4 + b))
        if (values.some((z) => z >= zones)) return fail
        rgb.regions.splice(a, b, ...values)
        return ok()
      }
      case 0x0e: {
        if (c > 3 || a >= zones || b + c > slots) return fail
        return ok(
          ...rgb.effects[a].slice(b, b + c).flatMap((e) => [e.effect, e.hue, e.sat, e.speed, ...le16(e.time & 0xffff), ...le16(e.time >>> 16)]),
        )
      }
      case 0x0f: {
        if (c > 3 || a >= zones || b + c > slots) return fail
        const records = Array.from({ length: c }, (_, i) => {
          const r = request.subarray(5 + i * 8, 13 + i * 8)
          return { effect: r[0], hue: r[1], sat: r[2], speed: r[3], time: (r[4] | (r[5] << 8) | (r[6] << 16) | (r[7] << 24)) >>> 0 }
        })
        if (records.some((r) => r.effect >= rgb.mixedEffect)) return fail
        rgb.effects[a].splice(b, c, ...records)
        return ok()
      }
      default:
        return [0xff]
    }
  }

  const keychron = (request: Uint8Array): number[] => {
    const kc = config.keychron
    if (!kc) return [0xff]
    if (request[0] === 0xa8) return kc.rgb ? keychronRgb(kc.rgb, request) : [0xff]
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
      case 0x04: {
        // via.c id_dynamic_keymap_get_keycode: the keycode in bytes 4-5 after the layer, row and column.
        const code = config.keymap[request[1]]?.[request[2]]?.[request[3]] ?? 0
        return [0x04, request[1], request[2], request[3], ...be16(code)]
      }
      case 0x05:
        config.keymap[request[1]][request[2]][request[3]] = (request[4] << 8) | request[5]
        return Array.from(request)
      case 0x06:
        // via.c: the keymap reset needs no unlock (dynamic_keymap_reset unlocks itself for QK_BOOT in the keymap).
        resetKeymap()
        return Array.from(request)
      case 0x10:
        // via.c: the macro reset needs no unlock either (only macro writes do); dynamic_keymap.c fills them with 0.
        config.macros.fill(0)
        return Array.from(request)
      case 0x0b:
        // via.c: only on Vial builds without VIAL_INSECURE, and ignored (sent back unchanged) until unlocked.
        if (config.insecure) return [0xff]
        if (config.unlocked) config.onBootloaderJump?.()
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
