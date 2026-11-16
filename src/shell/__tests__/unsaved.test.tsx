// @vitest-environment jsdom
// SPDX-License-Identifier: GPL-3.0-or-later

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import { deviceStore } from '../../device'
import { connectDemo, disconnect } from '../session'
import { StatusLine } from '../StatusLine'
import { describeUnsaved, setUnsaved } from '../unsaved'

const macro = (n: number, keyboard?: string) => ({ label: `Macro ${n}`, group: 'macros', href: `#/shortcuts/macro/${n}`, keyboard })

describe('describeUnsaved', () => {
  it('names one piece of work, counts several of a kind, and several kinds', () => {
    expect(describeUnsaved([macro(3)])).toBe('Macro 3 has changes not yet saved to the keyboard')
    expect(describeUnsaved([macro(3), macro(5)])).toBe('2 macros have unsaved changes')
    expect(describeUnsaved([macro(3), { label: 'Key chord 1', group: 'key chords' }])).toBe('2 items have unsaved changes')
  })
})

describe('the status line with unsaved work', () => {
  beforeEach(async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    await connectDemo()
  })
  afterEach(async () => {
    act(() => {
      setUnsaved('a', null)
      setUnsaved('b', null)
      setUnsaved('c', null)
    })
    await act(() => disconnect())
  })

  it('says so instead of “Saved”, leads to the work, and goes back to “Saved” once it is done', () => {
    const uid = deviceStore.getState().keyboard!.uid
    render(<StatusLine />)
    expect(screen.getByText('Saved on the keyboard')).toBeInTheDocument()

    act(() => setUnsaved('a', macro(3, uid)))
    const link = screen.getByRole('link', { name: 'Macro 3 has changes not yet saved to the keyboard' })
    expect(link).toHaveAttribute('href', '#/shortcuts/macro/3')
    expect(screen.queryByText('Saved on the keyboard')).toBeNull()

    act(() => setUnsaved('b', macro(5, uid)))
    expect(screen.getByRole('link', { name: '2 macros have unsaved changes' })).toBeInTheDocument()

    act(() => {
      setUnsaved('a', null)
      setUnsaved('b', null)
    })
    expect(screen.getByText('Saved on the keyboard')).toBeInTheDocument()
  })

  it('leaves out work that belongs to another keyboard', () => {
    render(<StatusLine />)
    act(() => setUnsaved('c', macro(2, 'some other keyboard')))
    expect(screen.getByText('Saved on the keyboard')).toBeInTheDocument()
  })
})
