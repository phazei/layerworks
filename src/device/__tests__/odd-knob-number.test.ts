// SPDX-License-Identifier: GPL-3.0-or-later
// Compatibility: knobs a definition numbers other than 0, 1, 2 … (mechlovin/adelais/rgb_led/rev3 draws its only knob
// as 3, argo_works/ishi/80/mk0_avr_extra as 8; device/knob-map.ts, knobIndices). The app keeps the definition's
// number on the wire, in backups and in the picture, and names knobs by their place in order.

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { backupContents, backupText, createBackup, parseBackup } from '../backup'
import { FakeLink, fakeKeyboard, fakeKeyboardConfig, plainDefinition, type FakeKeyboardConfig } from '../fake-keyboard'
import { knobIndices, knobName } from '../knob-map'
import { planItems, planRestore } from '../restore'
import { createDeviceStore, type DeviceStore } from '../store'
import { exportVil } from '../vil'
import { pictureTargets, targetName } from '../../ui/picture-keys'
import { knobDirections } from '../../shell/pressed-keys'
import { notSeenLine } from '../../pages/test/not-seen'

const knobKey = (index: number, direction: 0 | 1) => `${index},${direction}\n\n\n\n\n\n\n\n\ne`

/** A small keyboard whose definition draws knobs numbered `indices`; the firmware keeps a pair for every number. */
function config(indices: number[]): FakeKeyboardConfig {
  return fakeKeyboardConfig({
    layers: 2,
    kle: [['0,0', '0,1', '0,2', ...indices.flatMap((i) => [knobKey(i, 0), knobKey(i, 1)])], ['1,0', '1,1', '1,2']],
    // Number 0 holds 0x11 / 0x12 so a request for the wrong number shows.
    knobs: Array.from({ length: 2 }, () =>
      Array.from({ length: Math.max(...indices) + 1 }, (_, i) => (indices.includes(i) ? [0x81, 0x80] : [0x11, 0x12]) as [number, number]),
    ),
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
let link: FakeLink

async function connect(c: FakeKeyboardConfig): Promise<void> {
  link = new FakeLink()
  link.responder = fakeKeyboard(c)
  await store.connect(link)
  await loaded(store)
}

/** The knob numbers Vial's get / set encoder requests (0xFE 0x03 / 0x04) carried. */
const knobsAsked = () => new Set(link.requests.filter((r) => r[0] === 0xfe && (r[1] === 0x03 || r[1] === 0x04)).map((r) => r[3]))

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  store = createDeviceStore({ decompress: plainDefinition })
})

describe('a keyboard whose only knob is numbered 1', () => {
  it('reads, shows, assigns, undoes, backs up and restores knob 1, and calls it the knob', async () => {
    const c = config([1])
    await connect(c)
    const kb = store.getState().keyboard!
    expect(kb).toMatchObject({ knobCount: 1, knobIndices: [1], fixedKnobs: 0 })
    expect(kb.knobs['1,1,0']).toBe(0x81)
    expect(kb.knobs['0,0,0']).toBeUndefined()

    // Shown: the picture's targets and the Test page's turns are knob 1's, named as the only knob.
    const knob = pictureTargets(kb, true).filter((t) => t.selection.kind === 'knob')
    expect(knob.map((t) => t.id).sort()).toEqual(['knob:1,0', 'knob:1,1'])
    expect(targetName(kb, 0, knob.find((t) => t.id === 'knob:1,0')!)).toMatch(/^Knob turned left: /)
    expect(knobDirections(kb)).toEqual(['1,0', '1,1'])
    expect(notSeenLine(kb, 0, ['0,0'], new Set(['0,0']), ['1,1'])).toBe('Not seen yet: Knob turned right.')

    // Assigned and undone with number 1 on the wire; number 0 is never asked about.
    await store.assign({ kind: 'knob', layer: 0, knob: 1, direction: 1 }, 0x52)
    expect(c.knobs![0][1]).toEqual([0x81, 0x52])
    await store.undo()
    expect(c.knobs![0][1]).toEqual([0x81, 0x80])
    expect(knobsAsked()).toEqual(new Set([1]))

    // Backed up by number (slot 0 left at Nothing), read back, and restored onto knob 1.
    await store.assign({ kind: 'knob', layer: 1, knob: 1, direction: 0 }, 0x29)
    const backup = parseBackup(backupText(createBackup(store.getState(), [], new Date())))
    expect(backup.knobs[1]).toEqual([
      [0, 0],
      [0x29, 0x80],
    ])
    c.knobs![1][1] = [0x04, 0x05]
    await connect(c)
    const plan = planRestore(backupContents(backup), store.getState(), [])
    expect(plan.ignored).toEqual([])
    expect(planItems(plan, store.getState(), (l) => ['Base', 'Fn'][l]).find((l) => l.part === 'knob')?.items).toEqual([
      expect.stringMatching(/^Fn, knob turned left: /),
      expect.stringMatching(/^Fn, knob turned right: /),
    ])
    await store.restore(plan)
    expect(c.knobs![1][1]).toEqual([0x29, 0x80])
    expect(c.knobs![1][0]).toEqual([0x11, 0x12])
    expect(knobsAsked()).toEqual(new Set([1]))

    // Vial's own file lays knobs out by number too.
    const vil = JSON.parse(exportVil(store.getState())) as { encoder_layout: string[][][] }
    expect(vil.encoder_layout[0]).toHaveLength(2)
  })
})

describe('a keyboard whose knobs are numbered 0 and 2', () => {
  it('keeps both, names them Knob 1 and Knob 2, and restores without counting the gap as missing', async () => {
    const c = config([0, 2])
    await connect(c)
    const kb = store.getState().keyboard!
    expect(kb).toMatchObject({ knobCount: 2, knobIndices: [0, 2] })
    expect(knobName(kb.knobIndices, 2)).toBe('Knob 2')
    const second = pictureTargets(kb, true).find((t) => t.id === 'knob:2,1')!
    expect(targetName(kb, 0, second)).toMatch(/^Knob 2 turned right: /)

    const backup = createBackup(store.getState(), [], new Date())
    c.knobs![0][2] = [0x04, 0x05]
    await connect(c)
    const plan = planRestore(backupContents(backup), store.getState(), [])
    expect(plan.ignored).toEqual([])
    await store.restore(plan)
    expect(c.knobs![0][2]).toEqual([0x81, 0x80])
    expect(c.knobs![0][1]).toEqual([0x11, 0x12])
    expect(knobsAsked().has(1)).toBe(false)
  })
})

describe('knobIndices', () => {
  it('lists the definition’s numbers once each, in order', () => {
    expect(knobIndices(new Set([3]))).toEqual([3])
    expect(knobIndices([2, 0, 2])).toEqual([0, 2])
    expect(knobIndices([])).toEqual([])
  })
})
