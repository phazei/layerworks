// @vitest-environment jsdom
// SPDX-License-Identifier: GPL-3.0-or-later

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import '..'
import { closeHelp } from '../../help/help-store'
import { GUIDE } from '../../help/guide'
import { tour } from '../../help/tour'
import { connectDemo, disconnect } from '../../shell/session'
import { Shell } from '../../shell/Shell'
import { renameLayer } from '../../shell/layer-names'
import { deviceStore } from '../../device'
import { clearPrefs } from '../../ui/prefs'

async function go(path: string): Promise<void> {
  await act(async () => {
    location.hash = path
    window.dispatchEvent(new HashChangeEvent('hashchange'))
  })
}

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  clearPrefs()
  tour.reset()
})

afterEach(async () => {
  act(() => closeHelp())
  act(() => tour.reset())
  await act(() => disconnect())
  location.hash = ''
})

describe('the Help page, offline', () => {
  it('lists the topics in the guide’s groups, in reading order', async () => {
    await go('#/help')
    render(<Shell />)
    const nav = screen.getByRole('navigation', { name: 'Help topics' })
    for (const group of GUIDE) expect(within(nav).getByRole('heading', { name: group.title })).toBeInTheDocument()
    const links = within(nav).getAllByRole('link').map((link) => link.textContent)
    expect(links.slice(0, 3)).toEqual(['Start here', 'What Layerworks does', 'Connecting the keyboard'])
    expect(links.at(-1)).toBe('Glossary')
    expect(screen.getByRole('button', { name: 'Take the tour' })).toBeInTheDocument()
  })

  it('opens a topic at its own address, with where it is, related topics and what comes next', async () => {
    await go('#/help/layer-key')
    render(<Shell />)
    const article = screen.getByRole('article', { name: 'Layer keys' })
    expect(article).toHaveTextContent('In QMK: MO, TT, TG, TO, OSL, DF')
    expect(within(article).getByRole('link', { name: /Keys page/ })).toHaveAttribute('href', '#/keys')
    expect(within(article).getByRole('link', { name: 'Layers' })).toHaveAttribute('href', '#/help/layers')
    expect(within(article).getByRole('link', { name: /Read more in the QMK documentation/ })).toHaveAttribute('target', '_blank')
    expect(within(article).getByRole('link', { name: /^Next/ })).toHaveAttribute('href', '#/help/tap-hold')
    expect(screen.getByRole('link', { name: 'Layer keys' })).toHaveAttribute('aria-current', 'page')
    // Without a keyboard, layers have their generic names.
    expect(article).toHaveTextContent('“While held, use Windows Fn” on Caps Lock')
  })

  it('searches QMK words and shows where they matched', async () => {
    await go('#/help')
    render(<Shell />)
    act(() => fireEvent.change(screen.getByRole('searchbox', { name: 'Search the help' }), { target: { value: 'tap dance' } }))
    const results = screen.getByRole('list', { name: 'Search results' })
    const firstHit = within(results).getAllByRole('link')[0]
    expect(firstHit).toHaveAttribute('href', '#/help/tap-dance')
    expect(firstHit.querySelectorAll('mark').length).toBeGreaterThan(0)
    expect(screen.getByText(/^\d+ topics match$/)).toBeInTheDocument()
  })

  it('suggests other words when nothing matches', async () => {
    await go('#/help?q=xyzzy')
    render(<Shell />)
    expect(screen.getByText(/Nothing in the help matches “xyzzy”/)).toBeInTheDocument()
    act(() => within(screen.getByRole('list', { name: 'Try instead' })).getByRole('button', { name: 'combo' }).click())
    expect(screen.getByRole('searchbox', { name: 'Search the help' })).toHaveValue('combo')
    expect(within(screen.getByRole('list', { name: 'Search results' })).getAllByRole('link')[0]).toHaveAttribute('href', '#/help/combos')
  })

  it('has a glossary that leads to the topics', async () => {
    await go('#/help/glossary')
    render(<Shell />)
    const glossary = screen.getByRole('article', { name: 'Glossary' })
    expect(glossary).toHaveTextContent('EEPROM')
    expect(within(glossary).getByRole('link', { name: 'Where changes are kept' })).toHaveAttribute('href', '#/help/saving')
  })

  it('says so for a topic that isn’t there', async () => {
    await go('#/help/nowhere')
    render(<Shell />)
    expect(screen.getByText('There is no such topic')).toBeInTheDocument()
  })
})

describe('the Help page with a keyboard', () => {
  it('names layers the keyboard’s way', async () => {
    await connectDemo()
    renameLayer(deviceStore.getState().keyboard!.uid, 3, 'My Fn')
    await go('#/help/layer-key')
    render(<Shell />)
    expect(screen.getByRole('article', { name: 'Layer keys' })).toHaveTextContent('“While held, use My Fn” on Caps Lock')
    renameLayer(deviceStore.getState().keyboard!.uid, 3, '')
  })
})

describe('the "?" buttons', () => {
  it('open the panel at their topic, switch topic, and close it when pressed again', async () => {
    await connectDemo()
    await go('#/keys')
    const { container } = render(<Shell />)
    const panel = container.querySelector<HTMLElement>('aside[aria-label="Help"]')!
    const title = screen.getByRole('heading', { level: 1, name: 'Keys' }).parentElement!
    const pageHelp = within(title).getByRole('button', { name: 'Explain this' })
    const stageHelp = within(screen.getByRole('region', { name: 'Keyboard and layers' })).getByRole('button', { name: 'Explain this' })
    expect(pageHelp).toHaveAttribute('aria-expanded', 'false')
    expect(pageHelp).toHaveAttribute('aria-controls', panel.id)

    act(() => pageHelp.click())
    expect(panel).toHaveAttribute('aria-hidden', 'false')
    expect(panel).toHaveTextContent('Changing what a key does')
    expect(pageHelp).toHaveAttribute('aria-expanded', 'true')

    act(() => stageHelp.click())
    expect(panel).toHaveTextContent('Follow the keyboard')
    expect(pageHelp).toHaveAttribute('aria-expanded', 'false')
    expect(stageHelp).toHaveAttribute('aria-expanded', 'true')

    act(() => stageHelp.click())
    expect(panel).toHaveAttribute('aria-hidden', 'true')
    expect(stageHelp).toHaveAttribute('aria-expanded', 'false')

    act(() => pageHelp.click())
    await act(async () => fireEvent.keyDown(document.body, { key: 'Escape' }))
    expect(panel).toHaveAttribute('aria-hidden', 'true')
  })

  it('opens related topics inside the panel', async () => {
    await go('#/settings')
    const { container } = render(<Shell />)
    const panel = container.querySelector<HTMLElement>('aside[aria-label="Help"]')!
    act(() => within(screen.getByRole('heading', { name: /Layer names/ })).getByRole('button', { name: 'Explain this' }).click())
    expect(panel).toHaveTextContent('Layer names')
    act(() => within(panel).getByRole('button', { name: 'Layers' }).click())
    expect(within(panel).getByRole('heading', { level: 2 })).toHaveTextContent('Layers')
    expect(within(panel).getByRole('link', { name: /Open on the Help page/ })).toHaveAttribute('href', '#/help/layers')
  })
})
