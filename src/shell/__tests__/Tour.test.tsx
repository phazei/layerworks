// @vitest-environment jsdom
// SPDX-License-Identifier: GPL-3.0-or-later

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import '../../pages'
import { closeHelp, openHelp } from '../../help/help-store'
import { armTour, tour, TOUR_STEPS } from '../../help/tour'
import { clearPrefs } from '../../ui/prefs'
import { connectDemo, disconnect } from '../session'
import { Shell } from '../Shell'

async function go(path: string): Promise<void> {
  await act(async () => {
    location.hash = path
    window.dispatchEvent(new HashChangeEvent('hashchange'))
  })
}

const card = () => screen.getByRole('dialog', { name: new RegExp(TOUR_STEPS.map((s) => s.title).join('|') + '|First, a keyboard') })
const tourCard = () => screen.queryByRole('dialog', { name: /Your keyboard, live|Change what a key does|Saved on the keyboard|Help beside everything|The other pages|Back up before you experiment|First, a keyboard/ })

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  clearPrefs()
  tour.reset()
})

afterEach(async () => {
  act(() => tour.reset())
  act(() => closeHelp())
  await act(() => disconnect())
  location.hash = ''
})

describe('the tour on the demo keyboard', () => {
  beforeEach(async () => {
    await connectDemo()
    await go('#/')
  })

  it('doesn’t start by itself unless the start was armed', () => {
    render(<Shell />)
    expect(tourCard()).toBeNull()
  })

  it('starts by itself on Home when armed, once', async () => {
    armTour(new URLSearchParams(''))
    const { unmount } = render(<Shell />)
    expect(await screen.findByRole('dialog', { name: 'Your keyboard, live' })).toHaveTextContent('Step 1 of 6')
    act(() => within(card()).getByRole('button', { name: 'Skip tour' }).click())
    expect(tourCard()).toBeNull()
    unmount()
    armTour(new URLSearchParams(''))
    render(<Shell />)
    expect(tourCard()).toBeNull()
  })

  it('doesn’t start by itself with screenshot options in the address', () => {
    armTour(new URLSearchParams('demo&theme=dark'))
    render(<Shell />)
    expect(tourCard()).toBeNull()
  })

  it('finds every step’s target, going to its page', async () => {
    render(<Shell />)
    act(() => tour.start())
    for (const [i, step] of TOUR_STEPS.entries()) {
      const dialog = await screen.findByRole('dialog', { name: step.title })
      await waitFor(() => expect(dialog).toHaveAttribute('data-target-found', 'true'))
      expect(dialog).toHaveTextContent(`Step ${i + 1} of ${TOUR_STEPS.length}`)
      const page = (path: string) => path.replace(/^#?\/+/, '').split('/')[0] || 'home'
      expect(page(location.hash)).toBe(page(step.path))
      if (i > 0) expect(within(dialog).getByRole('button', { name: 'Back' })).toBeInTheDocument()
      else expect(within(dialog).queryByRole('button', { name: 'Back' })).toBeNull()
      const next = within(dialog).getByRole('button', { name: i === TOUR_STEPS.length - 1 ? 'Done' : 'Next' })
      await act(async () => next.click())
      // jsdom doesn't announce the address change by itself.
      window.dispatchEvent(new HashChangeEvent('hashchange'))
    }
    expect(tourCard()).toBeNull()
    expect(tour.seen()).toBe(true)
  })

  it('works from the keyboard: focus on Next, arrows to move, Esc to skip, focus back after', async () => {
    render(<Shell />)
    const before = screen.getByRole('link', { name: 'Settings' })
    before.focus()
    act(() => tour.start())
    const first = await screen.findByRole('dialog', { name: 'Your keyboard, live' })
    expect(within(first).getByRole('button', { name: 'Next' })).toHaveFocus()

    await act(async () => fireEvent.keyDown(within(first).getByRole('button', { name: 'Next' }), { key: 'ArrowRight' }))
    window.dispatchEvent(new HashChangeEvent('hashchange'))
    const second = await screen.findByRole('dialog', { name: 'Change what a key does' })
    await act(async () => fireEvent.keyDown(second, { key: 'ArrowLeft' }))
    await screen.findByRole('dialog', { name: 'Your keyboard, live' })

    await act(async () => fireEvent.keyDown(document.activeElement!, { key: 'Escape' }))
    expect(tourCard()).toBeNull()
    expect(tour.seen()).toBe(true)
    expect(before).toHaveFocus()
  })

  it('lets Esc close the help panel first, without skipping', async () => {
    render(<Shell />)
    act(() => tour.start())
    await screen.findByRole('dialog', { name: 'Your keyboard, live' })
    act(() => openHelp('layers'))
    await act(async () => fireEvent.keyDown(document.body, { key: 'Escape' }))
    expect(tourCard()).not.toBeNull()
    await act(async () => fireEvent.keyDown(document.body, { key: 'Escape' }))
    expect(tourCard()).toBeNull()
  })

  it('can be started again from the Help page and from Settings', async () => {
    await go('#/help')
    const { unmount } = render(<Shell />)
    act(() => screen.getByRole('button', { name: 'Take the tour' }).click())
    expect(await screen.findByRole('dialog', { name: 'Your keyboard, live' })).toBeInTheDocument()
    act(() => tour.skip())
    unmount()
    await go('#/settings')
    render(<Shell />)
    act(() => screen.getByRole('button', { name: 'Take the tour' }).click())
    expect(await screen.findByRole('dialog', { name: 'Your keyboard, live' })).toBeInTheDocument()
  })
})

describe('the tour with no keyboard', () => {
  it('waits at the connect prompt, then carries on with the demo', async () => {
    await go('#/help')
    render(<Shell />)
    act(() => tour.start())
    window.dispatchEvent(new HashChangeEvent('hashchange'))
    const waiting = await screen.findByRole('dialog', { name: 'First, a keyboard' })
    await waitFor(() => expect(waiting).toHaveAttribute('data-target-found', 'true'))
    expect(within(waiting).getByRole('button', { name: 'Next' })).toBeDisabled()
    expect(waiting).toHaveTextContent('Waiting for a keyboard…')
    expect(within(waiting).getByRole('button', { name: 'Skip tour' })).toBeEnabled()

    act(() => screen.getByRole('button', { name: 'Try the demo keyboard' }).click())
    expect(await screen.findByRole('dialog', { name: 'Your keyboard, live' })).toHaveTextContent('click a layer in the list')
  })
})
