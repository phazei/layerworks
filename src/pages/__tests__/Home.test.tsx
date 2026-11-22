// @vitest-environment jsdom
// SPDX-License-Identifier: GPL-3.0-or-later

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen, waitFor, within } from '@testing-library/react'
import '..'
import { deviceStore } from '../../device'
import { FakeLink, fakeKeyboard, fakeKeyboardConfig } from '../../device/fake-keyboard'
import { connectDemo, demoKeyboard, disconnect } from '../../shell/session'
import { Shell } from '../../shell/Shell'
import { closeUnlock } from '../../shell/unlock-dialog'
import { describeCapabilities } from '../home/features'
import { buildCapabilities, type CapabilitySources } from '../../device/capabilities'

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

describe('Home on a keyboard whose lighting the app can’t change', () => {
  it('says keys change freely, not lighting', async () => {
    const config = fakeKeyboardConfig()
    config.definition = { name: 'Plain', matrix: { rows: config.rows, cols: config.cols }, layouts: { keymap: config.kle }, lighting: 'none' }
    const link = new FakeLink('cable')
    link.responder = fakeKeyboard(config)
    await act(() => deviceStore.connect(link))
    await go('#/')
    render(<Shell />)
    await waitFor(() => expect(deviceStore.getState().capabilities?.lighting).not.toBeNull())
    const glance = screen.getByLabelText('At a glance')
    await waitFor(() => expect(glance).toHaveTextContent('Keys change freely; a few powerful changes ask first.'))
    expect(glance).not.toHaveTextContent('lighting change')
  })

  it('offers macros and shortcuts in place of a lighting effect among the shortcuts (the demo Corne)', async () => {
    history.replaceState(null, '', '/?demo-keyboard=corne')
    await connectDemo()
    await waitFor(() => expect(deviceStore.getState().loading).toEqual([]))
    await go('#/')
    render(<Shell />)
    const tiles = screen.getByRole('navigation', { name: 'Shortcuts' })
    expect(within(tiles).queryByRole('link', { name: /Pick a lighting effect/ })).toBeNull()
    expect(within(tiles).getByRole('link', { name: /Make a macro or shortcut/ })).toHaveAttribute('href', '#/shortcuts')
    history.replaceState(null, '', '/')
  })
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

  it('offers unlocking from the Protection fact while locked', () => {
    render(<Shell />)
    const glance = screen.getByLabelText('At a glance')
    act(() => within(glance).getByRole('button', { name: 'Unlock…' }).click())
    expect(screen.getByRole('dialog', { name: /Unlock the keyboard/ })).toBeInTheDocument()
    act(() => closeUnlock())
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

  it('says the keyboard does N-key rollover by itself where it reports adaptive N-key rollover', async () => {
    // The demo is a K15 Max: once its Keychron part is in, adaptive.
    await connectDemo()
    await waitFor(() => expect(deviceStore.getState().capabilities?.nkro).toBe('automatic'))
    const lines = describeCapabilities(deviceStore.getState().capabilities!)
    expect(lines.find((l) => l.id === 'nkro')).toMatchObject({ available: true, detail: 'the keyboard does it by itself' })
  })

  it('counts the effects the Lighting page offers, without Off and Direct Control', async () => {
    await connectDemo()
    await waitFor(() => expect(deviceStore.getState().loading).toEqual([]))
    const caps = deviceStore.getState().capabilities!
    const listed = [...caps.lighting!.effects]
    expect(caps.effectCount).toBe(listed.filter((id) => id > 1).length)
    expect(describeCapabilities(caps).find((l) => l.id === 'lighting')?.detail).toBe(`${caps.effectCount} effects`)
  })
})

describe('Home’s N-key rollover line, for each way a keyboard has it', () => {
  const line = (sources: Partial<CapabilitySources>) =>
    describeCapabilities(buildCapabilities({ ...SOURCES, ...sources })).find((l) => l.id === 'nkro')!
  const kc = (patch: Record<string, boolean>) =>
    ({ hasNkro: true, nkroEnabled: false, nkroSupported: false, nkroAdaptive: false, ...patch }) as unknown as CapabilitySources['keychron']

  it('done by the keyboard itself', () => {
    expect(line({ keychron: kc({ nkroAdaptive: true }) })).toMatchObject({ available: true, detail: 'the keyboard does it by itself' })
  })

  it('QMK’s switch on Typing feel', () => {
    expect(line({})).toMatchObject({ available: true, detail: 'a switch on Typing feel' })
  })

  it('still being read', () => {
    expect(line({ keychronPending: true })).toMatchObject({ available: false, reason: 'Still reading this from the keyboard.' })
  })

  it('a keyboard without the setting', () => {
    expect(line({ qmkSettings: new Set([7]) })).toMatchObject({ available: false, reason: 'This keyboard’s firmware doesn’t include it.' })
  })
})

const SOURCES: CapabilitySources = {
  viaProtocol: 12,
  vialProtocol: 6,
  layers: 4,
  knobs: 0,
  counts: { tapDance: 0, combo: 0, keyOverride: 0, altRepeatKey: 0, featureFlags: 0 },
  macroCount: 0,
  macroBytes: 0,
  qmkSettings: new Set([21]),
  lighting: null,
  keychron: null,
}
