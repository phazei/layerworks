// SPDX-License-Identifier: GPL-3.0-or-later
// Keychron's per-key colours and zones: the packets, the numbering, and the store's setters and restore on the fake
// keyboard.

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { backupContents, createBackup } from '../backup'
import { FakeLink, fakeKeyboard, fakeKeyboardConfig, plainDefinition, type FakeKeychronRgb, type FakeKeyboardConfig } from '../fake-keyboard'
import {
  colourPackets,
  effectPackets,
  keyLeds,
  regionPackets,
  runs,
  zoneEffectChoices,
  zoneEffectNumbers,
  type Hsv,
  type ZoneEffect,
} from '../keychron-rgb'
import { describePlan, isEmptyPlan, planRestore } from '../restore'
import { createDeviceStore, type DeviceStore } from '../store'

const RED: Hsv = [0, 255, 255]
const BLUE: Hsv = [170, 255, 255]
const bytes = (p: Uint8Array, n: number) => Array.from(p.subarray(0, n))
const slot = (effect = 0): ZoneEffect => ({ effect, hue: 0, sat: 255, speed: 128, time: effect ? 5000 : 0 })

describe('packets', () => {
  it('groups changed LEDs into stretches of at most the packet size', () => {
    expect(runs([3, 1, 2, 30], 9)).toEqual([
      { start: 1, count: 3 },
      { start: 30, count: 1 },
    ])
    expect(runs([0, 8, 9], 9)).toEqual([
      { start: 0, count: 9 },
      { start: 9, count: 1 },
    ])
  })

  it('sends only the colours that change, nine to a packet', () => {
    const before = Array.from({ length: 20 }, () => [...RED] as Hsv)
    const after = before.map((c, i) => (i === 2 || i === 4 ? BLUE : c))
    const packets = colourPackets(before, after)
    expect(packets).toHaveLength(1)
    expect(bytes(packets[0], 13)).toEqual([0xa8, 0x0a, 2, 3, 170, 255, 255, 0, 255, 255, 170, 255, 255])
    // Every key: 20 LEDs in 3 packets.
    expect(colourPackets(before, before.map(() => BLUE)).map((p) => [p[2], p[3]])).toEqual([
      [0, 9],
      [9, 9],
      [18, 2],
    ])
    expect(colourPackets(before, before)).toEqual([])
  })

  it('writes zones 28 to a packet and effect slots 3 to a packet, with the time little-endian', () => {
    const regions = new Array<number>(40).fill(0)
    expect(regionPackets(regions, regions.map(() => 1)).map((p) => [p[2], p[3]])).toEqual([
      [0, 28],
      [28, 12],
    ])
    const packets = effectPackets(1, [slot(5), slot(), slot(), slot(), slot(2)])
    expect(packets).toHaveLength(2)
    expect(bytes(packets[0], 13)).toEqual([0xa8, 0x0f, 1, 0, 3, 5, 0, 255, 128, 0x88, 0x13, 0, 0])
    expect(bytes(packets[1], 5)).toEqual([0xa8, 0x0f, 1, 3, 2])
  })

  it('maps keys to LEDs for the rows and columns the keyboard has', () => {
    const matrix = new Map([
      ['0,0', 0],
      ['0,1', 1],
      ['0,16', 0],
      ['6,0', 12],
    ])
    expect([...keyLeds(matrix, 6, 16, 89)]).toEqual([
      ['0,0', 0],
      ['0,1', 1],
    ])
  })

  it('numbers zone effects as the K15 Max does', () => {
    const k15 = [0, 1, 2, 6, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 25, 29, 30, 31, 34, 38, 39, 41, 43, 48, 49]
    const { toZone, fromZone } = zoneEffectNumbers(k15)
    // ../docs/research/k15-firmware-capabilities.md section 5.2
    expect(toZone.get(2)).toBe(1)
    expect(toZone.get(22)).toBe(13)
    expect(toZone.get(43)).toBe(15)
    expect(toZone.get(29)).toBe(16)
    expect(toZone.get(41)).toBe(22)
    expect(toZone.get(1)).toBe(23)
    expect(toZone.get(48)).toBe(24)
    expect(toZone.get(49)).toBe(25)
    expect(fromZone.get(5)).toBe(14)
    const choices = zoneEffectChoices({ toZone, fromZone })
    expect(choices).toContain(48)
    expect(choices).not.toContain(1)
    expect(choices).not.toContain(49)
  })
})

