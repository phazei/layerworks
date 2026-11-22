// @vitest-environment jsdom
// SPDX-License-Identifier: GPL-3.0-or-later

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen, waitFor, within } from '@testing-library/react'
import '..'
import { deviceStore, NEVER_LOCKS, neverLocks } from '../../device'
import { connectDemo, demoKeyboard, disconnect } from '../../shell/session'
import { Shell } from '../../shell/Shell'

async function go(path: string): Promise<void> {
  await act(async () => {
    location.hash = path
    window.dispatchEvent(new HashChangeEvent('hashchange'))
  })
}

describe('firmware that never locks (VIAL_INSECURE)', () => {
  it('reads as unlocked with no unlock keys, which a keyboard that locks never does', () => {
    expect(neverLocks({ unlocked: true, inProgress: false, keys: [] })).toBe(true)
    expect(neverLocks({ unlocked: true, inProgress: false, keys: [[0, 1], [3, 14]] })).toBe(false)
    expect(neverLocks({ unlocked: false, inProgress: false, keys: [[0, 1], [3, 14]] })).toBe(false)
    expect(neverLocks(null)).toBe(false)
  })

  describe('on the demo Vipad, built so', () => {
    beforeEach(async () => {
      vi.spyOn(console, 'log').mockImplementation(() => {})
      vi.spyOn(console, 'warn').mockImplementation(() => {})
      history.replaceState(null, '', '/?demo-keyboard=vipad')
      await connectDemo()
      await waitFor(() => expect(deviceStore.getState().loading).toEqual([]))
    })
    afterEach(async () => {
      await act(() => disconnect())
      history.replaceState(null, '', '/')
      location.hash = ''
    })

    it('offers neither Lock nor Unlock, and says the firmware doesn’t lock', async () => {
      await go('#/')
      render(<Shell />)
      const card = screen.getByRole('region', { name: 'Connected keyboard' })
      expect(card).toHaveTextContent('Never locks')
      expect(within(card).queryByRole('button', { name: /^(Lock|Unlock…)$/ })).toBeNull()
      const glance = screen.getByLabelText('At a glance')
      expect(glance).toHaveTextContent('ProtectionNever locks')
      expect(glance).toHaveTextContent(NEVER_LOCKS)
      expect(within(glance).queryByRole('button', { name: /Unlock/ })).toBeNull()
    })

    it('sends no lock, and refuses nothing as locked', async () => {
      const link = demoKeyboard() as unknown as { requests: Uint8Array[] }
      await deviceStore.lock()
      expect(link.requests.some((r) => r[0] === 0xfe && r[1] === 0x08)).toBe(false)
      expect(deviceStore.getState().unlock?.unlocked).toBe(true)
      expect(await deviceStore.saveMacro(1, [{ kind: 'text', text: 'hi' }])).toBe('saved')
    })
  })
})
