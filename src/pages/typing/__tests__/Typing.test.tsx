// @vitest-environment jsdom
// SPDX-License-Identifier: GPL-3.0-or-later

import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import '../..'
import { deviceStore } from '../../../device'
import { FakeLink, fakeKeyboard, fakeKeyboardConfig, type FakeKeyboardConfig, type FakeKeychron } from '../../../device/fake-keyboard'
import { definePlugin } from '../../../plugins/api'
import { Shell } from '../../../shell/Shell'

let config: FakeKeyboardConfig
let link: FakeLink

const KEYCHRON: FakeKeychron = {
  protocol: 2,
  features: 0x01 | 0x20 | 0x40,
  firmware: 'v1',
  misc: 0x04 | 0x08,
  debounce: { type: 4, time: 50 },
  snapClick: Array.from({ length: 20 }, () => ({ type: 0, key1: 0, key2: 0 })),
}

/** Unless told otherwise: combo term, Auto Shift and its timeout, tapping term, tap code delay and Magic. */
async function open(overrides: Partial<FakeKeyboardConfig> = {}): Promise<void> {
  config = fakeKeyboardConfig({
    qsids: [2, 3, 4, 7, 18, 21],
    settingValues: { 2: [50, 0], 3: [0], 4: [175, 0], 7: [200, 0], 18: [0, 0], 21: [0, 0, 0, 0] },
    settingDefaults: { 2: [50, 0], 3: [0], 4: [175, 0], 7: [200, 0], 18: [0, 0], 21: [0, 0, 0, 0] },
    ...overrides,
  })
  link = new FakeLink('cable')
  link.responder = fakeKeyboard(config)
  await deviceStore.connect(link)
  await act(async () => {
    location.hash = '#/typing'
    window.dispatchEvent(new HashChangeEvent('hashchange'))
  })
  render(<Shell />)
  await screen.findByRole('heading', { name: /Tap or hold/ })
}

const settled = () => waitFor(() => expect(deviceStore.getState().writing).toBe(0))
const card = (name: RegExp) => screen.getByRole('heading', { name }).closest('section')!

beforeAll(() => {
  // jsdom's <dialog> may lack showModal.
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
    this.open = true
  }
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
    this.open = false
  }
})

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  localStorage.clear()
})

afterEach(async () => {
  await act(() => deviceStore.disconnect())
  location.hash = ''
})

