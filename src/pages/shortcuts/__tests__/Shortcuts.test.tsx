// @vitest-environment jsdom
// SPDX-License-Identifier: GPL-3.0-or-later

import { clearPrefs } from '../../../ui/prefs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import '../..'
import { createBackup, deviceStore, readMacros } from '../../../device'
import { setMacroNames, storedLayerNames, storedMacroNames } from '../../../shell/layer-names'
import { connectDemo, demoKeyboard, disconnect } from '../../../shell/session'
import { Shell } from '../../../shell/Shell'
import { stage } from '../../../shell/stage-store'
import { closeUnlock } from '../../../shell/unlock-dialog'
import { summarize } from '../describe'
import { clearDrafts } from '../drafts'
import { Nothing } from '../../Shortcuts'

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

// The demo's unlock keys.
const ESC = '0,1'
const ENTER = '3,14'

const macroList = () => screen.getByRole('region', { name: 'Macros' })
const steps = () => within(screen.getByRole('region', { name: 'Steps' }))
const savedMacro = (i: number) => {
  const { keyboard, macros } = deviceStore.getState()
  return readMacros(macros!, keyboard!.vialProtocol, keyboard!.macroCount)[i]
}

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  // "More options" open or closed is remembered in the browser: start each test without what the last one left.
  clearPrefs()
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
    expect(links[0]).toHaveTextContent('Macro 1M1')
    expect(links[0]).toHaveTextContent('Types “hello@example.com”')
    expect(links[1]).toHaveTextContent('Ctrl + A, waits 0.05 s, Ctrl + C')
    expect(links[0]).toHaveTextContent('on 2 keys')
    expect(screen.getByText(/Room for about \d+ more characters · \d+ of 926 bytes used/)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Pick a shortcut' })).toBeInTheDocument()
  })

  it('opens the next free macro with Add', async () => {
    await show()
    fireEvent.click(screen.getByRole('button', { name: 'Add a macro' }))
    await waitFor(() => expect(location.hash).toBe('#/shortcuts/macro/4'))
  })

  // Keychron prints M1 - M5 on keys mapped to QMK's M1 - M5: the key printed M1 must run "Macro 1". Don't change
  // this back to counting from 1 = M0.
  it('numbers macros as QMK does, with M0 last', async () => {
    await show('#/shortcuts', { unlocked: true })
    await act(async () => void (await deviceStore.saveMacro(0, [{ kind: 'text', text: 'zero' }])))
    const links = within(macroList()).getAllByRole('link')
    expect(links.map((link) => link.querySelector('.font-mono')?.textContent)).toEqual(['M1', 'M2', 'M3', 'M0'])
    expect(links[0]).toHaveTextContent('Macro 1')
    expect(links[3]).toHaveTextContent('Macro 0')
    expect(links[0]).toHaveAttribute('href', '#/shortcuts/macro/1')
    expect(links[3]).toHaveAttribute('href', '#/shortcuts/macro/0')
    // Add still takes the lowest free number from 1.
    fireEvent.click(screen.getByRole('button', { name: 'Add a macro' }))
    await waitFor(() => expect(location.hash).toBe('#/shortcuts/macro/4'))
  })

  it('opens M0 at its own address and calls it Macro 0', async () => {
    await show('#/shortcuts/macro/0')
    expect(screen.getByRole('textbox', { name: 'Macro name' })).toHaveAttribute('placeholder', 'Macro 0')
    // Open, so listed: last, after the macros in use.
    const links = within(macroList()).getAllByRole('link')
    expect(links.at(-1)).toHaveTextContent('Macro 0M0')
    expect(links.at(-1)).toHaveAttribute('aria-current', 'page')
  })

  it('names unsaved work by the macro’s own name in the status line', async () => {
    await show('#/shortcuts/macro/2')
    const name = screen.getByRole('textbox', { name: 'Macro name' })
    fireEvent.change(name, { target: { value: 'Copy all' } })
    fireEvent.blur(name)
    fireEvent.click(screen.getByRole('button', { name: 'Type text' }))
    const status = screen.getByRole('contentinfo', { name: 'Status' })
    expect(within(status).getByRole('link', { name: /^Copy all has changes/ })).toHaveAttribute('href', '#/shortcuts/macro/2')
  })
})

