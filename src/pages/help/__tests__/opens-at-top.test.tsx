// @vitest-environment jsdom
// SPDX-License-Identifier: GPL-3.0-or-later
// The Help page opens at its top: marking the open item in the list moves only the list's own scrolling box, never
// the page (narrow, where the list and the overview stack, scrollIntoView took the page down to "Start here").

import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import '../..'
import { Shell } from '../../../shell/Shell'

afterEach(() => {
  location.hash = ''
  vi.restoreAllMocks()
})

describe('the Help page’s list', () => {
  it('scrolls nothing but itself to show the open item', async () => {
    const scrolled = vi.fn()
    Element.prototype.scrollIntoView = scrolled
    await act(async () => {
      location.hash = '#/help'
      window.dispatchEvent(new HashChangeEvent('hashchange'))
    })
    render(<Shell />)
    expect(screen.getByRole('link', { name: 'Start here' })).toHaveAttribute('aria-current', 'page')
    expect(scrolled).not.toHaveBeenCalled()
  })
})
