// @vitest-environment jsdom
// SPDX-License-Identifier: GPL-3.0-or-later

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen, waitFor, within } from '@testing-library/react'
import '..'
import { deviceStore, matrixKeys } from '../../device'
import { connectDemo, demoKeyboard, disconnect } from '../../shell/session'
import { Shell } from '../../shell/Shell'
import { clearPrefs } from '../../ui/prefs'
import { keyGroups } from '../lighting/key-groups'
import { forgetSeenKeys } from '../test/seen'

async function go(path: string): Promise<void> {
  await act(async () => {
    location.hash = path
    window.dispatchEvent(new HashChangeEvent('hashchange'))
  })
}

describe('counts on a keyboard with layout options follow the chosen layout (the demo GH80-3000)', () => {
  beforeEach(async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    clearPrefs()
    forgetSeenKeys()
    history.replaceState(null, '', '/?demo-keyboard=gh80&demo-unlocked')
    await connectDemo()
    await waitFor(() => expect(deviceStore.getState().loading).toEqual([]))
  })
  afterEach(async () => {
    await act(() => disconnect())
    history.replaceState(null, '', '/')
    location.hash = ''
  })

  it('counts only the keys the chosen layout has', () => {
    const kb = deviceStore.getState().keyboard!
    const everyOption = new Set(kb.layout!.keys.filter((k) => k.encoderIdx < 0 && !k.decal).map((k) => `${k.row},${k.col}`))
    expect(matrixKeys(kb).length).toBeLessThan(everyOption.size)
  })

  it('groups for colouring keys only keys of the chosen layout, even where every alternative had a light', () => {
    const kb = deviceStore.getState().keyboard!
    const everyPosition = [...new Set(kb.layout!.keys.filter((k) => k.encoderIdx < 0).map((k) => `${k.row},${k.col}`))]
    const leds = new Map(everyPosition.map((pos, i) => [pos, i]))
    const grouped = new Set(keyGroups(kb, 0, leds).flatMap((group) => group.keys))
    expect([...grouped].every((pos) => matrixKeys(kb).includes(pos))).toBe(true)
    expect(grouped.size).toBe(matrixKeys(kb).length)
  })

  it('lets the Test page reach “Every key works”', async () => {
    const keys = matrixKeys(deviceStore.getState().keyboard!)
    await go('#/test')
    render(<Shell />)
    expect(screen.getByText(`0 of ${keys.length} keys seen`)).toBeInTheDocument()
    for (const position of keys) {
      act(() => demoKeyboard()!.setKey(position, true))
      await new Promise((resolve) => setTimeout(resolve, 30))
      act(() => demoKeyboard()!.setKey(position, false))
    }
    await waitFor(() => expect(screen.getByText(`${keys.length} of ${keys.length} keys seen`)).toBeInTheDocument(), { timeout: 10000 })
    expect(screen.getByText('Every key works')).toBeInTheDocument()
  }, 30000)

  it('gives Device’s “Keys” the same count', async () => {
    const keys = matrixKeys(deviceStore.getState().keyboard!)
    await go('#/device')
    render(<Shell />)
    expect(within(screen.getByLabelText('The keyboard')).getByText(String(keys.length))).toBeInTheDocument()
  })
})
