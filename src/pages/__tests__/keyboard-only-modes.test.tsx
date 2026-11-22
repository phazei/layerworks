// @vitest-environment jsdom
// SPDX-License-Identifier: GPL-3.0-or-later
// The modes that take keys for themselves can be used and left from the keyboard: the Test page lets Tab, and Enter
// or Space on a control, do their usual job; macro recording stops on Esc; "Press a key" stops on Esc.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import '..'
import { deviceStore } from '../../device'
import { Shell } from '../../shell/Shell'
import { connectDemo, disconnect } from '../../shell/session'
import { stage } from '../../shell/stage-store'
import { closeUnlock } from '../../shell/unlock-dialog'
import { clearPrefs } from '../../ui/prefs'
import { clearDrafts } from '../shortcuts/drafts'
import { keptOnTestPage } from '../test/keep-keys'
import { forgetSeenKeys } from '../test/seen'

async function show(path: string): Promise<void> {
  await connectDemo()
  await waitFor(() => expect(deviceStore.getState().loading).toEqual([]))
  await act(async () => {
    location.hash = path
    window.dispatchEvent(new HashChangeEvent('hashchange'))
  })
  render(<Shell />)
}

/** Sends a key to the focused element (or the page) and says whether something stopped the browser's action. */
function press(key: string, code: string, options: KeyboardEventInit = {}): boolean {
  const target = document.activeElement ?? document.body
  const down = new KeyboardEvent('keydown', { key, code, bubbles: true, cancelable: true, ...options })
  act(() => void target.dispatchEvent(down))
  const up = new KeyboardEvent('keyup', { key, code, bubbles: true, cancelable: true, ...options })
  act(() => void (document.activeElement ?? document.body).dispatchEvent(up))
  return down.defaultPrevented || up.defaultPrevented
}

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  clearPrefs()
  forgetSeenKeys()
})

afterEach(async () => {
  act(() => clearDrafts())
  act(() => closeUnlock())
  await act(() => disconnect())
  location.hash = ''
})

describe('which keys the Test page keeps from the browser', () => {
  const button = document.createElement('button')
  const event = (key: string, target: EventTarget | null = document.body, more = {}) => ({ key, ctrlKey: false, metaKey: false, target, ...more })

  it('lets Tab and Shift + Tab through everywhere', () => {
    expect(keptOnTestPage(event('Tab'))).toBe(false)
  })

  it('lets Enter and Space press a focused control, and keeps them elsewhere (they would scroll)', () => {
    expect(keptOnTestPage(event('Enter', button))).toBe(false)
    expect(keptOnTestPage(event(' ', button))).toBe(false)
    expect(keptOnTestPage(event(' '))).toBe(true)
    expect(keptOnTestPage(event('Enter'))).toBe(true)
  })

  it('keeps the arrows, the function keys and Alt, and lets Ctrl shortcuts through', () => {
    for (const key of ['ArrowDown', 'PageDown', 'Home', 'F5', 'F1', 'Alt', 'Backspace', 'a']) expect(keptOnTestPage(event(key))).toBe(true)
    expect(keptOnTestPage(event('l', document.body, { ctrlKey: true }))).toBe(false)
  })
})

describe('the Test page from the keyboard', () => {
  it('lets Tab move on and Enter press a button, and still counts both keys as seen', async () => {
    await show('#/test')
    const restart = screen.getByRole('button', { name: 'Start again' })
    act(() => restart.focus())
    expect(press('Tab', 'Tab')).toBe(false)
    expect(press('Tab', 'Tab', { shiftKey: true })).toBe(false)
    expect(press('ArrowDown', 'ArrowDown')).toBe(true)
    act(() => restart.focus())
    expect(press('Enter', 'Enter')).toBe(false)
    expect(screen.getByText(/^3 of 90 keys seen$/)).toBeInTheDocument()
  })
})

describe('recording a macro', () => {
  it('stops on Esc, records no Esc, and gives the focus back to “Record what I type”', async () => {
    await show('#/shortcuts/macro/5')
    act(() => screen.getByRole('button', { name: 'Record what I type' }).click())
    expect(screen.getByRole('button', { name: 'Stop recording' })).toBeInTheDocument()
    for (const code of ['KeyH', 'KeyI']) {
      act(() => void window.dispatchEvent(new KeyboardEvent('keydown', { code, bubbles: true })))
      act(() => void window.dispatchEvent(new KeyboardEvent('keyup', { code, bubbles: true })))
    }
    act(() => void document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true })))
    act(() => void document.body.dispatchEvent(new KeyboardEvent('keyup', { key: 'Escape', code: 'Escape', bubbles: true })))

    expect(screen.queryByRole('button', { name: 'Stop recording' })).toBeNull()
    const steps = within(screen.getByRole('region', { name: 'Steps' }))
    expect(steps.getByRole('textbox', { name: 'Text to type, step 1' })).toHaveValue('hi')
    expect(screen.queryByRole('listitem', { name: /Step 2/ })).toBeNull()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Record what I type' }))
  })
})

describe('“Press a key” on the Keys page', () => {
  it('stops waiting on Esc, without taking Esc as the key', async () => {
    await show('#/keys')
    act(() => stage.select({ kind: 'key', row: 2, col: 2 }))
    const before = deviceStore.getState().keyboard!.keymap['2,2,2']
    const button = screen.getByRole('button', { name: 'Press a key' })
    act(() => button.focus())
    act(() => button.click())
    expect(screen.getByRole('button', { name: /Press a key now/ })).toBeInTheDocument()
    fireEvent.keyDown(document.activeElement!, { key: 'Escape', code: 'Escape' })
    expect(screen.getByRole('button', { name: 'Press a key' })).toBeInTheDocument()
    expect(deviceStore.getState().keyboard!.keymap['2,2,2']).toBe(before)
  })
})
