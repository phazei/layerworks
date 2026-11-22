// SPDX-License-Identifier: GPL-3.0-or-later

import { describe, expect, it } from 'vitest'
import { lightingAsWritten, lightingKind } from '../lighting-kind'

describe('the lighting a definition names', () => {
  it('reads a name as it is', () => {
    expect(lightingKind('vialrgb')).toBe('vialrgb')
    expect(lightingKind('qmk_backlight_rgblight')).toBe('qmk_backlight_rgblight')
  })

  it('reads a definition whose lighting is an object as the name it extends (Corne, DZ60RGB, Vipad)', () => {
    expect(lightingKind({ extends: 'qmk_rgblight' })).toBe('qmk_rgblight')
    expect(lightingKind({ extends: 'none', keycodes: 'qmk' })).toBe('none')
    expect(lightingKind({ extends: 'qmk_rgb_matrix', underglowEffects: [['00. None', 0]] })).toBe('qmk_rgb_matrix')
  })

  it('reads a definition whose lighting is a list by its first name', () => {
    expect(lightingKind(['qmk_rgblight'])).toBe('qmk_rgblight')
  })

  it('takes a definition without lighting as none, and a name it doesn’t know as other', () => {
    expect(lightingKind(undefined)).toBe('none')
    expect(lightingKind('wt_rgb_backlight')).toBe('other')
    expect(lightingKind({ keycodes: 'qmk' })).toBe('none')
    expect(lightingKind(42)).toBe('other')
  })

  it('shows what was written as text, short', () => {
    expect(lightingAsWritten({ extends: 'qmk_rgblight' })).toBe('{"extends":"qmk_rgblight"}')
    expect(lightingAsWritten({ extends: 'x', more: 'y'.repeat(200) })).toMatch(/…$/)
  })
})
