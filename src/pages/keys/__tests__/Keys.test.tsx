// @vitest-environment jsdom
// SPDX-License-Identifier: GPL-3.0-or-later

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import '../..'
import { deviceStore, layerKeycode, shortcutKeycode } from '../../../device'
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
const palette = () => screen.getByRole('group', { name: 'Keys' })

beforeEach(async () => {
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
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
