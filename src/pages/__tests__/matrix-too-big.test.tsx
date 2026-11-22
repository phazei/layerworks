// @vitest-environment jsdom
// SPDX-License-Identifier: GPL-3.0-or-later

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen, waitFor } from '@testing-library/react'
import '..'
import { deviceStore, MATRIX_TOO_BIG, matrixReadable } from '../../device'
import { connectDemo, demoKeyboard, disconnect } from '../../shell/session'
import { Shell } from '../../shell/Shell'
import { stage } from '../../shell/stage-store'
import { forgetSeenKeys } from '../test/seen'

async function go(path: string): Promise<void> {
  await act(async () => {
    location.hash = path
    window.dispatchEvent(new HashChangeEvent('hashchange'))
  })
}

describe('a switch matrix too big for the switch-matrix read', () => {
  it('is too big where (cols / 8 + 1) × rows passes 28, as via.c counts', () => {
    expect(matrixReadable(6, 16)).toBe(true) // the K15 Max: 3 × 6
    expect(matrixReadable(12, 9)).toBe(true) // 2 × 12 = 24
    expect(matrixReadable(14, 8)).toBe(true) // 2 × 14 = 28
    expect(matrixReadable(10, 16)).toBe(false) // era/sirind/klein_hs: 3 × 10
    expect(matrixReadable(18, 8)).toBe(false) // bpiphany/frosty_flake: 2 × 18
  })

  describe('on the demo Klein, unlocked', () => {
    beforeEach(async () => {
      vi.spyOn(console, 'log').mockImplementation(() => {})
      vi.spyOn(console, 'warn').mockImplementation(() => {})
      forgetSeenKeys()
      history.replaceState(null, '', '/?demo-keyboard=klein&demo-unlocked')
      await connectDemo()
      await waitFor(() => expect(deviceStore.getState().loading).toEqual([]))
    })
    afterEach(async () => {
      await act(() => disconnect())
      history.replaceState(null, '', '/')
      location.hash = ''
    })

    it('says why, offers no unlock, and goes by the browser on the Test page', async () => {
      expect(deviceStore.getState().unlock?.unlocked).toBe(true)
      expect(deviceStore.getState().capabilities!.check('keyMatrix')).toEqual({ available: false, reason: MATRIX_TOO_BIG })
      await go('#/test')
      render(<Shell />)
      expect(screen.getByText(new RegExp(MATRIX_TOO_BIG.slice(0, 50)))).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /Unlock to see every key/ })).toBeNull()
      expect(screen.queryByText(/Reading every key straight from the keyboard/)).toBeNull()
      await new Promise((resolve) => setTimeout(resolve, 80))
      const link = demoKeyboard() as unknown as { requests: Uint8Array[] }
      expect(link.requests.some((r) => r[0] === 0x02 && r[1] === 0x03)).toBe(false)
    })

    it('says on “Press a key” that only keys the computer receives count, and offers no unlock', async () => {
      await go('#/keys')
      render(<Shell />)
      act(() => stage.select({ kind: 'key', row: 0, col: 0 }))
      act(() => screen.getByRole('button', { name: 'Press a key' }).click())
      expect(screen.getByText(/more switches than its firmware can report to an app, so not Fn, layer or macro keys/)).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /Unlock to see every key/ })).toBeNull()
    })
  })
})
