// SPDX-License-Identifier: GPL-3.0-or-later

import { describe, expect, it } from 'vitest'
import { VIALRGB_EFFECTS } from '../../../device/api'
import { colourName, hsvCss } from '../colour'
import { effectGroups, effectInfo } from '../effects'

describe('lighting effects', () => {
  it('has a friendly name, a description and its QMK name for every VialRGB effect and Keychron’s own', () => {
    const ids = [...VIALRGB_EFFECTS.map((e) => e.index).filter((id) => id >= 2), 48, 49]
    const names = new Set<string>()
    for (const id of ids) {
      const info = effectInfo(id)
      expect(info.description, `effect ${id}`).not.toBe('An effect this app has no description for.')
      expect(info.qmkName).not.toMatch(/^Effect /)
      names.add(info.name)
    }
    expect(names.size).toBe(ids.length)
  })

  it('groups the effects a keyboard lists, leaving out Off and Direct Control', () => {
    const groups = effectGroups([0, 1, 41, 2, 13, 29])
    expect(groups.map((g) => [g.title, g.effects.map((e) => e.id)])).toEqual([
      ['Steady', [2]],
      ['Moving', [13]],
      ['Reacts to typing', [29, 41]],
    ])
  })

  it('shows slot 41 under its standard name unless a plugin renames it', () => {
    expect(effectInfo(41).name).toBe('One-colour splash')
    const renamed = effectInfo(41, { 41: { name: 'Ripple', description: 'Rings from each key.' } })
    expect(renamed).toMatchObject({ name: 'Ripple', description: 'Rings from each key.', qmkName: 'Solid Splash', hue: true })
  })

  it('says why an effect ignores a setting', () => {
    expect(effectInfo(13).hue).toMatch(/cycles through all colours/)
    expect(effectInfo(13).sat).toBe(true)
    expect(effectInfo(2).speed).toMatch(/doesn’t move/)
  })

  it('turns QMK colours into CSS and plain names', () => {
    expect(hsvCss(0, 255)).toBe('hsl(0.0 100.0% 50.0%)')
    expect(hsvCss(0, 0)).toBe('hsl(0.0 0.0% 100.0%)')
    expect(colourName(170, 255)).toBe('Blue')
    expect(colourName(85, 100)).toBe('Pale green')
    expect(colourName(85, 10)).toBe('White')
  })
})
