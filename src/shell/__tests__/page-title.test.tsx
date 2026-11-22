// @vitest-environment jsdom
// SPDX-License-Identifier: GPL-3.0-or-later

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render } from '@testing-library/react'
import '../../pages'
import { connectDemo, disconnect } from '../session'
import { pageTitle } from '../page-title'
import { Shell } from '../Shell'

async function go(path: string): Promise<void> {
  await act(async () => {
    location.hash = path
    window.dispatchEvent(new HashChangeEvent('hashchange'))
  })
}

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  document.title = 'Layerworks: keyboard configurator for Vial'
})

afterEach(async () => {
  await act(() => disconnect())
  location.hash = ''
})

describe('the window title', () => {
  it('names the page, then the app', () => {
    expect(pageTitle('Keys')).toBe('Keys · Layerworks')
    expect(pageTitle(null)).toBe('Page not found · Layerworks')
  })

  it('follows the page shown, without the keyboard’s name', async () => {
    await connectDemo()
    await go('#/keys')
    const { unmount } = render(<Shell />)
    expect(document.title).toBe('Keys · Layerworks')
    await go('#/lighting')
    expect(document.title).toBe('Lighting · Layerworks')
    await go('#/nowhere')
    expect(document.title).toBe('Page not found · Layerworks')
    expect(document.title).not.toMatch(/K15/)
    unmount()
    expect(document.title).toBe('Layerworks: keyboard configurator for Vial')
  })

  it('names pages that need a keyboard while none is connected too', async () => {
    await go('#/test')
    render(<Shell />)
    expect(document.title).toBe('Test · Layerworks')
  })
})
