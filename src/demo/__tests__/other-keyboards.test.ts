// @vitest-environment jsdom
// SPDX-License-Identifier: GPL-3.0-or-later

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { deviceStore, matrixKeys } from '../../device'
import { connectDemo, disconnect, useConnectError } from '../../shell/session'
import { DEMO_KEYBOARDS, loadDemoKeyboard } from '../other-keyboards'
import { renderHook } from '@testing-library/react'

function loaded(): Promise<void> {
  return new Promise((resolve) => {
    const done = () => deviceStore.getState().status !== 'ready' || deviceStore.getState().loading.length === 0
    if (done()) return resolve()
    const off = deviceStore.subscribe(() => {
      if (!done()) return
      off()
      resolve()
    })
  })
}

async function demo(name: string): Promise<void> {
  history.replaceState(null, '', `/?demo-keyboard=${name}`)
  await connectDemo()
  await loaded()
}

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})
afterEach(async () => {
  await disconnect()
  history.replaceState(null, '', '/')
})

describe('the demo standing in for other keyboards (?demo-keyboard=)', () => {
  it('has the keyboards that show the differences', () => {
    expect(DEMO_KEYBOARDS).toEqual(['cloud', 'corne', 'gh80', 'klein', 'macropad', 'q0', 'q2', 'splinter', 'vipad'])
  })

  it.each(DEMO_KEYBOARDS)('loads %s as the app would read the real one', async (name) => {
    const file = (await loadDemoKeyboard(name))!
    await demo(name)
    const state = deviceStore.getState()
    expect(state.status).toBe('ready')
    expect(state.failed).toEqual([])
    expect(state.link).toMatchObject({ kind: 'cable', ...file.usb })
    expect(state.keyboard!.layers).toBe(file.firmware.layers)
    expect(matrixKeys(state.keyboard!)).toHaveLength(file.keys.length)
    // Knobs the firmware keeps to itself (no knob map) are counted apart.
    expect(state.keyboard!.knobCount + state.keyboard!.fixedKnobs).toBe(file.knobs.length)
    expect(state.keyboard!.fixedKnobs > 0).toBe(!file.firmware.knobMap)
    expect(state.keychron !== null).toBe(file.firmware.keychron)
  }, 20000)

  it('gives a macropad without entry slots or typing settings none of them', async () => {
    await demo('macropad')
    const { capabilities, settings } = deviceStore.getState()
    expect([capabilities!.tapDances, capabilities!.combos, capabilities!.keyOverrides, capabilities!.altRepeatKeys]).toEqual([0, 0, 0, 0])
    expect(settings).toEqual({})
  })

  it('reads several knobs, each by its own index', async () => {
    await demo('splinter')
    const { keyboard } = deviceStore.getState()
    expect(keyboard!.knobCount).toBe(6)
    await deviceStore.assign({ kind: 'knob', layer: 0, knob: 5, direction: 1 }, 0x04)
    expect(deviceStore.getState().keyboard!.knobs['0,5,1']).toBe(0x04)
    expect(deviceStore.getState().keyboard!.knobs['0,4,1']).not.toBe(0x04)
  })

  it('says which names there are for one it doesn’t have', async () => {
    history.replaceState(null, '', '/?demo-keyboard=nonesuch')
    await connectDemo()
    const { result } = renderHook(() => useConnectError())
    expect(result.current).toMatch(/no demo keyboard called “nonesuch”.*corne/)
    expect(deviceStore.getState().status).toBe('disconnected')
  })
})
