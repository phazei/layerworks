// @vitest-environment jsdom
// SPDX-License-Identifier: GPL-3.0-or-later
// Shortcuts in one column: the list and the open shortcut take turns, and the focus follows. jsdom has no
// stylesheet, so `.hidden` is given here; the container query that shows both side by side never applies.

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen, waitFor } from '@testing-library/react'
import '../..'
import { deviceStore } from '../../../device'
import { connectDemo, disconnect } from '../../../shell/session'
import { Shell } from '../../../shell/Shell'
import { clearDrafts } from '../drafts'

async function go(path: string): Promise<void> {
  await act(async () => {
    location.hash = path
    window.dispatchEvent(new HashChangeEvent('hashchange'))
  })
}

const style = document.createElement('style')
beforeAll(() => {
  style.textContent = '.hidden { display: none; }'
  document.head.append(style)
})
afterAll(() => style.remove())

beforeEach(async () => {
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  await connectDemo()
  await waitFor(() => expect(deviceStore.getState().loading).toEqual([]))
})

afterEach(async () => {
  await act(() => disconnect())
  clearDrafts()
  location.hash = ''
})

describe('Shortcuts in one column', () => {
  it('shows the picked shortcut in the list’s place, with the focus on it and a way back that returns to its row', async () => {
    await go('#/shortcuts')
    render(<Shell />)
    const nav = screen.getByRole('navigation', { name: 'Shortcuts' })
    const row = () => nav.querySelector<HTMLElement>('a[href="#/shortcuts/macro/1"]')!
    act(() => row().focus())

    await go('#/shortcuts/macro/1')
    expect(getComputedStyle(nav.parentElement!.parentElement!).display).toBe('none')
    const editor = screen.getByRole('region', { name: 'The shortcut being changed' })
    expect(editor).toHaveFocus()
    expect(screen.getByRole('link', { name: 'All shortcuts' })).toHaveAttribute('href', '#/shortcuts')

    await go('#/shortcuts')
    expect(screen.queryByRole('region', { name: 'The shortcut being changed' })).toBeNull()
    expect(row()).toHaveFocus()
  })

  it('shows the list alone when nothing is picked, without the card that points “on the left”', async () => {
    await go('#/shortcuts')
    render(<Shell />)
    const pick = screen.getByText('Pick a shortcut').closest('section')!.parentElement!
    expect(getComputedStyle(pick).display).toBe('none')
  })
})
