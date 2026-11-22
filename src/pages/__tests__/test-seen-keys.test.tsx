// @vitest-environment jsdom
// SPDX-License-Identifier: GPL-3.0-or-later
// The Test page marks seen keys by more than a tint, and names the keys still missing once most are seen.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import '..'
import { deviceStore, matrixKeys } from '../../device'
import { Shell } from '../../shell/Shell'
import { connectDemo, demoKeyboard, disconnect } from '../../shell/session'
import { closeUnlock } from '../../shell/unlock-dialog'
import { keyNameAt, notSeenLine, NOT_SEEN_NAMES } from '../test/not-seen'
import { forgetSeenKeys } from '../test/seen'

async function openTest(query = ''): Promise<void> {
  history.replaceState(null, '', `/${query}#/test`)
  await connectDemo()
  await waitFor(() => expect(deviceStore.getState().unlock).not.toBeNull())
  render(<Shell />)
}

const rules = () => [...document.querySelectorAll('style')].map((style) => style.textContent).join('\n')

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  forgetSeenKeys()
})

afterEach(async () => {
  await act(() => disconnect())
  closeUnlock()
  history.replaceState(null, '', '/')
})

describe('the keys not seen yet', () => {
  beforeEach(async () => {
    await connectDemo()
  })

  it('are named by what they do on the layer shown, or by place where they do nothing', () => {
    const keyboard = deviceStore.getState().keyboard!
    // Windows (layer 2): Esc at row 0, column 1.
    expect(keyNameAt(keyboard, 2, '0,1')).toMatch(/Esc/)
    const nowhere = { ...keyboard, keymap: { ...keyboard.keymap, '2,0,1': 0, '0,0,1': 0 } }
    expect(keyNameAt(nowhere, 2, '0,1')).toBe('the key at row 1, column 2')
  })

  it('use plain words where the key’s description is only QMK’s name (a macro, a layer key)', () => {
    const keyboard = deviceStore.getState().keyboard!
    const names = matrixKeys(keyboard).map((pos) => keyNameAt(keyboard, 2, pos, ['Mac', 'Mac Fn', 'Windows', 'Windows Fn', 'Fn2']))
    expect(names).toContain('Macro 1')
    expect(names.some((name) => /^Hold (Windows Fn|Fn2)$/.test(name))).toBe(true)
    expect(names.filter((name) => /^M\d+$|^MO\(/.test(name))).toEqual([])
  })

  it('are listed only once no more than a quarter of the keys is left', () => {
    const keyboard = deviceStore.getState().keyboard!
    const keys = matrixKeys(keyboard)
    expect(notSeenLine(keyboard, 2, keys, new Set(keys.slice(0, 60)))).toBeNull()
    const line = notSeenLine(keyboard, 2, keys, new Set(keys.slice(0, 87)))
    expect(line).toMatch(/^Not seen yet: .+, .+ and .+\.$/)
    expect(notSeenLine(keyboard, 2, keys, new Set(keys))).toBeNull()
  })

  it('tell two keys that do the same apart by their place (the split space bar)', () => {
    const keyboard = deviceStore.getState().keyboard!
    const keys = matrixKeys(keyboard)
    const spaces = keys.filter((pos) => keyNameAt(keyboard, 2, pos) === 'Space bar')
    expect(spaces).toHaveLength(2)
    const line = notSeenLine(keyboard, 2, keys, new Set(keys.filter((pos) => !spaces.includes(pos))))!
    expect(line).toMatch(/^Not seen yet: Space bar \(row \d+, column \d+\) and Space bar \(row \d+, column \d+\)\.$/)
  })

  it('count the rest past twenty names, and include knob turns still to check', () => {
    const keyboard = deviceStore.getState().keyboard!
    const keys = matrixKeys(keyboard)
    const line = notSeenLine(keyboard, 2, keys, new Set(keys.slice(0, 68)), ['0,1'])!
    expect(line).toMatch(new RegExp(`and ${keys.length - 68 + 1 - NOT_SEEN_NAMES} more\\.$`))
    expect(notSeenLine(keyboard, 2, keys, new Set(keys.slice(0, 89)), ['0,0'])).toMatch(/ and Knob turned left\.$/)
  })
})

describe('the Test page', () => {
  it('outlines a seen key, apart from its tint', async () => {
    await openTest()
    fireEvent.keyDown(window, { code: 'KeyA', key: 'a' })
    fireEvent.keyUp(window, { code: 'KeyA', key: 'a' })
    expect(screen.getByText('1 of 90 keys seen')).toBeInTheDocument()
    expect(rules()).toMatch(/\[data-key-pos="\d+,\d+"\] > :first-child \{ stroke: var\(--key-edge-seen\)/)
  })

  it('names the missing keys once most are seen', async () => {
    await openTest('?demo-unlocked')
    const keys = matrixKeys(deviceStore.getState().keyboard!)
    expect(screen.queryByText(/Not seen yet/)).toBeNull()
    const pressed = keys.slice(0, keys.length - 3)
    act(() => {
      for (const key of pressed) demoKeyboard()!.setKey(key, true)
    })
    await waitFor(() => expect(screen.getByText(`${pressed.length} of 90 keys seen`)).toBeInTheDocument())
    act(() => {
      for (const key of pressed) demoKeyboard()!.setKey(key, false)
    })
    expect(screen.getByText(/^Not seen yet: /)).toBeInTheDocument()
  })
})
