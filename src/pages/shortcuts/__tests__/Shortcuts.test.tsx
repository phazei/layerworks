// @vitest-environment jsdom
// SPDX-License-Identifier: GPL-3.0-or-later

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import '../..'
import { createBackup, deviceStore, readMacros } from '../../../device'
import { setMacroNames, storedLayerNames, storedMacroNames } from '../../../shell/layer-names'
import { connectDemo, disconnect } from '../../../shell/session'
import { Shell } from '../../../shell/Shell'
import { stage } from '../../../shell/stage-store'
import { closeUnlock } from '../../../shell/unlock-dialog'
import { summarize } from '../describe'
import { clearDrafts } from '../drafts'

async function go(path: string): Promise<void> {
  await act(async () => {
    location.hash = path
    window.dispatchEvent(new HashChangeEvent('hashchange'))
  })
}

async function show(path = '#/shortcuts', { unlocked = false } = {}): Promise<void> {
  history.replaceState(null, '', unlocked ? '/?demo-unlocked' : '/')
  await connectDemo()
  await waitFor(() => expect(deviceStore.getState().loading).toEqual([]))
  await go(path)
  render(<Shell />)
}

const macroList = () => screen.getByRole('region', { name: 'Macros' })
const steps = () => within(screen.getByRole('region', { name: 'Steps' }))
const savedMacro = (i: number) => {
  const { keyboard, macros } = deviceStore.getState()
  return readMacros(macros!, keyboard!.vialProtocol, keyboard!.macroCount)[i]
}

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})

afterEach(async () => {
  const uid = deviceStore.getState().keyboard?.uid
  if (uid) setMacroNames(uid, [])
  act(() => clearDrafts())
  act(() => closeUnlock())
  await act(() => disconnect())
  history.replaceState(null, '', '/')
  location.hash = ''
})

