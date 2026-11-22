// SPDX-License-Identifier: GPL-3.0-or-later
// What happens when something goes wrong mid-write, on the fake keyboard with failures injected: the keyboard goes
// away, stops answering, answers late, or sends requests back because another app is unlocking it. Each test is a
// scenario from the mid-write audit, now handled.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { FakeLink, fakeKeyboard, fakeKeyboardConfig, plainDefinition, type FakeKeyboardConfig } from '../fake-keyboard'
import type { LinkKind } from '../link'
import { backupContents, createBackup } from '../backup'
import { planRestore } from '../restore'
import { macrosHalted, rawMacros, readMacros } from '../index'
import {
  createDeviceStore,
  KEY_BOOT_LOCKED,
  MACRO_INTERRUPTED,
  NOT_ANSWERING,
  OTHER_APP_UNLOCKING,
  UNLOCK_LEFT_COUNTING,
  type DeviceStore,
} from '../store'
import { bootKeycode } from '../restore'

/**
 * What to do with one request: the keyboard goes away first ('drop'), the request never reaches it ('lost': asleep,
 * out of range), it carries the request out but the reply is lost ('silent'), or it answers late.
 */
type Hook = (request: Uint8Array) => 'drop' | 'lost' | 'silent' | { delay: number } | undefined

class HookLink extends FakeLink {
  hook: Hook | null = null
  constructor(kind: LinkKind = 'cable') {
    super(kind)
  }
  override async send(sent: Uint8Array): Promise<void> {
    if (this.closed) throw new Error('closed')
    const request = this.kind === 'receiver' ? sent.map((b) => b ^ 0x28) : sent.slice()
    const action = this.hook?.(request)
    if (action === 'drop') {
      this.drop()
      throw new Error('device gone')
    }
    this.requests.push(request)
    if (action === 'lost') return
    const reply = this.responder?.(request)
    if (action === 'silent' || !reply) return
    if (action && typeof action === 'object') setTimeout(() => !this.closed && this.reply(reply), action.delay)
    else queueMicrotask(() => this.reply(reply))
  }
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
let link: HookLink

async function connect(c: FakeKeyboardConfig, kind: LinkKind = 'cable'): Promise<void> {
  config = c
  link = new HookLink(kind)
  link.responder = fakeKeyboard(config)
  await store.connect(link)
  await loaded(store)
}

/** Four macros of 60 letters each (a … d) in a 300-byte memory. */
function bigMacros(): number[] {
  const out: number[] = []
  for (let m = 0; m < 4; m++) out.push(...new Array<number>(60).fill(0x61 + m), 0)
  while (out.length < 300) out.push(0)
  return out
}

const texts = (buffer: number[]) => readMacros(buffer, 6, 4).map((steps) => steps.map((s) => (s.kind === 'text' ? s.text : s.kind)).join(''))

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  store = createDeviceStore({ decompress: plainDefinition })
})
afterEach(() => {
  vi.useRealTimers()
})

