// SPDX-License-Identifier: GPL-3.0-or-later

import { describe, expect, it } from 'vitest'
import { createLatestQueue } from '../latest'

/** A sender whose sends finish only when the test says so. */
function controlledSender() {
  const sent: object[] = []
  const finish: (() => void)[] = []
  const send = (change: object) => {
    sent.push(change)
    return new Promise<void>((resolve) => finish.push(resolve))
  }
  const finishNext = async () => {
    finish.shift()?.()
    await new Promise((resolve) => setTimeout(resolve, 0))
  }
  return { sent, send, finishNext }
}

describe('the latest-wins queue', () => {
  it('sends at once when idle, then only the newest of what came in meanwhile', async () => {
    const { sent, send, finishNext } = controlledSender()
    const queue = createLatestQueue<{ val?: number }>(send)
    queue.push({ val: 1 })
    queue.push({ val: 2 })
    queue.push({ val: 3 })
    queue.push({ val: 4 })
    expect(sent).toEqual([{ val: 1 }])
    await finishNext()
    expect(sent).toEqual([{ val: 1 }, { val: 4 }])
    await finishNext()
    expect(sent).toHaveLength(2)
    await queue.idle()
  })

  it('merges different settings that wait together', async () => {
    const { sent, send, finishNext } = controlledSender()
    const queue = createLatestQueue<{ hue?: number; sat?: number }>(send)
    queue.push({ hue: 1 })
    queue.push({ sat: 9 })
    queue.push({ hue: 5 })
    await finishNext()
    expect(sent).toEqual([{ hue: 1 }, { sat: 9, hue: 5 }])
    await finishNext()
  })

  it('reports what is still on its way, and nothing once idle', async () => {
    const { send, finishNext } = controlledSender()
    const queue = createLatestQueue<{ hue?: number; sat?: number }>(send)
    let notified = 0
    queue.subscribe(() => notified++)
    expect(queue.pending()).toEqual({})
    queue.push({ hue: 1 })
    queue.push({ sat: 2 })
    expect(queue.pending()).toEqual({ hue: 1, sat: 2 })
    const idle = queue.idle()
    await finishNext()
    await finishNext()
    await idle
    expect(queue.pending()).toEqual({})
    expect(notified).toBeGreaterThan(0)
  })

  it('carries on after a failed send', async () => {
    const sent: number[] = []
    const queue = createLatestQueue<{ val: number }>(async ({ val }) => {
      sent.push(val)
      if (val === 1) throw new Error('lost')
    })
    queue.push({ val: 1 })
    queue.push({ val: 2 })
    await queue.idle()
    expect(sent).toEqual([1, 2])
  })
})
