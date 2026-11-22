// @vitest-environment jsdom
// SPDX-License-Identifier: GPL-3.0-or-later
// One Layerworks tab per keyboard: a second tab is told and can take the keyboard over; the first lets go.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/** A LockManager shared by "tabs" (each a fresh copy of the app's modules), as the browser shares one per origin. */
function fakeLocks() {
  const held = new Map<string, { reject: (e: Error) => void; release: () => void }>()
  return {
    request(name: string, options: { ifAvailable?: boolean; steal?: boolean }, callback: (lock: object | null) => unknown) {
      return new Promise((resolve, reject) => {
        const current = held.get(name)
        if (current && options.ifAvailable) {
          void Promise.resolve(callback(null)).then(resolve)
          return
        }
        if (current && options.steal) {
          held.delete(name)
          current.reject(Object.assign(new Error('stolen'), { name: 'AbortError' }))
        }
        const done = Promise.resolve(callback({ name }))
        held.set(name, { reject, release: () => held.delete(name) })
        void done.then((v) => {
          held.delete(name)
          resolve(v)
        })
      })
    },
  }
}

const device = { vendorId: 0x3434, productId: 0x0af0, productName: 'K15', collections: [{ usagePage: 0xff60, usage: 0x61 }], opened: true } as unknown as HIDDevice

/** A tab: the session module with its own device store, connecting through a fake link instead of WebHID. */
async function tab() {
  vi.resetModules()
  const { FakeLink, fakeKeyboard, fakeKeyboardConfig } = await import('../../device/fake-keyboard')
  vi.doMock('../../device/webhid', async (original) => ({
    ...(await original<typeof import('../../device/webhid')>()),
    openLink: async () => {
      const link = new FakeLink()
      link.responder = fakeKeyboard(fakeKeyboardConfig())
      return link
    },
  }))
  const session = await import('../session')
  const { deviceStore } = await import('../../device')
  return { session, deviceStore }
}

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  Object.defineProperty(navigator, 'locks', { value: fakeLocks(), configurable: true })
})
afterEach(() => {
  vi.doUnmock('../../device/webhid')
})

describe('two Layerworks tabs on one keyboard', () => {
  it('the second is told, and taking over makes the first let go', async () => {
    const first = await tab()
    await first.session.connectTo(device)
    expect(first.deviceStore.getState().status).not.toBe('disconnected')

    const second = await tab()
    await second.session.connectTo(device)
    expect(second.deviceStore.getState().status).toBe('disconnected')
    expect(second.session.sessionNotice()).toMatchObject({ kind: 'other-tab' })

    await second.session.takeOver(device)
    await new Promise((r) => setTimeout(r, 0))
    expect(first.deviceStore.getState().status).toBe('disconnected')
    expect(first.session.sessionNotice()).toEqual({ kind: 'taken-over' })
    expect(second.deviceStore.getState().status).not.toBe('disconnected')
  })

  it('without navigator.locks, connecting simply goes ahead', async () => {
    Object.defineProperty(navigator, 'locks', { value: undefined, configurable: true })
    const only = await tab()
    await only.session.connectTo(device)
    expect(only.deviceStore.getState().status).not.toBe('disconnected')
  })
})