describe('the editor', () => {
  it('opens a macro from the list, with its steps and the keys it is on', async () => {
    await show()
    await act(async () => fireEvent.click(within(macroList()).getAllByRole('link')[0]))
    await go(within(macroList()).getAllByRole('link')[0].getAttribute('href')!)

    expect(steps().getByRole('textbox', { name: 'Text to type, step 1' })).toHaveValue('hello@example.com')
    const use = screen.getByRole('button', { name: 'Windows: the M1 key' })
    fireEvent.click(use)
    await waitFor(() => expect(location.hash).toBe('#/keys'))
    expect(stage.get()).toMatchObject({ follow: false, layer: 2, selection: { kind: 'key', row: 1, col: 0 } })
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
    expect(screen.getByRole('button', { name: 'Unlock to save…' })).toBeDisabled()
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

    fireEvent.click(screen.getByRole('button', { name: 'Unlock to save…' }))

    expect(screen.getByRole('dialog', { name: /Unlock the keyboard/ })).toHaveTextContent('only takes macro changes while it is unlocked')
    expect(deviceStore.getState().macros).toBe(before)
  })

  it('saves by itself once the unlock it asked for completes', async () => {
    await show('#/shortcuts/macro/1')
    fireEvent.change(steps().getByRole('textbox', { name: 'Text to type, step 1' }), { target: { value: 'after-unlock@example.org' } })
    act(() => {
      demoKeyboard()!.setKey(ESC, true)
      demoKeyboard()!.setKey(ENTER, true)
    })
    vi.useFakeTimers()
    try {
      await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Unlock to save…' })))
      await act(async () => within(screen.getByRole('dialog')).getByRole('button', { name: 'Start unlocking' }).click())
      await act(() => vi.advanceTimersByTimeAsync(9000))
    } finally {
      vi.useRealTimers()
    }
    await waitFor(() => expect(savedMacro(1)).toEqual([{ kind: 'text', text: 'after-unlock@example.org' }]))
    expect(screen.getByText('Saved to the keyboard')).toBeInTheDocument()
    expect(screen.queryByText('Not saved yet')).toBeNull()
  })

  it('saves nothing and keeps the draft when the unlock is cancelled', async () => {
    await show('#/shortcuts/macro/1')
    const before = deviceStore.getState().macros
    fireEvent.change(steps().getByRole('textbox', { name: 'Text to type, step 1' }), { target: { value: 'x' } })
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Unlock to save…' })))
    await act(async () => within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }).click())
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(deviceStore.getState().macros).toBe(before)
    expect(screen.getAllByText('Not saved yet')[0]).toBeInTheDocument()
  })

  it('saves to the keyboard when unlocked, and Undo takes it back', async () => {
    await show('#/shortcuts/macro/1', { unlocked: true })
    fireEvent.change(steps().getByRole('textbox', { name: 'Text to type, step 1' }), { target: { value: 'me@example.org' } })

    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Save to keyboard' })))

    expect(savedMacro(1)).toEqual([{ kind: 'text', text: 'me@example.org' }])
    expect(screen.getByText('Saved to the keyboard')).toBeInTheDocument()
    expect(within(macroList()).getAllByRole('link')[0]).toHaveTextContent('Types “me@example.org”')

    await act(() => deviceStore.undo())
    expect(savedMacro(1)).toEqual([{ kind: 'text', text: 'hello@example.com' }])
  })

  it('names a macro, in the list and in the backup', async () => {
    await show('#/shortcuts/macro/3')
    const name = screen.getByRole('textbox', { name: 'Macro name' })
    fireEvent.change(name, { target: { value: 'Open Notepad' } })
    fireEvent.blur(name)

    expect(within(macroList()).getAllByRole('link')[2]).toHaveTextContent('Open NotepadM3')
    const { keyboard } = deviceStore.getState()
    const backup = createBackup(deviceStore.getState(), storedLayerNames(keyboard!.uid), new Date(), storedMacroNames(keyboard!.uid))
    expect(backup.macroNames?.[3]).toBe('Open Notepad')
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

describe('the card before a shortcut is picked', () => {
  it('offers Macro 1, with the US-layout caveat, only where the firmware has macros', () => {
    const { unmount } = render(<Nothing macros />)
    expect(screen.getByRole('link', { name: 'Start with Macro 1' })).toBeInTheDocument()
    expect(screen.getByText(/typed the way a US keyboard types it/)).toBeInTheDocument()
    unmount()
    render(<Nothing macros={false} />)
    expect(screen.queryByRole('link', { name: 'Start with Macro 1' })).toBeNull()
    expect(screen.getByText('This keyboard’s firmware has no macros.')).toBeInTheDocument()
  })
})
