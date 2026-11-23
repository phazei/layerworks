// SPDX-License-Identifier: GPL-3.0-or-later
// How tall the Keys page's editing area is in a short window. The stage stays put above the page, which scrolls under
// it, so what can be seen under the picture is the page area's own height (the shell's scroller). Where that is
// plenty, the editing area just fills it and nothing scrolls. In a short window it is at least that height plus the
// card's padding, so that once the palette's search box is scrolled to the top of that area the key list below it
// reaches the bottom: the page scrolls by the card's padding and its own, no more.

import { useLayoutEffect, useState } from 'react'

/** Below this much visible height (in rem) the window counts as short. */
export const SHORT_REM = 22
/** The card's padding, top and bottom together (p-5), in rem. */
const CARD_PADDING_REM = 2.5
/** The least height of the editing area however short the window, in rem (room for a few rows of keys). */
const FLOOR_REM = 12

export interface EditingHeight {
  /** The window is short: the editing area and the key list take the visible height, not just what is left. */
  short: boolean
  /** The editing area's least height, in px; null when it simply fills the space under the stage. */
  min: number | null
  /** What can be seen under the stage, in px, for the key list to reach down to; null when not short. */
  visible: number | null
}

/** From the height that can be seen under the stage (`visible`, px) and the root font size (`rem`, px). */
export function editingHeight(visible: number, rem = 16): EditingHeight {
  if (!(visible > 0) || visible >= SHORT_REM * rem) return { short: false, min: null, visible: null }
  return { short: true, min: Math.max(visible + CARD_PADDING_REM * rem, FLOOR_REM * rem), visible }
}

/**
 * The visible height under the stage: the content height of the element the returned ref goes on sits in (the
 * shell's page scroller), kept current as the window, the stage's handle or the layer row change it. 0 until measured
 * (and in tests). A callback ref, as the element comes and goes with the selection.
 */
export function useVisibleHeight(): { ref: (element: HTMLElement | null) => void; visible: number; rem: number } {
  const [element, setElement] = useState<HTMLElement | null>(null)
  const [measured, setMeasured] = useState({ visible: 0, rem: 16 })
  useLayoutEffect(() => {
    const scroller = element?.parentElement
    if (!scroller || typeof ResizeObserver === 'undefined') return
    const measure = () => {
      const style = getComputedStyle(scroller)
      // All of it can be seen with the page scrolled: its bottom padding is only the room under the card at the end.
      const visible = scroller.clientHeight - parseFloat(style.paddingTop)
      const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
      setMeasured((old) => (old.visible === visible && old.rem === rem ? old : { visible, rem }))
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(scroller)
    return () => observer.disconnect()
  }, [element])
  return { ref: setElement, ...measured }
}
