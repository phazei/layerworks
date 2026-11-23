// SPDX-License-Identifier: GPL-3.0-or-later
// How tall the Keys page's palette is where the inspector is one column. The stage stays put above the page, which
// scrolls under it, so what can be seen under the picture is the page area's own height (the shell's scroller). In
// two columns the card fills exactly that and the key list takes what is left in it. In one column the card is as
// tall as its contents, and the list would be as short as it may be: there the palette (its search row and the key
// list under it) takes the visible height less the room around it, so scrolled into place it fills what can be seen.

import { useLayoutEffect, useState } from 'react'

/**
 * The room kept around the palette, in rem: the card's padding, top and bottom (p-5), and the page's own under the
 * card (pb-6). It is what the two-column layout leaves around it too.
 */
const AROUND_REM = 4

/**
 * The height the palette takes in one column (search row and key list together), in px, from the height that can be
 * seen under the stage (`visible`, px) and the root font size (`rem`, px); null while that isn't measured.
 */
export function paletteHeight(visible: number, rem = 16): number | null {
  return visible > 0 ? Math.max(0, visible - AROUND_REM * rem) : null
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
