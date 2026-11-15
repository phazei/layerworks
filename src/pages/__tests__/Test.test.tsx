// @vitest-environment jsdom
// SPDX-License-Identifier: GPL-3.0-or-later

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import '..'
import { deviceStore, matrixKeys } from '../../device'
import { Shell } from '../../shell/Shell'
import { connectDemo, demoKeyboard, disconnect } from '../../shell/session'
import { closeUnlock } from '../../shell/unlock-dialog'
import { forgetSeenKeys } from '../test/seen'

/** The right B key: Fn2 on the K15 Max, a layer key the browser never hears about. */
const FN2 = '4,8'

async function openTest(query = ''): Promise<void> {
  history.replaceState(null, '', `/${query}#/test`)
  await connectDemo()
  await waitFor(() => expect(deviceStore.getState().unlock).not.toBeNull())
  render(<Shell />)
}

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  forgetSeenKeys()
})

afterEach(async () => {
  await act(() => disconnect())
  closeUnlock()
  history.replaceState(null, '', '/')
})

describe('the Test page', () => {
  it('counts every physical key of the K15 Max (not the two knob turns)', async () => {
    await openTest()
    expect(matrixKeys(deviceStore.getState().keyboard!)).toHaveLength(90)
    expect(screen.getByText('0 of 90 keys seen')).toBeInTheDocument()
  })

  it('marks keys the browser sees while the keyboard is locked', async () => {
    await openTest()
    expect(screen.getByText(/Seeing keys through the browser/)).toBeInTheDocument()

    fireEvent.keyDown(window, { code: 'KeyA', key: 'a' })
    fireEvent.keyUp(window, { code: 'KeyA', key: 'a' })
    fireEvent.keyDown(window, { code: 'Escape', key: 'Escape' })
    fireEvent.keyUp(window, { code: 'Escape', key: 'Escape' })

    expect(screen.getByText('2 of 90 keys seen')).toBeInTheDocument()
    act(() => screen.getByRole('button', { name: 'Start again' }).click())
    expect(screen.getByText('0 of 90 keys seen')).toBeInTheDocument()
  })

  it('offers to unlock, and opens the unlock dialog', async () => {
    await openTest()

    act(() => screen.getByRole('button', { name: /Unlock to see every key/ }).click())

    expect(screen.getByRole('dialog', { name: 'Unlock the keyboard?' })).toHaveTextContent('Esc and Enter')
    expect(screen.getByRole('dialog')).toHaveTextContent(/The key test needs it/)
  })

  it('reads keys the browser can’t see from the unlocked keyboard', async () => {
    await openTest('?demo-unlocked')
    expect(screen.getByText(/Reading every key straight from the keyboard/)).toBeInTheDocument()

    act(() => demoKeyboard()!.setKey(FN2, true))

    await waitFor(() => expect(screen.getByText('1 of 90 keys seen')).toBeInTheDocument())
    expect(document.querySelector(`[data-key-pos="${FN2}"]`)).toHaveAttribute('data-pressed', 'true')

    act(() => demoKeyboard()!.setKey(FN2, false))
    await waitFor(() => expect(document.querySelector(`[data-key-pos="${FN2}"]`)).not.toHaveAttribute('data-pressed'))
    expect(screen.getByText('1 of 90 keys seen')).toBeInTheDocument()
  })

  it('stops reading the keyboard when leaving the page', async () => {
    await openTest('?demo-unlocked')
    const link = demoKeyboard()!
    const reads = () => (link as unknown as { requests: Uint8Array[] }).requests.filter((r) => r[0] === 0x02 && r[1] === 0x03).length
    await waitFor(() => expect(reads()).toBeGreaterThan(0))

    await act(async () => {
      location.hash = '#/help'
      window.dispatchEvent(new HashChangeEvent('hashchange'))
    })
    await new Promise((resolve) => setTimeout(resolve, 60))
    const after = reads()
    await new Promise((resolve) => setTimeout(resolve, 150))

    expect(reads()).toBe(after)
  })
})
