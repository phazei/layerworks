// @vitest-environment jsdom
// SPDX-License-Identifier: GPL-3.0-or-later
// The sidebar with icons only: by the window's width and by its button, the remembered choice, the icons' names and
// labels, and the keyboard's icon with its card in a popover.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import '../../pages'
import { deviceStore } from '../../device'
import { clearPrefs, getPref } from '../../ui/prefs'
import { connectDemo, disconnect } from '../session'
import { Shell } from '../Shell'
import { NARROW_BELOW, SIDEBAR_PREF, sidebarCollapsed, type SidebarChoice } from '../sidebar-collapse'
import { closeUnlock } from '../unlock-dialog'

const JSDOM_WIDTH = window.innerWidth

function resize(width: number): void {
  act(() => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: width })
    window.dispatchEvent(new Event('resize'))
  })
}

const sidebar = () => screen.getByRole('navigation', { name: 'Pages' }).closest('aside')!
const collapsed = () => sidebar().dataset.collapsed === 'true'

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  clearPrefs()
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1280 })
})

afterEach(async () => {
  await act(() => disconnect())
  closeUnlock()
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: JSDOM_WIDTH })
  location.hash = ''
  clearPrefs()
})

describe('the collapse rule', () => {
  it('follows the width, and a hand choice only on the side of the threshold it was made on', () => {
    expect(sidebarCollapsed(null, false)).toBe(false)
    expect(sidebarCollapsed(null, true)).toBe(true)
    expect(sidebarCollapsed({ collapsed: true, narrow: false }, false)).toBe(true)
    expect(sidebarCollapsed({ collapsed: true, narrow: false }, true)).toBe(true)
    expect(sidebarCollapsed({ collapsed: false, narrow: true }, true)).toBe(false)
    expect(sidebarCollapsed({ collapsed: false, narrow: false }, true)).toBe(true)
  })
})

describe('the sidebar', () => {
  it('shows the names in a wide window and the icons only in a narrow one, as the window crosses the threshold', () => {
    render(<Shell />)
    expect(collapsed()).toBe(false)
    resize(NARROW_BELOW - 1)
    expect(collapsed()).toBe(true)
    resize(NARROW_BELOW)
    expect(collapsed()).toBe(false)
  })

  it('collapses by its button, remembers it across a reload, and forgets it when the window crosses the threshold', () => {
    const { unmount } = render(<Shell />)
    fireEvent.click(screen.getByRole('button', { name: 'Collapse sidebar' }))
    expect(collapsed()).toBe(true)
    expect(getPref<SidebarChoice | null>(SIDEBAR_PREF, null)).toEqual({ collapsed: true, narrow: false })

    unmount()
    render(<Shell />)
    expect(collapsed()).toBe(true)
    // Another wide width: the choice holds.
    resize(1100)
    expect(collapsed()).toBe(true)

    // Narrow, then wide again: the choice was forgotten at the crossing, so the wide shape comes back.
    resize(800)
    expect(collapsed()).toBe(true)
    expect(getPref<SidebarChoice | null>(SIDEBAR_PREF, null)).toBeNull()
    resize(1280)
    expect(collapsed()).toBe(false)
  })

  it('expands by hand in a narrow window until the window gets wide', () => {
    resize(800)
    render(<Shell />)
    expect(collapsed()).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'Expand sidebar' }))
    expect(collapsed()).toBe(false)
    resize(700)
    expect(collapsed()).toBe(false)
    resize(1280)
    expect(collapsed()).toBe(false)
    resize(800)
    expect(collapsed()).toBe(true)
  })

  it('keeps each icon’s name and the current page, and shows the name beside it on pointing and on focus', async () => {
    resize(800)
    await act(async () => {
      location.hash = '#/settings'
      window.dispatchEvent(new HashChangeEvent('hashchange'))
    })
    render(<Shell />)
    const nav = screen.getByRole('navigation', { name: 'Pages' })
    expect(within(nav).getAllByRole('link').map((link) => link.textContent)).toEqual([
      'Home',
      'Keys',
      'Shortcuts & macros',
      'Lighting',
      'Typing feel',
      'Test',
      'Device',
      'Help',
      'Settings',
    ])
    const settings = within(nav).getByRole('link', { name: 'Settings' })
    expect(settings).toHaveAttribute('aria-current', 'page')
    expect(within(nav).getByRole('link', { name: 'Keys' })).not.toHaveAttribute('aria-current')

    const tip = () => document.querySelector('[data-tip]')
    expect(tip()).toBeNull()
    act(() => settings.focus())
    expect(tip()).toHaveTextContent('Settings')
    expect(tip()).toHaveAttribute('aria-hidden', 'true')
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(tip()).toBeNull()
    act(() => settings.blur())

    fireEvent.pointerEnter(within(nav).getByRole('link', { name: 'Keys' }).parentElement!)
    expect(tip()).toHaveTextContent('Keys')
    fireEvent.pointerLeave(within(nav).getByRole('link', { name: 'Keys' }).parentElement!)
    expect(tip()).toBeNull()

    // Focus from a click: the pointer is there already, so no label.
    const home = within(nav).getByRole('link', { name: 'Home' })
    fireEvent.pointerDown(home)
    act(() => home.focus())
    expect(tip()).toBeNull()
  })

  it('shows one name at a time: pointing at an icon hides the name of the one focused', () => {
    resize(800)
    render(<Shell />)
    const nav = screen.getByRole('navigation', { name: 'Pages' })
    fireEvent.keyDown(window, { key: 'Tab' })
    act(() => within(nav).getByRole('link', { name: 'Settings' }).focus())
    expect(document.querySelectorAll('[data-tip]')).toHaveLength(1)
    fireEvent.pointerEnter(within(nav).getByRole('link', { name: 'Keys' }).parentElement!)
    const tips = document.querySelectorAll('[data-tip]')
    expect(tips).toHaveLength(1)
    expect(tips[0]).toHaveTextContent('Keys')
  })

  it('keeps its button with the logo, not as a row under the pages', () => {
    render(<Shell />)
    const button = screen.getByRole('button', { name: 'Collapse sidebar' })
    expect(screen.getByRole('navigation', { name: 'Pages' })).not.toContainElement(button)
    expect(button.closest('aside > div')).toHaveTextContent('Layerworks')
    resize(800)
    expect(screen.getByRole('button', { name: 'Expand sidebar' }).closest('aside > div')).toHaveTextContent('Layerworks')
  })

  it('shows no labels beside the names while they are on screen', () => {
    render(<Shell />)
    const keys = screen.getByRole('link', { name: 'Keys' })
    act(() => keys.focus())
    expect(document.querySelector('[data-tip]')).toBeNull()
  })
})