describe('the Typing feel page', () => {
  it('shows only the settings the keyboard reports, grouped', async () => {
    await open()
    expect(screen.getByRole('slider', { name: /How long counts as a hold/ })).toHaveValue('200')
    expect(screen.getByRole('slider', { name: /Time to press them all/ })).toHaveValue('50')
    // Nothing reported for mouse keys or one-tap modifiers: no card at all.
    expect(screen.queryByRole('heading', { name: /Mouse keys/ })).toBeNull()
    expect(screen.queryByRole('heading', { name: /One-tap modifiers/ })).toBeNull()
    expect(screen.queryByRole('slider', { name: /Taps to lock a layer on/ })).toBeNull()
  })

  it('writes a slider without flooding the keyboard, ending on the last value', async () => {
    await open()
    const term = screen.getByRole('slider', { name: /How long counts as a hold/ })
    const before = link.requests.filter((r) => r[0] === 0xfe && r[1] === 0x0b).length
    act(() => {
      for (const value of [210, 220, 230, 240, 250]) fireEvent.change(term, { target: { value: String(value) } })
    })
    expect(term).toHaveValue('250')
    await settled()
    await waitFor(() => expect(config.settingValues?.[7][0]).toBe(250))
    expect(link.requests.filter((r) => r[0] === 0xfe && r[1] === 0x0b).length - before).toBeLessThan(5)
  })

  it('offers quick choices beside a slider', async () => {
    await open()
    const choices = screen.getByRole('group', { name: /Quick choices: How long counts as a hold/ })
    act(() => within(choices).getByRole('button', { name: /Relaxed/ }).click())
    await settled()
    await waitFor(() => expect(config.settingValues?.[7][0]).toBe(250))
    expect(within(choices).getByRole('button', { name: /Relaxed/ })).toHaveAttribute('aria-pressed', 'true')
  })

  it('switches one bit of a set of switches', async () => {
    await open()
    act(() => screen.getByRole('switch', { name: /Windows keys do nothing/ }).click())
    await settled()
    await waitFor(() => expect(config.settingValues?.[21][0]).toBe(0x10))
    expect(screen.getByRole('switch', { name: /Windows keys do nothing/ })).toHaveAttribute('aria-checked', 'true')
  })

  it('greys out what does nothing yet, saying why', async () => {
    await open()
    const timeout = screen.getByRole('slider', { name: /How long to hold/ })
    expect(timeout).toBeDisabled()
    expect(timeout).toHaveAccessibleDescription('Turn on “Hold for capitals” first.')
    act(() => screen.getByRole('switch', { name: /Hold for capitals/ }).click())
    await settled()
    expect(screen.getByRole('slider', { name: /How long to hold/ })).toBeEnabled()
  })

  it('keeps the rarely needed settings under More options', async () => {
    await open()
    const tapHold = card(/Tap or hold/)
    expect(within(tapHold).queryByRole('slider', { name: /Length of taps the keyboard sends/ })).toBeNull()
    act(() => within(tapHold).getByRole('button', { name: 'More options' }).click())
    expect(within(tapHold).getByRole('slider', { name: /Length of taps the keyboard sends/ })).toBeInTheDocument()
  })

  it('finds settings by their name, QMK name or explanation', async () => {
    await open()
    const search = screen.getByRole('searchbox', { name: 'Search the typing settings' })
    act(() => fireEvent.change(search, { target: { value: 'tap code' } }))
    // Found under More options, and shown without opening it.
    expect(screen.getByRole('slider', { name: /Length of taps the keyboard sends/ })).toBeInTheDocument()
    expect(screen.queryByRole('slider', { name: /How long counts as a hold/ })).toBeNull()
    expect(screen.queryByRole('heading', { name: /Key chords/ })).toBeNull()

    act(() => fireEvent.change(search, { target: { value: 'caps lock' } }))
    expect(screen.getByRole('switch', { name: /Caps Lock works as Ctrl/ })).toBeInTheDocument()

    act(() => fireEvent.change(search, { target: { value: 'zebra' } }))
    expect(screen.getByText('No setting matches “zebra”.')).toBeInTheDocument()
  })

  it('shows settings it doesn’t know, read only', async () => {
    await open({ qsids: [7, 99], settingValues: { 7: [200, 0], 99: [3, 0] } })
    const other = card(/Other settings/)
    expect(other).toHaveTextContent('Setting 99')
    expect(within(other).queryByRole('slider')).toBeNull()
  })

  it('has no Keychron parts on a keyboard without Keychron’s commands', async () => {
    await open()
    expect(screen.queryByRole('heading', { name: /Key bounce filter/ })).toBeNull()
    expect(screen.queryByRole('heading', { name: /Snap Click/ })).toBeNull()
  })

  it('sets the key bounce filter on a Keychron keyboard', async () => {
    await open({ keychron: structuredClone(KEYCHRON) })
    const filter = card(/Key bounce filter/)
    expect(within(filter).getByRole('slider', { name: /Wait/ })).toHaveValue('50')
    act(() => within(filter).getByRole('button', { name: /Wait until steady/ }).click())
    await settled()
    await waitFor(() => expect(config.keychron?.debounce).toEqual({ type: 2, time: 50 }))
  })

  it('adds, changes and removes a Snap Click pair', async () => {
    await open({ keychron: structuredClone(KEYCHRON) })
    const snap = card(/Snap Click/)
    act(() => within(snap).getByRole('button', { name: /A and D/ }).click())
    await settled()
    await waitFor(() => expect(config.keychron?.snapClickSaved?.[0]).toEqual({ type: 2, key1: 0x04, key2: 0x07 }))

    const rule = within(snap).getByRole('combobox', { name: /While A and D are both held/ })
    act(() => fireEvent.change(rule, { target: { value: '5' } }))
    await settled()
    await waitFor(() => expect(config.keychron?.snapClick?.[0].type).toBe(5))

    act(() => within(snap).getByRole('button', { name: 'Remove the pair A and D' }).click())
    await settled()
    await waitFor(() => expect(config.keychron?.snapClick?.[0]).toEqual({ type: 0, key1: 0, key2: 0 }))
  })

  it('takes a Snap Click pair pressed on the keyboard', async () => {
    await open({ keychron: structuredClone(KEYCHRON) })
    const snap = card(/Snap Click/)
    act(() => within(snap).getByRole('button', { name: /Other keys/ }).click())
    act(() => within(snap).getByRole('button', { name: /First key/ }).click())
    act(() => fireEvent.keyDown(window, { code: 'KeyJ' }))
    act(() => within(snap).getByRole('button', { name: /Second key/ }).click())
    act(() => fireEvent.keyDown(window, { code: 'KeyL' }))
    act(() => within(snap).getByRole('button', { name: 'Add this pair' }).click())
    await settled()
    await waitFor(() => expect(config.keychron?.snapClick?.[0]).toEqual({ type: 2, key1: 0x0d, key2: 0x0f }))
  })

  it('resets every setting after asking', async () => {
    await open({ settingValues: { 2: [80, 0], 7: [44, 1], 18: [0, 0] } })
    act(() => screen.getByRole('button', { name: /Reset all typing settings/ }).click())
    const dialog = screen.getByRole('dialog', { name: 'Reset all typing settings?' })
    act(() => within(dialog).getByRole('button', { name: 'Reset' }).click())
    await settled()
    await waitFor(() => expect(screen.getByRole('slider', { name: /Time to press them all/ })).toHaveValue('50'))
    expect(config.settingValues?.[2]).toEqual([50, 0])
  })

  it('shows plugin panels for this section', async () => {
    definePlugin({
      id: 'test-typing',
      panels: [{ section: 'typing', title: 'Extra feel', component: () => <p>Extra feel settings</p> }],
    })
    await open()
    expect(screen.getByRole('heading', { name: 'Extra feel' })).toBeInTheDocument()
    expect(screen.getByText('Extra feel settings')).toBeInTheDocument()
  })
})
