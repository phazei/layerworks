// @vitest-environment jsdom
// SPDX-License-Identifier: GPL-3.0-or-later

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import '../../pages'
import { closeHelp } from '../../help/help-store'
import { connectDemo, disconnect } from '../session'
import { Shell } from '../Shell'

async function go(path: string): Promise<void> {
  await act(async () => {
    location.hash = path
    window.dispatchEvent(new HashChangeEvent('hashchange'))
  })
}

beforeEach(async () => {
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  await connectDemo()
  await go('#/keys')
})

afterEach(async () => {
  act(() => closeHelp())
  await act(() => disconnect())
  location.hash = ''
})

const pageHelp = () => screen.getByRole('button', { name: /^Explain: Changing what a key does/ })

describe('the help panel and the focus', () => {
  it('takes the focus when a "?" opens it, and gives it back to that "?" on Esc', () => {
    const { container } = render(<Shell />)
    const panel = container.querySelector<HTMLElement>('aside[aria-label="Help"]')!
    const button = pageHelp()
    act(() => button.focus())
    act(() => button.click())
    expect(document.activeElement).toBe(panel)
    // Visible at once, not only at the end of a visibility transition.
    expect(panel.className).toMatch(/\bvisible\b/)
    act(() => {
      fireEvent.keyDown(document.activeElement!, { key: 'Escape' })
    })
    expect(panel).toHaveAttribute('aria-hidden', 'true')
    expect(document.activeElement).toBe(button)
  })

  it('gives the focus back after the close button too', () => {
    const { container } = render(<Shell />)
    const panel = container.querySelector<HTMLElement>('aside[aria-label="Help"]')!
    const button = pageHelp()
    act(() => button.focus())
    act(() => button.click())
    const close = within(panel).getByRole('button', { name: 'Close help' })
    act(() => close.focus())
    act(() => close.click())
    expect(document.activeElement).toBe(button)
  })

  it('leaves the focus on a "?" pressed again to close it', () => {
    render(<Shell />)
    const button = pageHelp()
    act(() => button.click())
    act(() => button.focus())
    act(() => button.click())
    expect(document.activeElement).toBe(button)
  })
})