describe('a macro save that stops part-way', () => {
  it('marks the memory first, so the keyboard plays no macro rather than a mixture', async () => {
    await connect(fakeKeyboardConfig({ unlocked: true, macros: bigMacros() }))
    let sets = 0
    // A shorter Macro 0 moves the others; the keyboard goes away at the second piece.
    link.hook = (r) => (r[0] === 0x0f && ++sets === 3 ? 'drop' : undefined)

    expect(await store.saveMacro(0, [{ kind: 'text', text: 'X'.repeat(10) }])).toBe('failed')

    // The memory is mixed, but its last byte says "being written": dynamic_keymap_macro_send plays nothing.
    expect(config.macros.at(-1)).toBe(0xff)
    expect(macrosHalted(config.macros)).toBe(true)
  })

  it('reads the memory back after a failed save and says what to do; saving again puts it right', async () => {
    vi.useFakeTimers()
    const connecting = connect(fakeKeyboardConfig({ unlocked: true, macros: bigMacros() }))
    await vi.runAllTimersAsync()
    await connecting
    let sets = 0
    // The second piece goes unanswered twice (both attempts): no disconnect, the save fails.
    link.hook = (r) => (r[0] === 0x0f && (++sets === 2 || sets === 3) ? 'silent' : undefined)
    const saving = store.saveMacro(0, [{ kind: 'text', text: 'X'.repeat(75) }])
    await vi.advanceTimersByTimeAsync(5000)

    expect(await saving).toBe('failed')
    expect(store.getState().writeError).toBe(MACRO_INTERRUPTED)
    // The page shows what the keyboard holds, which isn't what it held before.
    expect(store.getState().macros).toEqual(config.macros)
    expect(macrosHalted(store.getState().macros)).toBe(true)
    expect(store.getState().canUndo).toBe(false)

    link.hook = null
    const again = store.saveMacro(0, [{ kind: 'text', text: 'X'.repeat(75) }])
    await vi.advanceTimersByTimeAsync(1000)
    expect(await again).toBe('saved')
    expect(texts(config.macros)).toEqual(['X'.repeat(75), 'b'.repeat(60), 'c'.repeat(60), 'd'.repeat(60)])
    expect(config.macros.at(-1)).toBe(0)
  })

  it('a restore writes the macros in the same order', async () => {
    const c = fakeKeyboardConfig({ unlocked: true, macros: bigMacros() })
    await connect(c)
    const backup = createBackup(store.getState(), [], new Date())
    c.macros = c.macros.map((b) => (b === 0 ? 0 : 0x7a))
    await connect(c)
    let sets = 0
    link.hook = (r) => (r[0] === 0x0f && ++sets === 4 ? 'drop' : undefined)

    const report = await store.restore(planRestore(backupContents(backup), store.getState(), []))

    expect(report).toMatchObject({ stopped: true, stoppedBecause: 'disconnected' })
    expect(macrosHalted(c.macros)).toBe(true)
  })
})

describe('a write that times out but reached the keyboard', () => {
  it('is read back: shown as done, with an undo step', async () => {
    vi.useFakeTimers()
    const connecting = connect(fakeKeyboardConfig())
    await vi.runAllTimersAsync()
    await connecting
    // The keyboard is slow to answer (past both attempts), but carries the write out.
    link.hook = (r) => (r[0] === 0x05 ? { delay: 1100 } : undefined)
    const assigning = store.assign({ kind: 'key', layer: 0, row: 0, col: 0 }, 0x29)
    await vi.advanceTimersByTimeAsync(5000)
    await assigning

    expect(config.keymap[0][0][0]).toBe(0x29)
    expect(store.getState().keyboard?.keymap['0,0,0']).toBe(0x29)
    expect(store.getState()).toMatchObject({ writeError: null, canUndo: true })
  })

  it('a setting found unchanged keeps no undo step and says so in plain words', async () => {
    vi.useFakeTimers()
    const connecting = connect(fakeKeyboardConfig({ settingValues: { 7: [7, 0, 0, 0] } }))
    await vi.runAllTimersAsync()
    await connecting
    link.hook = (r) => (r[0] === 0xfe && r[1] === 0x0b ? 'lost' : undefined)
    const setting = store.setSetting(7, 9)
    await vi.advanceTimersByTimeAsync(5000)

    expect(await setting).toBe(false)
    expect(store.getState()).toMatchObject({ writeError: NOT_ANSWERING.cable, canUndo: false })
    expect(store.getState().settings?.[7][0]).toBe(7)
  })
})

describe('another app or tab unlocking the keyboard', () => {
  it('is noticed before a write, instead of taking the echo for success', async () => {
    await connect(fakeKeyboardConfig())
    // Someone else starts an unlock: from now on the keyboard sends requests back unchanged.
    link.responder!(Uint8Array.from([0xfe, 0x06, ...new Array<number>(30).fill(0)]))

    await store.assign({ kind: 'key', layer: 0, row: 0, col: 1 }, 0x29)
    const entry = store.getState().entries!.combo[0]
    const saved = await store.saveEntry('combo', 0, { ...entry, key1: 0x04, key2: 0x05, output: 0x06 })

    expect(config.keymap[0][0][1]).not.toBe(0x29)
    expect(store.getState().keyboard?.keymap['0,0,1']).toBe(config.keymap[0][0][1])
    expect(store.getState().writeError).toBe(OTHER_APP_UNLOCKING)
    expect(saved).toBe('failed')
    expect(store.getState().canUndo).toBe(false)
  })
})

