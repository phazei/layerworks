// @vitest-environment jsdom
// SPDX-License-Identifier: GPL-3.0-or-later

import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import { deviceStore, VIAL_FIRMWARE_URL } from '../../device'
import { FakeLink, fakeKeyboard, fakeKeyboardConfig } from '../../device/fake-keyboard'
import { ConnectPrompt } from '../ConnectPrompt'
import { disconnect } from '../session'

afterEach(async () => {
  await act(() => disconnect())
})

describe('the connect prompt after a keyboard with VIA firmware, not Vial', () => {
  it('says so in plain words, with where to get Vial', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    const link = new FakeLink('cable')
    const fake = fakeKeyboard(fakeKeyboardConfig())
    link.responder = (request) => (request[0] === 0xfe ? [0xff, ...Array.from(request.subarray(1))] : fake(request))
    await act(() => deviceStore.connect(link))

    render(<ConnectPrompt />)
    expect(screen.getByText(/runs VIA firmware \(or other firmware without Vial\), not Vial/)).toBeInTheDocument()
    expect(screen.queryByText(/Failed to decompress/)).toBeNull()
    expect(screen.queryByText(/Couldn’t connect/)).toBeNull()
    expect(screen.getByRole('link', { name: /Vial’s site/ })).toHaveAttribute('href', VIAL_FIRMWARE_URL)
  })
})
