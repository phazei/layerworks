// @vitest-environment jsdom
// SPDX-License-Identifier: GPL-3.0-or-later
// Zones differ by their line as well as their colour, and their colours stand out against the keys in both themes.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render } from '@testing-library/react'
import { deviceStore } from '../../../device'
import { connectDemo, disconnect } from '../../../shell/session'
import { KeyboardPicture } from '../../../ui/KeyboardPicture'
import { ZONE_COLOURS, zoneOutline, ZoneMark } from '../zone-marks'

const linear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
const luminance = ([r, g, b]: number[]) => 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b)
const ratio = (a: number[], b: number[]) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}
function hsl(text: string): number[] {
  const [h, s, l] = text.match(/[\d.]+/g)!.map(Number)
  const a = (s / 100) * Math.min(l / 100, 1 - l / 100)
  const f = (n: number) => {
    const k = (n + h / 30) % 12
    return l / 100 - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))
  }
  return [f(0), f(8), f(4)]
}
/** The light and the dark theme's colour of a `light-dark(…, …)` value. */
const shades = (value: string) => value.match(/hsl\([^)]*\)/g)!.map(hsl)
const WHITE_KEY = [1, 1, 1]
const DARK_KEY = [0x24 / 255, 0x27 / 255, 0x2c / 255] // --key-bg in the dark theme

describe('zone marks', () => {
  it('give every zone its own line, not only its own colour', () => {
    const lines = ZONE_COLOURS.map((_, zone) => `${zoneOutline(zone).dash}|${zoneOutline(zone).round}`)
    expect(new Set(lines).size).toBe(ZONE_COLOURS.length)
  })

  it('reach 3:1 against the keys: a darker shade on the light theme’s white keys, the usual one on dark keys', () => {
    for (const colour of ZONE_COLOURS) {
      const [light, dark] = shades(colour)
      expect(ratio(light, WHITE_KEY)).toBeGreaterThanOrEqual(3)
      expect(ratio(dark, DARK_KEY)).toBeGreaterThanOrEqual(3)
    }
  })

  it('draw the same line beside the zone’s name', () => {
    const { container } = render(<ZoneMark zone={1} />)
    expect(container.querySelector('rect')!.style.strokeDasharray).not.toBe('')
  })
})

describe('zone outlines on the picture', () => {
  beforeEach(async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    await connectDemo()
  })
  afterEach(async () => {
    await act(() => disconnect())
  })

  it('outline each key with its zone’s colour and line', () => {
    const keyboard = deviceStore.getState().keyboard!
    const outlines = new Map([
      ['0,1', zoneOutline(0)],
      ['0,2', zoneOutline(2)],
    ])
    const { container } = render(<KeyboardPicture keyboard={keyboard} layer={0} outlines={outlines} />)
    const rules = container.querySelector('style')!.textContent!
    expect(rules).toMatch(/data-key-pos="0,1"\] > :first-child \{[^}]*stroke-dasharray: none/)
    expect(rules).toMatch(new RegExp(`data-key-pos="0,2"\\] > :first-child \\{[^}]*stroke-dasharray: ${zoneOutline(2).dash}; stroke-linecap: round`))
  })
})
