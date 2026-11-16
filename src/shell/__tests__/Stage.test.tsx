// @vitest-environment jsdom
// SPDX-License-Identifier: GPL-3.0-or-later

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { deviceStore } from '../../device'
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

  it('sizes the stage from the remembered share, kept under half the space unless the picture needs more', () => {
    setPref(STAGE_SIZE_PREF, 0.4)
    const { container } = render(<Stage keyboard={deviceStore.getState().keyboard!} selectable={false} space={SPACE} />)
    const box = container.firstElementChild as HTMLElement
    expect(box.style.height).toBe('40%')
    expect(box.style.maxHeight).toMatch(/^max\(50%, [\d.]+px\)$/)
  })
})
