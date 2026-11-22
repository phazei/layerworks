// @vitest-environment jsdom
// SPDX-License-Identifier: GPL-3.0-or-later

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import '../../pages'
import { deviceStore } from '../../device'
import { connectDemo, demoKeyboard, disconnect } from '../session'
import { Shell } from '../Shell'
import { closeUnlock, openUnlock } from '../unlock-dialog'
import { Counting } from '../UnlockDialog'

const ESC = '0,1'
const ENTER = '3,14'

async function shell(): Promise<void> {
  await connectDemo()
  await waitFor(() => expect(deviceStore.getState().loading).toEqual([]))
  render(<Shell />)
}

function openFromDeviceCard(): HTMLElement {
  const card = screen.getByRole('region', { name: 'Connected keyboard' })
  expect(card).toHaveTextContent('Locked')
  act(() => within(card).getByRole('button', { name: 'Unlock…' }).click())
  return screen.getByRole('dialog', { name: 'Unlock the keyboard?' })
}

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})

afterEach(async () => {
  vi.useRealTimers()
  await act(() => disconnect())
  await act(async () => {})
  closeUnlock()
})

describe('the unlock dialog', () => {
  it('explains first, with the keys to hold marked on the keyboard, and can be cancelled', async () => {
    await shell()
    const dialog = openFromDeviceCard()

    expect(dialog).toHaveTextContent('a web page can’t quietly read your typing')
    expect(dialog).toHaveTextContent('hold Esc and Enter together')
    expect(dialog).toHaveTextContent('nothing can stop it')
    expect(dialog.querySelectorAll('svg [data-key-pos]').length).toBeGreaterThan(0)

    act(() => within(dialog).getByRole('button', { name: 'Cancel' }).click())
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(demoKeyboard()).not.toBeNull()
  })

  it('tells whoever asked whether the keyboard got unlocked', async () => {
    await shell()
    let answer: boolean | null = null
    act(() => void openUnlock('Test').then((ok) => (answer = ok)))
    await act(async () => within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }).click())
    expect(answer).toBe(false)

    act(() => {
      demoKeyboard()!.setKey(ESC, true)
      demoKeyboard()!.setKey(ENTER, true)
    })
    answer = null
    act(() => void openUnlock('Test').then((ok) => (answer = ok)))
    vi.useFakeTimers()
    await act(async () => within(screen.getByRole('dialog')).getByRole('button', { name: 'Start unlocking' }).click())
    await act(() => vi.advanceTimersByTimeAsync(9000))
    // As soon as it completes, while the dialog still says so.
    expect(answer).toBe(true)
    expect(screen.getByRole('dialog', { name: 'The keyboard is unlocked' })).toBeInTheDocument()
    // Asked again while unlocked: yes at once, no dialog.
    await expect(openUnlock('Again')).resolves.toBe(true)
  })

  it('shows the count while the keys are held, can’t be closed, and ends unlocked', async () => {
    await shell()
    const dialog = openFromDeviceCard()
    vi.useFakeTimers()

    await act(async () => within(dialog).getByRole('button', { name: 'Start unlocking' }).click())
    await act(() => vi.advanceTimersByTimeAsync(500))
    const counting = screen.getByRole('dialog', { name: 'Hold Esc and Enter' })
    expect(within(counting).queryAllByRole('button')).toHaveLength(0)
    expect(counting).toHaveTextContent('can’t be cancelled')
    expect(within(counting).getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0')

    // Esc is the dialog's cancel key: it must not close it now.
    fireEvent(counting.closest('dialog')!, new Event('cancel', { cancelable: true }))
    expect(screen.getByRole('dialog', { name: 'Hold Esc and Enter' })).toBeInTheDocument()

    act(() => {
      demoKeyboard()!.setKey(ESC, true)
      demoKeyboard()!.setKey(ENTER, true)
    })
    await act(() => vi.advanceTimersByTimeAsync(2000))
    expect(Number(within(counting).getByRole('progressbar').getAttribute('aria-valuenow'))).toBeGreaterThan(10)
    expect(counting).toHaveTextContent('Keep holding')

    await act(() => vi.advanceTimersByTimeAsync(6000))
    const done = screen.getByRole('dialog', { name: 'The keyboard is unlocked' })
    act(() => within(done).getByRole('button', { name: 'Done' }).click())
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByRole('region', { name: 'Connected keyboard' })).toHaveTextContent('Unlocked')
  })

  it('says so when the keyboard goes away mid-way', async () => {
    await shell()
    const dialog = openFromDeviceCard()
    vi.useFakeTimers()

    await act(async () => within(dialog).getByRole('button', { name: 'Start unlocking' }).click())
    await act(() => vi.advanceTimersByTimeAsync(500))
    await act(async () => demoKeyboard()!.drop())
    await act(() => vi.advanceTimersByTimeAsync(500))

    const lost = screen.getByRole('dialog', { name: 'The keyboard was disconnected' })
    expect(lost).toHaveTextContent('starts locked')
    act(() => within(lost).getByRole('button', { name: 'Close' }).click())
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('locks again from the device card', async () => {
    history.replaceState(null, '', '/?demo-unlocked')
    await shell()
    history.replaceState(null, '', '/')
    const card = screen.getByRole('region', { name: 'Connected keyboard' })
    expect(card).toHaveTextContent('Unlocked')

    await act(async () => within(card).getByRole('button', { name: 'Lock' }).click())

    await waitFor(() => expect(card).toHaveTextContent('Locked'))
    expect(within(card).getByRole('button', { name: 'Unlock…' })).toBeInTheDocument()
  })
})

describe('the count, when it starts again', () => {
  it('asks for both keys on a keyboard with two, all of them on one with more', () => {
    const progress = (remaining: number) => ({ remaining, total: 50, silent: false })
    const { rerender } = render(<Counting progress={progress(40)} keys="Esc and Enter" count={2} />)
    rerender(<Counting progress={progress(50)} keys="Esc and Enter" count={2} />)
    expect(screen.getByText('The count started again: hold both keys at the same time.')).toBeInTheDocument()
    rerender(<Counting progress={progress(50)} keys="Esc, Enter and Space" count={3} />)
    expect(screen.getByText('The count started again: hold all of them at the same time.')).toBeInTheDocument()
  })
})
