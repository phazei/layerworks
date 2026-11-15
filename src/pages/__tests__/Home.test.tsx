// @vitest-environment jsdom
// SPDX-License-Identifier: GPL-3.0-or-later

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen, within } from '@testing-library/react'
import '..'
import { deviceStore } from '../../device'
import { connectDemo, demoKeyboard, disconnect } from '../../shell/session'
import { Shell } from '../../shell/Shell'
import { describeCapabilities } from '../home/features'

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

describe('Home on the demo keyboard', () => {
  beforeEach(async () => {
    await connectDemo()
    await go('#/')
  })

  it('shows the keyboard at a glance', () => {
    render(<Shell />)
    const glance = screen.getByLabelText('At a glance')
    const card = glance.closest('section')!
    expect(card).toHaveTextContent(deviceStore.getState().keyboard!.name)
    expect(glance).toHaveTextContent('ConnectionCable')
    expect(glance).toHaveTextContent('Active layerWindows')
    expect(glance).toHaveTextContent('Firmwaredemo')
    expect(glance).toHaveTextContent('ProtectionLocked')
    // The demo keyboard is on the cable, so there's no battery to show.
    expect(glance).not.toHaveTextContent('Battery')
  })

  it('follows the layer the keyboard reports', async () => {
    render(<Shell />)
    await act(async () => demoKeyboard()!.holdLayer(3))
    expect(screen.getByLabelText('At a glance')).toHaveTextContent('Active layerWindows Fn')
    expect(screen.getByLabelText('At a glance')).toHaveTextContent('Held on top of Windows')
  })

  it('lists what the keyboard can do, and folds away what it can’t', () => {
    render(<Shell />)
    const features = screen.getByRole('list', { name: 'Features' })
    expect(features).toHaveTextContent('Layers5')
    expect(features).toHaveTextContent('A knob')
    expect(features).toHaveTextContent('Multi-tap keysTap Dance · 16')
    expect(screen.queryByRole('list', { name: 'Not available' })).toBeNull()
    act(() => screen.getByRole('button', { name: /Not available on this keyboard/ }).click())
    expect(screen.getByRole('list', { name: 'Not available' })).toHaveTextContent('Wireless and battery')
  })

  it('has shortcuts that go to the right pages', async () => {
    render(<Shell />)
    const shortcuts = screen.getByRole('navigation', { name: 'Shortcuts' })
    const target = (name: string) => within(shortcuts).getByRole('link', { name: new RegExp(`^${name}`) }).getAttribute('href')
    expect(target('Change what a key does')).toBe('#/keys')
    expect(target('Pick a lighting effect')).toBe('#/lighting')
    expect(target('Back up the keyboard')).toBe('#/device')
    expect(target('Test the keys')).toBe('#/test')

    // jsdom doesn't follow links, so go where the link points, as the browser would.
    await go(target('Pick a lighting effect')!)
    expect(screen.getByRole('heading', { level: 1, name: 'Lighting' })).toBeInTheDocument()
  })
})

describe('Home with no keyboard', () => {
  it('welcomes and offers to connect, and the demo shows the keyboard', async () => {
    await go('#/')
    render(<Shell />)
    expect(screen.getByRole('heading', { level: 1, name: 'Home' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Connect your keyboard' })).toBeInTheDocument()
    expect(screen.getByRole('list', { name: 'What you can do' })).toBeInTheDocument()

    act(() => screen.getByRole('button', { name: 'Try the demo keyboard' }).click())
    expect(await screen.findByLabelText('At a glance')).toHaveTextContent('Cable')
    expect(screen.getByRole('region', { name: 'Keyboard and layers' })).toBeInTheDocument()
  })
})

describe('describeCapabilities', () => {
  it('gives every feature a friendly name, and a reason where it is missing', async () => {
    await connectDemo()
    const lines = describeCapabilities(deviceStore.getState().capabilities!)
    expect(lines[0]).toEqual({ id: 'layers', name: 'Layers', detail: '5', available: true })
    expect(lines.find((l) => l.id === 'macros')).toMatchObject({ available: true, qmkName: 'Macros', detail: '16' })
    expect(lines.find((l) => l.id === 'battery')).toMatchObject({ available: false, reason: expect.any(String) })
    expect(new Set(lines.map((l) => l.id)).size).toBe(lines.length)
  })
})