/** Two rows of three keys; (1,2) has no LED. */
function fakeRgb(): FakeKeychronRgb {
  return {
    ledAt: [
      [0, 1, 2],
      [3, 4, 0xff],
    ],
    colours: Array.from({ length: 5 }, () => [...RED] as Hsv),
    style: 0,
    regions: [0, 0, 0, 1, 1],
    effects: [
      [slot(5), slot(), slot()],
      [slot(2), slot(), slot()],
    ],
    mixedEffect: 25,
  }
}

function newConfig(overrides: Partial<FakeKeyboardConfig> = {}): FakeKeyboardConfig {
  return fakeKeyboardConfig({
    keychron: { protocol: 2, features: 0x01 | 0x40 | 0x80, firmware: 'v1', misc: 0x08, snapClick: Array.from({ length: 4 }, () => ({ type: 0, key1: 0, key2: 0 })), rgb: fakeRgb() },
    ...overrides,
  })
}

function loaded(store: DeviceStore): Promise<void> {
  return new Promise((resolve) => {
    const done = () => store.getState().status !== 'ready' || store.getState().loading.length === 0
    if (done()) return resolve()
    const off = store.subscribe(() => {
      if (!done()) return
      off()
      resolve()
    })
  })
}

let store: DeviceStore
let config: FakeKeyboardConfig
let link: FakeLink
const rgb = () => config.keychron!.rgb!
const stateRgb = () => store.getState().keychron!.rgb!

async function connect(c = newConfig()): Promise<void> {
  config = c
  link = new FakeLink()
  link.responder = fakeKeyboard(config)
  await store.connect(link)
  await loaded(store)
}

beforeEach(async () => {
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  store = createDeviceStore({ decompress: plainDefinition })
  await connect()
})

describe('the store', () => {
  it('reads the colours, zones and LED map, and says what the keyboard can do', () => {
    expect(stateRgb().ledCount).toBe(5)
    expect(keyLeds(stateRgb().ledMatrix, 2, 3, 5).get('1,1')).toBe(4)
    expect(keyLeds(stateRgb().ledMatrix, 2, 3, 5).has('1,2')).toBe(false)
    expect(stateRgb().mixedRGBRegions).toEqual([0, 0, 0, 1, 1])
    const caps = store.getState().capabilities!
    expect(caps.has('perKeyLighting')).toBe(true)
    expect(caps.has('lightingZones')).toBe(true)
  })

  it('has neither without Keychron lighting', async () => {
    await connect(fakeKeyboardConfig({ keychron: { protocol: 2, features: 0x01, firmware: 'v1' } }))
    expect(store.getState().capabilities!.check('perKeyLighting')).toMatchObject({ available: false })
    expect(store.getState().capabilities!.has('lightingZones')).toBe(false)
  })

  it('paints keys, shows them at once, saves after a pause and undoes a stroke in one step', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] })
    try {
      const colours = stateRgb().perKeyColors.map((c) => [...c] as Hsv)
      colours[1] = BLUE
      await store.setKeyColours(colours.map((c) => [...c] as Hsv), 'stroke:1')
      colours[2] = BLUE
      await store.setKeyColours(colours.map((c) => [...c] as Hsv), 'stroke:1')
      expect(rgb().colours[1]).toEqual(BLUE)
      expect(rgb().colours[2]).toEqual(BLUE)
      expect(stateRgb().perKeyColors[2]).toEqual(BLUE)
      expect(rgb().saved).toBeUndefined()
      await vi.advanceTimersByTimeAsync(1600)
      expect(rgb().saved?.colours[2]).toEqual(BLUE)

      await store.undo()
      expect(rgb().colours.slice(0, 3)).toEqual([RED, RED, RED])
      expect(store.getState().canUndo).toBe(false)
    } finally {
      vi.useRealTimers()
    }
  })

  it('sets the style, the zones and a zone’s effects', async () => {
    expect(await store.setKeyStyle(1)).toBe(true)
    expect(rgb().style).toBe(1)
    expect(await store.setKeyStyle(9)).toBe(false)

    expect(await store.setZones([1, 1, 0, 0, 1])).toBe(true)
    expect(rgb().regions).toEqual([1, 1, 0, 0, 1])
    expect(await store.setZones([2, 0, 0, 0, 0])).toBe(false)

    const effects = [slot(13), slot(2), slot()]
    expect(await store.setZoneEffects(1, effects)).toBe(true)
    expect(rgb().effects[1].map((e) => e.effect)).toEqual([13, 2, 0])
    expect(stateRgb().mixedRGBEffects[1][0].effect).toBe(13)
  })

  it('reports an effect the keyboard refuses', async () => {
    expect(await store.setZoneEffects(0, [slot(25), slot(), slot()])).toBe(false)
    expect(store.getState().writeError).toMatch(/refused/)
    expect(rgb().effects[0][0].effect).toBe(5)
  })
})

