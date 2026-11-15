// SPDX-License-Identifier: GPL-3.0-or-later

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createTransport, TransportError } from '../transport'
import { LAYER_PUSH, parseLayerReport, type PushShape } from '../pushes'
import { FakeLink, report } from '../fake-keyboard'

const layerPush = (base: number, held: number) => report(0xa3, base, held)

beforeEach(() => {
  vi.useFakeTimers()
})
afterEach(() => {
  vi.useRealTimers()
})

describe('requests and replies', () => {
  it('pads the request to 32 bytes and resolves with the reply', async () => {
    const link = new FakeLink()
    link.responder = (request) => [request[0], 5]
    const transport = createTransport(link)

    const reply = await transport.request([0x11])

    expect(link.requests[0]).toEqual(report(0x11))
    expect(reply).toEqual(report(0x11, 5))
  })

  it('sends one request at a time, in order', async () => {
    const link = new FakeLink()
    const transport = createTransport(link)
    const replies = [transport.request([0x01]), transport.request([0x02]), transport.request([0x03])]

    await vi.advanceTimersByTimeAsync(0)
    expect(link.requests).toHaveLength(1)
    link.reply([0x01, 1])
    await vi.advanceTimersByTimeAsync(0)
    expect(link.requests).toHaveLength(2)
    link.reply([0x02, 2])
    await vi.advanceTimersByTimeAsync(0)
    link.reply([0x03, 3])

    expect((await Promise.all(replies)).map((r) => r[1])).toEqual([1, 2, 3])
  })

  it('carries on with the queue after a request fails', async () => {
    const link = new FakeLink()
    link.responder = (request) => (request[0] === 0x01 ? null : [request[0], 9])
    const transport = createTransport(link, { attempts: 1 })

    const failed = transport.request([0x01])
    const ok = transport.request([0x02])
    const failure = expect(failed).rejects.toMatchObject({ reason: 'timeout' })
    await vi.advanceTimersByTimeAsync(500)

    await failure
    expect((await ok)[1]).toBe(9)
    expect(transport.stats.failures).toBe(1)
  })

  it('drops a reply to a VIA command that does not echo the command', async () => {
    const link = new FakeLink()
    const transport = createTransport(link)
    const reply = transport.request([0x11])
    await vi.advanceTimersByTimeAsync(0)

    link.reply([0x12, 0, 0, 4]) // a late reply to something else
    link.reply([0x11, 5])

    expect((await reply)[1]).toBe(5)
    expect(transport.stats.strays).toBe(1)
  })

  it('accepts 0xFF, the firmware saying it does not know the command', async () => {
    const link = new FakeLink()
    link.responder = () => [0xff]
    const transport = createTransport(link)

    expect((await transport.request([0xa0]))[0]).toBe(0xff)
  })

  it('accepts any reply to a Vial request, which carries data from the first byte', async () => {
    const link = new FakeLink()
    link.responder = () => [6, 0, 0, 0, 0x42]
    const transport = createTransport(link)

    expect((await transport.request([0xfe, 0x00]))[4]).toBe(0x42)
  })

  it('counts a report nobody asked for as stray', async () => {
    const link = new FakeLink()
    const transport = createTransport(link)

    link.reply([0x11, 5])

    expect(transport.stats.strays).toBe(1)
  })

  it('send() queues a report without waiting for a reply', async () => {
    const link = new FakeLink()
    const transport = createTransport(link)

    await transport.send([0x0b])

    expect(link.requests[0]).toEqual(report(0x0b))
  })
})

describe('timeouts and resends', () => {
  it('sends again after a timeout and resolves with the late answer', async () => {
    const link = new FakeLink()
    let sent = 0
    link.responder = (request) => (++sent < 3 ? null : [request[0], 7])
    const transport = createTransport(link, { timeoutMs: 100, attempts: 4, settleMs: 0 })

    const reply = transport.request([0x11])
    await vi.advanceTimersByTimeAsync(250)

    expect((await reply)[1]).toBe(7)
    expect(link.requests).toHaveLength(3)
    expect(transport.stats).toMatchObject({ requests: 1, resends: 2, failures: 0 })
  })

  it('gives up after the last attempt', async () => {
    const link = new FakeLink()
    const transport = createTransport(link, { timeoutMs: 100, attempts: 3 })

    const failure = expect(transport.request([0x11])).rejects.toBeInstanceOf(TransportError)
    await vi.advanceTimersByTimeAsync(300)

    await failure
    expect(link.requests).toHaveLength(3)
  })

  it('takes per-request options over the defaults', async () => {
    const link = new FakeLink()
    const transport = createTransport(link, { timeoutMs: 100, attempts: 3 })

    const failure = expect(transport.request([0x11], { timeoutMs: 20, attempts: 1 })).rejects.toThrow('20 ms')
    await vi.advanceTimersByTimeAsync(20)

    await failure
    expect(link.requests).toHaveLength(1)
  })

  it('holds the queue after a resend so a second copy of the reply is not given to the next request', async () => {
    const link = new FakeLink()
    const transport = createTransport(link, { timeoutMs: 100, attempts: 2, settleMs: 50 })

    const first = transport.request([0xfe, 0x00])
    const second = transport.request([0xfe, 0x01])
    await vi.advanceTimersByTimeAsync(100) // first attempt times out, request is sent again
    link.reply([1, 1]) // reply to the first attempt, arriving late
    link.reply([1, 1]) // reply to the second attempt
    await vi.advanceTimersByTimeAsync(50)
    link.reply([2, 2])

    expect((await first)[0]).toBe(1)
    expect((await second)[0]).toBe(2)
    expect(transport.stats.strays).toBe(1)
  })
})

