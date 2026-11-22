// SPDX-License-Identifier: GPL-3.0-or-later

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createDeviceStore } from '../store'
import { FakeLink, fakeKeyboard, fakeKeyboardConfig, plainDefinition, type Responder } from '../fake-keyboard'
import { answersVial, NOT_VIAL } from '../vial-firmware'

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})

/** A keyboard whose firmware answers Vial's commands as `vial` does, everything else as the fake. */
async function connectWith(vial: (request: Uint8Array) => number[]) {
  const store = createDeviceStore({ decompress: plainDefinition })
  const link = new FakeLink('cable')
  const fake = fakeKeyboard(fakeKeyboardConfig())
  const responder: Responder = (request) => (request[0] === 0xfe ? vial(request) : fake(request))
  link.responder = responder
  await store.connect(link)
  return { store, link }
}

describe('a keyboard with VIA firmware, not Vial', () => {
  it('answers Vial’s keyboard ID with its protocol version; VIA with “unknown command”, other firmware with an echo', () => {
    expect(answersVial([6, 0, 0, 0, 1, 2, 3, 4])).toBe(true)
    expect(answersVial([0xff, 0x00, 0, 0])).toBe(false)
    expect(answersVial([0xfe, 0x00, 0, 0])).toBe(false)
  })

  it('is said plainly at connect, not as a definition that failed to unpack (VIA and Keychron’s stock firmware)', async () => {
    // vial_qmk quantum/via.c: raw_hid_receive_kb puts 0xFF (id_unhandled) in the first byte and sends the rest back.
    const { store, link } = await connectWith((request) => [0xff, ...Array.from(request.subarray(1))])
    expect(store.getState()).toMatchObject({ status: 'error', error: NOT_VIAL, keyboard: null })
    expect(link.closed).toBe(true)
    // Nothing past the question that told.
    expect(link.requests.filter((r) => r[0] === 0xfe && r[1] === 0x02)).toHaveLength(0)
  })

  it('is said plainly for firmware that sends Vial’s commands back unchanged', async () => {
    const { store } = await connectWith((request) => Array.from(request))
    expect(store.getState().error).toBe(NOT_VIAL)
  })
})
