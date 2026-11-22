// SPDX-License-Identifier: GPL-3.0-or-later
// Whether the sidebar shows its pages' names or only their icons.
//
// The rule: a window narrower than NARROW_BELOW shows the icons only, a wider one the names. The button at the
// bottom of the sidebar overrides that by hand, at any width, and the choice is remembered in the browser together
// with the side of the threshold it was made on. It holds, across reloads too, for as long as the window stays on
// that side. When the window crosses the threshold, the choice is forgotten and the sidebar takes the shape for the
// new width. So the sidebar only ever changes shape when the button is pressed or when the window crosses the
// threshold, and after a crossing it always has the shape that width calls for.

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import { usePref } from '../ui/prefs'

/** Windows narrower than this (in CSS pixels) show the icons only: a tablet held sideways, half a laptop screen. */
export const NARROW_BELOW = 1024

/** Remembered under `layerworks:sidebar`: the hand choice and the side of the threshold it was made on. */
export interface SidebarChoice {
  collapsed: boolean
  narrow: boolean
}

export const SIDEBAR_PREF = 'sidebar'

export const isNarrow = (width: number): boolean => width < NARROW_BELOW

/** Whether the sidebar shows icons only: the hand choice while the window is on the side it was made on, else the width's. */
export function sidebarCollapsed(choice: SidebarChoice | null, narrow: boolean): boolean {
  return choice !== null && choice.narrow === narrow ? choice.collapsed : narrow
}

function subscribeWidth(listener: () => void): () => void {
  window.addEventListener('resize', listener)
  return () => window.removeEventListener('resize', listener)
}

/** Whether the window is narrower than the threshold, following it as it resizes. */
function useNarrow(): boolean {
  return useSyncExternalStore(subscribeWidth, () => isNarrow(window.innerWidth))
}

/**
 * `?sidebar=collapsed` or `?sidebar=expanded` in the address shows the sidebar so without remembering it (for
 * screenshots, like `?theme`), until the button is pressed.
 */
function addressChoice(): boolean | null {
  if (typeof location === 'undefined') return null
  const value = new URLSearchParams(location.search).get('sidebar')
  return value === 'collapsed' ? true : value === 'expanded' ? false : null
}

/** The sidebar's shape and the button's action. */
export function useSidebarCollapsed(): [collapsed: boolean, toggle: () => void] {
  const narrow = useNarrow()
  const [choice, setChoice] = usePref<SidebarChoice | null>(SIDEBAR_PREF, null)
  const [forced, setForced] = useState<SidebarChoice | null>(() => {
    const collapsed = addressChoice()
    return collapsed === null ? null : { collapsed, narrow: isNarrow(window.innerWidth) }
  })

  // Crossing the threshold forgets the hand choice (and the address's), so the new width's shape applies.
  useEffect(() => {
    if (choice !== null && choice.narrow !== narrow) setChoice(null)
    if (forced !== null && forced.narrow !== narrow) setForced(null)
  }, [narrow, choice, setChoice, forced])

  const collapsed = sidebarCollapsed(forced ?? choice, narrow)
  const toggle = useCallback(() => {
    setForced(null)
    setChoice({ collapsed: !collapsed, narrow })
  }, [collapsed, narrow, setChoice])
  return [collapsed, toggle]
}
