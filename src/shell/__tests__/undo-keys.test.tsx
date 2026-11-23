// @vitest-environment jsdom
// SPDX-License-Identifier: GPL-3.0-or-later

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen, waitFor } from '@testing-library/react'
import '../../pages'
import { deviceStore } from '../../device'
import { connectDemo, disconnect } from '../session'
import { Shell } from '../Shell'
import { holdUndoKeys, undoKeyAction, undoShortcuts } from '../undo-keys'

const slot = { kind: 'key', layer: 0, row: 0, col: 1 } as const
const key = () => deviceStore.getState().keyboard!.keymap['0,0,1']

/** Presses Ctrl + `letter` on `target`, as the browser sends it; returns whether the page took it. */
function press(target: Element, letter: string, extra: KeyboardEventInit = {}): boolean {
  const event = new KeyboardEvent('keydown', { key: letter, ctrlKey: true, bubbles: true, cancelable: true, ...extra })
  act(() => void target.dispatchEvent(event))
  return event.defaultPrevented
}

beforeEach(async () => {
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  await connectDemo()
})

afterEach(async () => {
  await act(() => disconnect())
  location.hash = ''
})

describe('Ctrl + Z and Ctrl + Y', () => {
  it('undo and redo a change from anywhere on the page, like the buttons', async () => {
    location.hash = '#/keys'
    render(<Shell />)
    const before = key()
    await act(() => deviceStore.assign(slot, 0x04))
    expect(press(document.body, 'z')).toBe(true)
    await waitFor(() => expect(key()).toBe(before))
    expect(press(document.body, 'y')).toBe(true)
    await waitFor(() => expect(key()).toBe(0x04))
    press(document.body, 'z')
    await waitFor(() => expect(key()).toBe(before))
    expect(press(document.body, 'Z', { shiftKey: true })).toBe(true)
    await waitFor(() => expect(key()).toBe(0x04))
  })

  it('leave a text field its own undo', async () => {
    render(<Shell />)
    await act(() => deviceStore.assign(slot, 0x04))
    const field = document.createElement('input')
    document.body.append(field)
    expect(press(field, 'z')).toBe(false)
    expect(key()).toBe(0x04)
    expect(deviceStore.getState().canUndo).toBe(true)
    field.remove()
  })

  it('do nothing with nothing to undo or redo', () => {
    render(<Shell />)
    expect(screen.getByRole('button', { name: 'Undo' })).toBeDisabled()
    expect(press(document.body, 'z')).toBe(false)
    expect(press(document.body, 'y')).toBe(false)
  })

  it('do nothing on the Test page, where Ctrl + Z is a key press to test', async () => {
    location.hash = '#/test'
    render(<Shell />)
    await act(() => deviceStore.assign(slot, 0x04))
    expect(screen.getByRole('heading', { level: 1, name: 'Test' })).toBeInTheDocument()
    expect(press(document.body, 'z')).toBe(false)
    expect(key()).toBe(0x04)
  })

  it('do nothing while something else holds them, until it lets go', async () => {
    render(<Shell />)
    await act(() => deviceStore.assign(slot, 0x04))
    const release = holdUndoKeys()
    expect(press(document.body, 'z')).toBe(false)
    release()
    expect(press(document.body, 'z')).toBe(true)
  })

  it('do nothing while a dialog is open', async () => {
    render(<Shell />)
    await act(() => deviceStore.assign(slot, 0x04))
    const dialog = document.createElement('div')
    dialog.setAttribute('role', 'dialog')
    document.body.append(dialog)
    expect(press(document.body, 'z')).toBe(false)
    dialog.remove()
  })

  it('use Cmd on a Mac, and leave Alt and the other modifier alone', () => {
    const mods = { ctrlKey: false, metaKey: false, altKey: false, shiftKey: false }
    expect(undoKeyAction({ ...mods, key: 'z', metaKey: true }, true)).toBe('undo')
    expect(undoKeyAction({ ...mods, key: 'z', ctrlKey: true }, true)).toBeNull()
    expect(undoKeyAction({ ...mods, key: 'z', ctrlKey: true, altKey: true }, false)).toBeNull()
    expect(undoShortcuts(true)).toEqual({ undo: 'Cmd + Z', redo: 'Cmd + Shift + Z' })
    expect(undoShortcuts(false)).toEqual({ undo: 'Ctrl + Z', redo: 'Ctrl + Y' })
  })
})