describe('the keyboard’s icon', () => {
  beforeEach(async () => {
    resize(800)
    await connectDemo()
    await waitFor(() => expect(deviceStore.getState().loading).toEqual([]))
  })

  const icon = () => screen.getByRole('button', { name: /Keychron K15 Max.*demo keyboard, locked/ })

  it('says which keyboard, how and whether it is locked, and opens the card beside it', () => {
    render(<Shell />)
    expect(screen.queryByRole('region', { name: 'Connected keyboard' })).toBeNull()
    expect(icon()).toHaveAttribute('aria-expanded', 'false')

    fireEvent.click(icon())
    const card = screen.getByRole('region', { name: 'Connected keyboard' })
    expect(icon()).toHaveAttribute('aria-expanded', 'true')
    expect(card).toHaveTextContent('Demo keyboard')
    expect(card).toHaveTextContent('Locked')
    expect(card.parentElement).toHaveFocus()
    // The popover is the card: the card inside has no fill of its own (bg-card from the popover, in both themes).
    expect(card).not.toHaveClass('bg-raised')
    expect(card.parentElement).toHaveClass('bg-card')

    fireEvent.keyDown(within(card).getByRole('button', { name: 'Disconnect' }), { key: 'Escape' })
    expect(screen.queryByRole('region', { name: 'Connected keyboard' })).toBeNull()
    expect(icon()).toHaveFocus()
  })

  it('closes on a click outside it', () => {
    render(<Shell />)
    fireEvent.click(icon())
    expect(screen.getByRole('region', { name: 'Connected keyboard' })).toBeInTheDocument()
    fireEvent.pointerDown(screen.getByRole('heading', { level: 1 }))
    expect(screen.queryByRole('region', { name: 'Connected keyboard' })).toBeNull()
  })

  it('unlocks from the card in two steps, and the dialog takes over from the icon', () => {
    render(<Shell />)
    fireEvent.click(icon())
    act(() => within(screen.getByRole('region', { name: 'Connected keyboard' })).getByRole('button', { name: 'Unlock…' }).click())
    expect(screen.getByRole('dialog', { name: 'Unlock the keyboard?' })).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Connected keyboard' })).toBeNull()
    expect(icon()).toHaveFocus()
  })

  it('disconnects from the card, and then leads to connecting', async () => {
    render(<Shell />)
    fireEvent.click(icon())
    await act(async () =>
      within(screen.getByRole('region', { name: 'Connected keyboard' })).getByRole('button', { name: 'Disconnect' }).click(),
    )
    await waitFor(() => expect(deviceStore.getState().status).toBe('disconnected'))
    const connect = screen.getByRole('link', { name: 'No keyboard connected: connect one' })
    expect(connect).toHaveAttribute('href', '#/home')
    expect(connect).toHaveFocus()
  })
})
