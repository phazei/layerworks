// @vitest-environment jsdom
// SPDX-License-Identifier: GPL-3.0-or-later
// The Keys page's editing area under the stage: in two columns it fills the page area (the shell's scroller); in one
// column the palette takes the visible height less the room around it. jsdom lays nothing out, so this holds the
// rule and the structure it relies on; the heights themselves are measured in a browser.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render } from '@testing-library/react'
import '../..'
import { connectDemo, disconnect } from '../../../shell/session'
import { Shell } from '../../../shell/Shell'
import { stage } from '../../../shell/stage-store'
import { clearPrefs } from '../../../ui/prefs'
import { KeyPalette } from '../KeyPalette'
import { paletteHeight } from '../visible-height'

describe('paletteHeight', () => {
  it('is the visible height less the room around the palette, whatever the window’s height', () => {
    expect(paletteHeight(349)).toBe(285)
    expect(paletteHeight(800)).toBe(736)
    // In rem: a larger root font size takes the room with it.
    expect(paletteHeight(500, 24)).toBe(404)
    expect(paletteHeight(40)).toBe(0)
  })

  it('is nothing while the height isn’t measured', () => {
    expect(paletteHeight(0)).toBeNull()
  })
})

describe('the key list', () => {
  const list = (fill?: number) => {
    render(<KeyPalette groups={[]} current={0} onPick={() => {}} hint="" label="Keys" fill={fill} />)
    return document.querySelector<HTMLElement>('[role="group"][aria-label="Keys"]')!
  }

  it('in one column is at least the palette’s height less what sits above it, and in two columns takes what is left', () => {
    const box = list(285)
    // jsdom lays nothing out, so nothing sits above it here.
    expect(box.style.getPropertyValue('--fill')).toBe('max(9rem, 285px)')
    // The height applies up to the card's two-column width; from there the list only has its floor.
    expect(box).toHaveClass('min-h-[var(--fill,9rem)]', '@2xl:min-h-36')
  })

  it('has only its floor where no height is given (the palettes on other pages)', () => {
    expect(list().style.getPropertyValue('--fill')).toBe('')
  })
})

describe('the editing area in the page', () => {
  beforeEach(async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    clearPrefs()
    await connectDemo()
  })
  afterEach(async () => {
    await act(() => disconnect())
    location.hash = ''
  })

  it('is the scroller’s own child, a flex column that fills it, holding the card placed against it', async () => {
    await act(async () => {
      location.hash = '#/keys'
      window.dispatchEvent(new HashChangeEvent('hashchange'))
    })
    render(<Shell />)
    act(() => stage.select({ kind: 'key', row: 3, col: 2 }))
    const area = document.querySelector<HTMLElement>('[data-tour="keys-page"]')!
    const scroller = area.parentElement!
    // Nothing between the page area's scroller and the editing area that could give it a height of its own.
    expect(scroller).toHaveClass('overflow-y-auto', 'flex', 'flex-col')
    expect(area).toHaveClass('relative', 'flex', 'flex-1', 'flex-col')
    // A floor, and no height of its own.
    expect(area).toHaveClass('min-h-60')
    expect(area.style.minHeight).toBe('')
    // The card is placed against it in the two-column layout, so its contents can't make the page taller.
    expect(area.firstElementChild).toHaveClass('@2xl/keys:absolute', '@2xl/keys:inset-0')
  })
})
