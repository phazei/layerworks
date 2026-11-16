// @vitest-environment jsdom
// SPDX-License-Identifier: GPL-3.0-or-later

import { clearPrefs } from '../../../ui/prefs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import '../..'
import { deviceStore, layerKeycode, layerTapKeycode, modTapKeycode, parseKeycode, shortcutKeycode } from '../../../device'
import { renameMacro } from '../../../shell/layer-names'
import { connectDemo, disconnect } from '../../../shell/session'
import { Shell } from '../../../shell/Shell'
import { stage, type Selection } from '../../../shell/stage-store'
import { getPref, setPref } from '../../../ui/prefs'

// The demo keyboard rests on its Windows layer (2). Row 3, column 2 is A; row 5, column 7 is MO(3); on layer 3,
// row 4, column 1 is "same as the layer below", over Left Shift.
const A_KEY: Selection = { kind: 'key', row: 3, col: 2 }
const keymap = (layer: number, row: number, col: number) => deviceStore.getState().keyboard!.keymap[`${layer},${row},${col}`]

async function openKeys(selection: Selection, layer?: number): Promise<void> {
  await act(async () => {
    location.hash = '#/keys'
    window.dispatchEvent(new HashChangeEvent('hashchange'))
  })
  render(<Shell />)
  act(() => {
    if (layer !== undefined) stage.showLayer(layer)
    stage.select(selection)
  })
}

async function click(element: HTMLElement): Promise<void> {
  await act(async () => fireEvent.click(element))
}

function openMoreOptions(): void {
  const toggle = screen.getByRole('button', { name: 'More options' })
  if (toggle.getAttribute('aria-expanded') !== 'true') fireEvent.click(toggle)
}

const choice = (name: string) => screen.getByRole('radio', { name })
const keycode = (name: string) => parseKeycode(name)!
const palette = () => screen.getByRole('group', { name: 'Keys' })

beforeEach(async () => {
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  // "More options" open or closed is remembered in the browser: start each test without what the last one left.
  clearPrefs()
  await connectDemo()
})

afterEach(async () => {
  await act(() => disconnect())
  location.hash = ''
})

