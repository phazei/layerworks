// @vitest-environment jsdom
// SPDX-License-Identifier: GPL-3.0-or-later
// The Keys page's editing area under the stage: it fills the page area (the shell's scroller) where that is tall
// enough, and in a short window takes the visible height plus the card's padding. jsdom lays nothing out, so this holds
// the rule and the structure it relies on; the heights themselves are measured in a browser.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render } from '@testing-library/react'
import '../..'
import { connectDemo, disconnect } from '../../../shell/session'
import { Shell } from '../../../shell/Shell'
import { stage } from '../../../shell/stage-store'
import { clearPrefs } from '../../../ui/prefs'
import { editingHeight, SHORT_REM } from '../visible-height'

describe('editingHeight', () => {
  it('lets the editing area simply fill the space where the window is tall enough, or not measured yet', () => {
    expect(editingHeight(0)).toEqual({ short: false, min: null, visible: null })
    expect(editingHeight(SHORT_REM * 16)).toEqual({ short: false, min: null, visible: null })
    expect(editingHeight(557)).toEqual({ short: false, min: null, visible: null })
  })

  it('in a short window, makes it the visible height plus the card’s padding, with a floor', () => {
    expect(editingHeight(242)).toEqual({ short: true, min: 282, visible: 242 })
    expect(editingHeight(100)).toEqual({ short: true, min: 192, visible: 100 })
    // In rem: a larger root font size moves the line and the floor with it.
    expect(editingHeight(400, 24)).toEqual({ short: true, min: 460, visible: 400 })
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
    // Unmeasured (as in a tall window): the old floor, no height of its own.
    expect(area).toHaveClass('min-h-60')
    expect(area.style.minHeight).toBe('')
    // The card is placed against it in the two-column layout, so its contents can't make the page taller.
    expect(area.firstElementChild).toHaveClass('@2xl/keys:absolute', '@2xl/keys:inset-0')
  })
})
