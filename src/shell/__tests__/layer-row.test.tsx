// @vitest-environment jsdom
// SPDX-License-Identifier: GPL-3.0-or-later
// Above the picture the layers are one row however many there are (one that scrolls sideways when long), so a
// keyboard with many layers doesn't squeeze the picture. jsdom lays nothing out, so this holds the classes that
// decide it; the stage with 18 layers is seen in screenshots (?demo-keyboard=vipad).

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen, within } from '@testing-library/react'
import { deviceStore } from '../../device'
import { connectDemo, disconnect } from '../session'
import { Stage } from '../Stage'

beforeEach(async () => {
  vi.spyOn(console, 'log').mockImplementation(() => {})
  await connectDemo()
})

afterEach(async () => {
  await act(() => disconnect())
})

describe('the layers in a row', () => {
  it('stay on one line that scrolls sideways, each chip its full width', () => {
    render(<Stage keyboard={deviceStore.getState().keyboard!} selectable={false} space={600} />)
    const list = screen.getByRole('list', { name: 'Layers' })
    expect(list).toHaveClass('overflow-x-auto')
    expect(list).not.toHaveClass('flex-wrap')
    for (const chip of within(list).getAllByRole('listitem')) expect(chip).toHaveClass('shrink-0')
  })
})
