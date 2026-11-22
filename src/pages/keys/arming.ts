// SPDX-License-Identifier: GPL-3.0-or-later
// "Put it on a key…" from a shortcut's editor: the Keys page opens armed with that shortcut's keycode, and the next
// key or knob direction clicked on the picture gets it (Keys.tsx does the assigning). Esc, Cancel or leaving the
// Keys page ends it. Kept outside React, as the editor arms it just before the page changes.

import { useSyncExternalStore } from 'react'
import { stage } from '../../shell/stage-store'

export interface Armed {
  /** The keycode the clicked key gets. */
  code: number
  /** What it is called, as elsewhere: "Multi-tap key 2", the macro's name. */
  name: string
  /** A hint said with it: the shortcut is empty, or has changes not saved yet. */
  hint?: string
}

/** What was just put on a key, for the inspector to say what the key held before. */
export interface JustPut {
  name: string
  /** "layer,row,col" or "layer,knob,k,dir" of the key it went on. */
  where: string
  before: number
}

interface ArmingState {
  armed: Armed | null
  justPut: JustPut | null
}

let state: ArmingState = { armed: null, justPut: null }
const listeners = new Set<() => void>()

function set(patch: Partial<ArmingState>): void {
  state = { ...state, ...patch }
  for (const listener of [...listeners]) listener()
}

const onKeys = () => /^#?\/keys(\/|$)/.test(location.hash)

/** Leaving the Keys page ends it. */
function watchLeaving(): void {
  if (!state.armed || onKeys()) return
  set({ armed: null })
}

/**
 * Arms the Keys page with a keycode, then the caller goes there. Nothing is selected meanwhile (so any click is the
 * one), and the stage stops following the keyboard's layer, so the layer picked doesn't change under the pointer.
 */
export function armKey(armed: Armed, liveLayer: number | undefined): void {
  stage.select(null)
  if (stage.get().follow && liveLayer !== undefined) stage.showLayer(liveLayer)
  set({ armed, justPut: null })
}

/** Ends it without assigning. */
export const disarm = (): void => set({ armed: null })

/** Called by the Keys page once it has put the keycode on a key. */
export const armedDone = (justPut: JustPut): void => set({ armed: null, justPut })

/** Forgets what was just put (another key is selected). */
export const forgetJustPut = (): void => {
  if (state.justPut) set({ justPut: null })
}

export const armingState = (): ArmingState => state

if (typeof window !== 'undefined') window.addEventListener('hashchange', watchLeaving)

export function useArming(): ArmingState {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => state,
  )
}
