// @vitest-environment jsdom
// SPDX-License-Identifier: GPL-3.0-or-later

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { deviceStore } from '../../device'
import { FakeLink, fakeKeyboard, fakeKeyboardConfig } from '../../device/fake-keyboard'
import { getPref, setPref } from '../../ui/prefs'
import { connectDemo, disconnect } from '../session'
import { Stage, STAGE_SIZE_PREF } from '../Stage'

// jsdom draws nothing, so the stage works from the space it is given: 600 pixels shared with the page.
const SPACE = 600

beforeEach(async () => {
  vi.spyOn(console, 'log').mockImplementation(() => {})
  setPref(STAGE_SIZE_PREF, null)
  await connectDemo()
})

afterEach(async () => {
  await act(() => disconnect())
})

const handle = () => screen.getByRole('separator', { name: 'Height of the keyboard picture' })

describe('the stage’s resize handle', () => {
  it('remembers a size set with the keyboard as a share of the space, and goes back to automatic', () => {
    render(<Stage keyboard={deviceStore.getState().keyboard!} selectable={false} space={SPACE} />)
    expect(handle()).toHaveAttribute('aria-valuetext', expect.stringContaining('automatic'))
    const start = Number(handle().getAttribute('aria-valuenow'))

    fireEvent.keyDown(handle(), { key: 'ArrowDown' })
    expect(getPref(STAGE_SIZE_PREF, null)).toBeCloseTo((start + 16) / SPACE)
    expect(handle()).not.toHaveAttribute('aria-valuetext', expect.stringContaining('automatic'))

    fireEvent.keyDown(handle(), { key: 'End' })
    expect(getPref(STAGE_SIZE_PREF, null)).toBeCloseTo(0.5)

    fireEvent.keyDown(handle(), { key: 'Enter' })
    expect(getPref(STAGE_SIZE_PREF, null)).toBeNull()
  })

  it('follows the keyboard’s layer where the keyboard reports it', () => {
    render(<Stage keyboard={deviceStore.getState().keyboard!} selectable={false} space={SPACE} />)
    expect(screen.getByRole('switch', { name: /Follow the keyboard/ })).toBeInTheDocument()
  })

  it('sizes the stage from the remembered share, kept under half the space unless the picture needs more', () => {
    setPref(STAGE_SIZE_PREF, 0.4)
    const { container } = render(<Stage keyboard={deviceStore.getState().keyboard!} selectable={false} space={SPACE} />)
    const box = container.firstElementChild as HTMLElement
    expect(box.style.height).toBe('40%')
    expect(box.style.maxHeight).toMatch(/^max\(50%, [\d.]+px\)$/)
  })
})

describe('the stage on a keyboard that doesn’t report its layer', () => {
  beforeEach(async () => {
    // A plain Vial keyboard: no Keychron commands, so no layer reports. Its layer 0 types A, B, C … from row 0.
    const link = new FakeLink('cable')
    link.responder = fakeKeyboard(fakeKeyboardConfig())
    await act(() => deviceStore.connect(link))
  })

  it('lights the keys typed, worked out on layer 0', () => {
    expect(deviceStore.getState().layer).toBeNull()
    const { container } = render(<Stage keyboard={deviceStore.getState().keyboard!} selectable={false} space={SPACE} />)
    act(() => {
      fireEvent.keyDown(window, { code: 'KeyB', key: 'b' })
    })
    expect(container.querySelector('[data-key-pos="0,1"]')).toHaveAttribute('data-pressed', 'true')
    act(() => {
      fireEvent.keyUp(window, { code: 'KeyB', key: 'b' })
    })
    expect(container.querySelector('[data-key-pos="0,1"]')).not.toHaveAttribute('data-pressed')
  })

  it('has no Follow the keyboard switch: there is nothing to follow', () => {
    render(<Stage keyboard={deviceStore.getState().keyboard!} selectable={false} space={SPACE} />)
    expect(screen.queryByRole('switch', { name: /Follow the keyboard/ })).toBeNull()
  })
})
