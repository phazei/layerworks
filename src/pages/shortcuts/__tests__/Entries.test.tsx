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
import { clearDrafts, setEntryDraft } from '../drafts'

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

    expect(section('Key chords')).toHaveTextContent('Combos · 3 of 16 used')
    expect(section('Key chords')).toHaveTextContent('J + K together → Escape')
    expect(section('Shortcut replacements')).toHaveTextContent('Shift + Backspace → Delete')
    expect(section('Multi-tap keys')).toHaveTextContent('Tap: Escape · Double tap: Caps Lock')
    expect(section('Multi-tap keys')).toHaveTextContent('on 1 key')
    expect(section('Repeat rules')).toHaveTextContent('After Ctrl + Z → Ctrl + Y')
    expect(within(section('Key chords')).getAllByRole('link')).toHaveLength(3)
  })
})

describe('key chords', () => {
  it('adds one in the next free slot from an example, and saves it', async () => {
    await show()
    await click('Add a key chord')
    await waitFor(() => expect(location.hash).toBe('#/shortcuts/chord/4'))
    expect(screen.getByRole('heading', { name: /Key chord 4/ })).toBeInTheDocument()

    await click('Try: J and K together send Esc')
    expect(screen.getByText('Not saved yet')).toBeInTheDocument()
    expect(within(section('Key chords')).getByRole('link', { name: /Key chord 4/ })).toHaveTextContent('Not saved')

    await click('Save to keyboard')

    expect(entries().combo[3]).toMatchObject({ key1: 0x0d, key2: 0x0e, key3: 0, output: 0x29 })
    expect(screen.getByText('Saved to the keyboard')).toBeInTheDocument()
    expect(section('Key chords')).toHaveTextContent('Combos · 4 of 16 used')
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

describe('what the pickers offer', () => {
  const picker = () => within(screen.getByRole('group', { name: 'Key for this step' }))
  const groups = () => picker().getAllByRole('region').map((region) => region.getAttribute('aria-label'))

  it('offers a chord the less common keys too, and names them in the summary', async () => {
    await show('#/shortcuts/chord/1')
    await click('Change sends')
    expect(groups()).toEqual(expect.arrayContaining(['Typing helpers', 'Swapped and disabled keys', 'International keys']))
    expect(groups()).not.toContain('Multi-tap keys')
    await click('Capitals for one word (Caps Word)')
    expect(within(section('Key chords')).getAllByRole('link')[0]).toHaveTextContent('J + K together → Capitals for one word (Caps Word)')
    await click('Save to keyboard')
    expect(entries().combo[0].output).toBe(0x7c73)
  })

  it('offers a shortcut replacement only keys the keyboard can send there', async () => {
    await show('#/shortcuts/replacement/1')
    await click('Change to send instead')
    for (const left of ['Lighting controls', 'This keyboard', 'Macros', 'Typing helpers', 'Swapped and disabled keys']) expect(groups(), left).not.toContain(left)
    expect(groups()).toEqual(expect.arrayContaining(['Letters', 'Media and system', 'International keys']))
  })

  it('says so when a replacement holds a key the keyboard can’t send (from a Vial file, say), and won’t save it', async () => {
    await show('#/shortcuts/replacement/1')
    // RGB_TOG: the firmware would cut it to its low byte and send 3.
    act(() => setEntryDraft(deviceStore.getState().keyboard!.uid, 'keyOverride', 0, { ...entries().keyOverride[0], replacementKey: 0x7820 }))
    expect(screen.getByText(/The keyboard can’t send Lights on or off as a replacement/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save to keyboard' })).toBeDisabled()
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

    expect(entryIsEmpty('tapDance', entries().tapDance[2])).toBe(true)
    expect(section('Multi-tap keys')).toHaveTextContent('Tap dance · 1 of 16 used')
  })

  // Multi-tap keys go by QMK's number like macros: TD(1) is Multi-tap key 1, TD(0) comes last. Don't change back.
  it('numbers them as QMK does, and Add takes the lowest free number from 1', async () => {
    await show('#/shortcuts/multi-tap/1')
    expect(screen.getByRole('heading', { name: /^Multi-tap key 1/ })).toBeInTheDocument()
    const links = within(section('Multi-tap keys')).getAllByRole('link')
    expect(links.map((link) => link.getAttribute('href'))).toEqual(['#/shortcuts/multi-tap/1', '#/shortcuts/multi-tap/2'])
    expect(links[0]).toHaveTextContent('Multi-tap key 1TD(1)')
    await click('Add a multi-tap key')
    await waitFor(() => expect(location.hash).toBe('#/shortcuts/multi-tap/3'))
  })

  it('lists TD(0) last when it is open', async () => {
    await show('#/shortcuts/multi-tap/0')
    expect(screen.getByRole('heading', { name: /^Multi-tap key 0/ })).toBeInTheDocument()
    expect(within(section('Multi-tap keys')).getAllByRole('link').at(-1)).toHaveTextContent('Multi-tap key 0TD(0)')
  })
})

describe('what is in use comes above the fold', () => {
  it('shows kinds in use under the macros, and keeps unused ones under More options', async () => {
    await show()
    // Every kind has entries in the demo: nothing left to fold away.
    expect(screen.queryByRole('button', { name: 'More options' })).toBeNull()
    expect(section('Multi-tap keys')).toBeInTheDocument()

    // With the multi-tap keys cleared, their section waits under More options (closed).
    await act(async () => {
      for (const index of [1, 2]) await deviceStore.saveEntry('tapDance', index, { onTap: 0, onHold: 0, onDoubleTap: 0, onTapHold: 0, tappingTerm: 200 })
    })
    expect(screen.queryByRole('region', { name: 'Multi-tap keys' })).toBeNull()
    expect(screen.getByRole('button', { name: 'More options' })).toHaveAttribute('aria-expanded', 'false')

    // Opened at its address, it comes up.
    await go('#/shortcuts/multi-tap/1')
    expect(within(screen.getByRole('navigation', { name: 'Shortcuts' })).getByRole('region', { name: 'Multi-tap keys' })).toBeInTheDocument()
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
