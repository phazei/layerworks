// @vitest-environment jsdom
// SPDX-License-Identifier: GPL-3.0-or-later

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen, waitFor, within } from '@testing-library/react'
import '../../pages'
import { deviceStore } from '../../device'
import { connectDemo, disconnect } from '../session'
import { Shell } from '../Shell'
import { stage } from '../stage-store'

async function go(path: string): Promise<void> {
  await act(async () => {
    location.hash = path
    window.dispatchEvent(new HashChangeEvent('hashchange'))
  })
}

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})

afterEach(async () => {
  await act(() => disconnect())
  location.hash = ''
})

describe('the shell on the demo keyboard', () => {
  beforeEach(async () => {
    await connectDemo()
  })

  it('lists every built-in page in the sidebar and marks the current one', async () => {
    await go('#/keys')
    render(<Shell />)
    const nav = screen.getByRole('navigation', { name: 'Pages' })
    const links = within(nav).getAllByRole('link').map((link) => link.textContent)
    expect(links).toEqual([
      'Home',
      'Keys',
      'Shortcuts & macros',
      'Lighting',
      'Typing feel',
      'Test',
      'Device',
      'Help',
      'Settings',
    ])
    expect(within(nav).getByRole('link', { name: 'Keys' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('heading', { level: 1, name: 'Keys' })).toBeInTheDocument()
  })

  it('shows the connected keyboard in the device card', () => {
    render(<Shell />)
    const card = screen.getByRole('region', { name: 'Connected keyboard' })
    expect(card).toHaveTextContent(deviceStore.getState().keyboard!.name)
    expect(card).toHaveTextContent('Demo keyboard')
    expect(card).toHaveTextContent('Cable')
  })

  it('shows the stage with named layers on the Keys page, the live layer marked', async () => {
    await go('#/keys')
    render(<Shell />)
    const stageRegion = screen.getByRole('region', { name: 'Keyboard and layers' })
    const layers = within(stageRegion).getByRole('list', { name: 'Layers' })
    expect(within(layers).getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      '0Mac',
      '1Mac Fn',
      '2WindowsActive',
      '3Windows Fn',
      '4Layer 4',
    ])
    expect(within(stageRegion).getByRole('switch')).toHaveAttribute('aria-checked', 'true')
    expect(stageRegion.querySelector('svg')).not.toBeNull()
  })

  it('passes the selected key to the Keys page', async () => {
    await go('#/keys')
    render(<Shell />)
    expect(screen.getByText(/Click a key/)).toBeInTheDocument()
    act(() => stage.select({ kind: 'key', row: 0, col: 1 }))
    expect(screen.getByText(/This key does/)).toBeInTheDocument()
  })

  it('choosing a layer stops following the keyboard', async () => {
    await go('#/keys')
    render(<Shell />)
    expect(screen.getByRole('button', { name: 'Windows, active on the keyboard' })).toHaveAttribute('aria-pressed', 'true')
    act(() => screen.getByRole('button', { name: 'Mac Fn' }).click())
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false')
    expect(screen.getByRole('button', { name: 'Mac Fn' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('leaves the stage out on pages that use the full height', async () => {
    await go('#/settings')
    render(<Shell />)
    expect(screen.queryByRole('region', { name: 'Keyboard and layers' })).toBeNull()
    expect(screen.getByRole('radiogroup', { name: 'Theme' })).toBeInTheDocument()
  })

  it('says in the status line that everything is saved, with undo and redo', async () => {
    await go('#/lighting')
    render(<Shell />)
    const status = screen.getByRole('contentinfo', { name: 'Status' })
    expect(status).toHaveTextContent('Saved on the keyboard')
    expect(within(status).getByRole('button', { name: 'Undo' })).toBeDisabled()
    expect(within(status).getByRole('button', { name: 'Redo' })).toBeDisabled()
  })

  it('enables undo after a change and undoes it', async () => {
    render(<Shell />)
    const slot = { kind: 'key', layer: 0, row: 0, col: 1 } as const
    const before = deviceStore.getState().keyboard!.keymap['0,0,1']
    await act(() => deviceStore.assign(slot, 0x04))
    const undo = screen.getByRole('button', { name: 'Undo' })
    expect(undo).toBeEnabled()
    await act(async () => undo.click())
    await waitFor(() => expect(deviceStore.getState().keyboard!.keymap['0,0,1']).toBe(before))
  })

  it('opens the help panel from a "?" and closes it again', async () => {
    await go('#/keys')
    const { container } = render(<Shell />)
    const panel = container.querySelector<HTMLElement>('aside[aria-label="Help"]')!
    expect(panel).toHaveAttribute('aria-hidden', 'true')
    act(() => within(screen.getByRole('region', { name: 'Keyboard and layers' })).getByRole('button', { name: 'Explain this' }).click())
    expect(panel).toHaveAttribute('aria-hidden', 'false')
    expect(panel).toHaveTextContent('Follow the keyboard')
    act(() => within(panel).getByRole('button', { name: 'Close help' }).click())
    expect(panel).toHaveAttribute('aria-hidden', 'true')
  })
})

describe('the shell with no keyboard', () => {
  it('asks to connect on pages that need a keyboard, and offers the demo', async () => {
    await go('#/keys')
    render(<Shell />)
    expect(screen.getByRole('heading', { name: 'Connect your keyboard' })).toBeInTheDocument()
    // jsdom has no WebHID, like Firefox or Safari.
    expect(screen.getByText(/This browser can’t talk to keyboards/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Connect a keyboard…' })).toBeDisabled()
    expect(screen.queryByRole('contentinfo', { name: 'Status' })).toBeNull()

    act(() => screen.getByRole('button', { name: 'Try the demo keyboard' }).click())
    expect(await screen.findByRole('region', { name: 'Keyboard and layers' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Connected keyboard' })).toHaveTextContent('Demo keyboard')
  })

  it('shows pages that work without a keyboard', async () => {
    await go('#/help')
    render(<Shell />)
    expect(screen.queryByRole('heading', { name: 'Connect your keyboard' })).toBeNull()
    expect(screen.getByText('Explanations')).toBeInTheDocument()
  })

  it('goes to Home for the bare address and says so for an unknown one', async () => {
    await go('')
    const { unmount } = render(<Shell />)
    expect(screen.getByRole('heading', { level: 1, name: 'Home' })).toBeInTheDocument()
    unmount()
    await go('#/nowhere')
    render(<Shell />)
    expect(screen.getByText('This page isn’t here')).toBeInTheDocument()
  })
})
