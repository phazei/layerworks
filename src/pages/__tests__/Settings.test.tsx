// @vitest-environment jsdom
// SPDX-License-Identifier: GPL-3.0-or-later

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, renderHook, screen, within } from '@testing-library/react'
import '..'
import { deviceStore } from '../../device'
import { renameLayer, useConnectedLayerNames } from '../../ui/layer-names'
import { connectDemo, disconnect } from '../../shell/session'
import { Shell } from '../../shell/Shell'
import { setPref } from '../../ui/prefs'
import { THEME_PREF } from '../../ui/theme'

async function go(path: string): Promise<void> {
  await act(async () => {
    location.hash = path
    window.dispatchEvent(new HashChangeEvent('hashchange'))
  })
}

beforeEach(async () => {
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  await go('#/settings')
})

afterEach(async () => {
  const uid = deviceStore.getState().keyboard?.uid
  if (uid) for (let i = 0; i < 5; i++) renameLayer(uid, i, '')
  await act(() => disconnect())
  setPref(THEME_PREF, 'dark')
  location.hash = ''
})

describe('Settings with the demo keyboard', () => {
  beforeEach(async () => {
    await connectDemo()
  })

  it('renames a layer, and the new name is the one used everywhere', () => {
    render(<Shell />)
    const names = renderHook(() => useConnectedLayerNames())
    const field = screen.getByRole('textbox', { name: 'Name of layer 4' })
    expect(field).toHaveValue('Layer 4')

    act(() => {
      fireEvent.change(field, { target: { value: 'Fn2' } })
      fireEvent.blur(field)
    })
    expect(names.result.current[4]).toBe('Fn2')
    expect(screen.getByRole('textbox', { name: 'Name of layer 4' })).toHaveValue('Fn2')
  })

  it('resets a renamed layer to its default', () => {
    render(<Shell />)
    const names = renderHook(() => useConnectedLayerNames())
    const field = screen.getByRole('textbox', { name: 'Name of layer 2' })
    act(() => {
      fireEvent.change(field, { target: { value: 'Work' } })
      fireEvent.keyDown(field, { key: 'Enter' })
      fireEvent.blur(field)
    })
    expect(names.result.current[2]).toBe('Work')

    act(() => screen.getByRole('button', { name: 'Reset layer 2 to “Windows”' }).click())
    expect(names.result.current[2]).toBe('Windows')
    expect(screen.getByRole('textbox', { name: 'Name of layer 2' })).toHaveValue('Windows')
    expect(screen.queryByRole('button', { name: /Reset layer 2/ })).toBeNull()
  })

  it('shows a rename made in the layer stack', () => {
    render(<Shell />)
    act(() => renameLayer(deviceStore.getState().keyboard!.uid, 0, 'Home row'))
    expect(screen.getByRole('textbox', { name: 'Name of layer 0' })).toHaveValue('Home row')
  })
})

describe('Settings with no keyboard', () => {
  it('shows without a keyboard, and says layer names need one', () => {
    render(<Shell />)
    expect(screen.queryByRole('heading', { name: 'Connect your keyboard' })).toBeNull()
    expect(screen.getByText('Connect a keyboard to name its layers.')).toBeInTheDocument()
    expect(screen.queryByRole('textbox')).toBeNull()
  })

  it('switches the theme', () => {
    render(<Shell />)
    const theme = screen.getByRole('radiogroup', { name: 'Theme' })
    expect(within(theme).getByRole('radio', { name: 'Dark' })).toHaveAttribute('aria-checked', 'true')
    expect(document.documentElement).toHaveClass('dark')

    act(() => within(theme).getByRole('radio', { name: 'Light' }).click())
    expect(within(theme).getByRole('radio', { name: 'Light' })).toHaveAttribute('aria-checked', 'true')
    expect(document.documentElement).not.toHaveClass('dark')

    act(() => within(theme).getByRole('radio', { name: 'Dark' }).click())
    expect(document.documentElement).toHaveClass('dark')
  })

  it('credits Pipette, QMK and Vial with links that open in a new tab', () => {
    render(<Shell />)
    const pipette = screen.getByRole('link', { name: /^Pipette/ })
    expect(pipette).toHaveAttribute('href', 'https://github.com/darakuneko/pipette-desktop')
    expect(pipette).toHaveAttribute('target', '_blank')
    expect(screen.getByRole('link', { name: /^QMK/ })).toHaveAttribute('target', '_blank')
    expect(screen.getByRole('link', { name: /^Vial(?! GUI)/ })).toHaveAttribute('target', '_blank')
    expect(screen.getByText('GPL-3.0-or-later')).toBeInTheDocument()
  })
})
