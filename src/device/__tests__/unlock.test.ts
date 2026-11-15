// SPDX-License-Identifier: GPL-3.0-or-later

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createDeviceStore, STILL_UNLOCKING, type DeviceStore } from '../store'
import { FakeLink, fakeKeyboard, fakeKeyboardConfig, plainDefinition, type FakeKeyboardConfig } from '../fake-keyboard'
import { matrixKeys, parseMatrix } from '../matrix'
import { UNLOCK_STEPS } from '../unlock'

const isVial = (r: Uint8Array, cmd: number) => r[0] === 0xfe && r[1] === cmd
const isPoll = (r: Uint8Array) => isVial(r, 0x07)
const isMatrix = (r: Uint8Array) => r[0] === 0x02 && r[1] === 0x03
const UNLOCK_KEYS = ['0,0', '1,2']

/** A connected store on the fake keyboard, every part loaded; timers are fake from here on. */
async function connected(overrides: Partial<FakeKeyboardConfig> = {}, kind: 'cable' | 'receiver' = 'cable') {
  const config = fakeKeyboardConfig(overrides)
  const link = new FakeLink(kind)
  const keyboard = fakeKeyboard(config)
  /** When each request reached the keyboard (fake time). */
  const sentAt: number[] = []
  link.responder = (request) => {
    sentAt.push(Date.now())
    return keyboard(request)
  }
  const store = createDeviceStore({ decompress: plainDefinition })
  await store.connect(link)
  await new Promise<void>((resolve) => {
    const done = () => store.getState().loading.length === 0
    if (done()) return resolve()
    const off = store.subscribe(() => done() && (off(), resolve()))
  })
  vi.useFakeTimers()
  return { config, link, store, sentAt }
}

let store: DeviceStore | null = null
beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})
afterEach(async () => {
  await store?.disconnect()
  store = null
  vi.useRealTimers()
})

describe('unlocking', () => {
  it('counts down while the keys are held and ends unlocked', async () => {
    const kb = await connected()
    store = kb.store
    kb.config.held = new Set(UNLOCK_KEYS)
    const remaining: number[] = []
    store.subscribe(() => {
      const r = kb.store.getState().unlocking?.remaining
      if (r !== undefined && r !== remaining.at(-1)) remaining.push(r)
    })

    const result = store.unlock()
    await vi.advanceTimersByTimeAsync(10_000)

    expect(await result).toBe('unlocked')
    expect(kb.config.unlocked).toBe(true)
    expect(store.getState()).toMatchObject({ unlock: { unlocked: true, inProgress: false }, unlocking: null })
    expect(remaining[0]).toBe(UNLOCK_STEPS)
    expect(remaining.at(-1)).toBe(1)
    expect(store.getState().capabilities?.has('keyMatrix')).toBe(true)
  })

  it('polls from one loop, at least 110 ms apart', async () => {
    const kb = await connected()
    store = kb.store
    kb.config.held = new Set(UNLOCK_KEYS)
    const from = kb.link.requests.length

    // Asking twice joins the one flow.
    const [a, b] = [store.unlock(), store.unlock()]
    await vi.advanceTimersByTimeAsync(10_000)
    expect(await a).toBe('unlocked')
    expect(await b).toBe('unlocked')

    const polls = kb.link.requests
      .map((request, i) => ({ request, at: kb.sentAt[i] }))
      .slice(from)
      .filter(({ request }) => isPoll(request))
    expect(polls).toHaveLength(UNLOCK_STEPS)
    for (let i = 1; i < polls.length; i++) expect(polls[i].at - polls[i - 1].at).toBeGreaterThanOrEqual(110)
    expect(kb.link.requests.slice(from).filter((r) => isVial(r, 0x06))).toHaveLength(1)
  })

  it('polls more slowly through the receiver', async () => {
    const kb = await connected({}, 'receiver')
    store = kb.store
    kb.config.held = new Set(UNLOCK_KEYS)
    const from = kb.link.requests.length

    const result = store.unlock()
    await vi.advanceTimersByTimeAsync(15_000)
    expect(await result).toBe('unlocked')

    const at = kb.sentAt.slice(from).filter((_, i) => isPoll(kb.link.requests[from + i]))
    for (let i = 1; i < at.length; i++) expect(at[i] - at[i - 1]).toBeGreaterThanOrEqual(150)
  })

  it('sends nothing else while it runs, and what was asked for meanwhile afterwards', async () => {
    const kb = await connected()
    store = kb.store
    const from = kb.link.requests.length

    const result = store.unlock()
    await vi.advanceTimersByTimeAsync(500)
    const assigned = store.assign({ kind: 'key', layer: 0, row: 0, col: 1 }, 0x29)
    const raw = store.transport!.request([0x01])
    await vi.advanceTimersByTimeAsync(2000)
    // Nobody holds the keys yet: still counting, and the change still waiting.
    expect(store.getState().unlocking?.remaining).toBe(UNLOCK_STEPS)
    expect(kb.config.keymap[0][0][1]).not.toBe(0x29)
    kb.config.held = new Set(UNLOCK_KEYS)
    await vi.advanceTimersByTimeAsync(10_000)
    await Promise.all([result, assigned, raw])

    const sent = kb.link.requests.slice(from)
    const lastPoll = sent.findLastIndex(isPoll)
    expect(sent.slice(0, lastPoll + 1).every((r) => r[0] === 0xfe && [0x05, 0x06, 0x07].includes(r[1]))).toBe(true)
    expect(sent.slice(lastPoll + 1).some((r) => r[0] === 0x05)).toBe(true)
    expect(kb.config.keymap[0][0][1]).toBe(0x29)
  })

  it('starts the count again when a key is let go', async () => {
    const kb = await connected()
    store = kb.store
    kb.config.held = new Set(UNLOCK_KEYS)

    void store.unlock()
    await vi.advanceTimersByTimeAsync(2000)
    const before = store.getState().unlocking!.remaining
    expect(before).toBeLessThan(UNLOCK_STEPS - 5)
    kb.config.held.delete('1,2')
    await vi.advanceTimersByTimeAsync(500)

    expect(store.getState().unlocking?.remaining).toBe(UNLOCK_STEPS)
  })

  it('ends when the keyboard goes away mid-way', async () => {
    const kb = await connected()
    store = kb.store
    kb.config.held = new Set(UNLOCK_KEYS)

    const result = store.unlock()
    await vi.advanceTimersByTimeAsync(1000)
    kb.link.drop()
    await vi.advanceTimersByTimeAsync(1000)

    expect(await result).toBe('disconnected')
    expect(store.getState()).toMatchObject({ status: 'disconnected', unlocking: null, unlock: null })
  })

  it('keeps polling through replies that get lost', async () => {
    const kb = await connected()
    store = kb.store
    kb.config.held = new Set(UNLOCK_KEYS)
    const keyboard = kb.link.responder!
    let dropped = 0
    kb.link.responder = (request) => (isPoll(request) && dropped++ < 2 ? null : keyboard(request))

    const result = store.unlock()
    await vi.advanceTimersByTimeAsync(800)
    expect(store.getState().unlocking?.silent).toBe(true)
    await vi.advanceTimersByTimeAsync(10_000)

    expect(await result).toBe('unlocked')
  })

  it('does nothing when the keyboard is already unlocked, and locks again', async () => {
    const kb = await connected({ unlocked: true })
    store = kb.store
    const from = kb.link.requests.length

    expect(await store.unlock()).toBe('unlocked')
    expect(kb.link.requests.slice(from)).toHaveLength(0)

    const locking = store.lock()
    await vi.advanceTimersByTimeAsync(100)
    await locking
    expect(kb.config.unlocked).toBe(false)
    expect(store.getState().unlock?.unlocked).toBe(false)
    expect(store.getState().capabilities?.check('keyMatrix')).toMatchObject({ available: false, needsUnlock: true })
  })

  it('refuses to load a keyboard left in the middle of an unlock', async () => {
    const config = fakeKeyboardConfig()
    const link = new FakeLink()
    const keyboard = fakeKeyboard(config)
    keyboard(Uint8Array.of(0xfe, 0x06))
    link.responder = keyboard
    store = createDeviceStore({ decompress: plainDefinition })

    await store.connect(link)

    expect(store.getState()).toMatchObject({ status: 'error', error: STILL_UNLOCKING })
  })
})