describe('unsolicited reports', () => {
  it('gives a layer push to listeners, not to the waiting request', async () => {
    const link = new FakeLink()
    const transport = createTransport(link)
    const layers: number[] = []
    transport.onPush(LAYER_PUSH, (r) => layers.push(parseLayerReport(r).active))

    const reply = transport.request([0x02, 0x03])
    await vi.advanceTimersByTimeAsync(0)
    link.deliver(layerPush(2, 4))
    link.reply([0x02, 0x03, 0x80])

    expect((await reply)[2]).toBe(0x80)
    expect(layers).toEqual([4])
    expect(transport.stats).toMatchObject({ pushes: 1, strays: 0 })
  })

  it('keeps a layer push away from a waiting Vial request even with nobody listening', async () => {
    const link = new FakeLink()
    const transport = createTransport(link)

    const reply = transport.request([0xfe, 0x05])
    await vi.advanceTimersByTimeAsync(0)
    link.deliver(layerPush(2, 3))
    link.reply([1, 0])

    expect((await reply)[0]).toBe(1)
  })

  it('treats the same shape as the reply when an 0xA3 request is waiting', async () => {
    const link = new FakeLink()
    const transport = createTransport(link)
    const pushed = vi.fn()
    transport.onPush(LAYER_PUSH, pushed)

    const reply = transport.request([0xa3])
    await vi.advanceTimersByTimeAsync(0)
    link.reply([0xa3, 2, 0])

    expect(parseLayerReport(await reply)).toEqual({ base: 2, held: 0, active: 2 })
    expect(pushed).not.toHaveBeenCalled()
  })

  it('does not take a report with other bytes set for a layer push', async () => {
    const link = new FakeLink()
    const transport = createTransport(link)
    const pushed = vi.fn()
    transport.onPush(LAYER_PUSH, pushed)

    link.deliver(report(0xa3, 2, 0, 1))
    link.deliver(report(0xa3, 40, 0))

    expect(pushed).not.toHaveBeenCalled()
    expect(transport.stats.strays).toBe(2)
  })

  it('lets a plugin register its own push shape', async () => {
    const link = new FakeLink()
    const transport = createTransport(link)
    const keyPush: PushShape = { name: 'key', matches: (raw) => raw[0] === 0xd0 && raw[1] === 0x01 }
    const seen: number[] = []
    const off = transport.onPush(keyPush, (r) => seen.push(r[2]))

    link.deliver(report(0xd0, 0x01, 7))
    off()
    link.deliver(report(0xd0, 0x01, 8))

    expect(seen).toEqual([7])
    expect(transport.stats.pushes).toBe(2)
  })
})

describe('through the 2.4 GHz receiver', () => {
  it('XOR-encodes requests and decodes replies', async () => {
    const link = new FakeLink('receiver')
    const sent: Uint8Array[] = []
    const send = link.send.bind(link)
    link.send = (bytes) => {
      sent.push(bytes.slice())
      return send(bytes)
    }
    link.responder = (request) => [request[0], 5]
    const transport = createTransport(link)

    const reply = await transport.request([0xfe, 0x00])

    expect(Array.from(sent[0].subarray(0, 3))).toEqual([0xfe ^ 0x28, 0x28, 0x28])
    expect(reply).toEqual(report(0xfe, 5))
  })

  it('recognises a layer push by its raw bytes, even while an 0xA3 request waits', async () => {
    const link = new FakeLink('receiver')
    const transport = createTransport(link)
    const layers: number[] = []
    transport.onPush(LAYER_PUSH, (r) => layers.push(parseLayerReport(r).active))

    const reply = transport.request([0xa3])
    await vi.advanceTimersByTimeAsync(0)
    link.deliver(layerPush(2, 4)) // pushes are not encoded
    link.reply([0xa3, 2, 0]) // the reply is

    expect(parseLayerReport(await reply).active).toBe(2)
    expect(layers).toEqual([4])
  })

  it('skips the receiver\'s own state notices', async () => {
    const link = new FakeLink('receiver')
    const transport = createTransport(link)

    const reply = transport.request([0x11])
    await vi.advanceTimersByTimeAsync(0)
    link.deliver(report(0xbc, 1, 2, 3))
    link.deliver(report(0xe2, 1))
    link.reply([0x11, 5])

    expect((await reply)[1]).toBe(5)
    expect(transport.stats.notices).toBe(2)
  })

  it('waits less and resends more than on the cable', async () => {
    const link = new FakeLink('receiver')
    const transport = createTransport(link)

    const failure = expect(transport.request([0x11])).rejects.toMatchObject({ reason: 'timeout' })
    await vi.advanceTimersByTimeAsync(1800)

    await failure
    expect(link.requests).toHaveLength(6)
  })
})

describe('disconnecting', () => {
  it('rejects the waiting request and everything queued when the device goes away', async () => {
    const link = new FakeLink()
    const transport = createTransport(link)
    const waiting = transport.request([0x01])
    const queued = transport.request([0x02])
    const failures = Promise.all([
      expect(waiting).rejects.toMatchObject({ reason: 'disconnected' }),
      expect(queued).rejects.toMatchObject({ reason: 'disconnected' }),
    ])
    await vi.advanceTimersByTimeAsync(0)

    link.drop()

    await failures
    await expect(transport.request([0x03])).rejects.toMatchObject({ reason: 'disconnected' })
    expect(link.requests).toHaveLength(1)
  })

  it('rejects when the link cannot send', async () => {
    const link = new FakeLink()
    const transport = createTransport(link)
    link.closed = true

    await expect(transport.request([0x01])).rejects.toThrow('closed')
  })
})