describe('the list', () => {
  it('shows the macros in use with what they do, where they are and the space they share', async () => {
    await show()
    const list = macroList()
    const links = within(list).getAllByRole('link')
    expect(links).toHaveLength(3)
    expect(list).toHaveTextContent('3 of 16 used')
    expect(links[0]).toHaveTextContent('Macro 1M0')
    expect(links[0]).toHaveTextContent('Types “hello@example.com”')
    expect(links[1]).toHaveTextContent('Ctrl + A, waits 0.05 s, Ctrl + C')
    expect(links[0]).toHaveTextContent('on 1 key')
    expect(screen.getByText(/Room for about \d+ more characters · \d+ of 926 bytes used/)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Pick a shortcut' })).toBeInTheDocument()
  })

  it('opens the next free macro with Add', async () => {
    await show()
    fireEvent.click(screen.getByRole('button', { name: 'Add a macro' }))
    await waitFor(() => expect(location.hash).toBe('#/shortcuts/macro/4'))
  })
})

describe('the editor', () => {
  it('opens a macro from the list, with its steps and the keys it is on', async () => {
    await show()
    await act(async () => fireEvent.click(within(macroList()).getAllByRole('link')[0]))
    await go(within(macroList()).getAllByRole('link')[0].getAttribute('href')!)

    expect(steps().getByRole('textbox', { name: 'Text to type, step 1' })).toHaveValue('hello@example.com')
    const use = screen.getByRole('button', { name: 'Windows Fn: the P key' })
    fireEvent.click(use)
    await waitFor(() => expect(location.hash).toBe('#/keys'))
    expect(stage.get()).toMatchObject({ follow: false, layer: 3, selection: { kind: 'key', row: 2, col: 11 } })
  })

  it('keeps an edit as a draft until saved or reverted, across pages', async () => {
    await show('#/shortcuts/macro/1')
    const field = steps().getByRole('textbox', { name: 'Text to type, step 1' })
    fireEvent.change(field, { target: { value: 'hi@example.com' } })

    expect(screen.getAllByText('Not saved yet')[0]).toBeInTheDocument()
    expect(within(macroList()).getAllByRole('link')[0]).toHaveTextContent('Not saved')

    await go('#/keys')
    await go('#/shortcuts/macro/1')
    expect(steps().getByRole('textbox', { name: 'Text to type, step 1' })).toHaveValue('hi@example.com')

    fireEvent.click(screen.getByRole('button', { name: 'Revert' }))
    expect(steps().getByRole('textbox', { name: 'Text to type, step 1' })).toHaveValue('hello@example.com')
    expect(screen.queryByText('Not saved yet')).toBeNull()
  })

  it('adds steps, flags what needs fixing, reorders and removes', async () => {
    await show('#/shortcuts/macro/2')
    fireEvent.click(screen.getByRole('button', { name: 'Type text' }))
    const added = steps().getByRole('textbox', { name: 'Text to type, step 4' })
    expect(screen.getByText('Type the text this step should type.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Unlock and save…' })).toBeDisabled()
    expect(screen.getByText('1 step to fix before saving.')).toBeInTheDocument()

    fireEvent.change(added, { target: { value: 'é' } })
    expect(screen.getByText(/can’t type “é”/)).toBeInTheDocument()
    fireEvent.change(added, { target: { value: 'done' } })

    fireEvent.click(screen.getByRole('button', { name: 'Move step 4 up' }))
    expect(steps().getByRole('textbox', { name: 'Text to type, step 3' })).toHaveValue('done')
    fireEvent.click(screen.getByRole('button', { name: 'Remove step 3' }))
    expect(steps().queryByRole('textbox')).toBeNull()
    // Back as it was: nothing to save.
    expect(screen.queryByText('Not saved yet')).toBeNull()
  })

  it('picks the key of a new key step from the palette, with Ctrl for a shortcut', async () => {
    await show('#/shortcuts/macro/4')
    fireEvent.click(screen.getByRole('button', { name: 'Tap a key' }))
    const palette = screen.getByRole('group', { name: 'Key for this step' })
    fireEvent.click(screen.getByRole('checkbox', { name: 'Ctrl' }))
    fireEvent.click(within(palette).getAllByRole('button', { name: /^V$/ })[0])
    expect(screen.getByRole('listitem', { name: 'Step 1: Tap a key' })).toHaveTextContent('Ctrl + V')
  })

  it('asks to unlock before saving while locked, and writes nothing', async () => {
    await show('#/shortcuts/macro/1')
    const before = deviceStore.getState().macros
    fireEvent.change(steps().getByRole('textbox', { name: 'Text to type, step 1' }), { target: { value: 'x' } })
    expect(screen.getByText(/Saving needs the keyboard unlocked/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Unlock and save…' }))

    expect(screen.getByRole('dialog', { name: /Unlock the keyboard/ })).toHaveTextContent('only takes macro changes while it is unlocked')
    expect(deviceStore.getState().macros).toBe(before)
  })

  it('saves to the keyboard when unlocked, and Undo takes it back', async () => {
    await show('#/shortcuts/macro/1', { unlocked: true })
    fireEvent.change(steps().getByRole('textbox', { name: 'Text to type, step 1' }), { target: { value: 'me@example.org' } })

    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Save to keyboard' })))

    expect(savedMacro(0)).toEqual([{ kind: 'text', text: 'me@example.org' }])
    expect(screen.getByText('Saved to the keyboard')).toBeInTheDocument()
    expect(within(macroList()).getAllByRole('link')[0]).toHaveTextContent('Types “me@example.org”')

    await act(() => deviceStore.undo())
    expect(savedMacro(0)).toEqual([{ kind: 'text', text: 'hello@example.com' }])
  })

  it('names a macro, in the list and in the backup', async () => {
    await show('#/shortcuts/macro/3')
    const name = screen.getByRole('textbox', { name: 'Macro name' })
    fireEvent.change(name, { target: { value: 'Open Notepad' } })
    fireEvent.blur(name)

    expect(within(macroList()).getAllByRole('link')[2]).toHaveTextContent('Open NotepadM2')
    const { keyboard } = deviceStore.getState()
    const backup = createBackup(deviceStore.getState(), storedLayerNames(keyboard!.uid), new Date(), storedMacroNames(keyboard!.uid))
    expect(backup.macroNames?.[2]).toBe('Open Notepad')
  })

  it('records what is typed into steps', async () => {
    await show('#/shortcuts/macro/5')
    fireEvent.click(screen.getByRole('button', { name: 'Record what I type' }))
    const key = (type: 'keydown' | 'keyup', code: string) => act(() => void window.dispatchEvent(new KeyboardEvent(type, { code, bubbles: true })))
    for (const [type, code] of [['keydown', 'ShiftLeft'], ['keydown', 'KeyH'], ['keyup', 'KeyH'], ['keyup', 'ShiftLeft'], ['keydown', 'KeyI'], ['keyup', 'KeyI'], ['keydown', 'Enter'], ['keyup', 'Enter']] as const) {
      await key(type, code)
    }
    fireEvent.click(screen.getByRole('button', { name: 'Stop recording' }))

    expect(steps().getByRole('textbox', { name: 'Text to type, step 1' })).toHaveValue('Hi')
    expect(screen.getByRole('listitem', { name: 'Step 2: Tap a key' })).toHaveTextContent('Enter')
  })
})

describe('summarize', () => {
  it('says what a macro does in one line', () => {
    expect(summarize([])).toBe('Empty')
    expect(summarize([{ kind: 'wait', ms: 200 }, { kind: 'down', key: 0xe1 }])).toBe('Waits 0.2 s, holds Left Shift')
  })
})
