// @vitest-environment jsdom
// SPDX-License-Identifier: GPL-3.0-or-later

import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen, within } from '@testing-library/react'
import { Bomb } from 'lucide-react'
import '../../pages'
import { definePlugin, removePlugin } from '../../plugins/api'
import { ISSUES_URL } from '../../project'
import { clearPrefs, getPref, setPref } from '../../ui/prefs'
import { ErrorBoundary } from '../ErrorBoundary'
import { Shell } from '../Shell'

/** Throws while its section is remembered open, as the Device page's Technical details did on some keyboards. */
function Breaks() {
  if (getPref('open:breaks-details', false)) throw new Error('Objects are not valid as a React child')
  return <p>The page drew.</p>
}

async function go(path: string): Promise<void> {
  await act(async () => {
    location.hash = path
    window.dispatchEvent(new HashChangeEvent('hashchange'))
  })
}

beforeAll(() => {
  definePlugin({ id: 'test-breaks', pages: [{ path: 'breaks', title: 'Breaks', icon: Bomb, offline: true, component: Breaks }] })
})
afterAll(() => removePlugin('test-breaks'))

beforeEach(() => {
  clearPrefs()
  // React and the boundary report the error on the console; that is expected here.
  vi.spyOn(console, 'error').mockImplementation(() => {})
  location.hash = ''
})

describe('a page that throws', () => {
  it('shows what happened in the page’s place, with the sidebar still there', async () => {
    setPref('open:breaks-details', true)
    await go('#/breaks')
    render(<Shell />)

    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('Something went wrong on this page')
    expect(within(alert).getByRole('link', { name: /report a problem/ })).toHaveAttribute('href', ISSUES_URL)
    expect(within(alert).getByRole('button', { name: 'Reload' })).toBeInTheDocument()
    // The error text waits behind "What went wrong".
    expect(alert).not.toHaveTextContent('Objects are not valid')
    act(() => within(alert).getByRole('button', { name: 'What went wrong' }).click())
    expect(alert).toHaveTextContent('Objects are not valid as a React child')

    expect(screen.getByRole('navigation', { name: 'Pages' })).toBeInTheDocument()
  })

  it('lets the person go to another page', async () => {
    setPref('open:breaks-details', true)
    await go('#/breaks')
    render(<Shell />)
    expect(screen.getByRole('alert')).toBeInTheDocument()

    await go('#/settings')
    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.getByRole('heading', { level: 1, name: 'Settings' })).toBeInTheDocument()
  })

  it('tries again with every remembered section closed, so the page isn’t stuck', async () => {
    setPref('open:breaks-details', true)
    setPref('open:device-technical', true)
    await go('#/breaks')
    render(<Shell />)

    act(() => screen.getByRole('button', { name: 'Try again' }).click())

    expect(screen.getByText('The page drew.')).toBeInTheDocument()
    expect(getPref('open:breaks-details', true)).toBe(false)
    expect(getPref('open:device-technical', true)).toBe(false)
  })
})

describe('the app’s own boundary', () => {
  it('shows a notice instead of a blank window', () => {
    const Throws = () => {
      throw new Error('broken')
    }
    render(
      <ErrorBoundary whole>
        <Throws />
      </ErrorBoundary>,
    )
    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('Something went wrong')
    expect(within(alert).getByRole('button', { name: 'Reload' })).toBeInTheDocument()
    expect(within(alert).getByRole('link', { name: /report a problem/ })).toHaveAttribute('href', ISSUES_URL)
  })
})
