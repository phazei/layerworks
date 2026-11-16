// SPDX-License-Identifier: GPL-3.0-or-later
// What the key colour and zone editors share: the keyboard's Keychron lighting from the store, the LED under each
// key, and the layer whose keys name the groups.

import { useMemo } from 'react'
import { keyLeds, useDevice } from '../../device'

export function useKeyLighting() {
  const keyboard = useDevice((s) => s.keyboard)
  const rgb = useDevice((s) => s.keychron?.rgb ?? null)
  const baseLayer = useDevice((s) => s.layer?.base ?? 0)
  const ledMatrix = rgb?.ledMatrix
  const ledCount = rgb?.ledCount ?? 0
  const leds = useMemo(
    () => (keyboard && ledMatrix ? keyLeds(ledMatrix, keyboard.rows, keyboard.cols, ledCount) : new Map<string, number>()),
    [keyboard, ledMatrix, ledCount],
  )
  return { keyboard, rgb, leds, layer: Math.min(baseLayer, (keyboard?.layers ?? 1) - 1) }
}