describe('the keyboard falls asleep through the 2.4 GHz receiver', () => {
  it('a restore stops after a few writes without a reply, and says why', async () => {
    const c = fakeKeyboardConfig({ unlocked: true })
    await connect(c, 'receiver')
    const backup = createBackup(store.getState(), [], new Date())
    c.keymap = c.keymap.map((l) => l.map((r) => r.map(() => 0x29)))
    await connect(c, 'receiver')
    const plan = planRestore(backupContents(backup), store.getState(), [])
    vi.useFakeTimers()
    let writes = 0
    // After two key writes the keyboard falls asleep: nothing reaches it any more.
    link.hook = (r) => {
      if (r[0] === 0x05) writes++
      return writes > 2 ? 'lost' : undefined
    }
    let done = false
    const restoring = store.restore(plan).then((r) => ((done = true), r))
    while (!done) await vi.advanceTimersByTimeAsync(200)
    const report = await restoring

    expect(plan.keys.length).toBeGreaterThan(10)
    expect(report).toMatchObject({ stopped: true, stoppedBecause: 'not-answering' })
    expect(report.done).toBeLessThan(6)
    expect(report.failed[0].error).toContain(NOT_ANSWERING.receiver)
    expect(report.failed[0].detail).toMatch(/No reply/)
    expect(store.getState().writeError).not.toMatch(/No reply/)
  })

  it('"Stop waiting" ends an unlock the keyboard no longer answers, and later changes say why they fail', async () => {
    await connect(fakeKeyboardConfig(), 'receiver')
    vi.useFakeTimers()
    let started = false
    link.hook = (r) => {
      if (r[0] === 0xfe && r[1] === 0x06) started = true
      return started && !(r[0] === 0xfe && r[1] === 0x06) ? 'silent' : undefined
    }
    let result: string | null = null
    void store.unlock().then((r) => (result = r))
    await vi.advanceTimersByTimeAsync(10_000)
    expect(store.getState().unlocking?.silent).toBe(true)

    store.stopUnlock()
    await vi.advanceTimersByTimeAsync(3000)

    expect(result).toBe('stopped')
    expect(store.getState().unlocking).toBeNull()
    // The keyboard may still be counting: it answers the status, and sends every other request back.
    link.hook = null
    const assigning = store.assign({ kind: 'key', layer: 0, row: 0, col: 1 }, 0x29)
    await vi.advanceTimersByTimeAsync(3000)
    await assigning
    expect(store.getState().writeError).toBe(UNLOCK_LEFT_COUNTING)
  })
})

describe('lighting waiting for its save', () => {
  it('counts as on its way until it is saved', async () => {
    vi.useFakeTimers()
    const connecting = connect(fakeKeyboardConfig())
    await vi.runAllTimersAsync()
    await connecting
    await store.setLighting({ speed: 10 })

    expect(store.getState().savePending).toBe(true)
    await vi.advanceTimersByTimeAsync(2000)
    expect(store.getState().savePending).toBe(false)
    expect(config.rgbSaved?.speed).toBe(10)
  })

  it('flushSaves saves at once (before the page closes)', async () => {
    await connect(fakeKeyboardConfig())
    await store.setLighting({ speed: 10 })
    await store.flushSaves()
    expect(config.rgbSaved?.speed).toBe(10)
    expect(store.getState().savePending).toBe(false)
  })
})

