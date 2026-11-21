// @vitest-environment jsdom
// SPDX-License-Identifier: GPL-3.0-or-later
// "Press a key" on the Keys page, on the demo keyboard: locked (browser key events) and unlocked (the switch matrix
// too, which wins when both report the press).

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import '../..'
import { deviceStore, layerKeycode } from '../../../device'
import type { FakeLink } from '../../../device/fake-keyboard'
import { connectDemo, demoKeyboard, disconnect } from '../../../shell/session'
import { Shell } from '../../../shell/Shell'
import { stage, type Selection } from '../../../shell/stage-store'
import { clearPrefs } from '../../../ui/prefs'
import { keyNow } from '../describe'
import { MATRIX_WAIT_MS } from '../PressKey'

// The demo rests on its Windows layer (2). Row 3, column 2 is A; row 1, column 0 is the key printed M1 (QMK's M1);
// row 5, column 7 is MO(3).
const A_KEY: Selection = { kind: 'key', row: 3, col: 2 }
const M1_KEY = '1,0'
const FN_KEY = '5,7'
const KC_Z = 0x1d
const M1 = 0x7701
const keymap = (row: number, col: number) => deviceStore.getState().keyboard!.keymap[`2,${row},${col}`]

async function show(selection: Selection, { unlocked = false } = {}): Promise<void> {
  history.replaceState(null, '', unlocked ? '/?demo-unlocked' : '/')
  await connectDemo()
  await waitFor(() => expect(deviceStore.getState().unlock).not.toBeNull())
  await act(async () => {
    location.hash = '#/keys'
    window.dispatchEvent(new HashChangeEvent('hashchange'))
  })
  render(<Shell />)
  act(() => stage.select(selection))
}

const pressButton = () => screen.getByRole('button', { name: /^Press a key/ })
const browserKey = (code: string) =>
  act(() => {
    fireEvent.keyDown(window, { code })
    fireEvent.keyUp(window, { code })
  })
/** A key down on the demo's switches only, as a key the computer doesn't see (Fn, a macro key). */
async function matrixKey(position: string): Promise<void> {
  act(() => demoKeyboard()!.setKey(position, true))
  await new Promise((resolve) => setTimeout(resolve, 80))
  act(() => demoKeyboard()!.setKey(position, false))
}

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  clearPrefs()
})

afterEach(async () => {
  await act(() => disconnect())
  history.replaceState(null, '', '/')
  location.hash = ''
})

describe('Press a key, locked', () => {
  it('takes the next key the browser sees, as one undo step', async () => {
    await show(A_KEY)
    fireEvent.click(pressButton())
    expect(screen.getByText(/not Fn, layer or/)).toBeInTheDocument()
    await browserKey('KeyZ')
    await waitFor(() => expect(keymap(3, 2)).toBe(KC_Z))
    expect(pressButton()).toHaveTextContent('Press a key')
    await act(() => deviceStore.undo())
    expect(keymap(3, 2)).toBe(0x04)
  })

  it('stops on Esc without changing anything, and says when the browser can’t name a key', async () => {
    await show(A_KEY)
    fireEvent.click(pressButton())
    await browserKey('Escape')
    expect(pressButton()).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(pressButton())
    await browserKey('F13')
    expect(screen.getByText(/The browser can’t tell which key that is/)).toBeInTheDocument()
    expect(keymap(3, 2)).toBe(0x04)
  })

  it('works for a knob direction too', async () => {
    await show({ kind: 'knob', knob: 0, direction: 1 })
    fireEvent.click(pressButton())
    await browserKey('KeyZ')
    await waitFor(() => expect(deviceStore.getState().keyboard!.knobs['2,0,1']).toBe(KC_Z))
  })
})

describe('Press a key, unlocked', () => {
  it('sees keys the computer never gets, through the matrix: a macro key, a layer key', async () => {
    await show(A_KEY, { unlocked: true })
    fireEvent.click(pressButton())
    expect(screen.getByText(/does its usual job on the computer/)).toBeInTheDocument()
    await matrixKey(M1_KEY)
    await waitFor(() => expect(keymap(3, 2)).toBe(M1))

    fireEvent.click(pressButton())
    await matrixKey(FN_KEY)
    await waitFor(() => expect(keymap(3, 2)).toBe(layerKeycode('MO', 3)))
  })

  it('takes the matrix’s key when the browser reports the same press', async () => {
    await show(A_KEY, { unlocked: true })
    fireEvent.click(pressButton())
    // The browser hears Mute (as from a media key), the switches say the M1 key: the exact key wins.
    await browserKey('AudioVolumeMute')
    await matrixKey(M1_KEY)
    await waitFor(() => expect(keymap(3, 2)).toBe(M1))
    await act(() => new Promise((resolve) => setTimeout(resolve, MATRIX_WAIT_MS + 50)))
    expect(keymap(3, 2)).toBe(M1)
  })

  it('falls back to the browser’s key when the matrix reports nothing in time', async () => {
    await show(A_KEY, { unlocked: true })
    fireEvent.click(pressButton())
    // Mute isn't on the demo's base layer, so no switch goes down for it.
    await browserKey('AudioVolumeMute')
    await waitFor(() => expect(keymap(3, 2)).toBe(0xa8), { timeout: MATRIX_WAIT_MS + 1000 })
  })

  it('reads the matrix only while waiting', async () => {
    await show(A_KEY, { unlocked: true })
    // Vial's switch matrix request: 0x02 0x03 (via.c, id_get_keyboard_value / id_switch_matrix_state).
    const polls = () => (demoKeyboard() as unknown as FakeLink).requests.filter((r) => r[0] === 0x02 && r[1] === 0x03).length
    const before = polls()
    await new Promise((resolve) => setTimeout(resolve, 100))
    expect(polls()).toBe(before)
    fireEvent.click(pressButton())
    await waitFor(() => expect(polls()).toBeGreaterThan(before))
    await browserKey('Escape')
    await new Promise((resolve) => setTimeout(resolve, 60))
    const stopped = polls()
    await new Promise((resolve) => setTimeout(resolve, 100))
    expect(polls()).toBe(stopped)
    expect(within(screen.getByRole('group', { name: 'What it does now' })).getByText('KC_A')).toBeInTheDocument()
  })
})

describe('keyNow', () => {
  it('takes what a key does on the active layer, falling through to the base layer and layer 0', async () => {
    await show(A_KEY)
    const kb = deviceStore.getState().keyboard!
    expect(keyNow(kb, '3,2', { base: 2, active: 2 })).toBe(0x04)
    // On Windows Fn (3), row 4, column 1 is "same as the layer below": the Windows layer's Left Shift.
    expect(keyNow(kb, '4,1', { base: 2, active: 3 })).toBe(0xe1)
    expect(keyNow(kb, '1,0', { base: 2, active: 2 })).toBe(M1)
  })
})
