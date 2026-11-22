// @vitest-environment jsdom
// SPDX-License-Identifier: GPL-3.0-or-later

import { afterEach, describe, expect, it, vi } from 'vitest'
import { waitFor } from '@testing-library/react'
import { deviceStore } from '..'
import { connectDemo, disconnect } from '../../shell/session'
import { ledRowsMissed } from '../keychron-rgb'

afterEach(async () => {
  await disconnect()
  history.replaceState(null, '', '/')
})

describe('a Keychron board with more than 8 matrix rows and per-key lighting', () => {
  it('is one the vendored reload reads short', () => {
    expect(ledRowsMissed(6)).toBe(false) // the K15 Max
    expect(ledRowsMissed(8)).toBe(false)
    expect(ledRowsMissed(10)).toBe(true) // keychron/c100_8k
  })

  it('has an LED found under every key, those in rows 9 and 10 included (the demo C100 8K)', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    history.replaceState(null, '', '/?demo-keyboard=c100')
    await connectDemo()
    await waitFor(() => expect(deviceStore.getState().loading).toEqual([]))
    const { keychron, capabilities, keyboard } = deviceStore.getState()
    expect(keyboard!.rows).toBe(10)
    const leds = keychron!.rgb!.ledMatrix
    expect(leds.size).toBe(keychron!.rgb!.ledCount)
    expect([...leds.keys()].filter((at) => Number(at.split(',')[0]) >= 8)).toHaveLength(20)
    expect(capabilities!.has('perKeyLighting')).toBe(true)
  })
})
