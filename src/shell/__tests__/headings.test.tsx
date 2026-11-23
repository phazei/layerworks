// @vitest-environment jsdom
// SPDX-License-Identifier: GPL-3.0-or-later
// Each page has one h1, its title, and headings under it that go down one level at a time, so a screen reader's list
// of headings reads as the page's outline. The sidebar's group titles (h2) come before it in the page.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render } from '@testing-library/react'
import '../../pages'
import { connectDemo, disconnect } from '../session'
import { Shell } from '../Shell'
import { stage } from '../stage-store'

async function go(path: string): Promise<void> {
  await act(async () => {
    location.hash = path
    window.dispatchEvent(new HashChangeEvent('hashchange'))
  })
}

/** The heading levels a screen reader lists, in page order: hidden ones (the parked help panel) left out. */
function levels(root: HTMLElement): number[] {
  return [...root.querySelectorAll<HTMLElement>('h1, h2, h3, h4, h5, h6')]
    .filter((heading) => !heading.closest('[aria-hidden="true"]'))
    .map((heading) => Number(heading.tagName[1]))
}

/** The levels from the h1 on, where no heading may be more than one level below the one before it. */
function skips(found: number[]): string[] {
  const from = found.indexOf(1)
  const page = found.slice(from)
  return page.flatMap((level, i) => (i > 0 && level > page[i - 1] + 1 ? [`h${page[i - 1]} → h${level}`] : []))
}

beforeEach(async () => {
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  await connectDemo()
})

afterEach(async () => {
  await act(() => disconnect())
  location.hash = ''
})

describe('heading order', () => {
  it.each(['home', 'keys', 'shortcuts', 'shortcuts/macro/1', 'shortcuts/chord/1', 'shortcuts/replacement/1', 'lighting', 'typing', 'test', 'device', 'help', 'help/layers', 'settings'])(
    'the %s page: one h1, then no level skipped',
    async (path) => {
      await go(`#/${path}`)
      const { container } = render(<Shell />)
      const found = levels(container)
      expect(found.filter((level) => level === 1)).toHaveLength(1)
      expect(found.slice(0, found.indexOf(1)).every((level) => level === 2)).toBe(true)
      expect(skips(found)).toEqual([])
    },
  )

  it('the Keys page with a key picked: the inspector and its key list', async () => {
    await go('#/keys')
    const { container } = render(<Shell />)
    act(() => stage.select({ kind: 'key', row: 0, col: 1 }))
    expect(skips(levels(container))).toEqual([])
  })
})
