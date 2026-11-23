// @vitest-environment jsdom
// SPDX-License-Identifier: GPL-3.0-or-later
// The page area scrolls sideways only below the narrowest width the pages are laid out for. jsdom lays nothing out,
// so this holds the classes that decide it; the widths themselves are measured in a browser (docs/screen.md "The screen").

import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import '../../pages'
import { HELP_PANEL_ID } from '../../help/help-store'
import { Shell } from '../Shell'

describe('the page area', () => {
  it('clips the help panel waiting beyond its right edge, so the panel adds no width to scroll to', () => {
    render(<Shell />)
    const panel = document.getElementById(HELP_PANEL_ID)!
    const main = panel.closest('main')!
    // Clipped, not a scrolling box of its own (overflow-hidden could still be scrolled by focus).
    expect(main).toHaveClass('overflow-clip')
    // The box that scrolls sideways below the minimum width is outside it.
    const scroller = main.parentElement!.parentElement!
    expect(scroller).toHaveClass('overflow-x-auto')
    expect(main.parentElement).toHaveClass('min-w-124')
  })
})
