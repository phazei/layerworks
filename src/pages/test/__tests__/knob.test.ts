// SPDX-License-Identifier: GPL-3.0-or-later

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { connectDemo, disconnect } from '../../../shell/session'
import { parseKeycode, type KeyboardData } from '../../../device'
import { knobPlan } from '../knob'

const code = (id: string) => parseKeycode(id)!

/** One key (MO(1)) and `knobs` knobs: volume on layer 0, the mouse wheel on layer 1. */
function keyboard(knobs: number): KeyboardData {
  const knobMap: Record<string, number> = {}
  for (let k = 0; k < knobs; k++) {
    knobMap[`0,${k},0`] = code('KC_VOLD')
    knobMap[`0,${k},1`] = code('KC_VOLU')
    knobMap[`1,${k},0`] = code('KC_WH_D')
    knobMap[`1,${k},1`] = code('KC_WH_U')
  }
  return { rows: 1, cols: 1, layers: 2, keymap: { '0,0,0': code('MO(1)'), '1,0,0': 1 }, knobs: knobMap, knobCount: knobs } as unknown as KeyboardData
}

// Connecting the demo keyboard sets up the keycode tables (Vial protocol 6).
beforeAll(async () => {
  vi.spyOn(console, 'log').mockImplementation(() => {})
  await connectDemo()
})
afterAll(() => disconnect())

describe('where the knob can be checked instead', () => {
  it('says “it” for one knob and “they” for several', () => {
    const layer = { base: 0, held: 0, active: 0 }
    expect(knobPlan(keyboard(1), layer).elsewhere).toEqual({ layer: 1, way: 'hold', does: 'it scrolls' })
    expect(knobPlan(keyboard(3), layer).elsewhere).toEqual({ layer: 1, way: 'hold', does: 'they scroll' })
    expect(knobPlan(keyboard(3), layer).checkable).toHaveLength(6)
  })
})