describe('the Keys page', () => {
  it('asks for a key while none is selected', async () => {
    await act(async () => {
      location.hash = '#/keys'
      window.dispatchEvent(new HashChangeEvent('hashchange'))
    })
    render(<Shell />)
    expect(screen.getByText(/Click a key in the picture/)).toBeInTheDocument()
  })

  it('shows what the key does now and opens on the matching choice', async () => {
    await openKeys(A_KEY)
    expect(screen.getByRole('heading', { name: 'What should this key do?' })).toBeInTheDocument()
    const now = screen.getByRole('group', { name: 'What it does now' })
    expect(now).toHaveTextContent('A')
    expect(now).toHaveTextContent('KC_A')
    expect(choice('A key')).toHaveAttribute('aria-checked', 'true')
    expect(within(palette()).getByRole('button', { name: 'A' })).toHaveAttribute('aria-current', 'true')
  })

  it('assigns a key from the palette, and undo puts the old one back', async () => {
    await openKeys(A_KEY)
    await click(within(palette()).getByRole('button', { name: 'Escape' }))
    await waitFor(() => expect(keymap(2, 3, 2)).toBe(0x29))
    expect(screen.getByRole('group', { name: 'What it does now' })).toHaveTextContent('KC_ESCAPE')
    expect(screen.getByRole('heading', { name: 'What should this key do?' })).toBeInTheDocument()

    await click(within(screen.getByRole('contentinfo', { name: 'Status' })).getByRole('button', { name: 'Undo' }))
    await waitFor(() => expect(keymap(2, 3, 2)).toBe(0x04))
  })

  it('finds keys by what they do and by their QMK name', async () => {
    await openKeys(A_KEY)
    const search = screen.getByRole('searchbox', { name: 'Search keys' })
    fireEvent.change(search, { target: { value: 'volume' } })
    expect(within(palette()).getByRole('button', { name: 'Volume Up' })).toBeInTheDocument()
    expect(within(palette()).queryByRole('button', { name: 'A' })).toBeNull()
    fireEvent.change(search, { target: { value: 'kc_esc' } })
    expect(within(palette()).getByRole('button', { name: 'Escape' })).toBeInTheDocument()
    fireEvent.change(search, { target: { value: 'nothing like it' } })
    expect(screen.getByText(/No key matches/)).toBeInTheDocument()
  })

  it('builds a shortcut from modifiers and a key', async () => {
    await openKeys(A_KEY)
    fireEvent.click(choice('A shortcut'))
    // Nothing ticked to start with, and the key it holds now (A) already picked.
    expect(screen.getByRole('button', { name: 'Tick a modifier' })).toBeDisabled()
    expect(within(screen.getByRole('group', { name: 'Key for the shortcut' })).getByRole('button', { name: 'A' })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(screen.getByRole('checkbox', { name: 'Ctrl' }))
    fireEvent.click(screen.getByRole('checkbox', { name: 'Shift' }))
    fireEvent.click(within(screen.getByRole('group', { name: 'Key for the shortcut' })).getByRole('button', { name: 'C' }))
    await click(screen.getByRole('button', { name: 'Use Ctrl + Shift + C' }))
    await waitFor(() => expect(keymap(2, 3, 2)).toBe(shortcutKeycode(0x01 | 0x02, 0x06)))
    expect(screen.getByRole('group', { name: 'What it does now' })).toHaveTextContent('Ctrl + Shift + C')
  })

  it('makes a layer key, named after the layer', async () => {
    await openKeys(A_KEY)
    fireEvent.click(choice('Switch layer'))
    fireEvent.click(within(screen.getByRole('group', { name: 'Layer to switch to' })).getByRole('button', { name: 'Layer 4' }))
    await click(screen.getByRole('button', { name: /While held, use Layer 4/ }))
    await waitFor(() => expect(keymap(2, 3, 2)).toBe(layerKeycode('MO', 4)))
  })

  it('opens a layer key on "Switch layer", with its sentence marked', async () => {
    await openKeys({ kind: 'key', row: 5, col: 7 })
    expect(choice('Switch layer')).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('button', { name: /While held, use Windows Fn/ })).toHaveAttribute('aria-pressed', 'true')
  })

  it('sets "same as the layer below" and says what the key falls through to', async () => {
    await openKeys(A_KEY, 3)
    openMoreOptions()
    await click(screen.getByRole('button', { name: /Same as the layer below/ }))
    await waitFor(() => expect(keymap(3, 3, 2)).toBe(0x01))
    expect(screen.getByText(/It normally does what it does on Windows/)).toHaveTextContent('A KC_A')
  })

  it('says when a key on a higher layer has nothing of its own', async () => {
    setPref('open:keys-more', false)
    await openKeys({ kind: 'key', row: 4, col: 1 }, 3)
    expect(screen.getByText(/where it has nothing of its own/)).toHaveTextContent('Left Shift')
    expect(screen.getByRole('button', { name: 'More options' })).toHaveAttribute('aria-expanded', 'true')
  })

  it('opens More options for a key that lives there, only for that key', async () => {
    setPref('open:keys-more', false)
    await openKeys({ kind: 'key', row: 4, col: 1 }, 3)
    expect(screen.getByRole('button', { name: 'More options' })).toHaveAttribute('aria-expanded', 'true')
    act(() => {
      stage.showLayer(2)
      stage.select(A_KEY)
    })
    expect(screen.getByRole('button', { name: 'More options' })).toHaveAttribute('aria-expanded', 'false')
    expect(getPref('open:keys-more', false)).toBe(false)
  })

  it('takes a typed key code, saying what it means first', async () => {
    await openKeys(A_KEY)
    openMoreOptions()
    const field = screen.getByRole('textbox', { name: /Key code/ })
    fireEvent.change(field, { target: { value: 'kc_nope' } })
    expect(screen.getByText('Not a key code this app knows.')).toBeInTheDocument()
    fireEvent.change(field, { target: { value: 'LCTL(KC_V)' } })
    expect(screen.getByText(/^Means/)).toHaveTextContent('Ctrl + V')
    await click(screen.getByRole('button', { name: 'Use this code' }))
    await waitFor(() => expect(keymap(2, 3, 2)).toBe(shortcutKeycode(0x01, 0x19)))
  })

  it('makes a tap / hold key with a modifier, only once the button is pressed', async () => {
    await openKeys(A_KEY)
    fireEvent.click(choice('Tap or hold'))
    expect(choice('Tap or hold')).toHaveAttribute('aria-checked', 'true')
    // The tap starts as the key it holds now (A), nothing is ticked, and nothing is written until the button.
    expect(within(screen.getByRole('group', { name: 'Key for a tap' })).getByRole('button', { name: 'A' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Tick a modifier' })).toBeDisabled()
    fireEvent.click(within(screen.getByRole('group', { name: 'Modifiers while held' })).getByRole('checkbox', { name: 'Ctrl' }))
    expect(screen.getByRole('button', { name: 'Use Tap: A · Hold: Ctrl' })).toBeEnabled()
    fireEvent.click(within(screen.getByRole('group', { name: 'Key for a tap' })).getByRole('button', { name: 'Escape' }))
    expect(keymap(2, 3, 2)).toBe(0x04)
    await click(screen.getByRole('button', { name: 'Use Tap: Escape · Hold: Ctrl' }))
    await waitFor(() => expect(keymap(2, 3, 2)).toBe(modTapKeycode(0x01, 0x29)))
    const now = screen.getByRole('group', { name: 'What it does now' })
    expect(now).toHaveTextContent('Tap: Escape · Hold: Ctrl')
    expect(now).toHaveTextContent('LCTL_T(KC_ESCAPE)')

    await click(within(screen.getByRole('contentinfo', { name: 'Status' })).getByRole('button', { name: 'Undo' }))
    await waitFor(() => expect(keymap(2, 3, 2)).toBe(0x04))
  })

  it('makes a tap / hold key with a layer, named after the layer', async () => {
    await openKeys(A_KEY)
    fireEvent.click(choice('Tap or hold'))
    fireEvent.click(within(screen.getByRole('group', { name: 'When held' })).getByRole('button', { name: 'a layer' }))
    fireEvent.click(within(screen.getByRole('group', { name: 'Layer while held' })).getByRole('button', { name: 'Layer 4' }))
    fireEvent.click(within(screen.getByRole('group', { name: 'Key for a tap' })).getByRole('button', { name: 'Space bar' }))
    await click(screen.getByRole('button', { name: 'Use Tap: Space bar · Hold: Layer 4' }))
    await waitFor(() => expect(keymap(2, 3, 2)).toBe(layerTapKeycode(4, 0x2c)))
    expect(screen.getByRole('group', { name: 'What it does now' })).toHaveTextContent('LT4(KC_SPACE)')
  })

  it('opens a mod-tap key on "Tap or hold", saying what it does', async () => {
    // The demo's Fn2 layer has Caps Lock as Tap: Escape · Hold: Ctrl.
    await openKeys({ kind: 'key', row: 3, col: 1 }, 4)
    expect(choice('Tap or hold')).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('group', { name: 'What it does now' })).toHaveTextContent('Tap: Escape · Hold: Ctrl')
    expect(within(screen.getByRole('group', { name: 'Modifiers while held' })).getByRole('checkbox', { name: 'Ctrl' })).toBeChecked()
    expect(within(screen.getByRole('group', { name: 'Key for a tap' })).getByRole('button', { name: 'Escape' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'This is what it does now' })).toBeDisabled()
  })

  it('opens a layer-tap key on "Tap or hold", with its layer by name', async () => {
    // And Tab as Tap: Tab · Hold: Windows Fn.
    await openKeys({ kind: 'key', row: 2, col: 1 }, 4)
    expect(choice('Tap or hold')).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('group', { name: 'What it does now' })).toHaveTextContent('Tap: Tab · Hold: Windows Fn')
    expect(within(screen.getByRole('group', { name: 'When held' })).getByRole('button', { name: 'a layer' })).toHaveAttribute('aria-pressed', 'true')
    expect(within(screen.getByRole('group', { name: 'Layer while held' })).getByRole('button', { name: 'Windows Fn' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('names macro and multi-tap tiles by what they do, and finds them by name', async () => {
    act(() => renameMacro(deviceStore.getState().keyboard!.uid, 1, 'Email'))
    await openKeys(A_KEY)
    await waitFor(() => expect(within(palette()).getByRole('button', { name: 'Email: Types “hello@example.com”' })).toHaveTextContent('Email'))
    expect(within(palette()).getByRole('button', { name: 'Multi-tap key 1: Tap: Escape · Double tap: Caps Lock' })).toHaveTextContent('Multi- tap 1')
    expect(within(palette()).getByRole('button', { name: /^Multi-tap key 5: empty/ })).toBeInTheDocument()

    fireEvent.change(screen.getByRole('searchbox', { name: 'Search keys' }), { target: { value: 'email' } })
    expect(within(palette()).getByRole('button', { name: /^Email/ })).toBeInTheDocument()
    expect(within(palette()).queryByRole('button', { name: 'A' })).toBeNull()
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search keys' }), { target: { value: 'caps lock' } })
    expect(within(palette()).getByRole('button', { name: /^Multi-tap key 1/ })).toBeInTheDocument()
    act(() => renameMacro(deviceStore.getState().keyboard!.uid, 1, ''))
  })

  it('says what a macro key runs, with a link to it', async () => {
    // The key printed M1 is QMK's M1: Macro 1, as on the key.
    await openKeys({ kind: 'key', row: 1, col: 0 })
    const now = screen.getByRole('group', { name: 'What it does now' })
    await waitFor(() => expect(now).toHaveTextContent('Macro 1 · Types “hello@example.com”'))
    expect(within(now).getByRole('link', { name: 'Open on Shortcuts & macros' })).toHaveAttribute('href', '#/shortcuts/macro/1')
  })

  it('ticks no modifier for the next key only until one is chosen', async () => {
    await openKeys(A_KEY)
    openMoreOptions()
    const use = screen.getAllByRole('button', { name: 'Tick a modifier' }).at(-1)!
    expect(use).toBeDisabled()
    for (const box of screen.getAllByRole('checkbox', { name: 'Shift' })) expect(box).not.toBeChecked()
  })

  it('ticks no modifier for a layer with modifiers until one is chosen', async () => {
    setPref('open:keys-layer-mods', true)
    await openKeys(A_KEY)
    fireEvent.click(choice('Switch layer'))
    expect(screen.getByRole('checkbox', { name: 'Ctrl' })).not.toBeChecked()
    expect(screen.getByRole('button', { name: 'Tick a modifier' })).toBeDisabled()
  })

  it('says how many taps keep a layer on, from the keyboard’s setting', async () => {
    await openKeys(A_KEY)
    fireEvent.click(choice('Switch layer'))
    // The demo reports QMK's tapping toggle as 5, a setting on the Typing feel page.
    expect(screen.getByRole('button', { name: /Hold for Windows Fn, or tap it 5 times to keep it on/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Typing feel page' })).toHaveAttribute('href', '#/typing/tapHold')
  })

  it('edits a knob direction', async () => {
    // Direction 1 is clockwise; the demo turns the volume up that way.
    await openKeys({ kind: 'knob', knob: 0, direction: 1 })
    expect(screen.getByRole('heading', { name: /What should turning right do/ })).toBeInTheDocument()
    expect(screen.getByText(/^The knob, on Windows/)).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'What it does now' })).toHaveTextContent('Volume Up')
    await click(within(palette()).getByRole('button', { name: 'Mute Audio' }))
    await waitFor(() => expect(deviceStore.getState().keyboard!.knobs['2,0,1']).toBe(0xa8))
  })
})

describe('the keys beyond the everyday ones', () => {
  const search = (text: string) => fireEvent.change(screen.getByRole('searchbox', { name: 'Search keys' }), { target: { value: text } })
  const tiles = () => within(palette()).queryAllByRole('button').map((tile) => tile.getAttribute('aria-label'))

  it('shows the typing helpers and the swapped and disabled keys, with the rarer ones folded away', async () => {
    await openKeys(A_KEY)
    expect(within(palette()).getByRole('region', { name: 'Typing helpers' })).toBeInTheDocument()
    expect(within(palette()).getByRole('region', { name: 'Swapped and disabled keys' })).toHaveTextContent('Typing feel')
    expect(within(palette()).getByRole('button', { name: 'Capitals for one word (Caps Word)' })).toBeInTheDocument()
    expect(within(palette()).getByRole('button', { name: 'More keys' })).toHaveAttribute('aria-expanded', 'false')
    expect(within(palette()).queryByRole('region', { name: 'Restart and firmware update' })).toBeNull()
    fireEvent.click(within(palette()).getByRole('button', { name: 'More keys' }))
    expect(within(palette()).getByRole('region', { name: 'Restart and firmware update' })).toBeInTheDocument()
  })

  it('finds them by friendly name, QMK name and what they do, folded ones included', async () => {
    await openKeys(A_KEY)
    search('magic')
    expect(tiles()).toContain('Swap Caps Lock and left Ctrl')
    expect(tiles()).not.toContain('A')
    search('windows key')
    expect(tiles()).toContain('Windows keys do nothing')
    search('nkro')
    expect(tiles()).toEqual(expect.arrayContaining(['Any number of keys at once: on or off']))
    search('swap')
    expect(tiles()).toContain('Swap Esc and Caps Lock')
    search('gui')
    expect(tiles()).toContain('Windows keys do nothing')
    search('space cadet')
    expect(tiles()).toContain('Left Shift when held, ( when tapped (Space Cadet)')
    search('reboot')
    expect(tiles()).toContain('Restart the keyboard')
  })

  it('says what a key holding a magic key does, and opens the fold for a rare one', async () => {
    await act(() => deviceStore.assign({ kind: 'key', layer: 2, row: 3, col: 2 }, 0x7002))
    await openKeys(A_KEY)
    const now = screen.getByRole('group', { name: 'What it does now' })
    expect(now).toHaveTextContent('Swap Caps Lock and left Ctrl, or back')
    expect(now).toHaveTextContent('CL_TOGG')
    expect(choice('A key')).toHaveAttribute('aria-checked', 'true')
    expect(within(palette()).getByRole('button', { name: 'Swap Caps Lock and left Ctrl, or back' })).toHaveAttribute('aria-current', 'true')
  })

  it('opens "More keys" by itself for a key that holds one of its keys', async () => {
    await act(() => deviceStore.assign({ kind: 'key', layer: 2, row: 3, col: 2 }, keycode('QK_REBOOT')))
    await openKeys(A_KEY)
    expect(within(palette()).getByRole('button', { name: 'More keys' })).toHaveAttribute('aria-expanded', 'true')
    expect(within(palette()).getByRole('button', { name: 'Restart the keyboard' })).toHaveAttribute('aria-current', 'true')
  })

  it('asks to unlock before putting the firmware update key on a key', async () => {
    await openKeys(A_KEY)
    fireEvent.click(within(palette()).getByRole('button', { name: 'More keys' }))
    await click(within(palette()).getByRole('button', { name: /^Firmware update mode/ }))
    const dialog = await screen.findByRole('dialog', { name: /Unlock the keyboard/ })
    expect(dialog).toHaveTextContent('firmware update key')
    await act(async () => within(dialog).getByRole('button', { name: 'Cancel' }).click())
    expect(keymap(2, 3, 2)).toBe(0x04)
  })

  it('names a key from a family the palette leaves out', async () => {
    // A MIDI note: the demo's firmware has no MIDI, so no table names it.
    await act(() => deviceStore.assign({ kind: 'key', layer: 2, row: 3, col: 2 }, 0x7103))
    await openKeys(A_KEY)
    expect(screen.getByRole('group', { name: 'What it does now' })).toHaveTextContent('A MIDI music key')
  })
})
