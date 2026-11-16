// @vitest-environment jsdom
// SPDX-License-Identifier: GPL-3.0-or-later
// Multi-tap keys, key chords, shortcut replacements and repeat rules on the demo keyboard.

import { clearPrefs } from '../../../ui/prefs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import '../..'
import { deviceStore, entryIsEmpty } from '../../../device'
import { connectDemo, disconnect } from '../../../shell/session'
import { Shell } from '../../../shell/Shell'
import { stage } from '../../../shell/stage-store'
import { clearDrafts } from '../drafts'

async function go(path: string): Promise<void> {
  await act(async () => {
    location.hash = path
    window.dispatchEvent(new HashChangeEvent('hashchange'))
  })
}

async function show(path = '#/shortcuts'): Promise<void> {
  await connectDemo()
  await waitFor(() => expect(deviceStore.getState().loading).toEqual([]))
  await go(path)
  render(<Shell />)
}

const section = (name: string) => screen.getByRole('region', { name })
const entries = () => deviceStore.getState().entries!
const click = (name: string | RegExp) => act(async () => fireEvent.click(screen.getByRole('button', { name })))

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  // "More options" open or closed is remembered in the browser: start each test without what the last one left.
  clearPrefs()
})

afterEach(async () => {
  act(() => clearDrafts())
  await act(() => disconnect())
  location.hash = ''
})

describe('the list', () => {
  it('shows each kind in its own section, the entries in use in one line each', async () => {
    await show()

    expect(section('Key chords')).toHaveTextContent('Combos · 2 of 16 used')
    expect(section('Key chords')).toHaveTextContent('J + K together → Escape')
    expect(section('Shortcut replacements')).toHaveTextContent('Shift + Backspace → Delete')
    expect(section('Multi-tap keys')).toHaveTextContent('Tap: Escape · Double tap: Caps Lock')
    expect(section('Multi-tap keys')).toHaveTextContent('on 1 key')
    expect(section('Repeat rules')).toHaveTextContent('After Ctrl + Z → Ctrl + Y')
    expect(within(section('Key chords')).getAllByRole('link')).toHaveLength(2)
  })
})

describe('key chords', () => {
  it('adds one in the next free slot from an example, and saves it', async () => {
    await show()
    await click('Add a key chord')
    await waitFor(() => expect(location.hash).toBe('#/shortcuts/chord/3'))
    expect(screen.getByRole('heading', { name: /Key chord 3/ })).toBeInTheDocument()

    await click('Try: J and K together send Esc')
    expect(screen.getByText('Not saved yet')).toBeInTheDocument()
    expect(within(section('Key chords')).getByRole('link', { name: /Key chord 3/ })).toHaveTextContent('Not saved')

    await click('Save to keyboard')

    expect(entries().combo[2]).toMatchObject({ key1: 0x0d, key2: 0x0e, key3: 0, output: 0x29 })
    expect(screen.getByText('Saved to the keyboard')).toBeInTheDocument()
    expect(section('Key chords')).toHaveTextContent('Combos · 3 of 16 used')
  })

  it('takes keys out and says what is missing; Revert puts it back', async () => {
    await show('#/shortcuts/chord/1')
    const keys = screen.getByRole('list', { name: 'Keys in the chord' })
    expect(keys).toHaveTextContent('J+K')

    await click('Take K out of the chord')

    expect(screen.getByText('A chord needs at least two keys.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save to keyboard' })).toBeDisabled()
    await click('Revert')
    expect(screen.getByRole('list', { name: 'Keys in the chord' })).toHaveTextContent('J+K')
  })

  it('keeps an unsaved chord across pages', async () => {
    await show('#/shortcuts/chord/2')
    await click('Take F out of the chord')
    await go('#/keys')
    await go('#/shortcuts/chord/2')
    expect(screen.getByText('Not saved yet')).toBeInTheDocument()
    expect(screen.getByRole('list', { name: 'Keys in the chord' })).not.toHaveTextContent('F')
  })
})

describe('shortcut replacements', () => {
  it('edits the modifiers and saves', async () => {
    await show('#/shortcuts/replacement/2')
    const hold = screen.getAllByRole('group', { name: 'Hold' })[0]
    await act(async () => fireEvent.click(within(hold).getByRole('checkbox', { name: 'Ctrl' })))

    await click('Save to keyboard')

    expect(entries().keyOverride[1]).toMatchObject({ triggerMods: 0x33, triggerKey: 0x29, replacementKey: 0x35 })
    expect(section('Shortcut replacements')).toHaveTextContent('Ctrl + Shift + Escape → ` and ~')
  })
})

describe('multi-tap keys', () => {
  it('shows the key it is on, and a click shows it on the Keys page', async () => {
    await show('#/shortcuts/multi-tap/1')
    await click('Windows Fn: the Caps Lock key')
    await waitFor(() => expect(location.hash).toBe('#/keys'))
    expect(stage.get()).toMatchObject({ layer: 3, selection: { kind: 'key', row: 3, col: 1 } })
  })

  it('clears one', async () => {
    await show('#/shortcuts/multi-tap/2')
    await click('Clear this multi-tap key')
    await click('Save to keyboard')

    expect(entryIsEmpty('tapDance', entries().tapDance[1])).toBe(true)
    expect(section('Multi-tap keys')).toHaveTextContent('Tap dance · 1 of 16 used')
  })
})

describe('repeat rules', () => {
  it('shows where the alternate repeat key is, and turns a rule off', async () => {
    await show('#/shortcuts/repeat/1')
    expect(screen.getByRole('button', { name: 'Layer 4: the Space key' })).toBeInTheDocument()

    await act(async () => fireEvent.click(screen.getByRole('switch', { name: 'On' })))
    await click('Save to keyboard')

    expect(entries().altRepeatKey[0].enabled).toBe(false)
    expect(section('Repeat rules')).toHaveTextContent('After Ctrl + Z → Ctrl + Y (off)')
  })
})
