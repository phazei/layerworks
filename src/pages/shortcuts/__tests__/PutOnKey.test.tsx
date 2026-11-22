// @vitest-environment jsdom
// SPDX-License-Identifier: GPL-3.0-or-later
// "Put it on a key…" (the Keys page, armed with the shortcut) and the number-less addresses ("#/shortcuts/multi-tap"
// opens the first free one), on the demo keyboard.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import '../..'
import { deviceStore, emptyEntry, readMacros } from '../../../device'
import { connectDemo, disconnect } from '../../../shell/session'
import { Shell } from '../../../shell/Shell'
import { stage } from '../../../shell/stage-store'
import { clearPrefs } from '../../../ui/prefs'
import { armingState, disarm } from '../../keys/arming'
import { clearDrafts } from '../drafts'
import { firstFree } from '../first-free'
import { kindFromPath, shortcutKindHref } from '../route'

async function go(path: string): Promise<void> {
  await act(async () => {
    location.hash = path
    window.dispatchEvent(new HashChangeEvent('hashchange'))
  })
}

async function show(path: string): Promise<void> {
  await connectDemo()
  await waitFor(() => expect(deviceStore.getState().loading).toEqual([]))
  await go(path)
  render(<Shell />)
}

// The demo rests on its Windows layer (2); row 3, column 2 is A.
const keymap = (layer: number, row: number, col: number) => deviceStore.getState().keyboard!.keymap[`${layer},${row},${col}`]
const TD1 = 0x5701
const TD3 = 0x5703
const click = (name: string | RegExp) => act(async () => fireEvent.click(screen.getByRole('button', { name })))

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  clearPrefs()
})

afterEach(async () => {
  act(() => disarm())
  act(() => clearDrafts())
  await act(() => disconnect())
  location.hash = ''
})

describe('Put it on a key', () => {
  it('opens Keys waiting for the key, which gets the shortcut and stays selected; Undo takes it back', async () => {
    await show('#/shortcuts/multi-tap/1')
    await click('Put it on another key…')
    expect(location.hash).toBe('#/keys')
    expect(screen.getByText('Click the key that should run Multi-tap key 1')).toBeInTheDocument()
    // The layer stays put while it waits.
    expect(stage.get()).toMatchObject({ follow: false, layer: 2, selection: null })

    act(() => stage.select({ kind: 'key', row: 3, col: 2 }))
    await waitFor(() => expect(keymap(2, 3, 2)).toBe(TD1))
    expect(armingState().armed).toBeNull()
    expect(screen.getByRole('group', { name: 'What it does now' })).toHaveTextContent('Multi-tap key 1')
    expect(screen.getByText(/is on it now/)).toHaveTextContent('Multi-tap key 1 is on it now. It was A; Undo')

    await act(() => deviceStore.undo())
    expect(keymap(2, 3, 2)).toBe(0x04)
  })

  it('stops on Esc, on Cancel, and when leaving the Keys page, without changing anything', async () => {
    await show('#/shortcuts/multi-tap/1')
    await click('Put it on another key…')
    act(() => void fireEvent.keyDown(document.body, { key: 'Escape' }))
    expect(armingState().armed).toBeNull()

    await go('#/shortcuts/multi-tap/1')
    await click('Put it on another key…')
    await click('Cancel')
    expect(armingState().armed).toBeNull()

    await go('#/shortcuts/multi-tap/1')
    await click('Put it on another key…')
    await go('#/home')
    expect(armingState().armed).toBeNull()
    expect(keymap(2, 3, 2)).toBe(0x04)
  })

  it('works for an empty multi-tap key too, saying it does nothing yet', async () => {
    await show('#/shortcuts/multi-tap/3')
    await click('Put it on a key…')
    expect(screen.getByText(/Multi-tap key 3 is empty: the key does nothing until it is set up and saved/)).toBeInTheDocument()
    act(() => stage.select({ kind: 'knob', knob: 0, direction: 1 }))
    await waitFor(() => expect(deviceStore.getState().keyboard!.knobs['2,0,1']).toBe(TD3))
  })
})

describe('addresses without a number', () => {
  it('names the kind', () => {
    expect(kindFromPath('/shortcuts/multi-tap')).toBe('tapDance')
    expect(kindFromPath('/shortcuts/chord/')).toBe('combo')
    expect(kindFromPath('/shortcuts/chord/2')).toBeNull()
    expect(shortcutKindHref('macro')).toBe('#/shortcuts/macro')
  })

  it('open the first free one in the order Add uses, in place of the address', async () => {
    await show('#/shortcuts/multi-tap')
    await waitFor(() => expect(location.hash).toBe('#/shortcuts/multi-tap/3'))
    expect(screen.getByRole('heading', { name: /^Multi-tap key 3/ })).toBeInTheDocument()
    await go('#/shortcuts/chord')
    await waitFor(() => expect(location.hash).toBe('#/shortcuts/chord/4'))
    await go('#/shortcuts/macro')
    await waitFor(() => expect(location.hash).toBe('#/shortcuts/macro/4'))
  })

  it('show the kind’s section when none is free, and take number 0 last', async () => {
    await show('#/shortcuts')
    const kb = deviceStore.getState().keyboard!
    const full = Array.from({ length: 16 }, () => ({ ...emptyEntry('tapDance'), onTap: 0x04 }))
    const entries = { ...deviceStore.getState().entries!, tapDance: full }
    expect(firstFree('tapDance', kb, null, entries, new Map())).toBeNull()
    expect(firstFree('tapDance', kb, null, { ...entries, tapDance: full.map((e, i) => (i === 0 ? emptyEntry('tapDance') : e)) }, new Map())).toBe(0)
    const macros = deviceStore.getState().macros!
    expect(readMacros(macros, kb.vialProtocol, kb.macroCount)[0]).toEqual([])
    expect(firstFree('macro', kb, macros, entries, new Map())).toBe(4)

    for (let i = 0; i < 16; i++) await act(async () => void (await deviceStore.saveEntry('tapDance', i, full[i])))
    await go('#/shortcuts/multi-tap')
    expect(location.hash).toBe('#/shortcuts/multi-tap')
    expect(screen.getByRole('heading', { name: 'Pick a shortcut' })).toBeInTheDocument()
    expect(within(screen.getByRole('navigation', { name: 'Shortcuts' })).getByRole('region', { name: 'Multi-tap keys' })).toBeInTheDocument()
  })
})
