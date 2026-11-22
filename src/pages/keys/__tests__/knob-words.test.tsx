// @vitest-environment jsdom
// SPDX-License-Identifier: GPL-3.0-or-later

import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { NothingSelected } from '../../Keys'

describe('the Keys page on a keyboard with several knobs', () => {
  it('speaks of “a knob”, which reads right with one knob or eight', () => {
    render(<NothingSelected knob />)
    expect(screen.getByText(/Click a key in the picture, or one side of a knob, to choose what it does\./)).toBeInTheDocument()
  })

  it('doesn’t mention a knob on a keyboard without one', () => {
    render(<NothingSelected knob={false} />)
    expect(screen.getByText('Click a key in the picture to choose what it does.')).toBeInTheDocument()
  })
})
