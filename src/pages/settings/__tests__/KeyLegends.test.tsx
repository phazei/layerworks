// @vitest-environment jsdom
// SPDX-License-Identifier: GPL-3.0-or-later
// Settings, "Key names": what was found about the computer's layout, and the switch that turns the legends off.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import '../..'
import { deviceStore, keycodeName } from '../../../device'
import { layoutFromUrl, setLayoutForTests } from '../../../shell/keyboard-layout'
import { connectDemo, disconnect } from '../../../shell/session'
import { Shell } from '../../../shell/Shell'
import { clearPrefs } from '../../../ui/prefs'

// Enough of a German layout map: Y and Z swapped, ö on the US semicolon key.
const GERMAN = new Map([
  ['KeyY', 'z'],
  ['KeyZ', 'y'],
  ['KeyA', 'a'],
  ['Semicolon', 'ö'],
])
const card = () => screen.getByRole('heading', { name: /^Key names/ }).closest('section')!

beforeEach(async () => {
  vi.spyOn(console, 'log').mockImplementation(() => {})
  clearPrefs()
  await connectDemo()
  await waitFor(() => expect(deviceStore.getState().keyboard).not.toBeNull())
  await act(async () => {
    location.hash = '#/settings'
    window.dispatchEvent(new HashChangeEvent('hashchange'))
  })
})

afterEach(async () => {
  act(() => setLayoutForTests(null))
  await act(() => disconnect())
  location.hash = ''
})

describe('Key names in Settings', () => {
  it('says what it found and names keys by the layout, until switched off', () => {
    render(<Shell />)
    act(() => setLayoutForTests(GERMAN))
    expect(card()).toHaveTextContent('the key a US keyboard has as Y types Z here')
    expect(keycodeName(0x1c)).toBe('Z')

    act(() => fireEvent.click(within(card()).getByRole('switch', { name: /Name keys by what my computer’s layout types/ })))
    expect(keycodeName(0x1c)).toBe('Y')
    act(() => fireEvent.click(within(card()).getByRole('switch')))
    expect(keycodeName(0x1c)).toBe('Z')
  })

  it('says when the layout is US, and when the browser can’t tell', () => {
    render(<Shell />)
    act(() => setLayoutForTests(new Map([['KeyY', 'y'], ['KeyZ', 'z']])))
    expect(card()).toHaveTextContent('uses a US layout')
    expect(keycodeName(0x1c)).toBe('Y')
    act(() => setLayoutForTests(null))
    expect(card()).toHaveTextContent('can’t tell which keyboard layout')
    expect(within(card()).queryByRole('switch')).toBeNull()
  })

  it('redraws the keyboard picture when the layout changes', async () => {
    await act(async () => {
      location.hash = '#/keys'
      window.dispatchEvent(new HashChangeEvent('hashchange'))
    })
    render(<Shell />)
    const picture = () => screen.getByRole('region', { name: 'Keyboard and layers' })
    expect(within(picture()).queryByText('Ö')).toBeNull()
    act(() => setLayoutForTests(GERMAN))
    expect(within(picture()).getAllByText('Ö').length).toBeGreaterThan(0)
  })

  it('reads a layout from the URL for screenshots', () => {
    expect(layoutFromUrl('?layout=KeyY:z,KeyZ:y,Semicolon:%C3%B6')).toEqual(new Map([['KeyY', 'z'], ['KeyZ', 'y'], ['Semicolon', 'ö']]))
    expect(layoutFromUrl('?demo')).toBeNull()
  })
})
