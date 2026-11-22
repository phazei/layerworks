// @vitest-environment jsdom
// SPDX-License-Identifier: GPL-3.0-or-later

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen, waitFor } from '@testing-library/react'
import '..'
import { deviceStore, lightingKind } from '../../device'
import { firmwareHasVialRgb } from '../../device/lighting-kind'
import { connectDemo, disconnect } from '../../shell/session'
import { Shell } from '../../shell/Shell'
import { clearPrefs, setPref } from '../../ui/prefs'

async function go(path: string): Promise<void> {
  await act(async () => {
    location.hash = path
    window.dispatchEvent(new HashChangeEvent('hashchange'))
  })
}

describe('VialRGB the firmware reports but the definition doesn’t name', () => {
  it('is read from byte 12 of the keyboard ID reply, and beats the definition', () => {
    const reply = [6, 0, 0, 0, 1, 2, 3, 4, 5, 6, 7, 8, 1]
    expect(firmwareHasVialRgb(reply)).toBe(true)
    expect(firmwareHasVialRgb(reply.with(12, 0))).toBe(false)
    expect(lightingKind({ extends: 'qmk_rgb_matrix' }, true)).toBe('vialrgb')
    expect(lightingKind('none', true)).toBe('vialrgb')
    expect(lightingKind('none', false)).toBe('none')
  })

  describe('on the demo Vipad (definition: { "extends": "qmk_rgb_matrix" }, firmware: VIALRGB_ENABLE)', () => {
    beforeEach(async () => {
      vi.spyOn(console, 'log').mockImplementation(() => {})
      vi.spyOn(console, 'warn').mockImplementation(() => {})
      clearPrefs()
      history.replaceState(null, '', '/?demo-keyboard=vipad')
      await connectDemo()
      await waitFor(() => expect(deviceStore.getState().loading).toEqual([]))
    })
    afterEach(async () => {
      await act(() => disconnect())
      history.replaceState(null, '', '/')
      location.hash = ''
    })

    it('offers its lighting effects, and says in Technical details whose word that is', async () => {
      const { lighting, capabilities } = deviceStore.getState()
      expect(lighting?.kind).toBe('vialrgb')
      expect(capabilities!.has('lighting')).toBe(true)
      await go('#/lighting')
      const { unmount } = render(<Shell />)
      expect(screen.getByRole('heading', { name: 'Effect' })).toBeInTheDocument()
      unmount()

      setPref('open:device-technical', true)
      await go('#/device')
      render(<Shell />)
      expect(screen.getByText(/vialrgb \(the firmware reports VialRGB; the definition says \{"extends":"qmk_rgb_matrix",/)).toBeInTheDocument()
    })
  })

  it('says “no lighting the app can change” where neither names any', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    history.replaceState(null, '', '/?demo-keyboard=gh80')
    await connectDemo()
    await waitFor(() => expect(deviceStore.getState().loading).toEqual([]))
    expect(deviceStore.getState().capabilities!.check('lighting')).toMatchObject({
      available: false,
      reason: expect.stringMatching(/^This keyboard has no lighting the app can change/),
    })
    await act(() => disconnect())
    history.replaceState(null, '', '/')
  })
})
