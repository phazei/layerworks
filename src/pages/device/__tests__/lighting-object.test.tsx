// @vitest-environment jsdom
// SPDX-License-Identifier: GPL-3.0-or-later

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen, waitFor } from '@testing-library/react'
import '../..'
import { deviceStore } from '../../../device'
import { connectDemo, disconnect } from '../../../shell/session'
import { Shell } from '../../../shell/Shell'
import { clearPrefs, setPref } from '../../../ui/prefs'

async function go(path: string): Promise<void> {
  await act(async () => {
    location.hash = path
    window.dispatchEvent(new HashChangeEvent('hashchange'))
  })
}

beforeEach(async () => {
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  clearPrefs()
  // The demo as a Corne, whose vial.json gives its lighting as { "extends": "qmk_rgblight" }.
  history.replaceState(null, '', '/?demo-keyboard=corne')
  await connectDemo()
  await waitFor(() => expect(deviceStore.getState().loading).toEqual([]))
})

afterEach(async () => {
  await act(() => disconnect())
  history.replaceState(null, '', '/')
  location.hash = ''
})

describe('a definition whose lighting is an object', () => {
  it('is read as the lighting it names', () => {
    expect(deviceStore.getState().lighting?.kind).toBe('qmk_rgblight')
  })

  it('shows in Technical details as a kind, with what was written beside it', async () => {
    setPref('open:device-technical', true)
    await go('#/device')
    render(<Shell />)
    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.getByText(/qmk_rgblight \(written as \{"extends":"qmk_rgblight"\}\)/)).toBeInTheDocument()
  })

  it('says on Lighting that the app can’t change this kind of light', async () => {
    await go('#/lighting')
    render(<Shell />)
    expect(screen.getByText(/older way \(not VialRGB\)/)).toBeInTheDocument()
  })
})