describe('restore', () => {
  it('puts back key colours, style, zones and Snap Click, and lists them', async () => {
    const backup = createBackup(store.getState(), [], new Date())
    const contents = backupContents(JSON.parse(JSON.stringify(backup)))
    expect(contents.keyColours?.colours).toHaveLength(5)

    // Change everything behind the store's back, then read it again.
    const kc = config.keychron!
    kc.rgb!.colours = kc.rgb!.colours.map(() => [...BLUE] as Hsv)
    kc.rgb!.style = 3
    kc.rgb!.regions = [1, 1, 1, 1, 1]
    kc.rgb!.effects[0][0] = slot(13)
    kc.snapClick![1] = { type: 2, key1: 0x04, key2: 0x07 }
    await connect(config)

    const plan = planRestore(contents, store.getState())
    expect(describePlan(plan, []).map((l) => l.text)).toEqual(
      expect.arrayContaining([
        '1 Snap Click pair (SOCD)',
        'Key by key lighting: colours and how they light up (per-key RGB)',
        'Lighting zones: which keys are in each zone and the zones’ effects (mixed RGB)',
      ]),
    )
    const report = await store.restore(plan)
    expect(report.failed).toEqual([])
    expect(report.written).toMatchObject({ snapClick: 1, keyColours: 1, zones: 1 })
    expect(rgb().colours).toEqual(fakeRgb().colours)
    expect(rgb().style).toBe(0)
    expect(rgb().regions).toEqual([0, 0, 0, 1, 1])
    expect(rgb().effects[0][0].effect).toBe(5)
    expect(rgb().saved?.regions).toEqual([0, 0, 0, 1, 1])
    expect(kc.snapClick![1].type).toBe(0)
    expect(isEmptyPlan(planRestore(contents, store.getState()))).toBe(true)
  })

  it('leaves them out on a keyboard without them', async () => {
    const contents = backupContents(JSON.parse(JSON.stringify(createBackup(store.getState(), [], new Date()))))
    await connect(fakeKeyboardConfig({ keychron: { protocol: 2, features: 0x01, firmware: 'v1' } }))
    const plan = planRestore(contents, store.getState())
    expect(plan.keyColours).toBeNull()
    expect(plan.ignored).toEqual(expect.arrayContaining([expect.stringMatching(/^Key colours/), expect.stringMatching(/^Lighting zones/)]))
  })
})
