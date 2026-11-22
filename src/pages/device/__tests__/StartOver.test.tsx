// @vitest-environment jsdom
// SPDX-License-Identifier: GPL-3.0-or-later

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import '../..'
import { deviceStore } from '../../../device'
import { clearPrefs } from '../../../ui/prefs'
import { connectDemo, disconnect } from '../../../shell/session'
import { Shell } from '../../../shell/Shell'

async function showDevice(): Promise<void> {
  await connectDemo()
  await waitFor(() => expect(deviceStore.getState().loading).toEqual([]))
  await act(async () => {
    location.hash = '#/device'
    window.dispatchEvent(new HashChangeEvent('hashchange'))
  })
  render(<Shell />)
  fireEvent.click(screen.getByRole('button', { name: 'More options' }))
}

const dialog = (title: RegExp) => screen.getByRole('dialog', { name: title, hidden: true })

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  clearPrefs()
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
    this.open = true
  }
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
    this.open = false
  }
})

afterEach(async () => {
  await act(() => disconnect())
  location.hash = ''
})

describe('Device, More options', () => {
  it('asks before a reset, naming what is lost and what stays, and resets', async () => {
    await showDevice()
    const before = deviceStore.getState().keyboard!.keymap['4,0,1']
    fireEvent.click(screen.getByRole('button', { name: 'Reset to defaults…' }))
    const box = within(dialog(/^Reset the keyboard/))
    expect(box.getByText('Every key on all 5 layers')).toBeTruthy()
    expect(box.getByText('Key chords')).toBeTruthy()
    expect(box.getByText(/Stays as it is: the lighting, key colours, mixed zones and the Caps Lock light, layer and macro names/)).toBeTruthy()
    expect(box.getByText('Unticked, the macros stay as they are.')).toBeTruthy()
    expect(box.getByRole('button', { name: 'Save a backup first' })).toBeTruthy()

    const reset = vi.spyOn(deviceStore, 'resetKeymap')
    fireEvent.click(box.getByRole('checkbox', { name: 'Empty the macros too' }))
    expect(box.getByText('Every macro')).toBeTruthy()
    await act(async () => {
      fireEvent.click(box.getByRole('button', { name: 'Reset' }))
    })
    await screen.findByText('The keys are the firmware’s own again.')
    expect(reset).toHaveBeenCalledWith({ macros: true })
    // The demo's Fn2 + Esc example (QK_REBOOT) isn't in the firmware's keymap.
    expect(deviceStore.getState().keyboard!.keymap['4,0,1']).not.toBe(before)
    expect(deviceStore.getState().macros!.every((b) => b === 0)).toBe(true)
  })

  it('asks before restarting for a firmware update and unlocks first when locked', async () => {
    await showDevice()
    fireEvent.click(screen.getByRole('button', { name: 'Restart for a firmware update…' }))
    const box = within(dialog(/^Restart for a firmware update/))
    expect(box.getByText(/stops typing until new firmware is put on it/)).toBeTruthy()
    expect(box.getByText(/loses the connection/)).toBeTruthy()
    expect(box.getByRole('button', { name: 'Unlock and restart…' })).toBeTruthy()
  })
})