describe('a change queued for one keyboard', () => {
  it('is dropped when another keyboard is connected by its turn', async () => {
    const first = fakeKeyboardConfig()
    await connect(first)
    vi.useFakeTimers()
    // A slow change holds the queue; two more wait behind it.
    link.hook = (r) => (r[0] === 0x05 ? { delay: 200 } : undefined)
    const slow = store.assign({ kind: 'key', layer: 0, row: 0, col: 0 }, 0x29)
    const queued = store.assign({ kind: 'knob', layer: 0, knob: 0, direction: 0 }, 0x2a)
    // The keyboard is unplugged and another plugged in before the queued change's turn.
    link.drop()
    vi.useRealTimers()
    const second = fakeKeyboardConfig({ name: 'Second' })
    await connect(second)
    await Promise.all([slow, queued])

    expect(second.knob[0][0]).not.toBe(0x2a)
    expect(second.keymap[0][0][0]).not.toBe(0x29)
    expect(store.getState().canUndo).toBe(false)
  })
})

describe('the firmware update key while locked', () => {
  it('is refused on every route to a key, not only from the inspector', async () => {
    await connect(fakeKeyboardConfig({ unlocked: false }))
    const boot = bootKeycode()!

    await store.assign({ kind: 'key', layer: 0, row: 0, col: 1 }, boot)
    await store.assign({ kind: 'knob', layer: 0, knob: 0, direction: 1 }, boot)

    expect(config.keymap[0][0][1]).not.toBe(boot)
    expect(link.requests.filter((r) => r[0] === 0x05)).toHaveLength(0)
    expect(store.getState().writeError).toBe(KEY_BOOT_LOCKED)
  })
})

describe('Keychron’s factory reset while connected', () => {
  it('reads the keyboard again and forgets undo', async () => {
    await connect(fakeKeyboardConfig())
    await store.assign({ kind: 'key', layer: 0, row: 0, col: 0 }, 0x29)
    expect(store.getState().canUndo).toBe(true)
    // The keyboard is reset behind the app's back and says so.
    config.keymap[0][0][0] = 0x04
    link.deliver([0xa7, 0x11])
    await new Promise((r) => setTimeout(r, 0))
    await loaded(store)

    expect(store.getState().status).toBe('ready')
    expect(store.getState().keyboard?.keymap['0,0,0']).toBe(0x04)
    expect(store.getState().canUndo).toBe(false)
  })
})

describe('the keyboard unplugged while a change is on its way', () => {
  it('is remembered for the connect prompt', async () => {
    await connect(fakeKeyboardConfig())
    link.hook = (r) => (r[0] === 0x05 ? 'drop' : undefined)
    await store.assign({ kind: 'key', layer: 0, row: 0, col: 0 }, 0x29)
    expect(store.getState()).toMatchObject({ status: 'disconnected', lost: { duringWrite: true } })
  })

  it('but not after Disconnect', async () => {
    await connect(fakeKeyboardConfig())
    await store.disconnect()
    expect(store.getState().lost).toBeNull()
  })
})

describe('a restore cut off part-way, run again', () => {
  it('finishes what is left and nothing more', async () => {
    const c = fakeKeyboardConfig({ unlocked: true, macros: bigMacros() })
    await connect(c)
    const backup = createBackup(store.getState(), [], new Date())
    const original = structuredClone({ keymap: c.keymap, macros: c.macros })
    c.keymap = c.keymap.map((l) => l.map((r) => r.map(() => 0x29)))
    c.macros = c.macros.map((b) => (b === 0 ? 0 : 0x7a))
    await connect(c)
    let n = 0
    link.hook = (r) => (r[0] === 0x05 && ++n === 5 ? 'drop' : undefined)
    const first = await store.restore(planRestore(backupContents(backup), store.getState(), []))
    expect(first).toMatchObject({ stopped: true, stoppedBecause: 'disconnected' })
    expect(first.done).toBeLessThan(first.total)

    await connect(c)
    const report = await store.restore(planRestore(backupContents(backup), store.getState(), []))
    expect(report.stopped).toBe(false)
    expect({ keymap: c.keymap, macros: c.macros }).toEqual(original)
    expect(rawMacros(c.macros, 4).map((m) => m.length)).toEqual([60, 60, 60, 60])
  })
})
