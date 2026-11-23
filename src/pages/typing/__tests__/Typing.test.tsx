// @vitest-environment jsdom
// SPDX-License-Identifier: GPL-3.0-or-later

import { clearPrefs } from '../../../ui/prefs'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import '../..'
import { deviceStore, SETTING_GROUP_INFO } from '../../../device'
import { FLASH_MS } from '../../../ui/reveal'
import { FakeLink, fakeKeyboard, fakeKeyboardConfig, type FakeKeyboardConfig, type FakeKeychron } from '../../../device/fake-keyboard'
import { definePlugin, removePlugin } from '../../../plugins/api'
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
  clearPrefs()
})

afterEach(async () => {
  await act(() => deviceStore.disconnect())
  location.hash = ''
  removePlugin('test-typing')
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

  it('takes the focus to the group picked in the side list and flashes it, every time it is picked', async () => {
    await open()
    const nav = screen.getByRole('navigation', { name: 'Typing settings' })
    const pick = () => fireEvent.click(within(nav).getByRole('button', { name: SETTING_GROUP_INFO.chords.title }))
    const group = document.getElementById('typing-chords')!
    vi.useFakeTimers()
    try {
      act(pick)
      // Already in view (nothing scrolls in jsdom): marked once the scrolling would have started and didn't.
      expect(document.activeElement).toBe(group)
      expect(group).not.toHaveAttribute('data-flash')
      act(() => vi.advanceTimersByTime(150))
      expect(group).toHaveAttribute('data-flash')
      act(() => vi.advanceTimersByTime(FLASH_MS))
      expect(group).not.toHaveAttribute('data-flash')

      // The same group again: marked again.
      act(pick)
      act(() => vi.advanceTimersByTime(150))
      expect(group).toHaveAttribute('data-flash')
      expect(document.activeElement).toBe(group)
    } finally {
      vi.useRealTimers()
    }
  })

  describe('N-key rollover', () => {
    const switchShown = () => {
      const magic = card(/Swapped and disabled keys/)
      const more = within(magic).queryByRole('button', { name: 'More options' })
      if (more && more.getAttribute('aria-expanded') !== 'true') act(() => more.click())
      return within(magic).queryByRole('switch', { name: /Any number of keys at once/ }) !== null
    }
    const search = (text: string) => fireEvent.change(screen.getByRole('searchbox', { name: 'Search the typing settings' }), { target: { value: text } })

    it('shows the switch on a keyboard without Keychron’s commands, as QMK has it', async () => {
      await open()
      await waitFor(() => expect(deviceStore.getState().loading).toEqual([]))
      expect(deviceStore.getState().capabilities?.nkro).toBe('setting')
      expect(switchShown()).toBe(true)
    })

    it('shows it where Keychron’s firmware says it can be switched', async () => {
      await open({ keychron: { ...structuredClone(KEYCHRON), features: KEYCHRON.features | 0x0200, nkro: 0x02 } })
      await waitFor(() => expect(deviceStore.getState().loading).toEqual([]))
      expect(deviceStore.getState().capabilities?.nkro).toBe('setting')
      expect(switchShown()).toBe(true)
    })

    it('hides it, also from the search, where the keyboard does it by itself', async () => {
      await open({ keychron: { ...structuredClone(KEYCHRON), features: KEYCHRON.features | 0x0200, nkro: 0x04 } })
      await waitFor(() => expect(deviceStore.getState().loading).toEqual([]))
      expect(deviceStore.getState().capabilities?.nkro).toBe('automatic')
      expect(switchShown()).toBe(false)
      // The rest of the card stays.
      expect(within(card(/Swapped and disabled keys/)).getByRole('switch', { name: /Windows keys do nothing/ })).toBeInTheDocument()
      search('nkro')
      expect(screen.queryByRole('switch', { name: /Any number of keys at once/ })).toBeNull()
    })
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
