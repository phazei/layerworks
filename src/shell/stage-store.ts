// SPDX-License-Identifier: GPL-3.0-or-later
// What the keyboard stage is showing: which layer, and which key or knob direction is selected. Shared by the
// pages that use the stage, so it stays put when moving between them.

import { useSyncExternalStore } from 'react'
import type { DeviceState, Slot } from '../device'

/** A selected key or knob direction, without the layer (the stage's layer supplies it). */
export type Selection = { kind: 'key'; row: number; col: number } | { kind: 'knob'; knob: number; direction: 0 | 1 }

export interface StageState {
  /** Show whichever layer is active on the keyboard. */
  follow: boolean
  /** The layer shown when not following. */
  layer: number
  selection: Selection | null
}

let state: StageState = { follow: true, layer: 0, selection: null }
const listeners = new Set<() => void>()

function set(patch: Partial<StageState>): void {
  state = { ...state, ...patch }
  for (const listener of [...listeners]) listener()
}

export const stage = {
  get: () => state,
  setFollow: (follow: boolean, liveLayer = state.layer) => set({ follow, layer: liveLayer }),
  /** Shows one layer and stops following the keyboard. */
  showLayer: (layer: number) => set({ follow: false, layer }),
  select: (selection: Selection | null) => set({ selection }),
  reset: () => set({ follow: true, layer: 0, selection: null }),
}

export function useStage(): StageState {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => state,
  )
}

/** The layer the stage shows, given what the keyboard reports. */
export function shownLayer(stageState: StageState, live: DeviceState['layer'], layerCount: number): number {
  const layer = stageState.follow && live ? live.active : stageState.layer
  return Math.min(layer, Math.max(0, layerCount - 1))
}

export function toSlot(selection: Selection, layer: number): Slot {
  return selection.kind === 'key'
    ? { kind: 'key', layer, row: selection.row, col: selection.col }
    : { kind: 'knob', layer, knob: selection.knob, direction: selection.direction }
}
