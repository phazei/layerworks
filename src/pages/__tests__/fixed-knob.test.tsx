// @vitest-environment jsdom
// SPDX-License-Identifier: GPL-3.0-or-later

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen, waitFor } from '@testing-library/react'
import '..'
import { createBackup, deviceStore, FIXED_KNOBS } from '../../device'
import { firmwareKeepsKnobs } from '../../device/knob-map'
import { connectDemo, disconnect } from '../../shell/session'
import { Shell } from '../../shell/Shell'
import { stage } from '../../shell/stage-store'

async function go(path: string): Promise<void> {
  await act(async () => {
    location.hash = path
    window.dispatchEvent(new HashChangeEvent('hashchange'))
  })
}

describe('a knob the firmware doesn’t let apps change (built without an encoder map)', () => {
  it('is told by Vial’s knob command coming back unchanged, on every layer', () => {
    // "get encoder (layer, knob)" sent back: 0xFE03, then layer << 8 | knob.
    const echoed = { '0,0,0': 0xfe03, '0,0,1': 0x0000, '1,0,0': 0xfe03, '1,0,1': 0x0100 }
    expect(firmwareKeepsKnobs(echoed, 2, [0])).toBe(true)
    expect(firmwareKeepsKnobs({ ...echoed, '1,0,0': 0x00aa }, 2, [0])).toBe(false)
    expect(firmwareKeepsKnobs({ '0,0,0': 0x00aa, '0,0,1': 0x00a9 }, 1, [0])).toBe(false)
    expect(firmwareKeepsKnobs({}, 1, [])).toBe(false)
  })

  describe('on the demo Cloud, whose firmware is built so', () => {
    beforeEach(async () => {
      vi.spyOn(console, 'log').mockImplementation(() => {})
      vi.spyOn(console, 'warn').mockImplementation(() => {})
      history.replaceState(null, '', '/?demo-keyboard=cloud')
      await connectDemo()
      await waitFor(() => expect(deviceStore.getState().loading).toEqual([]))
    })
    afterEach(async () => {
      await act(() => disconnect())
      history.replaceState(null, '', '/')
      location.hash = ''
    })

    it('has no knob to read, change, test, undo or back up, and says why', () => {
      const state = deviceStore.getState()
      expect(state.keyboard).toMatchObject({ knobCount: 0, fixedKnobs: 1, knobs: {} })
      expect(state.capabilities!.check('knob')).toEqual({ available: false, reason: FIXED_KNOBS })
      expect(createBackup(state, []).knobs.every((layer) => layer.length === 0)).toBe(true)
    })

    it('marks the knob “Fixed” in the picture, says so on Keys, and doesn’t let it be picked', async () => {
      await go('#/keys')
      render(<Shell />)
      expect(screen.getByText(new RegExp(FIXED_KNOBS.slice(0, 40)))).toBeInTheDocument()
      const knob = document.querySelector('[data-encoder-pos="0,1"]')!
      expect(knob).toHaveTextContent('Fixed')
      act(() => (knob.querySelector('circle') ?? knob).dispatchEvent(new MouseEvent('click', { bubbles: true })))
      expect(stage.get().selection).toBeNull()
      // A knob selection from elsewhere (the address) is ignored too.
      act(() => stage.select({ kind: 'knob', knob: 0, direction: 1 }))
      expect(screen.queryByRole('heading', { name: /What should turning right do/ })).toBeNull()
    })
  })
})