describe('reading the switch matrix', () => {
  it('reads nothing while locked, every key once unlocked, and stops when nobody watches', async () => {
    const kb = await connected()
    store = kb.store
    const seen: string[][] = []
    const stop = store.watchMatrix((down) => seen.push([...down]))

    await vi.advanceTimersByTimeAsync(500)
    expect(kb.link.requests.filter(isMatrix)).toHaveLength(0)

    kb.config.held = new Set(UNLOCK_KEYS)
    void store.unlock()
    await vi.advanceTimersByTimeAsync(10_000)
    expect(kb.link.requests.filter(isMatrix).length).toBeGreaterThan(0)
    kb.config.held = new Set(['1,1'])
    await vi.advanceTimersByTimeAsync(100)
    expect(seen.at(-1)).toEqual(['1,1'])

    stop()
    await vi.advanceTimersByTimeAsync(100)
    const reads = kb.link.requests.filter(isMatrix).length
    await vi.advanceTimersByTimeAsync(1000)
    expect(kb.link.requests.filter(isMatrix)).toHaveLength(reads)
  })

  it('stops when the keyboard is locked', async () => {
    const kb = await connected({ unlocked: true })
    store = kb.store
    const stop = store.watchMatrix(() => {})
    await vi.advanceTimersByTimeAsync(200)
    expect(kb.link.requests.filter(isMatrix).length).toBeGreaterThan(0)

    const locking = store.lock()
    await vi.advanceTimersByTimeAsync(100)
    await locking
    const reads = kb.link.requests.filter(isMatrix).length
    await vi.advanceTimersByTimeAsync(1000)
    expect(kb.link.requests.filter(isMatrix)).toHaveLength(reads)
    stop()
  })

  it('reads one bit per key, rows big-endian', () => {
    const reply = new Uint8Array(32)
    reply.set([0x02, 0x03, 0x80, 0x01, 0x00, 0x02])
    expect([...parseMatrix(reply, 2, 16)].sort()).toEqual(['0,0', '0,15', '1,1'])
  })

  it('lists the physical keys of the picture, not the knob turns', async () => {
    const kb = await connected()
    store = kb.store
    expect(matrixKeys(store.getState().keyboard!).sort()).toEqual(['0,0', '0,1', '0,2', '1,0', '1,1', '1,2'])
  })
})
