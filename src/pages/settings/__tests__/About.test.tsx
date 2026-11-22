// @vitest-environment jsdom
// SPDX-License-Identifier: GPL-3.0-or-later

import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BUILD_COMMIT } from '../../../build-info'
import { COPYRIGHT_HOLDER, ISSUES_URL, SOURCE_URL, commitUrl } from '../../../project'
import { About } from '../About'

describe('About', () => {
  it('links to the source, at the commit the page was built from', () => {
    render(<About />)
    // vite.config.ts gives tests a made-up commit.
    expect(BUILD_COMMIT).toBe('0123456789abcdef0123456789abcdef01234567')
    expect(screen.getByRole('link', { name: /^github\.com\/phazei\/layerworks/ })).toHaveAttribute('href', SOURCE_URL)
    expect(screen.getByRole('link', { name: /^commit 0123456/ })).toHaveAttribute(
      'href',
      'https://github.com/phazei/layerworks/tree/0123456789abcdef0123456789abcdef01234567',
    )
  })

  it('asks people to report problems on GitHub', () => {
    render(<About />)
    expect(screen.getByRole('link', { name: /^Report a problem/ })).toHaveAttribute('href', ISSUES_URL)
  })

  it('names the copyright holder, says there is no warranty, and links the licences beside the page', () => {
    render(<About />)
    expect(screen.getByText(new RegExp(`^Copyright © \\d{4} ${COPYRIGHT_HOLDER}\\.`))).toBeInTheDocument()
    expect(screen.getByText(/no warranty/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /^GNU GPL, version 3 or later/ })).toHaveAttribute('href', './LICENSE.txt')
    expect(screen.getByRole('link', { name: /^Licences of the parts/ })).toHaveAttribute('href', './licences.txt')
  })

  it('credits Vial GUI and says Layerworks is independent', () => {
    render(<About />)
    expect(screen.getByRole('link', { name: /^Vial GUI/ })).toHaveAttribute('href', 'https://github.com/vial-kb/vial-gui')
    expect(screen.getByText(/not affiliated with or endorsed by Keychron, QMK, Vial or VIA/)).toBeInTheDocument()
  })
})

describe('commitUrl', () => {
  it('gives no link for an unknown commit', () => {
    expect(commitUrl('unknown')).toBeNull()
    expect(commitUrl('abc1234')).toBeNull()
  })
})
