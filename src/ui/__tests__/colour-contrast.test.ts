// SPDX-License-Identifier: GPL-3.0-or-later
// The token colours that carry small text or a control's outline reach WCAG's contrast in both themes, as
// tokens.css gives them.
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { isLightColour, hsvRgb } from '../colour'

const css = readFileSync(join(__dirname, '../tokens.css'), 'utf8')

/** The `--name: #rrggbb` values of one block (`:root {` or `.dark {`), the dark one over the light one. */
function theme(block: ':root' | '.dark'): Record<string, string> {
  const read = (selector: string) => {
    const body = css.slice(css.indexOf(`${selector} {`)).split('\n}')[0]
    return Object.fromEntries([...body.matchAll(/--([\w-]+):\s*(#[0-9a-f]{6})/gi)].map((m) => [m[1], m[2]]))
  }
  return block === ':root' ? read(':root') : { ...read(':root'), ...read('.dark') }
}

const linear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
const luminance = ([r, g, b]: number[]) => 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b)
const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
const ratio = (a: number[], b: number[]) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

describe.each([':root', '.dark'] as const)('colours of %s', (block) => {
  const t = theme(block)
  const pair = (fg: string, bg: string) => ratio(rgb(t[fg]), rgb(t[bg]))

  it('the "Not saved" badge and warning text are 4.5:1 on controls and cards', () => {
    expect(pair('warning', 'raised')).toBeGreaterThanOrEqual(4.5)
    expect(pair('warning', 'card')).toBeGreaterThanOrEqual(4.5)
  })

  it('red text is 4.5:1 on its own tint (danger notices and buttons) and on cards', () => {
    expect(pair('danger', 'danger-soft')).toBeGreaterThanOrEqual(4.5)
    expect(pair('danger', 'card')).toBeGreaterThanOrEqual(4.5)
  })

  it('outlines of text boxes, select boxes, checkboxes and switches are 3:1 on the page, cards and controls', () => {
    for (const bg of ['surface', 'card', 'raised']) expect(pair('control-edge', bg)).toBeGreaterThanOrEqual(3)
    // A switch that is off: its white knob against the track.
    expect(pair('knob', 'control-edge')).toBeGreaterThanOrEqual(3)
  })
})

describe('labels on keys painted in a lighting colour', () => {
  const t = theme(':root')
  it('reach 4.5:1 on every hue and vividness, dark on light colours and light on dark ones', () => {
    let worst = Infinity
    for (let hue = 0; hue < 256; hue++) {
      for (let sat = 0; sat < 256; sat += 5) {
        const label = isLightColour(hue, sat) ? t['key-label-on-light'] : t['key-label-on-dark']
        worst = Math.min(worst, ratio(rgb(label), hsvRgb(hue, sat)))
      }
    }
    expect(worst).toBeGreaterThanOrEqual(4.5)
  })
})
