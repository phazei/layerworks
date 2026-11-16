// @vitest-environment jsdom
// SPDX-License-Identifier: GPL-3.0-or-later

import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { ResizeHandle } from '../ResizeHandle'

function setup(value = 200) {
  const onResize = vi.fn()
  const onReset = vi.fn()
  render(<ResizeHandle label="Height" value={value} min={150} max={300} step={10} valueText="40 %" onResize={onResize} onReset={onReset} />)
  return { handle: screen.getByRole('separator', { name: 'Height' }), onResize, onReset }
}

describe('ResizeHandle', () => {
  it('is a focusable horizontal separator with its value', () => {
    const { handle } = setup()
    expect(handle).toHaveAttribute('aria-orientation', 'horizontal')
    expect(handle).toHaveAttribute('tabindex', '0')
    expect(handle).toHaveAttribute('aria-valuenow', '200')
    expect(handle).toHaveAttribute('aria-valuemin', '150')
    expect(handle).toHaveAttribute('aria-valuemax', '300')
    expect(handle).toHaveAttribute('aria-valuetext', '40 %')
  })

  it('resizes with the arrows and Page Up / Down, within the limits', () => {
    const { handle, onResize } = setup()
    fireEvent.keyDown(handle, { key: 'ArrowUp' })
    fireEvent.keyDown(handle, { key: 'ArrowDown' })
    fireEvent.keyDown(handle, { key: 'PageDown' })
    fireEvent.keyDown(handle, { key: 'PageUp' })
    expect(onResize.mock.calls).toEqual([
      [190, true],
      [210, true],
      [240, true],
      [160, true],
    ])
  })

  it('goes to the limits with Home and End, and back to automatic with Enter or a double click', () => {
    const { handle, onResize, onReset } = setup()
    fireEvent.keyDown(handle, { key: 'Home' })
    fireEvent.keyDown(handle, { key: 'End' })
    expect(onResize.mock.calls).toEqual([
      [150, true],
      [300, true],
    ])
    fireEvent.keyDown(handle, { key: 'Enter' })
    fireEvent.doubleClick(handle)
    expect(onReset).toHaveBeenCalledTimes(2)
  })

  it('follows a drag, clamped, and says when it ends', () => {
    const { handle, onResize } = setup()
    fireEvent.pointerDown(handle, { button: 0, clientY: 100, pointerId: 1 })
    fireEvent.pointerMove(handle, { clientY: 130, pointerId: 1 })
    fireEvent.pointerMove(handle, { clientY: 400, pointerId: 1 })
    fireEvent.pointerUp(handle, { clientY: 400, pointerId: 1 })
    expect(onResize.mock.calls).toEqual([
      [230, false],
      [300, false],
      [300, true],
    ])
  })
})
